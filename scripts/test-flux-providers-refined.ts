/**
 * Test FLUX.2 providers path - refining based on 422 error
 * The endpoint is responding! Just need correct parameters.
 */

import 'dotenv/config';
import fs from 'fs';

const apiKey = process.env.AZURE_AI_API_KEY!;
const baseUrl = 'https://kinetiqs-foundry.services.ai.azure.com/providers/blackforestlabs/v1/flux-2-pro?api-version=2025-04-01-preview';

const tests = [
  // Without output_format
  {
    name: '1. No output_format',
    body: { model: 'flux.2-pro', prompt: 'simple blue circle', n: 1, size: '1024x1024' },
  },
  // Different output formats
  {
    name: '2. output_format: jpeg',
    body: { model: 'flux.2-pro', prompt: 'simple blue circle', n: 1, size: '1024x1024', output_format: 'jpeg' },
  },
  {
    name: '3. output_format: b64_json',
    body: { model: 'flux.2-pro', prompt: 'simple blue circle', n: 1, size: '1024x1024', output_format: 'b64_json' },
  },
  // Try response_format instead
  {
    name: '4. response_format: url',
    body: { model: 'flux.2-pro', prompt: 'simple blue circle', n: 1, size: '1024x1024', response_format: 'url' },
  },
  {
    name: '5. response_format: b64_json',
    body: { model: 'flux.2-pro', prompt: 'simple blue circle', n: 1, size: '1024x1024', response_format: 'b64_json' },
  },
  // Minimal - just model and prompt
  {
    name: '6. Minimal (model + prompt only)',
    body: { model: 'flux.2-pro', prompt: 'simple blue circle' },
  },
  // Try uppercase model name
  {
    name: '7. Uppercase model name',
    body: { model: 'FLUX.2-pro', prompt: 'simple blue circle' },
  },
  // With aspect_ratio instead of size (FLUX-specific)
  {
    name: '8. With aspect_ratio',
    body: { model: 'flux.2-pro', prompt: 'simple blue circle', aspect_ratio: '1:1' },
  },
];

async function testConfig(t: typeof tests[0]) {
  console.log(`\n📍 ${t.name}`);
  console.log(`   Body: ${JSON.stringify(t.body)}`);

  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(t.body),
    });

    const modelError = response.headers.get('ms-azureml-model-error-reason');
    const text = await response.text();

    console.log(`   Status: ${response.status}`);
    if (modelError) console.log(`   Model Error: ${modelError}`);

    if (response.ok) {
      console.log('   ✅ SUCCESS!');
      const data = JSON.parse(text);
      console.log('   Keys:', Object.keys(data));
      console.log('   Response:', JSON.stringify(data, null, 2).slice(0, 400));

      // Try to save image
      const b64 = data.data?.[0]?.b64_json || data.images?.[0]?.b64_json || data.image;
      const imgUrl = data.data?.[0]?.url || data.images?.[0]?.url;

      if (b64) {
        fs.writeFileSync('./Generated_Headshot.png', Buffer.from(b64, 'base64'));
        console.log('   📁 Saved to: Generated_Headshot.png');
      } else if (imgUrl) {
        console.log('   Fetching from URL...');
        const imgResp = await fetch(imgUrl);
        const imgBuf = await imgResp.arrayBuffer();
        fs.writeFileSync('./Generated_Headshot.png', Buffer.from(imgBuf));
        console.log('   📁 Saved to: Generated_Headshot.png');
      }
      return true;
    } else if (response.status === 429) {
      console.log('   ⏳ Rate limited');
    } else {
      console.log(`   Response: ${text.slice(0, 200)}`);
    }
  } catch (error: any) {
    console.log(`   Error: ${error.message}`);
  }
  return false;
}

async function main() {
  console.log('Testing FLUX.2 providers path with parameter variations...');
  console.log('URL:', baseUrl);

  for (const t of tests) {
    const success = await testConfig(t);
    if (success) {
      console.log('\n🎉 Found working configuration!');
      break;
    }
    await new Promise(r => setTimeout(r, 1500));
  }
}

main();
