/**
 * Test the headshot module
 */

import 'dotenv/config';
import fs from 'fs';
import { generateHeadshot } from '../src/lib/headshot';

async function main() {
  console.log('Testing headshot module...\n');

  // Load subject image
  const subjectBase64 = fs.readFileSync('./Subject_small.png').toString('base64');
  console.log('Subject image:', Math.round(subjectBase64.length / 1024), 'KB');

  const result = await generateHeadshot({
    subjectImage: subjectBase64,
    enhancements: "subtly enhance the subject's face to reduce under-eye bags and soften deep wrinkles to create a refreshed, energetic look, while ensuring he remains recognizable",
  });

  if (result.success) {
    console.log('\n✅ SUCCESS!');
    fs.writeFileSync('./Generated_Module_Test.png', Buffer.from(result.processedImage, 'base64'));
    console.log('📁 Saved to: Generated_Module_Test.png');
  } else {
    console.log('\n❌ FAILED:', result.error);
  }
}

main();
