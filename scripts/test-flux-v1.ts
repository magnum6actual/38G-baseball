/**
 * Test FLUX.2 using the correct /v1/ endpoint (NOT /openai/v1/)
 * Per Gemini's analysis: FLUX is not an OpenAI model, uses Azure AI Inference protocol
 */

import 'dotenv/config';
import fs from 'fs';

const apiKey = process.env.AZURE_AI_API_KEY!;
const url = 'https://kinetiqs-foundry.services.ai.azure.com/v1/images/generations';

async function main() {
  console.log('Testing FLUX.2 on /v1/ endpoint (Azure AI Inference protocol)...');
  console.log('URL:', url);
  console.log('API Key present:', !!apiKey);
  console.log();

  const body = {
    model: 'FLUX.2-pro',
    prompt: 'A professional military portrait photo of a person in US Army uniform, grey studio backdrop, soft professional lighting, photorealistic',
    size: '1024x1024',
    n: 1,
  };

  console.log('Request body:', JSON.stringify(body, null, 2));
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

    // Log key headers
    const modelError = response.headers.get('ms-azureml-model-error-reason');
    const rateLimit = response.headers.get('x-ratelimit-remaining-requests');
    if (modelError) console.log('Model Error:', modelError);
    if (rateLimit) console.log('Rate Limit Remaining:', rateLimit);
    console.log();

    const text = await response.text();

    if (response.ok) {
      console.log('✅ SUCCESS!');
      const data = JSON.parse(text);
      console.log('Response keys:', Object.keys(data));

      // Handle different response formats
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
      } else if (data.images?.[0]) {
        // Azure AI Inference format
        const img = data.images[0];
        if (img.b64_json || img.base64) {
          const imageBytes = Buffer.from(img.b64_json || img.base64, 'base64');
          fs.writeFileSync('./Generated_Headshot.png', imageBytes);
          console.log('\n📁 Saved to: Generated_Headshot.png');
        } else if (img.url) {
          console.log('Image URL:', img.url);
        }
      } else {
        console.log('Full response:', JSON.stringify(data, null, 2).slice(0, 500));
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
