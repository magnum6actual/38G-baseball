import { NextRequest, NextResponse } from 'next/server';
import { generateHeadshot } from '@/lib/headshot';

interface HeadshotRequestBody {
  subjectImage: string; // base64
  enhancements?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: HeadshotRequestBody = await request.json();
    const { subjectImage, enhancements } = body;

    if (!subjectImage) {
      return NextResponse.json(
        { error: 'Subject image is required' },
        { status: 400 }
      );
    }

    // Generate the professional headshot using Gemini
    const result = await generateHeadshot({
      subjectImage,
      enhancements,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Headshot generation failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      processedImage: result.processedImage,
      success: true,
    });
  } catch (error) {
    console.error('Headshot API error:', error);

    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';

    return NextResponse.json(
      { error: `Headshot generation failed: ${errorMessage}`, success: false },
      { status: 500 }
    );
  }
}
