import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import {
  createConversation,
  getConversationById,
  addMessageToConversation,
} from '@/lib/db';
import { prepareRagSearch, parseOfficerIds, getOfficerSummaries } from '@/lib/search';
import { chatStream, SEARCH_SYSTEM_PROMPT } from '@/lib/claude';
import { SearchChatRequest, ConversationMessage } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body: SearchChatRequest = await request.json();
    const { conversationId, message } = body;

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
      conversation = createConversation(convId, 'search');
    }

    // Add user message to conversation
    const userMessage: ConversationMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };
    addMessageToConversation(convId, userMessage);

    // Get updated conversation with the new message
    conversation = getConversationById(convId)!;

    // Prepare RAG search (retrieves officers and builds messages)
    const { messages, officers } = await prepareRagSearch(
      message,
      conversation.messages.slice(0, -1) // Exclude the message we just added
    );

    // Create a streaming response using SSE
    const encoder = new TextEncoder();
    let fullResponse = '';

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send the conversation ID first
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'conversationId', conversationId: convId })}\n\n`)
          );

          // Stream text chunks from Claude
          for await (const chunk of chatStream(messages, SEARCH_SYSTEM_PROMPT, 4096)) {
            fullResponse += chunk;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'text', content: chunk })}\n\n`)
            );
          }

          // Parse the completed response for officer IDs
          const { proseResponse, primaryTeamIds, alsoMentionedIds } = parseOfficerIds(fullResponse, officers);

          // Save assistant response to conversation
          const assistantMessage: ConversationMessage = {
            role: 'assistant',
            content: proseResponse,
            timestamp: new Date().toISOString(),
          };
          addMessageToConversation(convId!, assistantMessage);

          // Get officer summaries for both groups
          const primaryTeam = getOfficerSummaries(primaryTeamIds);
          const alsoMentioned = getOfficerSummaries(alsoMentionedIds);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'officers', primaryTeam, alsoMentioned })}\n\n`)
          );

          // Send completion signal
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'done', proseResponse })}\n\n`)
          );

          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
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
    console.error('Search chat error:', error);

    // Return a user-friendly error message
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';

    return NextResponse.json(
      { error: `Search failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}
