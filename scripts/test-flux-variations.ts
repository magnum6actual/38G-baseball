/**
 * Test FLUX.2 with various endpoint/model combinations
 */

import 'dotenv/config';
import OpenAI from 'openai';

const apiKey = process.env.AZURE_AI_API_KEY!;
const prompt = 'A simple blue circle on white background';

const variations = [
  { endpoint: 'https://kinetiqs-foundry.openai.azure.com/openai/v1/', model: 'FLUX.2-pro', name: 'Original (with slash, uppercase)' },
  { endpoint: 'https://kinetiqs-foundry.openai.azure.com/openai/v1', model: 'FLUX.2-pro', name: 'No trailing slash, uppercase' },
  { endpoint: 'https://kinetiqs-foundry.openai.azure.com/openai/v1/', model: 'flux.2-pro', name: 'With slash, lowercase' },
  { endpoint: 'https://kinetiqs-foundry.openai.azure.com/openai/v1', model: 'flux.2-pro', name: 'No slash, lowercase' },
  { endpoint: 'https://kinetiqs-foundry.openai.azure.com/openai/v1/', model: 'Flux.2-pro', name: 'With slash, mixed case' },
];

async function testVariation(v: typeof variations[0]) {
  console.log(`\nTesting: ${v.name}`);
  console.log(`  Endpoint: ${v.endpoint}`);
  console.log(`  Model: ${v.model}`);

  const client = new OpenAI({
    baseURL: v.endpoint,
    apiKey: apiKey,
  });

  try {
    const result = await client.images.generate({
      model: v.model,
      prompt,
      n: 1,
    });
    console.log(`  ✅ SUCCESS!`);
    return true;
  } catch (error: any) {
    const status = error?.status || 'unknown';
    const headers = error?.headers;
    const rateLimit = headers?.get?.('x-ratelimit-remaining-requests');
    const modelError = headers?.get?.('ms-azureml-model-error-reason');
    console.log(`  ❌ ${status} - Model Error: ${modelError}, Rate Limit Remaining: ${rateLimit}`);
    return false;
  }
}

async function main() {
  console.log('Testing FLUX.2 endpoint/model variations...\n');

  for (const v of variations) {
    await testVariation(v);
    // Small delay to avoid rapid rate limiting
    await new Promise(r => setTimeout(r, 1000));
  }
}

main();
