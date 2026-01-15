import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import {
  createConversation,
  getConversationById,
  addMessageToConversation,
} from '@/lib/db';
import {
  processBuilderChatStream,
  BuilderContext,
  BuilderProfile,
  BuilderState,
  DocumentUpload,
} from '@/lib/builder';
import { ConversationMessage } from '@/types';

interface DocumentUploadRequest {
  filename: string;
  content: string; // base64
}

/**
 * Get media type from filename extension
 */
function getMediaType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop();
  const mediaTypes: Record<string, string> = {
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'txt': 'text/plain',
    'md': 'text/markdown',
    'json': 'application/json',
    'csv': 'text/csv',
  };
  return mediaTypes[ext || ''] || 'application/octet-stream';
}

interface BuilderChatRequest {
  conversationId?: string;
  message: string;
  documents?: DocumentUploadRequest[];
}

// Store builder contexts in memory (in production, use Redis or database)
const builderContexts = new Map<string, BuilderContext>();

export async function POST(request: NextRequest) {
  try {
    const body: BuilderChatRequest = await request.json();
    const { conversationId, message, documents } = body;

    if (!message || message.trim() === '') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Get or create conversation
    let conversation;
    let convId = conversationId;

    if (convId) {
      conversation = getConversationById(convId);
      if (!conversation) {
        return NextResponse.json(
          { error: 'Conversation not found' },
          { status: 404 }
        );
      }
    } else {
      convId = uuidv4();
      conversation = createConversation(convId, 'builder');
    }

    // Get or create builder context
    let context = builderContexts.get(convId);
    if (!context) {
      context = {
        state: 'interviewing' as BuilderState,
        profile: {} as BuilderProfile,
        extractedFromDocuments: false,
      };
      builderContexts.set(convId, context);
    }

    // Add user message to conversation
    const userMessage: ConversationMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };
    addMessageToConversation(convId, userMessage);

    // Get updated conversation
    conversation = getConversationById(convId)!;

    // Convert documents to format expected by builder (pass directly to Claude)
    let builderDocuments: DocumentUpload[] | undefined;
    if (documents && documents.length > 0) {
      builderDocuments = documents.map(doc => ({
        filename: doc.filename,
        content: doc.content,
        mediaType: getMediaType(doc.filename),
      }));
    }

    // Create streaming response using SSE
    const encoder = new TextEncoder();
    const finalConvId = convId;

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send conversation ID first
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'conversationId', conversationId: finalConvId })}\n\n`)
          );

          let finalState: BuilderState = context!.state;
          let fullResponse = '';

          // Stream the response (chat only - no JSON extraction)
          for await (const chunk of processBuilderChatStream(
            message,
            conversation!.messages.slice(0, -1),
            context!,
            builderDocuments
          )) {
            if (chunk.type === 'text') {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'text', content: chunk.content })}\n\n`)
              );
            } else if (chunk.type === 'done') {
              finalState = chunk.state;
              fullResponse = chunk.response;
            }
          }

          // Send state update
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'state', state: finalState })}\n\n`)
          );

          // Send done signal (no profile - client will call /extract separately)
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'done',
              state: finalState
            })}\n\n`)
          );

          // Close stream IMMEDIATELY so client can proceed
          // This is critical - the browser waits for stream close before processing final events
          controller.close();

          // Do DB operations AFTER closing stream (non-blocking for user)
          // Update context state (keep existing profile)
          const updatedContext: BuilderContext = {
            ...context!,
            state: finalState,
            extractedFromDocuments: context!.extractedFromDocuments || !!(builderDocuments && builderDocuments.length > 0),
          };
          builderContexts.set(finalConvId, updatedContext);

          const assistantMessage: ConversationMessage = {
            role: 'assistant',
            content: fullResponse,
            timestamp: new Date().toISOString(),
          };
          addMessageToConversation(finalConvId, assistantMessage);
        } catch (error) {
          console.error('Builder streaming error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'error', error: errorMessage })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Builder chat error:', error);

    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';

    return NextResponse.json(
      { error: `Builder failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to retrieve current builder state
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get('conversationId');

  if (!conversationId) {
    return NextResponse.json(
      { error: 'conversationId is required' },
      { status: 400 }
    );
  }

  const context = builderContexts.get(conversationId);
  if (!context) {
    return NextResponse.json(
      { error: 'Builder context not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    state: context.state,
    profile: context.profile,
  });
}
