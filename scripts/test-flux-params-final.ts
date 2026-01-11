/**
 * Test FLUX.2 with various parameter formats
 * FLUX.2 may require specific parameter formats different from DALL-E
 */

import 'dotenv/config';
import fs from 'fs';

const apiKey = process.env.AZURE_AI_API_KEY!;
const url = 'https://kinetiqs-foundry.services.ai.azure.com/openai/v1/images/generations';
const prompt = 'simple blue circle';

const paramVariations = [
  // Standard DALL-E format
  { name: 'Standard', body: { model: 'FLUX.2-pro', prompt, n: 1, size: '1024x1024' } },

  // Without size (FLUX may not need it)
  { name: 'No size', body: { model: 'FLUX.2-pro', prompt, n: 1 } },

  // With response_format
  { name: 'With b64_json format', body: { model: 'FLUX.2-pro', prompt, n: 1, response_format: 'b64_json' } },

  // Different size formats
  { name: 'Size as object', body: { model: 'FLUX.2-pro', prompt, n: 1, size: { width: 1024, height: 1024 } } },

  // FLUX-specific params (guidance_scale, num_inference_steps)
  { name: 'With guidance', body: { model: 'FLUX.2-pro', prompt, n: 1, guidance_scale: 7.5, num_inference_steps: 50 } },

  // Minimal
  { name: 'Just prompt', body: { model: 'FLUX.2-pro', prompt } },

  // With quality/style (DALL-E 3 style)
  { name: 'With quality', body: { model: 'FLUX.2-pro', prompt, n: 1, quality: 'standard' } },
];

async function testParams(v: typeof paramVariations[0]) {
  console.log(`\n📍 ${v.name}`);
  console.log('   Body:', JSON.stringify(v.body));

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(v.body),
    });

    const modelError = response.headers.get('ms-azureml-model-error-reason');
    const text = await response.text();

    console.log(`   Status: ${response.status}, Model Error: ${modelError}`);

    if (response.ok) {
      console.log('   ✅ SUCCESS!');
      const data = JSON.parse(text);
      if (data.data?.[0]?.b64_json) {
        fs.writeFileSync('./Generated_Headshot.png', Buffer.from(data.data[0].b64_json, 'base64'));
        console.log('   📁 Saved!');
      }
      return true;
    } else {
      // Show first 80 chars of response
      console.log(`   Response: ${text.slice(0, 80)}`);
    }
  } catch (error: any) {
    console.log(`   Error: ${error.message}`);
  }
  return false;
}

async function main() {
  console.log('Testing FLUX.2 with different parameter formats...');
  console.log('URL:', url);

  for (const v of paramVariations) {
    const success = await testParams(v);
    if (success) {
      console.log('\n🎉 Found working configuration!');
      break;
    }
    await new Promise(r => setTimeout(r, 1500));
  }
}

main();
