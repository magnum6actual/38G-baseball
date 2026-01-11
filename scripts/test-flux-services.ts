/**
 * Test FLUX.2 using services.ai.azure.com endpoint
 * Similar to how Claude works on this tenant
 */

import 'dotenv/config';
import fs from 'fs';

const apiKey = process.env.AZURE_AI_API_KEY!;

const endpoints = [
  'https://kinetiqs-foundry.services.ai.azure.com/openai/v1/images/generations',
  'https://kinetiqs-foundry.services.ai.azure.com/images/generations',
  'https://kinetiqs-foundry.services.ai.azure.com/openai/deployments/FLUX.2-pro/images/generations',
  'https://kinetiqs-foundry.services.ai.azure.com/flux/images/generations',
];

async function testEndpoint(url: string) {
  console.log(`\nTesting: ${url}`);

  const body = {
    prompt: 'A simple blue circle on white background',
    model: 'FLUX.2-pro',
    n: 1,
    size: '1024x1024',
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

    const text = await response.text();
    console.log(`Status: ${response.status}`);

    if (response.ok) {
      console.log('✅ SUCCESS!');
      const data = JSON.parse(text);
      if (data.data?.[0]?.b64_json) {
        fs.writeFileSync('./Generated_Headshot.png', Buffer.from(data.data[0].b64_json, 'base64'));
        console.log('📁 Saved to: Generated_Headshot.png');
      }
      return true;
    } else {
      console.log('Response:', text.slice(0, 150));
    }
  } catch (error: any) {
    console.log('Error:', error.message);
  }
  return false;
}

async function main() {
  console.log('Testing FLUX.2 on services.ai.azure.com endpoint...');

  for (const url of endpoints) {
    const success = await testEndpoint(url);
    if (success) break;
    await new Promise(r => setTimeout(r, 500));
  }
}

main();
