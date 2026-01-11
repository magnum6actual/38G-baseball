/**
 * Test FLUX.2 using provider path format
 * /openai/v1/providers/blackforestlabs/v1/flux-2-pro
 */

import 'dotenv/config';
import fs from 'fs';

const apiKey = process.env.AZURE_AI_API_KEY!;
const url = 'https://kinetiqs-foundry.openai.azure.com/openai/v1/providers/blackforestlabs/v1/flux-2-pro?api-version=preview';

async function main() {
  console.log('Testing FLUX.2 with provider path...');
  console.log('URL:', url);
  console.log();

  const body = {
    prompt: 'A professional military portrait photo, grey studio backdrop, soft lighting',
    size: '1024x1024',
    n: 1,
    model: 'FLUX.2-pro',
  };

  console.log('Body:', JSON.stringify(body, null, 2));
  console.log();

  try {
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

    // Show headers
    const modelError = response.headers.get('ms-azureml-model-error-reason');
    const rateLimit = response.headers.get('x-ratelimit-remaining-requests');
    if (modelError) console.log('Model Error:', modelError);
    if (rateLimit) console.log('Rate Limit:', rateLimit);
    console.log();

    const text = await response.text();

    if (response.ok) {
      console.log('✅ SUCCESS!');
      const data = JSON.parse(text);
      console.log('Response keys:', Object.keys(data));

      if (data.data?.[0]?.b64_json) {
        const imageBytes = Buffer.from(data.data[0].b64_json, 'base64');
        fs.writeFileSync('./Generated_Headshot.png', imageBytes);
        console.log('\n📁 Saved to: Generated_Headshot.png');
        console.log('Size:', imageBytes.length, 'bytes');
      } else if (data.data?.[0]?.url) {
        console.log('Image URL:', data.data[0].url);
        const imgResp = await fetch(data.data[0].url);
        const imgBuf = await imgResp.arrayBuffer();
        fs.writeFileSync('./Generated_Headshot.png', Buffer.from(imgBuf));
        console.log('\n📁 Saved to: Generated_Headshot.png');
      } else {
        console.log('Full response:', JSON.stringify(data, null, 2));
      }
    } else {
      console.log('❌ Error:', text);
    }
  } catch (error: any) {
    console.log('❌ Fetch error:', error.message);
  }
}

main();
