import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import {
  createConversation,
  getConversationById,
  addMessageToConversation,
} from '@/lib/db';
import {
  processBuilderMessageStream,
  BuilderContext,
  BuilderProfile,
  BuilderState,
} from '@/lib/builder';
import { parseDocument } from '@/lib/documents';
import { ConversationMessage } from '@/types';

interface DocumentUpload {
  filename: string;
  content: string; // base64
}

interface BuilderChatRequest {
  conversationId?: string;
  message: string;
  documents?: DocumentUpload[];
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

    // Process document content if provided (including PDFs)
    let documentContent: string | undefined;
    if (documents && documents.length > 0) {
      const parsedDocs: string[] = [];
      for (const doc of documents) {
        try {
          const text = await parseDocument(doc.content, doc.filename);
          if (text && text.trim()) {
            parsedDocs.push(`--- Document: ${doc.filename} ---\n${text}`);
          }
        } catch (e) {
          console.warn(`Failed to parse document ${doc.filename}:`, e);
          parsedDocs.push(`--- Document: ${doc.filename} ---\n[Unable to parse document]`);
        }
      }
      if (parsedDocs.length > 0) {
        documentContent = parsedDocs.join('\n\n');
      }
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

          let finalContext: BuilderContext | null = null;
          let cleanResponse = '';

          // Stream the response
          for await (const chunk of processBuilderMessageStream(
            message,
            conversation!.messages.slice(0, -1),
            context!,
            documentContent
          )) {
            if (chunk.type === 'text') {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'text', content: chunk.content })}\n\n`)
              );
            } else if (chunk.type === 'done') {
              finalContext = chunk.context;
              cleanResponse = chunk.cleanResponse;
            }
          }

          if (finalContext) {
            // Send state update
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'state', state: finalContext.state })}\n\n`)
            );

            // Send profile update
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'profile', profile: finalContext.profile })}\n\n`)
            );

            // Send done signal
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'done',
                state: finalContext.state,
                profile: finalContext.profile
              })}\n\n`)
            );
          }

          // Close stream IMMEDIATELY so client can proceed
          // This is critical - the browser waits for stream close before processing final events
          controller.close();

          // Do DB operations AFTER closing stream (non-blocking for user)
          if (finalContext) {
            builderContexts.set(finalConvId, finalContext);
            const assistantMessage: ConversationMessage = {
              role: 'assistant',
              content: cleanResponse,
              timestamp: new Date().toISOString(),
            };
            addMessageToConversation(finalConvId, assistantMessage);
          }
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
