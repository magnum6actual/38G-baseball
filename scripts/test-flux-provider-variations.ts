/**
 * Test FLUX.2 with provider path variations
 */

import 'dotenv/config';
import fs from 'fs';

const apiKey = process.env.AZURE_AI_API_KEY!;
const body = {
  prompt: 'A simple blue circle',
  size: '1024x1024',
  n: 1,
  model: 'FLUX.2-pro',
};

const urls = [
  // Different model name formats in path
  'https://kinetiqs-foundry.openai.azure.com/openai/v1/providers/blackforestlabs/v1/flux-2-pro?api-version=preview',
  'https://kinetiqs-foundry.openai.azure.com/openai/v1/providers/blackforestlabs/v1/FLUX.2-pro?api-version=preview',
  'https://kinetiqs-foundry.openai.azure.com/openai/v1/providers/blackforestlabs/v1/FLUX-2-pro?api-version=preview',
  // Without api-version
  'https://kinetiqs-foundry.openai.azure.com/openai/v1/providers/blackforestlabs/v1/flux-2-pro',
  // Different versions
  'https://kinetiqs-foundry.openai.azure.com/openai/v1/providers/blackforestlabs/v1/flux-2-pro?api-version=2024-02-01',
  // Try on services endpoint
  'https://kinetiqs-foundry.services.ai.azure.com/openai/v1/providers/blackforestlabs/v1/flux-2-pro?api-version=preview',
];

async function testUrl(url: string) {
  console.log(`\n📍 ${url}`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const modelError = response.headers.get('ms-azureml-model-error-reason');
    const rateLimit = response.headers.get('x-ratelimit-remaining-requests');
    const text = await response.text();

    console.log(`   Status: ${response.status}`);
    if (modelError) console.log(`   Model Error: ${modelError}`);
    if (rateLimit) console.log(`   Rate Limit: ${rateLimit}`);

    if (response.ok) {
      console.log('   ✅ SUCCESS!');
      const data = JSON.parse(text);
      if (data.data?.[0]?.b64_json) {
        fs.writeFileSync('./Generated_Headshot.png', Buffer.from(data.data[0].b64_json, 'base64'));
        console.log('   📁 Saved!');
      }
      return true;
    } else {
      console.log(`   Response: ${text.slice(0, 80)}`);
    }
  } catch (error: any) {
    console.log(`   Error: ${error.message}`);
  }
  return false;
}

async function main() {
  console.log('Testing provider path variations...');

  for (const url of urls) {
    const success = await testUrl(url);
    if (success) break;
    await new Promise(r => setTimeout(r, 500));
  }
}

main();
