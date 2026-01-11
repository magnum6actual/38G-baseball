/**
 * Check available Google AI models and try Imagen
 */

import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GOOGLE_API_KEY!;
const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
  console.log('Listing available models...\n');

  try {
    // @ts-ignore - listModels may not be in types
    const models = await genAI.listModels();
    for await (const model of models) {
      console.log(`- ${model.name}`);
      if (model.supportedGenerationMethods) {
        console.log(`  Methods: ${model.supportedGenerationMethods.join(', ')}`);
      }
    }
  } catch (error: any) {
    console.log('Error listing models:', error.message);
  }
}

async function tryImagenModels() {
  console.log('\n\nTrying different image models...\n');

  const modelsToTry = [
    'imagen-3.0-generate-001',
    'imagen-3.0-fast-generate-001',
    'imagegeneration@006',
    'gemini-2.0-flash-exp-image-generation',
    'gemini-exp-1206',
  ];

  for (const modelName of modelsToTry) {
    console.log(`\n📍 Trying: ${modelName}`);
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Generate a simple blue circle');
      console.log('  ✅ Model exists!');
      console.log('  Response:', JSON.stringify(result.response).slice(0, 200));
    } catch (error: any) {
      console.log('  ❌', error.message?.slice(0, 100));
    }
  }
}

async function main() {
  await listModels();
  await tryImagenModels();
}

main();
