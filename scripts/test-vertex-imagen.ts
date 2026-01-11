/**
 * Test Vertex AI Imagen for headshot generation
 */

import 'dotenv/config';
import { VertexAI } from '@google-cloud/vertexai';
import fs from 'fs';

// Set credentials path for Google Cloud
process.env.GOOGLE_APPLICATION_CREDENTIALS = './gcp-service-account.json';

const project = process.env.GOOGLE_CLOUD_PROJECT || '38g-baseball';
const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';

console.log('Project:', project);
console.log('Location:', location);
console.log('Credentials file:', process.env.GOOGLE_APPLICATION_CREDENTIALS);

// Load both images
const subjectBase64 = fs.readFileSync('./Subject_small.png').toString('base64');
const styleBase64 = fs.readFileSync('./Style_Reference.png').toString('base64');

console.log('\nSubject image:', Math.round(subjectBase64.length / 1024), 'KB');
console.log('Style reference:', Math.round(styleBase64.length / 1024), 'KB');

// The prompt
const prompt = `I have attached two images. Please generate a highly realistic, professional military headshot following these specific instructions:

1. The Subject: Use the person in the FIRST image (the person in the camouflage uniform). Keep their exact US Army OCP uniform, ensuring the specific name tape and rank insignia visible in the source photo are preserved exactly as they are.

2. The Style & Background: Use the SECOND image (the officer in the dark suit) as the reference for the pose, lighting, and background.

Background: Create a similar seamless grey studio backdrop with a blurred US flag draped on the left side.

Lighting: Mimic the soft, professional studio lighting from the reference.

3. Enhancements: While maintaining a realistic photo-quality, please subtly enhance the subject's face to reduce under-eye bags and soften deep wrinkles to create a refreshed, energetic look, while ensuring he remains recognizable.

Output: A photorealistic headshot with a 2:3 aspect ratio.`;

async function main() {
  console.log('\nTesting Vertex AI Imagen...\n');

  const vertexAI = new VertexAI({ project, location });

  // Use Gemini 3 Pro Image Preview
  const model = vertexAI.getGenerativeModel({
    model: 'gemini-3-pro-image-preview',
    generationConfig: {
      responseModalities: ['IMAGE', 'TEXT'],
    } as any,
  });

  try {
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: 'image/png',
              data: subjectBase64,
            },
          },
          {
            inlineData: {
              mimeType: 'image/png',
              data: styleBase64,
            },
          },
        ],
      }],
    });

    const response = result.response;
    console.log('Response received!');

    const parts = response.candidates?.[0]?.content?.parts || [];
    console.log('Parts count:', parts.length);

    let imageFound = false;
    for (const part of parts) {
      if (part.inlineData) {
        imageFound = true;
        const imageData = part.inlineData.data;
        const mimeType = part.inlineData.mimeType;
        console.log('✅ Generated image found! MIME:', mimeType);

        fs.writeFileSync('./Generated_Vertex_Headshot.png', Buffer.from(imageData, 'base64'));
        console.log('📁 Saved to: Generated_Vertex_Headshot.png');
      } else if (part.text) {
        console.log('Text:', part.text.slice(0, 200));
      }
    }

    if (!imageFound) {
      console.log('No image generated. Response:');
      console.log(JSON.stringify(response, null, 2).slice(0, 1000));
    }
  } catch (error: any) {
    console.log('❌ Error:', error.message);

    // Try Imagen 3 directly if Gemini doesn't work
    console.log('\nTrying Imagen 3...');
    await tryImagen3();
  }
}

async function tryImagen3() {
  const vertexAI = new VertexAI({ project, location });

  // Imagen 3 model
  const model = vertexAI.preview.getGenerativeModel({
    model: 'imagen-3.0-generate-001',
  });

  try {
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: 'image/png',
              data: subjectBase64,
            },
          },
          {
            inlineData: {
              mimeType: 'image/png',
              data: styleBase64,
            },
          },
        ],
      }],
    });

    console.log('Imagen 3 response:', JSON.stringify(result.response, null, 2).slice(0, 500));
  } catch (error: any) {
    console.log('Imagen 3 error:', error.message);
  }
}

main();
