import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import {
  createConversation,
  getConversationById,
  addMessageToConversation,
  getDb,
} from '@/lib/db';
import {
  processBuilderMessage,
  BuilderContext,
  BuilderProfile,
  BuilderState,
} from '@/lib/builder';
import { BuilderChatRequest, BuilderChatResponse, ConversationMessage } from '@/types';

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

    // Process document content if provided
    let documentContent: string | undefined;
    if (documents && documents.length > 0) {
      // For now, just decode base64 text documents
      // In production, use proper document parsing libraries
      documentContent = documents
        .map((doc) => {
          try {
            // Try to decode as UTF-8 text
            const buffer = Buffer.from(doc, 'base64');
            return buffer.toString('utf-8');
          } catch (e) {
            return '[Unable to parse document]';
          }
        })
        .join('\n\n---\n\n');
    }

    // Process the message
    const result = await processBuilderMessage(
      message,
      conversation.messages.slice(0, -1), // Exclude the message we just added
      context,
      documentContent
    );

    // Update context
    builderContexts.set(convId, result.context);

    // Add assistant response to conversation
    const assistantMessage: ConversationMessage = {
      role: 'assistant',
      content: result.response,
      timestamp: new Date().toISOString(),
    };
    addMessageToConversation(convId, assistantMessage);

    const responseData: BuilderChatResponse = {
      conversationId: convId,
      response: result.response,
      state: result.context.state,
      profile: result.context.profile as Record<string, unknown>,
    };

    return NextResponse.json(responseData);
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
