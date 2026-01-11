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

    if (!officer.pdf_blob) {
      return NextResponse.json(
        { error: 'PDF not found' },
        { status: 404 }
      );
    }

    // Create a filename from the officer's name
    const filename = `${officer.rank}_${officer.name.replace(/\s+/g, '_')}_38G_Card.pdf`;

    // Return the PDF - convert Buffer to Uint8Array for NextResponse
    return new NextResponse(new Uint8Array(officer.pdf_blob), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Get officer PDF error:', error);
    return NextResponse.json(
      { error: 'Failed to get PDF' },
      { status: 500 }
    );
  }
}
