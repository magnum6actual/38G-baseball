/**
 * Check available FLUX model variants and test image-to-image capabilities
 * FLUX has different models: flux-2-pro (text-to-image), flux-fill (inpainting), flux-redux (variation)
 */

import 'dotenv/config';
import fs from 'fs';

const apiKey = process.env.AZURE_AI_API_KEY!;
const baseEndpoint = 'https://kinetiqs-foundry.services.ai.azure.com/providers/blackforestlabs/v1';

// Create a smaller test image (resize Subject if needed)
const subjectBase64 = fs.readFileSync('./Subject.png').toString('base64');
console.log('Subject size:', Math.round(subjectBase64.length / 1024), 'KB base64');

// Try different FLUX model variants
const modelVariants = [
  'flux-2-pro',
  'flux-pro',
  'flux-fill',
  'flux-redux',
  'flux-dev',
  'flux-schnell',
];

async function testModel(model: string) {
  const url = `${baseEndpoint}/${model}?api-version=2025-04-01-preview`;
  console.log(`\n📍 Testing: ${model}`);
  console.log(`   URL: ${url}`);

  try {
    // First try text-only to see if model exists
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        prompt: 'test',
        n: 1,
      }),
    });

    const text = await response.text();
    console.log(`   Status: ${response.status}`);

    if (response.status === 404) {
      console.log('   Model not found/deployed');
    } else if (response.status === 422) {
      console.log('   Model exists but needs different params');
      console.log(`   ${text.slice(0, 150)}`);
    } else if (response.ok) {
      console.log('   ✅ Model available!');
    } else {
      console.log(`   ${text.slice(0, 100)}`);
    }
  } catch (error: any) {
    console.log(`   Error: ${error.message}`);
  }
}

async function main() {
  console.log('Checking available FLUX model variants...\n');

  for (const model of modelVariants) {
    await testModel(model);
    await new Promise(r => setTimeout(r, 1000));
  }

  // Also try to get model info/capabilities
  console.log('\n\nTrying to get flux-2-pro schema/capabilities...');
  try {
    const schemaUrl = `${baseEndpoint}/flux-2-pro/schema?api-version=2025-04-01-preview`;
    const resp = await fetch(schemaUrl, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    console.log('Schema endpoint:', resp.status);
    if (resp.ok) {
      const data = await resp.json();
      console.log('Schema:', JSON.stringify(data, null, 2).slice(0, 500));
    }
  } catch (e: any) {
    console.log('Schema error:', e.message);
  }
}

main();
