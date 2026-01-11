/**
 * Test FLUX.2-pro deployment
 */

import 'dotenv/config';

async function testEndpoint(endpoint: string, deployment: string, apiKey: string) {
  console.log(`\nTesting: ${endpoint}`);
  console.log(`Deployment: ${deployment}`);

  const patterns = [
    `/openai/deployments/${deployment}/images/generations?api-version=2024-02-01`,
    `/models/${deployment}/images/generations`,
    `/deployments/${deployment}/images/generations`,
    `/images/generations?deployment=${deployment}`,
  ];

  for (const path of patterns) {
    const url = endpoint + path;
    console.log(`\n  [POST] ${path}`);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: 'A simple test image of a red circle',
          n: 1,
          size: '512x512',
        }),
      });

      const text = await res.text();
      console.log(`    Status: ${res.status}`);

      if (res.status === 200) {
        console.log('    ✅ SUCCESS!');
        return { success: true, path, endpoint };
      } else {
        console.log(`    ${text.slice(0, 150)}`);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`    Error: ${msg}`);
    }
  }

  return { success: false };
}

async function main() {
  const apiKey = process.env.AZURE_AI_API_KEY!;
  const deployment = 'FLUX.2-pro';

  // Try both endpoint styles
  const endpoints = [
    process.env.AZURE_AI_ENDPOINT!,
    'https://kinetiqs-foundry.services.ai.azure.com',  // AI Foundry style
  ];

  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint, deployment, apiKey);
    if (result.success) {
      console.log('\n=== Found working configuration ===');
      console.log(`Endpoint: ${result.endpoint}`);
      console.log(`Path: ${result.path}`);
      return;
    }
  }

  console.log('\n❌ Could not find working FLUX.2 endpoint');
  console.log('Check Azure AI Foundry for the correct endpoint URL');
}

main();
