/**
 * Test Gemini for headshot generation with both Subject + Style Reference images
 * Using responseModalities to request image output
 */

import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';

const apiKey = process.env.GOOGLE_API_KEY!;

console.log('Google API Key present:', !!apiKey);

// Load both images
const subjectBase64 = fs.readFileSync('./Subject_small.png').toString('base64');
const styleBase64 = fs.readFileSync('./Style_Reference.png').toString('base64');

console.log('Subject image:', Math.round(subjectBase64.length / 1024), 'KB');
console.log('Style reference:', Math.round(styleBase64.length / 1024), 'KB');

// The prompt from gemini-image-prompt.txt with enhancement
const prompt = `I have attached two images. Please generate a highly realistic, professional military headshot following these specific instructions:

1. The Subject: Use the person in the FIRST image (the person in the camouflage uniform). Keep their exact US Army OCP uniform, ensuring the specific name tape and rank insignia visible in the source photo are preserved exactly as they are.

2. The Style & Background: Use the SECOND image (the officer in the dark suit) as the reference for the pose, lighting, and background.

Background: Create a similar seamless grey studio backdrop with a blurred US flag draped on the left side.

Lighting: Mimic the soft, professional studio lighting from the reference.

3. Enhancements: While maintaining a realistic photo-quality, please subtly enhance the subject's face to reduce under-eye bags and soften deep wrinkles to create a refreshed, energetic look, while ensuring he remains recognizable.

Output: A photorealistic headshot with a 2:3 aspect ratio. Generate the image.`;

async function main() {
  console.log('\nTesting Gemini headshot generation with image output...\n');

  const genAI = new GoogleGenerativeAI(apiKey);

  // Use gemini-2.0-flash-exp with image generation capability
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-exp',
    generationConfig: {
      responseModalities: ['image', 'text'],
    } as any,
  });

  try {
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: 'image/png',
          data: subjectBase64,
        },
      },
      {
        inlineData: {
          mimeType: 'image/png',
          data: styleBase64,
        },
      },
    ]);

    const response = result.response;
    console.log('Response received!');

    // Check for generated image in response
    const parts = response.candidates?.[0]?.content?.parts || [];
    console.log('Parts count:', parts.length);

    let imageFound = false;
    for (const part of parts) {
      if (part.inlineData) {
        imageFound = true;
        const imageData = part.inlineData.data;
        const mimeType = part.inlineData.mimeType;
        console.log('✅ Generated image found! MIME:', mimeType);

        const ext = mimeType?.includes('png') ? 'png' : 'jpg';
        fs.writeFileSync(`./Generated_Gemini_Headshot.${ext}`, Buffer.from(imageData, 'base64'));
        console.log(`📁 Saved to: Generated_Gemini_Headshot.${ext}`);
      } else if (part.text) {
        console.log('Text:', part.text.slice(0, 200));
      }
    }

    if (!imageFound) {
      console.log('No image in response. Full response:');
      console.log(JSON.stringify(response, null, 2).slice(0, 1000));
    }
  } catch (error: any) {
    console.log('❌ Error:', error.message);
    console.log('Full error:', JSON.stringify(error, null, 2).slice(0, 500));
  }
}

main();
