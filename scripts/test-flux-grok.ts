/**
 * Test FLUX.2 with Grok's suggestions:
 * 1. Providers path WITHOUT /openai/ prefix
 * 2. Newer api-version (2025-04-01-preview)
 * 3. output_format parameter
 * 4. Api-Key header (capital A)
 */

import 'dotenv/config';
import fs from 'fs';

const apiKey = process.env.AZURE_AI_API_KEY!;

const tests = [
  // Grok's recommended first try - providers path on services endpoint
  {
    name: '1. Providers path (no /openai/) - services endpoint',
    url: 'https://kinetiqs-foundry.services.ai.azure.com/providers/blackforestlabs/v1/flux-2-pro?api-version=2025-04-01-preview',
    body: { prompt: 'simple blue circle', n: 1, size: '1024x1024', output_format: 'url' },
    headers: { 'Authorization': `Bearer ${apiKey}` },
  },
  {
    name: '2. Same with output_format: png',
    url: 'https://kinetiqs-foundry.services.ai.azure.com/providers/blackforestlabs/v1/flux-2-pro?api-version=2025-04-01-preview',
    body: { prompt: 'simple blue circle', n: 1, size: '1024x1024', output_format: 'png' },
    headers: { 'Authorization': `Bearer ${apiKey}` },
  },
  {
    name: '3. With model in body',
    url: 'https://kinetiqs-foundry.services.ai.azure.com/providers/blackforestlabs/v1/flux-2-pro?api-version=2025-04-01-preview',
    body: { model: 'flux.2-pro', prompt: 'simple blue circle', n: 1, size: '1024x1024', output_format: 'url' },
    headers: { 'Authorization': `Bearer ${apiKey}` },
  },
  // Cognitive services with preview API version
  {
    name: '4. Cognitive services + preview API version',
    url: 'https://kinetiqs-foundry.cognitiveservices.azure.com/openai/deployments/FLUX.2-pro/images/generations?api-version=2025-04-01-preview',
    body: { prompt: 'simple blue circle', n: 1, size: '1024x1024', output_format: 'png' },
    headers: { 'Api-Key': apiKey },  // Capital A
  },
  {
    name: '5. Cognitive services + lowercase deployment',
    url: 'https://kinetiqs-foundry.cognitiveservices.azure.com/openai/deployments/flux.2-pro/images/generations?api-version=2025-04-01-preview',
    body: { prompt: 'simple blue circle', n: 1, size: '1024x1024' },
    headers: { 'Api-Key': apiKey },
  },
  // Services /v1/ path (no /openai/)
  {
    name: '6. Services /v1/ with azure_ai/ prefix',
    url: 'https://kinetiqs-foundry.services.ai.azure.com/v1/images/generations',
    body: { model: 'azure_ai/flux.2-pro', prompt: 'simple blue circle', n: 1, size: '1024x1024' },
    headers: { 'Authorization': `Bearer ${apiKey}` },
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
        ...t.headers,
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
      console.log('   Keys:', Object.keys(data));

      // Try to save image
      const b64 = data.data?.[0]?.b64_json || data.images?.[0]?.b64_json;
      const imgUrl = data.data?.[0]?.url || data.images?.[0]?.url;

      if (b64) {
        fs.writeFileSync('./Generated_Headshot.png', Buffer.from(b64, 'base64'));
        console.log('   📁 Saved to: Generated_Headshot.png');
      } else if (imgUrl) {
        console.log('   Image URL:', imgUrl);
        const imgResp = await fetch(imgUrl);
        const imgBuf = await imgResp.arrayBuffer();
        fs.writeFileSync('./Generated_Headshot.png', Buffer.from(imgBuf));
        console.log('   📁 Saved to: Generated_Headshot.png');
      } else {
        console.log('   Response:', JSON.stringify(data, null, 2).slice(0, 300));
      }
      return true;
    } else if (response.status === 429) {
      console.log('   ⏳ Rate limited - model reachable');
      console.log(`   ${text.slice(0, 100)}`);
    } else {
      console.log(`   Response: ${text.slice(0, 150)}`);
    }
  } catch (error: any) {
    console.log(`   Error: ${error.message}`);
  }
  return false;
}

async function main() {
  console.log('Testing FLUX.2 with Grok suggestions...');
  console.log('API Key present:', !!apiKey);

  for (const t of tests) {
    const success = await testConfig(t);
    if (success) {
      console.log('\n🎉 Found working configuration!');
      break;
    }
    await new Promise(r => setTimeout(r, 1000));
  }
}

main();
