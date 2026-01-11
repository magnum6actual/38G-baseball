/**
 * Try Gemini 3 via Google AI Studio API (not Vertex AI)
 */

import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';

const apiKey = process.env.GOOGLE_API_KEY!;
const subjectBase64 = fs.readFileSync('./Subject_small.png').toString('base64');
const styleBase64 = fs.readFileSync('./Style_Reference.png').toString('base64');

const prompt = `I have attached two images. Please generate a highly realistic, professional military headshot following these specific instructions:

1. The Subject: Use the person in the FIRST image (the person in the camouflage uniform). Keep their exact US Army OCP uniform, ensuring the specific name tape and rank insignia visible in the source photo are preserved exactly as they are.

2. The Style & Background: Use the SECOND image (the officer in the dark suit) as the reference for the pose, lighting, and background.

Background: Create a similar seamless grey studio backdrop with a blurred US flag draped on the left side.

Lighting: Mimic the soft, professional studio lighting from the reference.

3. Enhancements: While maintaining a realistic photo-quality, please subtly enhance the subject's face to reduce under-eye bags and soften deep wrinkles to create a refreshed, energetic look, while ensuring he remains recognizable.

Output: A photorealistic headshot with a 2:3 aspect ratio.`;

const models = [
  'gemini-3-pro-image-preview',
  'gemini-2.5-pro-preview-05-06',
  'gemini-2.5-flash-preview-05-20',
  'gemini-2.0-flash-exp',
];

async function tryModel(modelName: string) {
  console.log(`\n📍 ${modelName}`);

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseModalities: ['image', 'text'],
      } as any,
    });

    const result = await model.generateContent([
      prompt,
      { inlineData: { mimeType: 'image/png', data: subjectBase64 } },
      { inlineData: { mimeType: 'image/png', data: styleBase64 } },
    ]);

    const parts = result.response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData) {
        console.log('   ✅ SUCCESS!');
        fs.writeFileSync('./Generated_Gemini3_Headshot.png', Buffer.from(part.inlineData.data, 'base64'));
        console.log('   📁 Saved to: Generated_Gemini3_Headshot.png');
        return true;
      } else if (part.text) {
        console.log('   Text only:', part.text.slice(0, 100));
      }
    }
  } catch (error: any) {
    console.log(`   ❌ ${error.message?.slice(0, 100)}`);
  }
  return false;
}

async function main() {
  console.log('Testing Gemini models via AI Studio API...\n');

  for (const model of models) {
    const success = await tryModel(model);
    if (success) return;
  }
}

main();
