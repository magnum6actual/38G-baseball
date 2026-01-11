/**
 * Test FLUX.2 using Azure AI Inference SDK
 * Per Gemini's recommendation for non-OpenAI models
 */

import 'dotenv/config';
import ModelClient from '@azure-rest/ai-inference';
import { AzureKeyCredential } from '@azure/core-auth';
import fs from 'fs';

const endpoint = 'https://kinetiqs-foundry.services.ai.azure.com';
const apiKey = process.env.AZURE_AI_API_KEY!;

async function main() {
  console.log('Testing FLUX.2 using Azure AI Inference SDK...');
  console.log('Endpoint:', endpoint);
  console.log();

  const client = ModelClient(endpoint, new AzureKeyCredential(apiKey));

  try {
    // Try the standard path
    const response = await client.path('/images/generations').post({
      body: {
        model: 'FLUX.2-pro',
        prompt: 'A simple blue circle on white background',
        size: '1024x1024',
        n: 1,
      },
    });

    console.log('Status:', response.status);

    if (response.status === '200') {
      console.log('✅ SUCCESS!');
      const data = response.body as any;
      console.log('Response keys:', Object.keys(data));

      if (data.data?.[0]?.b64_json) {
        fs.writeFileSync('./Generated_Headshot.png', Buffer.from(data.data[0].b64_json, 'base64'));
        console.log('📁 Saved to: Generated_Headshot.png');
      } else if (data.data?.[0]?.url) {
        console.log('Image URL:', data.data[0].url);
      } else {
        console.log('Response:', JSON.stringify(data, null, 2).slice(0, 500));
      }
    } else {
      console.log('❌ Error:', JSON.stringify(response.body, null, 2));
    }
  } catch (error: any) {
    console.log('❌ SDK Error:', error.message);

    // Also try with path variations
    console.log('\nTrying alternate paths...');

    const paths = [
      '/v1/images/generations',
      '/openai/v1/images/generations',
      '/models/FLUX.2-pro/images/generations',
    ];

    for (const path of paths) {
      console.log(`\n📍 Path: ${path}`);
      try {
        const resp = await client.path(path as any).post({
          body: {
            model: 'FLUX.2-pro',
            prompt: 'test',
            n: 1,
          },
        });
        console.log(`   Status: ${resp.status}`);
        if (resp.status === '200') {
          console.log('   ✅ SUCCESS!');
          break;
        } else {
          const body = resp.body as any;
          console.log(`   Response: ${JSON.stringify(body).slice(0, 100)}`);
        }
      } catch (e: any) {
        console.log(`   Error: ${e.message?.slice(0, 100)}`);
      }
    }
  }
}

main();
