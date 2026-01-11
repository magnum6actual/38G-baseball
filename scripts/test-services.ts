/**
 * Test connectivity to all required services
 */

import 'dotenv/config';

async function testClaude() {
  console.log('\n--- Testing Claude API ---');

  const endpoint = process.env.AZURE_CLAUDE_ENDPOINT;
  const apiKey = process.env.AZURE_CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
  const isAzure = !!endpoint;

  if (!apiKey) {
    console.log('❌ No Claude API key configured');
    return false;
  }

  // Azure endpoint needs /anthropic appended
  const getBaseURL = () => {
    if (!isAzure) return undefined;
    return endpoint!.endsWith('/anthropic') ? endpoint : `${endpoint}/anthropic`;
  };

  // Model name differs for Azure vs direct Anthropic
  const modelName = process.env.CLAUDE_MODEL || (isAzure ? 'claude-opus-4-5' : 'claude-sonnet-4-20250514');

  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({
      apiKey,
      baseURL: getBaseURL(),
    });

    const response = await client.messages.create({
      model: modelName,
      max_tokens: 50,
      messages: [{ role: 'user', content: 'Say "Claude is connected" and nothing else.' }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    console.log(`✅ Claude API (${modelName}):`, text.trim());
    return true;
  } catch (error) {
    console.log('❌ Claude API error:', error instanceof Error ? error.message : error);
    return false;
  }
}

async function testEmbeddings() {
  console.log('\n--- Testing Azure OpenAI Embeddings ---');

  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const deployment = process.env.AZURE_EMBEDDING_DEPLOYMENT || 'text-embedding-3-small';
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-02-01';

  if (!endpoint || !apiKey) {
    console.log('❌ Azure OpenAI not configured');
    return false;
  }

  try {
    const url = `${endpoint}/openai/deployments/${deployment}/embeddings?api-version=${apiVersion}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        input: 'Test embedding generation',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const dimensions = data.data?.[0]?.embedding?.length;
    console.log(`✅ Azure OpenAI Embeddings: Connected (${dimensions} dimensions)`);
    return true;
  } catch (error) {
    console.log('❌ Azure OpenAI error:', error instanceof Error ? error.message : error);
    return false;
  }
}

async function testFlux() {
  console.log('\n--- Testing Azure AI (FLUX.2) ---');

  const endpoint = process.env.AZURE_AI_ENDPOINT;
  const apiKey = process.env.AZURE_AI_API_KEY;

  if (!endpoint || !apiKey) {
    console.log('⚠️  Azure AI (FLUX.2) not configured - headshot generation will be unavailable');
    return false;
  }

  try {
    // Just test that we can reach the endpoint - don't actually generate an image
    const url = `${endpoint}/models`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'api-key': apiKey,
      },
    });

    // Even a 404 or 401 tells us if we're reaching the service
    if (response.status === 401 || response.status === 403) {
      console.log('❌ Azure AI: Authentication failed - check API key');
      return false;
    }

    console.log(`✅ Azure AI (FLUX.2): Endpoint reachable (status: ${response.status})`);
    return true;
  } catch (error) {
    console.log('❌ Azure AI error:', error instanceof Error ? error.message : error);
    return false;
  }
}

async function main() {
  console.log('=== Service Connectivity Tests ===');
  console.log('Endpoint:', process.env.AZURE_CLAUDE_ENDPOINT || 'Direct Anthropic API');

  const results = {
    claude: await testClaude(),
    embeddings: await testEmbeddings(),
    flux: await testFlux(),
  };

  console.log('\n=== Summary ===');
  console.log('Claude API:', results.claude ? '✅ Ready' : '❌ Failed');
  console.log('Embeddings:', results.embeddings ? '✅ Ready' : '❌ Failed');
  console.log('FLUX.2:', results.flux ? '✅ Ready' : '⚠️  Not available');

  const coreReady = results.claude && results.embeddings;
  console.log('\nCore services:', coreReady ? '✅ All ready - you can run the app' : '❌ Fix issues above first');

  process.exit(coreReady ? 0 : 1);
}

main();
