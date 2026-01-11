import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';

const baseURL = 'https://kinetiqs-foundry.services.ai.azure.com/anthropic';
const apiKey = process.env.AZURE_CLAUDE_API_KEY!;

const modelsToTry = [
  'claude-3-5-sonnet-20241022',
  'claude-3-5-sonnet',
  'claude-3-sonnet-20240229',
  'claude-3-sonnet',
  'claude-3-5-haiku-20241022',
  'claude-3-haiku-20240307',
];

async function testModel(model: string) {
  try {
    const client = new Anthropic({ apiKey, baseURL });
    const response = await client.messages.create({
      model,
      max_tokens: 20,
      messages: [{ role: 'user', content: 'Say hello' }],
    });
    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    console.log(`✅ ${model}: ${text}`);
    return true;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('DeploymentNotFound')) {
      console.log(`❌ ${model}: Not deployed`);
    } else {
      console.log(`❌ ${model}: ${msg.slice(0, 100)}`);
    }
    return false;
  }
}

async function main() {
  console.log('Testing available Claude models on Azure...\n');

  for (const model of modelsToTry) {
    const success = await testModel(model);
    if (success) {
      console.log(`\n✅ Use this model in your .env or code: ${model}`);
      break;
    }
  }
}

main();
