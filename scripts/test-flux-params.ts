/**
 * Test FLUX.2 with different request body parameters
 */

import 'dotenv/config';
import fs from 'fs';

const apiKey = process.env.AZURE_AI_API_KEY!;
const baseUrl = 'https://kinetiqs-foundry.openai.azure.com/openai/v1/images/generations';

const prompt = 'A simple blue circle on white background';

const requestVariations = [
  { name: 'Minimal', body: { prompt, model: 'FLUX.2-pro' } },
  { name: 'With response_format b64', body: { prompt, model: 'FLUX.2-pro', response_format: 'b64_json' } },
  { name: 'With response_format url', body: { prompt, model: 'FLUX.2-pro', response_format: 'url' } },
  { name: 'With n and size', body: { prompt, model: 'FLUX.2-pro', n: 1, size: '1024x1024' } },
  { name: 'Without model', body: { prompt, n: 1 } },
  { name: 'Lowercase model', body: { prompt, model: 'flux.2-pro', n: 1 } },
];

async function testRequest(v: typeof requestVariations[0]) {
  console.log(`\nTesting: ${v.name}`);
  console.log('Body:', JSON.stringify(v.body));

  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(v.body),
    });

    const modelError = response.headers.get('ms-azureml-model-error-reason');
    const text = await response.text();

    console.log(`Status: ${response.status}, Model Error: ${modelError}`);

    if (response.ok) {
      console.log('✅ SUCCESS!');
      const data = JSON.parse(text);
      if (data.data?.[0]?.b64_json) {
        fs.writeFileSync('./Generated_Headshot.png', Buffer.from(data.data[0].b64_json, 'base64'));
        console.log('📁 Saved to: Generated_Headshot.png');
      } else if (data.data?.[0]?.url) {
        console.log('Image URL:', data.data[0].url);
      }
      return true;
    } else {
      console.log('Response:', text.slice(0, 100));
    }
  } catch (error: any) {
    console.log('Error:', error.message);
  }
  return false;
}

async function main() {
  console.log('Testing FLUX.2 with different request parameters...');
  console.log('Base URL:', baseUrl);

  for (const v of requestVariations) {
    const success = await testRequest(v);
    if (success) break;
    await new Promise(r => setTimeout(r, 1000));
  }
}

main();
