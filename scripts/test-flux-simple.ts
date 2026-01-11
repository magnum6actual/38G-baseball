/**
 * Simple FLUX.2 test with explicit configuration
 */

import 'dotenv/config';

async function main() {
  const endpoint = process.env.AZURE_AI_ENDPOINT!;
  const apiKey = process.env.AZURE_AI_API_KEY!;
  const deployment = process.env.AZURE_FLUX_DEPLOYMENT || 'FLUX.2-pro';
  const apiVersion = '2024-10-01-preview';

  const url = `${endpoint}/openai/deployments/${deployment}/images/generations?api-version=${apiVersion}`;

  console.log('Configuration:');
  console.log('  Endpoint:', endpoint);
  console.log('  Deployment:', deployment);
  console.log('  URL:', url);
  console.log();

  console.log('Calling FLUX.2 API...');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      prompt: 'A professional military portrait photo of a person in US Army uniform, grey studio backdrop, soft lighting, photorealistic',
      n: 1,
      size: '1024x1024',
    }),
  });

  console.log('Status:', response.status);

  const text = await response.text();
  console.log('Response:', text.slice(0, 500));

  if (response.ok) {
    const data = JSON.parse(text);
    console.log('\n✅ Success!');
    console.log('Response keys:', Object.keys(data));

    if (data.data?.[0]?.url) {
      console.log('Image URL:', data.data[0].url.slice(0, 100) + '...');

      // Fetch and save the image
      const imageResponse = await fetch(data.data[0].url);
      const imageBuffer = await imageResponse.arrayBuffer();
      const fs = await import('fs');
      fs.writeFileSync('./Generated_Headshot.png', Buffer.from(imageBuffer));
      console.log('\n📁 Saved to: Generated_Headshot.png');
    }
  }
}

main().catch(console.error);
