/**
 * Test FLUX.2 using OpenAI SDK (matching example code exactly)
 */

import 'dotenv/config';
import OpenAI from 'openai';
import fs from 'fs';

async function main() {
  const endpoint = 'https://kinetiqs-foundry.openai.azure.com/openai/v1/';
  const deploymentName = 'FLUX.2-pro';
  const apiKey = process.env.AZURE_AI_API_KEY!;

  console.log('Configuration:');
  console.log('  Endpoint:', endpoint);
  console.log('  Deployment:', deploymentName);
  console.log();

  const openai = new OpenAI({
    baseURL: endpoint,
    apiKey: apiKey,
  });

  const prompt = 'A professional military portrait photo of a person in US Army uniform, grey studio backdrop, soft professional lighting, photorealistic';

  console.log('Calling FLUX.2 API via OpenAI SDK...');
  console.log('Prompt:', prompt.slice(0, 50) + '...');
  console.log();

  try {
    const result = await openai.images.generate({
      model: deploymentName,
      prompt,
      n: 1,
    });

    console.log('✅ Success!');
    console.log('Response:', JSON.stringify(result, null, 2).slice(0, 500));

    // Save the image
    const b64 = result.data[0].b64_json;
    if (b64) {
      const imageBytes = Buffer.from(b64, 'base64');
      fs.writeFileSync('./Generated_Headshot.png', imageBytes);
      console.log('\n📁 Saved to: Generated_Headshot.png');
    } else if (result.data[0].url) {
      console.log('Image URL:', result.data[0].url);
      // Fetch and save
      const imageResponse = await fetch(result.data[0].url);
      const imageBuffer = await imageResponse.arrayBuffer();
      fs.writeFileSync('./Generated_Headshot.png', Buffer.from(imageBuffer));
      console.log('\n📁 Saved to: Generated_Headshot.png');
    }
  } catch (error: unknown) {
    console.log('❌ Error:', error);
  }
}

main();
