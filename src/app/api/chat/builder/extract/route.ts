import { NextRequest, NextResponse } from 'next/server';
import {
  updateProfileFromTurn,
  BuilderProfile,
  DocumentUpload,
} from '@/lib/builder';

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

interface UpdateRequest {
  currentProfile: BuilderProfile;
  latestUserMessage: string;
  latestAssistantResponse: string;
  documents?: DocumentUploadRequest[];
}

export async function POST(request: NextRequest) {
  try {
    const body: UpdateRequest = await request.json();
    const { currentProfile, latestUserMessage, latestAssistantResponse, documents } = body;

    if (!latestUserMessage || !latestAssistantResponse) {
      return NextResponse.json(
        { error: 'latestUserMessage and latestAssistantResponse are required' },
        { status: 400 }
      );
    }

    // Convert documents to format expected by builder
    let builderDocuments: DocumentUpload[] | undefined;
    if (documents && documents.length > 0) {
      builderDocuments = documents.map(doc => ({
        filename: doc.filename,
        content: doc.content,
        mediaType: getMediaType(doc.filename),
      }));
    }

    // Update profile from the latest turn
    const updatedProfile = await updateProfileFromTurn(
      currentProfile || {},
      latestUserMessage,
      latestAssistantResponse,
      builderDocuments
    );

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
    });
  } catch (error) {
    console.error('Update profile error:', error);

    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';

    return NextResponse.json(
      { error: `Profile update failed: ${errorMessage}`, success: false },
      { status: 500 }
    );
  }
}
