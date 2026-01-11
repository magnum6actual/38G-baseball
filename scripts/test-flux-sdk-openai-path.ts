/**
 * Test FLUX.2 using Azure AI Inference SDK with /openai/v1/ path
 */

import 'dotenv/config';
import ModelClient from '@azure-rest/ai-inference';
import { AzureKeyCredential } from '@azure/core-auth';
import fs from 'fs';

const endpoint = 'https://kinetiqs-foundry.services.ai.azure.com';
const apiKey = process.env.AZURE_AI_API_KEY!;

async function main() {
  console.log('Testing FLUX.2 with /openai/v1/ path via SDK...');

  const client = ModelClient(endpoint, new AzureKeyCredential(apiKey));

  try {
    const response = await client.path('/openai/v1/images/generations' as any).post({
      body: {
        model: 'FLUX.2-pro',
        prompt: 'A simple blue circle on white background',
        size: '1024x1024',
        n: 1,
      },
    });

    console.log('Status:', response.status);

    // Get headers if available
    const headers = (response as any).headers || {};
    console.log('Model Error Header:', headers['ms-azureml-model-error-reason']);
    console.log('Rate Limit:', headers['x-ratelimit-remaining-requests']);

    if (response.status === '200') {
      console.log('✅ SUCCESS!');
      const data = response.body as any;
      if (data.data?.[0]?.b64_json) {
        fs.writeFileSync('./Generated_Headshot.png', Buffer.from(data.data[0].b64_json, 'base64'));
        console.log('📁 Saved to: Generated_Headshot.png');
      }
    } else {
      console.log('Response:', JSON.stringify(response.body, null, 2));
    }
  } catch (error: any) {
    console.log('❌ Error:', error.message);
  }
}

main();
