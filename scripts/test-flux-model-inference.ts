/**
 * Test FLUX.2 using Azure AI Model Inference API format
 * This is different from Azure OpenAI - uses /models endpoint
 */

import 'dotenv/config';
import fs from 'fs';

const apiKey = process.env.AZURE_AI_API_KEY!;
const prompt = 'A simple blue circle on white background';

const endpoints = [
  // Model Inference API format
  { url: 'https://kinetiqs-foundry.services.ai.azure.com/models/FLUX.2-pro/images/generations', name: 'services.ai - models' },
  { url: 'https://kinetiqs-foundry.services.ai.azure.com/images/generations', name: 'services.ai - direct' },

  // AI Foundry with model in path
  { url: 'https://FLUX-2-pro.kinetiqs-foundry.models.ai.azure.com/images/generations', name: 'models.ai - subdomain' },

  // Try both authentication styles
  { url: 'https://kinetiqs-foundry.cognitiveservices.azure.com/models/FLUX.2-pro/images/generations', name: 'cognitiveservices - models' },
];

async function testEndpoint(e: typeof endpoints[0]) {
  console.log(`\nTesting: ${e.name}`);
  console.log(`URL: ${e.url}`);

  try {
    // Try with Bearer token
    let response = await fetch(e.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        prompt,
        n: 1,
        size: '1024x1024',
      }),
    });

    let text = await response.text();
    console.log(`  Bearer Auth - Status: ${response.status}`);

    if (response.ok) {
      console.log(`  ✅ SUCCESS with Bearer!`);
      const data = JSON.parse(text);
      if (data.data?.[0]?.b64_json) {
        fs.writeFileSync('./Generated_Headshot.png', Buffer.from(data.data[0].b64_json, 'base64'));
        console.log('  📁 Saved to: Generated_Headshot.png');
      }
      return;
    }

    // Try with api-key header
    response = await fetch(e.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        prompt,
        n: 1,
        size: '1024x1024',
      }),
    });

    text = await response.text();
    console.log(`  api-key Auth - Status: ${response.status}`);

    if (response.ok) {
      console.log(`  ✅ SUCCESS with api-key!`);
      const data = JSON.parse(text);
      if (data.data?.[0]?.b64_json) {
        fs.writeFileSync('./Generated_Headshot.png', Buffer.from(data.data[0].b64_json, 'base64'));
        console.log('  📁 Saved to: Generated_Headshot.png');
      }
    } else {
      console.log(`  Response: ${text.slice(0, 150)}`);
    }
  } catch (error: any) {
    console.log(`  ❌ Error: ${error.message}`);
  }
}

async function main() {
  console.log('Testing Azure AI Model Inference API endpoints...');

  for (const e of endpoints) {
    await testEndpoint(e);
    await new Promise(r => setTimeout(r, 500));
  }
}

main();
