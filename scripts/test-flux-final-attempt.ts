/**
 * Test FLUX.2 on the confirmed working endpoint
 * https://kinetiqs-foundry.services.ai.azure.com/openai/v1/images/generations
 */

import 'dotenv/config';
import fs from 'fs';

const apiKey = process.env.AZURE_AI_API_KEY!;
const url = 'https://kinetiqs-foundry.services.ai.azure.com/openai/v1/images/generations';

async function main() {
  console.log('Testing FLUX.2 on services.ai.azure.com endpoint...');
  console.log('URL:', url);
  console.log();

  const prompt = 'A professional military portrait photo of a person in US Army uniform, grey studio backdrop, soft professional lighting, photorealistic';

  const body = {
    prompt,
    model: 'FLUX.2-pro',
    n: 1,
    size: '1024x1024',
  };

  console.log('Request body:');
  console.log(JSON.stringify(body, null, 2));
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
    console.log();

    // Log all headers for debugging
    console.log('Response headers:');
    for (const [key, value] of response.headers.entries()) {
      console.log(`  ${key}: ${value}`);
    }
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
        console.log('Image size:', imageBytes.length, 'bytes');
      } else if (data.data?.[0]?.url) {
        console.log('Image URL:', data.data[0].url);
        const imgResponse = await fetch(data.data[0].url);
        const imgBuffer = await imgResponse.arrayBuffer();
        fs.writeFileSync('./Generated_Headshot.png', Buffer.from(imgBuffer));
        console.log('\n📁 Saved to: Generated_Headshot.png');
        console.log('Image size:', imgBuffer.byteLength, 'bytes');
      } else {
        console.log('Full response:');
        console.log(JSON.stringify(data, null, 2));
      }
    } else {
      console.log('❌ Error response:');
      console.log(text);
    }
  } catch (error: any) {
    console.log('❌ Fetch error:', error.message);
  }
}

main();
