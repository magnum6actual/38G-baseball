import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import {
  createConversation,
  getConversationById,
  addMessageToConversation,
} from '@/lib/db';
import { ragSearch, getOfficerSummaries } from '@/lib/search';
import { SearchChatRequest, SearchChatResponse, ConversationMessage } from '@/types';

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

    // Perform RAG search
    const { response, officerIds } = await ragSearch(
      message,
      conversation.messages.slice(0, -1) // Exclude the message we just added
    );

    // Add assistant response to conversation
    const assistantMessage: ConversationMessage = {
      role: 'assistant',
      content: response,
      timestamp: new Date().toISOString(),
    };
    addMessageToConversation(convId, assistantMessage);

    // Get officer summaries for the UI
    const officers = getOfficerSummaries(officerIds);

    const responseData: SearchChatResponse = {
      conversationId: convId,
      response,
      officers,
    };

    return NextResponse.json(responseData);
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
