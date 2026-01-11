/**
 * Test FLUX.2 with image input (image-to-image / style transfer)
 * We need to include Subject.png as the source image
 */

import 'dotenv/config';
import fs from 'fs';

const apiKey = process.env.AZURE_AI_API_KEY!;
const fluxEndpoint = process.env.AZURE_FLUX_ENDPOINT || 'https://kinetiqs-foundry.services.ai.azure.com';
const url = `${fluxEndpoint}/providers/blackforestlabs/v1/flux-2-pro?api-version=2025-04-01-preview`;

// Load Subject.png as base64
const subjectPath = './Subject.png';
const subjectBase64 = fs.readFileSync(subjectPath).toString('base64');
console.log('Subject image loaded:', subjectBase64.length, 'chars base64');

const prompt = `Transform this photo into a professional military headshot with grey studio backdrop and soft professional lighting. Keep the subject's face and features exactly the same.`;

// Try different parameter formats for image input
const tests = [
  {
    name: '1. image parameter (base64)',
    body: {
      model: 'flux.2-pro',
      prompt,
      image: subjectBase64,
      n: 1,
    },
  },
  {
    name: '2. image with data URI',
    body: {
      model: 'flux.2-pro',
      prompt,
      image: `data:image/png;base64,${subjectBase64}`,
      n: 1,
    },
  },
  {
    name: '3. init_image parameter',
    body: {
      model: 'flux.2-pro',
      prompt,
      init_image: subjectBase64,
      n: 1,
    },
  },
  {
    name: '4. images array',
    body: {
      model: 'flux.2-pro',
      prompt,
      images: [subjectBase64],
      n: 1,
    },
  },
  {
    name: '5. input_image parameter',
    body: {
      model: 'flux.2-pro',
      prompt,
      input_image: subjectBase64,
      n: 1,
    },
  },
];

async function testConfig(t: typeof tests[0]) {
  console.log(`\n📍 ${t.name}`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(t.body),
    });

    const text = await response.text();
    console.log(`   Status: ${response.status}`);

    if (response.ok) {
      console.log('   ✅ SUCCESS!');
      const data = JSON.parse(text);
      if (data.data?.[0]?.b64_json) {
        fs.writeFileSync('./Generated_From_Subject.png', Buffer.from(data.data[0].b64_json, 'base64'));
        console.log('   📁 Saved to: Generated_From_Subject.png');
      }
      return true;
    } else {
      // Show error details
      console.log(`   Response: ${text.slice(0, 300)}`);
    }
  } catch (error: any) {
    console.log(`   Error: ${error.message}`);
  }
  return false;
}

async function main() {
  console.log('Testing FLUX.2 with image input...\n');

  for (const t of tests) {
    const success = await testConfig(t);
    if (success) {
      console.log('\n🎉 Found working image input format!');
      break;
    }
    await new Promise(r => setTimeout(r, 2000));
  }
}

main();
