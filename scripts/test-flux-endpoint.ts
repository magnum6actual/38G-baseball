/**
 * Explore Azure AI endpoint to find correct FLUX.2 API path
 */

import 'dotenv/config';

async function main() {
  const endpoint = process.env.AZURE_AI_ENDPOINT;
  const apiKey = process.env.AZURE_AI_API_KEY;
  const deployment = process.env.AZURE_FLUX_DEPLOYMENT || 'flux-2-pro';

  console.log('Azure AI Configuration:');
  console.log('  Endpoint:', endpoint);
  console.log('  Deployment:', deployment);
  console.log();

  if (!endpoint || !apiKey) {
    console.log('❌ Missing AZURE_AI_ENDPOINT or AZURE_AI_API_KEY');
    return;
  }

  // Try different endpoint patterns
  const patterns = [
    { path: '/images/generations', method: 'POST' },
    { path: `/openai/deployments/${deployment}/images/generations?api-version=2024-02-01`, method: 'POST' },
    { path: `/models/${deployment}/images/generations`, method: 'POST' },
    { path: '/models', method: 'GET' },
    { path: '/openai/models?api-version=2024-02-01', method: 'GET' },
  ];

  for (const { path, method } of patterns) {
    const url = endpoint + path;
    console.log(`Testing [${method}]: ${url}`);

    try {
      const options: RequestInit = {
        method,
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
        },
      };

      if (method === 'POST') {
        options.body = JSON.stringify({ prompt: 'test', n: 1, size: '512x512' });
      }

      const res = await fetch(url, options);
      const text = await res.text().catch(() => '');
      console.log(`  Status: ${res.status}`);
      console.log(`  Response: ${text.slice(0, 200)}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`  Error: ${msg}`);
    }
    console.log();
  }
}

main();
