/**
 * Test FLUX.2 with different authentication methods
 */

import 'dotenv/config';
import fs from 'fs';

const apiKey = process.env.AZURE_AI_API_KEY!;

const tests = [
  {
    name: 'Bearer token',
    url: 'https://kinetiqs-foundry.openai.azure.com/openai/v1/images/generations',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
  },
  {
    name: 'api-key header',
    url: 'https://kinetiqs-foundry.openai.azure.com/openai/v1/images/generations',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
  },
  {
    name: 'Bearer with api-version param',
    url: 'https://kinetiqs-foundry.openai.azure.com/openai/v1/images/generations?api-version=2024-02-01',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
  },
  {
    name: 'api-key with api-version param',
    url: 'https://kinetiqs-foundry.openai.azure.com/openai/v1/images/generations?api-version=2024-02-01',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
  },
  {
    name: 'Both auth methods',
    url: 'https://kinetiqs-foundry.openai.azure.com/openai/v1/images/generations',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'api-key': apiKey,
    },
  },
];

async function testAuth(t: typeof tests[0]) {
  console.log(`\nTesting: ${t.name}`);
  console.log('URL:', t.url);

  const body = {
    prompt: 'A simple blue circle',
    model: 'FLUX.2-pro',
    n: 1,
    size: '1024x1024',
  };

  try {
    const response = await fetch(t.url, {
      method: 'POST',
      headers: t.headers,
      body: JSON.stringify(body),
    });

    const modelError = response.headers.get('ms-azureml-model-error-reason');
    const rateLimit = response.headers.get('x-ratelimit-remaining-requests');
    const text = await response.text();

    console.log(`Status: ${response.status}, Model Error: ${modelError}, Rate Limit: ${rateLimit}`);

    if (response.ok) {
      console.log('✅ SUCCESS!');
      const data = JSON.parse(text);
      if (data.data?.[0]?.b64_json) {
        fs.writeFileSync('./Generated_Headshot.png', Buffer.from(data.data[0].b64_json, 'base64'));
        console.log('📁 Saved to: Generated_Headshot.png');
      }
      return true;
    } else {
      console.log('Response:', text.slice(0, 100));
    }
  } catch (error: any) {
    console.log('Error:', error.message);
  }
  return false;
}

async function main() {
  console.log('Testing FLUX.2 with different authentication methods...');

  for (const t of tests) {
    const success = await testAuth(t);
    if (success) break;
    await new Promise(r => setTimeout(r, 1000));
  }
}

main();
