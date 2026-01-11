/**
 * Test FLUX.2 headshot generation with proper military portrait prompt
 */

import 'dotenv/config';
import fs from 'fs';

const apiKey = process.env.AZURE_AI_API_KEY!;
const fluxEndpoint = process.env.AZURE_FLUX_ENDPOINT || 'https://kinetiqs-foundry.services.ai.azure.com';

async function main() {
  console.log('Testing FLUX.2 military headshot generation...');
  console.log('Endpoint:', fluxEndpoint);
  console.log();

  const url = `${fluxEndpoint}/providers/blackforestlabs/v1/flux-2-pro?api-version=2025-04-01-preview`;

  const prompt = `A professional military portrait photo of a person in US Army OCP camouflage uniform.
Grey studio backdrop with soft professional lighting.
The subject should have a confident, professional expression.
Photorealistic, high quality portrait photography style.
2:3 aspect ratio, suitable for official military documentation.`;

  console.log('Prompt:', prompt.slice(0, 100) + '...');
  console.log();

  const body = {
    model: 'flux.2-pro',
    prompt,
    n: 1,
    size: '1024x1024',
  };

  try {
    console.log('Calling FLUX.2 API...');
    const startTime = Date.now();

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const elapsed = Date.now() - startTime;
    console.log('Status:', response.status);
    console.log('Time:', elapsed, 'ms');
    console.log();

    if (response.ok) {
      console.log('✅ SUCCESS!');
      const data = await response.json();

      const b64 = data.data?.[0]?.b64_json;
      if (b64) {
        const imageBytes = Buffer.from(b64, 'base64');
        fs.writeFileSync('./Generated_Military_Headshot.png', imageBytes);
        console.log('\n📁 Saved to: Generated_Military_Headshot.png');
        console.log('Image size:', imageBytes.length, 'bytes');
      } else {
        console.log('Response:', JSON.stringify(data, null, 2).slice(0, 500));
      }
    } else {
      const text = await response.text();
      console.log('❌ Error:', text);
    }
  } catch (error: any) {
    console.log('❌ Error:', error.message);
  }
}

main();
