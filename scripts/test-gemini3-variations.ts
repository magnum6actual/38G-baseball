/**
 * Try different Gemini 3 model name variations
 */

import 'dotenv/config';
import { VertexAI } from '@google-cloud/vertexai';
import fs from 'fs';

process.env.GOOGLE_APPLICATION_CREDENTIALS = './gcp-service-account.json';

const project = process.env.GOOGLE_CLOUD_PROJECT || 'g-baseball';
const subjectBase64 = fs.readFileSync('./Subject_small.png').toString('base64');
const styleBase64 = fs.readFileSync('./Style_Reference.png').toString('base64');

const prompt = `Generate a professional military headshot using the person from the first image with the style/background from the second image.`;

const modelVariations = [
  'gemini-3-pro-image-preview',
  'gemini-3.0-pro-image-preview',
  'gemini-pro-3-image-preview',
  'gemini-3-pro-vision',
  'gemini-3-pro',
  'gemini-2.0-pro-exp',
  'gemini-2.0-flash-001',
];

const locations = ['us-central1', 'us-east4', 'us-west1'];

async function tryModel(modelName: string, location: string) {
  console.log(`\n📍 ${modelName} @ ${location}`);

  try {
    const vertexAI = new VertexAI({ project, location });
    const model = vertexAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseModalities: ['IMAGE', 'TEXT'],
      } as any,
    });

    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          { text: prompt },
          { inlineData: { mimeType: 'image/png', data: subjectBase64 } },
          { inlineData: { mimeType: 'image/png', data: styleBase64 } },
        ],
      }],
    });

    const parts = result.response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData) {
        console.log('   ✅ SUCCESS! Image generated');
        fs.writeFileSync('./Generated_Vertex_Headshot.png', Buffer.from(part.inlineData.data, 'base64'));
        console.log('   📁 Saved to: Generated_Vertex_Headshot.png');
        return true;
      }
    }
    console.log('   Model exists but no image returned');
  } catch (error: any) {
    const msg = error.message?.slice(0, 80);
    console.log(`   ❌ ${msg}`);
  }
  return false;
}

async function main() {
  console.log('Testing Gemini 3 model variations...\n');

  // First try all models in us-central1
  for (const model of modelVariations) {
    const success = await tryModel(model, 'us-central1');
    if (success) return;
  }
}

main();
