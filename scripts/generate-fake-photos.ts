/**
 * Generate fake headshot photos for fictional officers using Gemini 3 Pro
 *
 * Usage:
 *   npx tsx scripts/generate-fake-photos.ts              # Generate for all officers
 *   npx tsx scripts/generate-fake-photos.ts officer_001  # Generate for one officer
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const REFERENCE_IMAGE_PATH = './reference.jpeg';
const PROMPT_TEMPLATE_PATH = './fakephoto.txt';
const OFFICERS_JSON_PATH = './fictional_officers.json';
const OUTPUT_DIR = './generated_photos';

const GEMINI_MODEL = 'gemini-3-pro-image-preview';

interface Officer {
  id: string;
  name: string;
  rank: string;
  [key: string]: unknown;
}

/**
 * Load reference image as base64
 */
function loadReferenceImage(): string {
  const absolutePath = path.resolve(REFERENCE_IMAGE_PATH);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Reference image not found at: ${absolutePath}`);
  }
  const imageBuffer = fs.readFileSync(absolutePath);
  return imageBuffer.toString('base64');
}

/**
 * Load prompt template
 */
function loadPromptTemplate(): string {
  const absolutePath = path.resolve(PROMPT_TEMPLATE_PATH);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Prompt template not found at: ${absolutePath}`);
  }
  return fs.readFileSync(absolutePath, 'utf-8');
}

/**
 * Load fictional officers
 */
function loadOfficers(): Officer[] {
  const absolutePath = path.resolve(OFFICERS_JSON_PATH);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Officers JSON not found at: ${absolutePath}`);
  }
  const data = JSON.parse(fs.readFileSync(absolutePath, 'utf-8'));
  return data.officers;
}

/**
 * Generate a fake photo for a single officer
 */
async function generateFakePhoto(
  officer: Officer,
  promptTemplate: string,
  referenceBase64: string,
  genAI: GoogleGenerativeAI
): Promise<{ success: boolean; error?: string }> {
  console.log(`\nGenerating photo for ${officer.rank} ${officer.name} (${officer.id})...`);

  // Build the full prompt by appending officer JSON
  const fullPrompt = promptTemplate + '\n' + JSON.stringify(officer, null, 2);

  try {
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: {
        responseModalities: ['image', 'text'],
      } as any,
    });

    // Generate content with reference image
    const result = await model.generateContent([
      fullPrompt,
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: referenceBase64,
        },
      },
    ]);

    // Extract generated image from response
    const parts = result.response.candidates?.[0]?.content?.parts || [];

    for (const part of parts) {
      if (part.inlineData) {
        // Ensure output directory exists
        if (!fs.existsSync(OUTPUT_DIR)) {
          fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        }

        // Save the image
        const outputPath = path.join(OUTPUT_DIR, `${officer.id}.png`);
        const imageBuffer = Buffer.from(part.inlineData.data, 'base64');
        fs.writeFileSync(outputPath, imageBuffer);

        console.log(`  ✓ Saved to ${outputPath}`);
        return { success: true };
      }
    }

    // Check for text response (might contain error or explanation)
    for (const part of parts) {
      if (part.text) {
        console.log(`  Text response: ${part.text.substring(0, 200)}...`);
      }
    }

    return { success: false, error: 'No image returned from Gemini API' };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`  ✗ Error: ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
}

/**
 * Main function
 */
async function main() {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error('Error: GOOGLE_API_KEY environment variable not set');
    process.exit(1);
  }

  // Get optional officer ID from command line
  const targetOfficerId = process.argv[2];

  console.log('Loading resources...');
  const promptTemplate = loadPromptTemplate();
  const referenceBase64 = loadReferenceImage();
  const officers = loadOfficers();

  console.log(`Loaded ${officers.length} officers`);
  console.log(`Reference image size: ${Math.round(referenceBase64.length / 1024)}KB`);

  // Initialize Gemini
  const genAI = new GoogleGenerativeAI(apiKey);

  // Filter to target officer if specified
  const targetOfficers = targetOfficerId
    ? officers.filter(o => o.id === targetOfficerId)
    : officers;

  if (targetOfficerId && targetOfficers.length === 0) {
    console.error(`Error: Officer ${targetOfficerId} not found`);
    process.exit(1);
  }

  console.log(`\nGenerating photos for ${targetOfficers.length} officer(s)...`);

  let successCount = 0;
  let failCount = 0;

  for (const officer of targetOfficers) {
    const result = await generateFakePhoto(officer, promptTemplate, referenceBase64, genAI);
    if (result.success) {
      successCount++;
    } else {
      failCount++;
    }

    // Add a small delay between requests to avoid rate limiting
    if (targetOfficers.length > 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Done! Success: ${successCount}, Failed: ${failCount}`);
  console.log(`Photos saved to: ${path.resolve(OUTPUT_DIR)}`);
}

main().catch(console.error);
