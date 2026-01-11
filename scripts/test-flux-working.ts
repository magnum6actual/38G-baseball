/**
 * Test FLUX.2 with parameters that showed 429 (rate limit) - indicating correct routing
 */

import 'dotenv/config';
import fs from 'fs';

const apiKey = process.env.AZURE_AI_API_KEY!;
const baseUrl = 'https://kinetiqs-foundry.openai.azure.com/openai/v1/images/generations';

async function main() {
  console.log('Testing FLUX.2 with working parameter combination...');
  console.log('URL:', baseUrl);
  console.log();

  const body = {
    prompt: 'A professional military portrait photo of a person in US Army uniform, grey studio backdrop, soft professional lighting, photorealistic',
    model: 'FLUX.2-pro',
    n: 1,
    size: '1024x1024',
  };

  console.log('Request body:', JSON.stringify(body, null, 2));
  console.log();

  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    console.log('Status:', response.status);
    console.log('Headers:');
    console.log('  Model Error:', response.headers.get('ms-azureml-model-error-reason'));
    console.log('  Rate Limit:', response.headers.get('x-ratelimit-remaining-requests'));
    console.log('  Region:', response.headers.get('x-ms-region'));

    const text = await response.text();

    if (response.ok) {
      console.log('\n✅ SUCCESS!');
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
      } else {
        console.log('Full response:', JSON.stringify(data, null, 2));
      }
    } else {
      console.log('\n❌ Error response:', text);
    }
  } catch (error: any) {
    console.log('\n❌ Fetch error:', error.message);
  }
}

main();
