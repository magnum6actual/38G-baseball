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

    if (!officer.photo_blob) {
      return NextResponse.json(
        { error: 'Photo not found' },
        { status: 404 }
      );
    }

    // Return the photo as an image - convert Buffer to Uint8Array for NextResponse
    return new NextResponse(new Uint8Array(officer.photo_blob), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Get officer photo error:', error);
    return NextResponse.json(
      { error: 'Failed to get photo' },
      { status: 500 }
    );
  }
}
