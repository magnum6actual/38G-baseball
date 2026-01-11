import { NextRequest, NextResponse } from 'next/server';
import { getOfficerById } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const officer = getOfficerById(id);

    if (!officer) {
      return NextResponse.json(
        { error: 'Officer not found' },
        { status: 404 }
      );
    }

    // Return officer data without binary blobs
    const { pdf_blob, photo_blob, photo_original_blob, ...officerData } = officer;

    return NextResponse.json({
      ...officerData,
      hasPdf: !!pdf_blob,
      hasPhoto: !!photo_blob,
      pdfUrl: pdf_blob ? `/api/officers/${id}/pdf` : null,
      photoUrl: photo_blob ? `/api/officers/${id}/photo` : null,
    });
  } catch (error) {
    console.error('Get officer error:', error);
    return NextResponse.json(
      { error: 'Failed to get officer' },
      { status: 500 }
    );
  }
}
