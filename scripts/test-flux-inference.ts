/**
 * Test FLUX.2 with various Azure AI Inference path formats
 */

import 'dotenv/config';
import fs from 'fs';

const apiKey = process.env.AZURE_AI_API_KEY!;
const prompt = 'A simple blue circle on white background';

// Different path variations for Azure AI Inference
const endpoints = [
  // Model name in path (serverless pattern)
  'https://kinetiqs-foundry.services.ai.azure.com/v1/images/generations',
  'https://kinetiqs-foundry.services.ai.azure.com/images/generations',
  'https://kinetiqs-foundry.services.ai.azure.com/models/FLUX.2-pro/images/generations',
  'https://kinetiqs-foundry.services.ai.azure.com/deployments/FLUX.2-pro/images/generations',
  // Try lowercase model
  'https://kinetiqs-foundry.services.ai.azure.com/models/flux.2-pro/images/generations',
  // Direct inference format
  'https://kinetiqs-foundry.services.ai.azure.com/inference/images/generations',
];

async function testEndpoint(url: string) {
  console.log(`\n📍 Testing: ${url}`);

  const body = {
    model: 'FLUX.2-pro',
    prompt,
    size: '1024x1024',
    n: 1,
  };

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
        console.log('   📁 Saved to: Generated_Headshot.png');
      }
      return true;
    } else {
      console.log(`   Response: ${text.slice(0, 100)}`);
    }
  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}`);
  }
  return false;
}

async function main() {
  console.log('Testing Azure AI Inference endpoint variations...');

  for (const url of endpoints) {
    const success = await testEndpoint(url);
    if (success) {
      console.log('\n🎉 Found working endpoint!');
      break;
    }
    await new Promise(r => setTimeout(r, 500));
  }
}

main();
