/**
 * Test FLUX.2 with lowercase model name
 */

import 'dotenv/config';
import OpenAI from 'openai';
import fs from 'fs';

async function main() {
  const endpoint = 'https://kinetiqs-foundry.openai.azure.com/openai/v1';
  const model = 'flux.2-pro';  // lowercase
  const apiKey = process.env.AZURE_AI_API_KEY!;

  console.log('Testing FLUX.2 with lowercase model name...');
  console.log('  Endpoint:', endpoint);
  console.log('  Model:', model);
  console.log();

  const client = new OpenAI({
    baseURL: endpoint,
    apiKey: apiKey,
  });

  const prompt = 'A professional military portrait photo of a person in US Army uniform, grey studio backdrop, soft professional lighting, photorealistic';

  try {
    console.log('Calling API...');
    const result = await client.images.generate({
      model: model,
      prompt,
      n: 1,
    });

    console.log('✅ SUCCESS!');
    console.log('Response:', JSON.stringify(result, null, 2).slice(0, 500));

    // Save the image
    const b64 = result.data[0].b64_json;
    if (b64) {
      const imageBytes = Buffer.from(b64, 'base64');
      fs.writeFileSync('./Generated_Headshot.png', imageBytes);
      console.log('\n📁 Saved to: Generated_Headshot.png');
    } else if (result.data[0].url) {
      console.log('Image URL:', result.data[0].url);
      const imageResponse = await fetch(result.data[0].url);
      const imageBuffer = await imageResponse.arrayBuffer();
      fs.writeFileSync('./Generated_Headshot.png', Buffer.from(imageBuffer));
      console.log('\n📁 Saved to: Generated_Headshot.png');
    }
  } catch (error: any) {
    console.log('❌ Error:', error?.status, error?.message);
    if (error?.headers) {
      console.log('Headers:');
      for (const [key, value] of error.headers.entries()) {
        console.log(`  ${key}: ${value}`);
      }
    }
  }
}

main();
