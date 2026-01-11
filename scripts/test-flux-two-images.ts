/**
 * Test FLUX.2 with both Subject and Style Reference images
 */

import 'dotenv/config';
import fs from 'fs';

const apiKey = process.env.AZURE_AI_API_KEY!;
const fluxEndpoint = process.env.AZURE_FLUX_ENDPOINT || 'https://kinetiqs-foundry.services.ai.azure.com';
const url = `${fluxEndpoint}/providers/blackforestlabs/v1/flux-2-pro?api-version=2025-04-01-preview`;

// Load both images as base64
const subjectBase64 = fs.readFileSync('./Subject.png').toString('base64');
const styleBase64 = fs.readFileSync('./Style_Reference.png').toString('base64');

console.log('Subject image:', subjectBase64.length, 'chars');
console.log('Style reference:', styleBase64.length, 'chars');

const prompt = `I have attached two images. Generate a professional military headshot:
1. Use the FIRST image as the subject - keep their exact face, features, and uniform.
2. Use the SECOND image as style reference for pose, lighting, and grey backdrop with US flag.
Output a photorealistic headshot maintaining the subject's identity.`;

// Try different formats for multiple image input
const tests = [
  {
    name: '1. images array with roles',
    body: {
      model: 'flux.2-pro',
      prompt,
      images: [
        { image: subjectBase64, role: 'subject' },
        { image: styleBase64, role: 'style' },
      ],
      n: 1,
    },
  },
  {
    name: '2. image_prompts array',
    body: {
      model: 'flux.2-pro',
      prompt,
      image_prompt: {
        images: [
          { image: subjectBase64, role: 'subject' },
          { image: styleBase64, role: 'style' },
        ],
      },
      n: 1,
    },
  },
  {
    name: '3. Separate subject/style params',
    body: {
      model: 'flux.2-pro',
      prompt,
      subject_image: subjectBase64,
      style_image: styleBase64,
      n: 1,
    },
  },
  {
    name: '4. control_image + style_image',
    body: {
      model: 'flux.2-pro',
      prompt,
      control_image: subjectBase64,
      style_image: styleBase64,
      n: 1,
    },
  },
  {
    name: '5. Simple images array (base64 strings)',
    body: {
      model: 'flux.2-pro',
      prompt,
      images: [subjectBase64, styleBase64],
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
      console.log(`   Response: ${text.slice(0, 250)}`);
    }
  } catch (error: any) {
    console.log(`   Error: ${error.message}`);
  }
  return false;
}

async function main() {
  console.log('Testing FLUX.2 with Subject + Style Reference...\n');

  for (const t of tests) {
    const success = await testConfig(t);
    if (success) {
      console.log('\n🎉 Found working format!');
      break;
    }
    await new Promise(r => setTimeout(r, 2000));
  }
}

main();
