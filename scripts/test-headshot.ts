/**
 * Test Gemini headshot generation
 *
 * Reads Subject_small.png, calls the headshot API, and saves the result.
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { generateHeadshot } from '../src/lib/headshot';

async function main() {
  // Use Subject_small.png (resized) to stay under API limits
  const subjectPath = path.resolve('./Subject_small.png');
  const outputPath = path.resolve('./Generated_Headshot.png');

  console.log('=== Gemini Headshot Generation Test ===\n');

  // Check Subject_small.png exists
  if (!fs.existsSync(subjectPath)) {
    console.error('❌ Subject_small.png not found in project root');
    console.error('   Run: sips -Z 512 Subject.png --out Subject_small.png');
    process.exit(1);
  }

  console.log('📷 Reading Subject_small.png...');
  const subjectBuffer = fs.readFileSync(subjectPath);
  const subjectBase64 = subjectBuffer.toString('base64');
  console.log(`   Size: ${(subjectBuffer.length / 1024).toFixed(1)} KB`);

  console.log('\n🎨 Calling Gemini API...');
  console.log('   This may take 30-60 seconds...\n');

  const startTime = Date.now();

  const result = await generateHeadshot({
    subjectImage: subjectBase64,
    enhancements: 'maintain natural appearance, professional lighting',
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  if (result.success && result.processedImage) {
    console.log(`✅ Generation successful! (${elapsed}s)`);

    // Save the output
    const outputBuffer = Buffer.from(result.processedImage, 'base64');
    fs.writeFileSync(outputPath, outputBuffer);

    console.log(`\n📁 Saved to: ${outputPath}`);
    console.log(`   Size: ${(outputBuffer.length / 1024).toFixed(1)} KB`);
    console.log('\nOpen Generated_Headshot.png to view the result.');
  } else {
    console.log(`❌ Generation failed (${elapsed}s)`);
    console.log(`   Error: ${result.error}`);
  }
}

main().catch((e) => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
