/**
 * Headshot professionalization using Google Gemini 3 Pro Image Preview
 *
 * Takes a user's photo and generates a professional military headshot
 * with grey backdrop, US flag, and studio lighting.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

// Load the style reference image
const STYLE_REFERENCE_PATH = process.env.STYLE_REFERENCE_PATH || './Style_Reference.png';

// Model configuration
const GEMINI_MODEL = 'gemini-3-pro-image-preview';

// Maximum image size in bytes for API (approximately 500KB base64 works well)
const MAX_IMAGE_SIZE_BYTES = 500000;

export interface HeadshotRequest {
  subjectImage: string; // base64 encoded image (should be resized to ~512px)
  enhancements?: string; // e.g., "reduce under-eye bags, soften wrinkles"
}

export interface HeadshotResponse {
  processedImage: string; // base64 encoded result
  success: boolean;
  error?: string;
}

/**
 * Load the style reference image as base64
 */
function getStyleReferenceBase64(): string {
  const absolutePath = path.resolve(STYLE_REFERENCE_PATH);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Style reference image not found at: ${absolutePath}`);
  }
  const imageBuffer = fs.readFileSync(absolutePath);
  return imageBuffer.toString('base64');
}

/**
 * Build the prompt for headshot generation
 */
function buildPrompt(enhancements?: string): string {
  const enhancementText = enhancements || 'maintain natural appearance';

  return `I have attached two images. Please generate a highly realistic, professional military headshot following these specific instructions:

1. The Subject: Use the person in the FIRST image (the person in the camouflage uniform). Keep their exact US Army OCP uniform, ensuring the specific name tape and rank insignia visible in the source photo are preserved exactly as they are.

2. The Style & Background: Use the SECOND image (the officer in the dark suit) as the reference for the pose, lighting, and background.

Background: Create a similar seamless grey studio backdrop with a blurred US flag draped on the left side.

Lighting: Mimic the soft, professional studio lighting from the reference.

3. Enhancements: While maintaining a realistic photo-quality, please ${enhancementText}.

4. Output: A photorealistic headshot with a 2:3 aspect ratio.

CRITICAL - FACIAL ACCURACY: You MUST preserve the subject's exact facial features, bone structure, skin tone, and likeness with absolute precision. The output must be immediately and unmistakably recognizable as the same person. Do not alter, idealize, or "improve" any facial characteristics - the face must remain 100% accurate to the source photo.`;
}

/**
 * Generate a professional headshot using Gemini 3 Pro Image Preview
 *
 * IMPORTANT: The subject image should be reasonably sized (under ~500KB base64).
 * Large images (e.g., 10MB phone photos) should be resized to ~512px before calling.
 */
export async function generateHeadshot(request: HeadshotRequest): Promise<HeadshotResponse> {
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    return {
      processedImage: '',
      success: false,
      error: 'Google API key missing. Set GOOGLE_API_KEY in environment.',
    };
  }

  // Check if image is too large
  if (request.subjectImage.length > MAX_IMAGE_SIZE_BYTES) {
    return {
      processedImage: '',
      success: false,
      error: `Image too large (${Math.round(request.subjectImage.length / 1024)}KB). Please resize to under 500KB.`,
    };
  }

  try {
    // Load style reference
    const styleBase64 = getStyleReferenceBase64();

    // Build prompt
    const prompt = buildPrompt(request.enhancements);

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: {
        responseModalities: ['image', 'text'],
      } as any,
    });

    // Generate content with both images
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: 'image/png',
          data: request.subjectImage,
        },
      },
      {
        inlineData: {
          mimeType: 'image/png',
          data: styleBase64,
        },
      },
    ]);

    // Extract generated image from response
    const parts = result.response.candidates?.[0]?.content?.parts || [];

    for (const part of parts) {
      if (part.inlineData) {
        return {
          processedImage: part.inlineData.data,
          success: true,
        };
      }
    }

    return {
      processedImage: '',
      success: false,
      error: 'No image returned from Gemini API',
    };
  } catch (error) {
    return {
      processedImage: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error generating headshot',
    };
  }
}
