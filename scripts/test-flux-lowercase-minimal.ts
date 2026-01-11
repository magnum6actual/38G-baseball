/**
 * Test FLUX.2 with lowercase model name and minimal params
 * Based on the example and earlier findings that certain param combos hit rate limit
 */

import 'dotenv/config';
import fs from 'fs';

const apiKey = process.env.AZURE_AI_API_KEY!;

const tests = [
  // The endpoint that showed 429 earlier with minimal params
  {
    name: 'services.ai - minimal with lowercase',
    url: 'https://kinetiqs-foundry.services.ai.azure.com/openai/v1/images/generations',
    body: { model: 'flux.2-pro', prompt: 'simple blue circle' },
  },
  {
    name: 'services.ai - just uppercase model',
    url: 'https://kinetiqs-foundry.services.ai.azure.com/openai/v1/images/generations',
    body: { model: 'FLUX.2-pro', prompt: 'simple blue circle' },
  },
  // Provider path with lowercase
  {
    name: 'provider path lowercase',
    url: 'https://kinetiqs-foundry.openai.azure.com/openai/v1/providers/blackforestlabs/v1/flux-2-pro?api-version=preview',
    body: { model: 'flux.2-pro', prompt: 'simple blue circle', size: '1024x1024', n: 1 },
  },
  // Try without model in body (model in path)
  {
    name: 'provider path - no model in body',
    url: 'https://kinetiqs-foundry.openai.azure.com/openai/v1/providers/blackforestlabs/v1/flux-2-pro?api-version=preview',
    body: { prompt: 'simple blue circle', size: '1024x1024', n: 1 },
  },
];

async function testConfig(t: typeof tests[0]) {
  console.log(`\n📍 ${t.name}`);
  console.log(`   URL: ${t.url}`);
  console.log(`   Body: ${JSON.stringify(t.body)}`);

  try {
    const response = await fetch(t.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(t.body),
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
        console.log('   📁 Saved to: Generated_Headshot.png');
      } else {
        console.log('   Response:', JSON.stringify(data, null, 2).slice(0, 300));
      }
      return true;
    } else if (response.status === 429) {
      console.log('   ⏳ Rate limited - model IS reachable');
      console.log(`   ${text.slice(0, 100)}`);
    } else {
      console.log(`   Response: ${text.slice(0, 100)}`);
    }
  } catch (error: any) {
    console.log(`   Error: ${error.message}`);
  }
  return false;
}

async function main() {
  console.log('Testing with lowercase model and minimal params...');

  for (const t of tests) {
    const success = await testConfig(t);
    if (success) break;
    await new Promise(r => setTimeout(r, 1000));
  }
}

main();
