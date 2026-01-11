/**
 * Test FLUX.2 with smaller resized image
 */

import 'dotenv/config';
import fs from 'fs';

const apiKey = process.env.AZURE_AI_API_KEY!;
const url = 'https://kinetiqs-foundry.services.ai.azure.com/providers/blackforestlabs/v1/flux-2-pro?api-version=2025-04-01-preview';

// Use smaller images
const subjectBase64 = fs.readFileSync('./Subject_small.png').toString('base64');
const styleBase64 = fs.readFileSync('./Style_Reference.png').toString('base64');

console.log('Subject (small):', Math.round(subjectBase64.length / 1024), 'KB');
console.log('Style reference:', Math.round(styleBase64.length / 1024), 'KB');

const prompt = `Transform this military photo into a professional headshot:
- Keep the subject's exact face and uniform
- Use grey studio backdrop with soft lighting
- Professional portrait photography style`;

// Try various image input parameter names
const tests = [
  {
    name: '1. image (base64)',
    body: { model: 'flux.2-pro', prompt, image: subjectBase64 },
  },
  {
    name: '2. image (data URI)',
    body: { model: 'flux.2-pro', prompt, image: `data:image/png;base64,${subjectBase64}` },
  },
  {
    name: '3. init_image',
    body: { model: 'flux.2-pro', prompt, init_image: subjectBase64 },
  },
  {
    name: '4. input_image',
    body: { model: 'flux.2-pro', prompt, input_image: subjectBase64 },
  },
  {
    name: '5. reference_image',
    body: { model: 'flux.2-pro', prompt, reference_image: subjectBase64 },
  },
  {
    name: '6. control_image',
    body: { model: 'flux.2-pro', prompt, control_image: subjectBase64 },
  },
  {
    name: '7. image_url style object',
    body: { model: 'flux.2-pro', prompt, image: { b64_json: subjectBase64 } },
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
    } else if (response.status === 422) {
      // Validation error - shows what params are expected
      console.log(`   Validation error: ${text.slice(0, 300)}`);
    } else {
      console.log(`   Response: ${text.slice(0, 200)}`);
    }
  } catch (error: any) {
    console.log(`   Error: ${error.message}`);
  }
  return false;
}

async function main() {
  console.log('Testing FLUX.2 with smaller image...\n');

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
