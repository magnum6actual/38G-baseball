import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';

async function main() {
  const client = new Anthropic({
    apiKey: process.env.AZURE_CLAUDE_API_KEY,
    baseURL: 'https://kinetiqs-foundry.services.ai.azure.com/anthropic',
  });

  const response = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 50,
    messages: [{ role: 'user', content: 'Say "Claude Opus 4.5 is connected" and nothing else.' }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  console.log('✅', text);
}

main().catch(e => console.log('❌', e.message));
