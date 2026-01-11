/**
 * Final raw fetch test to the endpoint that showed rate limiting
 */

import 'dotenv/config';
import fs from 'fs';

const apiKey = process.env.AZURE_AI_API_KEY!;
const url = 'https://kinetiqs-foundry.services.ai.azure.com/openai/v1/images/generations';

async function main() {
  console.log('Final FLUX.2 test...');
  console.log('URL:', url);
  console.log('Time:', new Date().toISOString());
  console.log();

  const body = {
    model: 'FLUX.2-pro',
    prompt: 'A professional military portrait photo, grey studio backdrop, soft lighting',
    size: '1024x1024',
    n: 1,
  };

  console.log('Request:', JSON.stringify(body, null, 2));
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
    console.log('Time elapsed:', elapsed, 'ms');
    console.log();

    // Show all response headers
    console.log('Response headers:');
    for (const [key, value] of response.headers.entries()) {
      console.log(`  ${key}: ${value}`);
    }
    console.log();

    const text = await response.text();

    if (response.ok) {
      console.log('✅ SUCCESS!');
      const data = JSON.parse(text);
      console.log('Keys:', Object.keys(data));

      // Try various response formats
      const b64 = data.data?.[0]?.b64_json || data.images?.[0]?.b64_json || data.images?.[0]?.base64;
      const imgUrl = data.data?.[0]?.url || data.images?.[0]?.url;

      if (b64) {
        fs.writeFileSync('./Generated_Headshot.png', Buffer.from(b64, 'base64'));
        console.log('📁 Saved to: Generated_Headshot.png');
      } else if (imgUrl) {
        console.log('Fetching from URL:', imgUrl);
        const imgResp = await fetch(imgUrl);
        const imgBuf = await imgResp.arrayBuffer();
        fs.writeFileSync('./Generated_Headshot.png', Buffer.from(imgBuf));
        console.log('📁 Saved to: Generated_Headshot.png');
      } else {
        console.log('Full response:', JSON.stringify(data, null, 2));
      }
    } else if (response.status === 429) {
      console.log('⏳ Rate limited - model IS reachable, just throttled');
      console.log('Response:', text);
    } else {
      console.log('❌ Error:', text);
    }
  } catch (error: any) {
    console.log('❌ Fetch error:', error.message);
  }
}

main();
