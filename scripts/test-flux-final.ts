/**
 * Test FLUX.2-pro with various API versions and formats
 */

import 'dotenv/config';

async function main() {
  const endpoint = 'https://kinetiqs-foundry.cognitiveservices.azure.com';
  const apiKey = process.env.AZURE_AI_API_KEY!;
  const deployment = 'FLUX.2-pro';

  console.log('Testing FLUX.2-pro deployment...\n');

  // Try different API versions
  const apiVersions = [
    '2024-02-01',
    '2024-05-01-preview',
    '2024-06-01',
    '2024-08-01-preview',
    '2024-10-01-preview',
    '2025-01-01-preview',
  ];

  for (const apiVersion of apiVersions) {
    const url = `${endpoint}/openai/deployments/${deployment}/images/generations?api-version=${apiVersion}`;
    console.log(`API Version: ${apiVersion}`);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: 'A red circle on white background',
          n: 1,
          size: '1024x1024',
        }),
      });

      const text = await res.text();
      console.log(`  Status: ${res.status}`);

      if (res.status === 200) {
        console.log('  ✅ SUCCESS!');
        const data = JSON.parse(text);
        console.log('  Response keys:', Object.keys(data));
        return;
      } else if (res.status === 400) {
        // 400 might mean wrong parameters but endpoint exists
        console.log(`  Endpoint exists but: ${text.slice(0, 100)}`);
      } else {
        console.log(`  ${text.slice(0, 80)}`);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`  Error: ${msg}`);
    }
    console.log();
  }

  // Also try without /openai prefix (some models use this)
  console.log('\nTrying without /openai prefix...');
  const altUrl = `${endpoint}/deployments/${deployment}/images/generations?api-version=2024-02-01`;
  try {
    const res = await fetch(altUrl, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: 'A red circle',
        n: 1,
      }),
    });
    console.log(`Status: ${res.status}`);
    const text = await res.text();
    console.log(text.slice(0, 150));
  } catch (e) {
    console.log('Error:', e);
  }
}

main();
