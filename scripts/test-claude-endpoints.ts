import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';

const baseEndpoint = 'https://kinetiqs-foundry.services.ai.azure.com';
const apiKey = process.env.AZURE_CLAUDE_API_KEY!;

async function testEndpoint(baseURL: string, label: string) {
  console.log(`\nTesting: ${label}`);
  console.log(`BaseURL: ${baseURL}`);

  try {
    const client = new Anthropic({ apiKey, baseURL });
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 20,
      messages: [{ role: 'user', content: 'Say hello' }],
    });
    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    console.log('✅ Success:', text);
    return true;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log('❌ Failed:', msg.slice(0, 300));
    return false;
  }
}

async function main() {
  console.log('Testing different Azure Claude endpoint configurations...\n');

  // Test different configurations
  await testEndpoint(baseEndpoint, 'Base URL only');
  await testEndpoint(baseEndpoint + '/anthropic', 'With /anthropic');
  await testEndpoint(baseEndpoint + '/anthropic/v1', 'With /anthropic/v1');
}

main();
