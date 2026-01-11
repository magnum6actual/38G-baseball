/**
 * Test FLUX.2 using the cognitiveservices endpoint with Azure OpenAI format
 * This endpoint showed 429 rate limit (indicating correct routing) instead of 404 model_error
 */

import 'dotenv/config';
import fs from 'fs';

const apiKey = process.env.AZURE_AI_API_KEY!;

async function main() {
  const url = 'https://kinetiqs-foundry.cognitiveservices.azure.com/openai/deployments/FLUX.2-pro/images/generations?api-version=2024-02-01';
  const prompt = 'A professional military portrait photo of a person in US Army uniform, grey studio backdrop, soft professional lighting, photorealistic';

  console.log('Testing FLUX.2 via cognitiveservices endpoint...');
  console.log('URL:', url);
  console.log('Prompt:', prompt.slice(0, 50) + '...');
  console.log();

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        prompt,
        n: 1,
        size: '1024x1024',
      }),
    });

    console.log('Status:', response.status);

    // Log key headers
    const modelError = response.headers.get('ms-azureml-model-error-reason');
    const rateLimit = response.headers.get('x-ratelimit-remaining-requests');
    console.log('Model Error Header:', modelError);
    console.log('Rate Limit Remaining:', rateLimit);

    const text = await response.text();

    if (response.ok) {
      console.log('\n✅ SUCCESS!');
      const data = JSON.parse(text);
      console.log('Response structure:', Object.keys(data));

      // Try to extract and save image
      const imageData = data.data?.[0];
      if (imageData?.b64_json) {
        const imageBytes = Buffer.from(imageData.b64_json, 'base64');
        fs.writeFileSync('./Generated_Headshot.png', imageBytes);
        console.log('\n📁 Saved to: Generated_Headshot.png');
      } else if (imageData?.url) {
        console.log('Image URL:', imageData.url);
        const imgResponse = await fetch(imageData.url);
        const imgBuffer = await imgResponse.arrayBuffer();
        fs.writeFileSync('./Generated_Headshot.png', Buffer.from(imgBuffer));
        console.log('\n📁 Saved to: Generated_Headshot.png');
      } else {
        console.log('Response data:', JSON.stringify(data, null, 2).slice(0, 500));
      }
    } else {
      console.log('\n❌ Error response:');
      console.log(text);
    }
  } catch (error: any) {
    console.log('❌ Fetch error:', error.message);
  }
}

main();
