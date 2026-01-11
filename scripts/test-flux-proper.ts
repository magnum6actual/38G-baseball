/**
 * Proper test: Both Subject + Style Reference images with the correct prompt
 */

import 'dotenv/config';
import fs from 'fs';

const apiKey = process.env.AZURE_AI_API_KEY!;
const url = 'https://kinetiqs-foundry.services.ai.azure.com/providers/blackforestlabs/v1/flux-2-pro?api-version=2025-04-01-preview';

// Load BOTH images
const subjectBase64 = fs.readFileSync('./Subject_small.png').toString('base64');
const styleBase64 = fs.readFileSync('./Style_Reference.png').toString('base64');

console.log('Subject image:', Math.round(subjectBase64.length / 1024), 'KB');
console.log('Style reference:', Math.round(styleBase64.length / 1024), 'KB');

// The CORRECT prompt from gemini-image-prompt.txt with the user's enhancement
const prompt = `I have attached two images. Please generate a highly realistic, professional military headshot following these specific instructions:

1. The Subject: Use the person in Subject.jpg (the person in the camouflage uniform). Keep their exact US Army OCP uniform, ensuring the specific name tape and rank insignia visible in the source photo are preserved exactly as they are.

2. The Style & Background: Use Style_Reference.jpg (the officer in the dark suit) as the reference for the pose, lighting, and background.

Background: Create a similar seamless grey studio backdrop with a blurred US flag draped on the left side.

Lighting: Mimic the soft, professional studio lighting from the reference.

3. Enhancements: While maintaining a realistic photo-quality, please subtly enhance the subject's face to reduce under-eye bags and soften deep wrinkles to create a refreshed, energetic look, while ensuring he remains recognizable.

Output: A photorealistic headshot with a 2:3 aspect ratio.`;

console.log('\nPrompt:', prompt.slice(0, 200) + '...\n');

// Try different ways to send TWO images
const tests = [
  {
    name: '1. images array (both)',
    body: {
      model: 'flux.2-pro',
      prompt,
      images: [subjectBase64, styleBase64],
    },
  },
  {
    name: '2. image + style_image params',
    body: {
      model: 'flux.2-pro',
      prompt,
      image: subjectBase64,
      style_image: styleBase64,
    },
  },
  {
    name: '3. images with roles',
    body: {
      model: 'flux.2-pro',
      prompt,
      images: [
        { b64_json: subjectBase64, name: 'Subject.jpg' },
        { b64_json: styleBase64, name: 'Style_Reference.jpg' },
      ],
    },
  },
  {
    name: '4. subject_image + reference_image',
    body: {
      model: 'flux.2-pro',
      prompt,
      subject_image: subjectBase64,
      reference_image: styleBase64,
    },
  },
  {
    name: '5. image array with data URIs',
    body: {
      model: 'flux.2-pro',
      prompt,
      images: [
        `data:image/png;base64,${subjectBase64}`,
        `data:image/png;base64,${styleBase64}`,
      ],
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
        fs.writeFileSync('./Generated_Proper_Headshot.png', Buffer.from(data.data[0].b64_json, 'base64'));
        console.log('   📁 Saved to: Generated_Proper_Headshot.png');
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
  console.log('Testing FLUX.2 with BOTH images + correct prompt...\n');

  for (const t of tests) {
    const success = await testConfig(t);
    if (success) {
      console.log('\n🎉 Found working two-image format!');
      break;
    }
    await new Promise(r => setTimeout(r, 3000));
  }
}

main();
