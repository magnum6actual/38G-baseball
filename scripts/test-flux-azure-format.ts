/**
 * Test FLUX.2 using Azure OpenAI deployment format
 * Tries the /openai/deployments/{deployment}/images/generations pattern
 */

import 'dotenv/config';

const apiKey = process.env.AZURE_AI_API_KEY!;
const prompt = 'A simple blue circle on white background';

const endpoints = [
  // Standard Azure OpenAI deployment format
  'https://kinetiqs-foundry.openai.azure.com/openai/deployments/FLUX.2-pro/images/generations?api-version=2024-02-01',
  'https://kinetiqs-foundry.openai.azure.com/openai/deployments/flux.2-pro/images/generations?api-version=2024-02-01',
  // With different api-version
  'https://kinetiqs-foundry.openai.azure.com/openai/deployments/FLUX.2-pro/images/generations?api-version=2024-10-01-preview',
  // Direct images endpoint with api-version
  'https://kinetiqs-foundry.openai.azure.com/openai/images/generations?api-version=2024-02-01',
  // Try cognitiveservices endpoint
  'https://kinetiqs-foundry.cognitiveservices.azure.com/openai/deployments/FLUX.2-pro/images/generations?api-version=2024-02-01',
];

async function testEndpoint(url: string) {
  console.log(`\nTesting: ${url}`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'api-key': apiKey,  // Also include Azure-style header
      },
      body: JSON.stringify({
        prompt,
        n: 1,
        size: '1024x1024',
      }),
    });

    const text = await response.text();
    console.log(`  Status: ${response.status}`);
    console.log(`  Model Error: ${response.headers.get('ms-azureml-model-error-reason')}`);
    console.log(`  Rate Limit: ${response.headers.get('x-ratelimit-remaining-requests')}`);

    if (response.ok) {
      console.log(`  ✅ SUCCESS!`);
      console.log(`  Response: ${text.slice(0, 200)}...`);
    } else {
      console.log(`  Response: ${text.slice(0, 100)}`);
    }
  } catch (error: any) {
    console.log(`  ❌ Fetch error: ${error.message}`);
  }
}

async function main() {
  console.log('Testing various Azure FLUX.2 endpoint formats...');

  for (const url of endpoints) {
    await testEndpoint(url);
    await new Promise(r => setTimeout(r, 500));
  }
}

main();
