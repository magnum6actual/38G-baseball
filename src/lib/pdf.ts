/**
 * PDF Generation Service
 *
 * Generates 38G Baseball Card PDFs using the fill_pdf.py script
 * and overlays the headshot using PyMuPDF.
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const PDF_TEMPLATE_PATH = process.env.PDF_TEMPLATE_PATH || './38g-card-builder/assets/template.pdf';
const FILL_PDF_SCRIPT = './38g-card-builder/scripts/fill_pdf.py';

export interface PdfField {
  field_id: string;
  description: string;
  page: number;
  value: string;
}

/**
 * Generate a PDF from field values
 */
export async function generatePdf(
  fields: PdfField[],
  headshotBase64?: string
): Promise<Buffer> {
  // Create temp directory for intermediate files
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), '38g-pdf-'));
  const fieldsPath = path.join(tempDir, 'fields.json');
  const outputPath = path.join(tempDir, 'output.pdf');
  const headshotPath = headshotBase64 ? path.join(tempDir, 'headshot.png') : null;

  try {
    // Write fields JSON
    fs.writeFileSync(fieldsPath, JSON.stringify(fields, null, 2));

    // Write headshot if provided
    if (headshotBase64 && headshotPath) {
      const headshotBuffer = Buffer.from(headshotBase64, 'base64');
      fs.writeFileSync(headshotPath, headshotBuffer);
    }

    // Run fill_pdf.py
    await runPythonScript(FILL_PDF_SCRIPT, [
      path.resolve(PDF_TEMPLATE_PATH),
      fieldsPath,
      outputPath,
    ]);

    // If we have a headshot, overlay it on the PDF
    if (headshotPath && fs.existsSync(headshotPath)) {
      await overlayHeadshot(outputPath, headshotPath, outputPath);
    }

    // Read the output PDF
    const pdfBuffer = fs.readFileSync(outputPath);

    return pdfBuffer;
  } finally {
    // Cleanup temp files
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {
      console.warn('Failed to cleanup temp directory:', e);
    }
  }
}

/**
 * Run a Python script with arguments
 */
function runPythonScript(script: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const python = spawn('python3', [script, ...args]);

    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    python.on('close', (code) => {
      if (code === 0) {
        console.log('PDF script output:', stdout);
        resolve();
      } else {
        reject(new Error(`Python script failed with code ${code}: ${stderr}`));
      }
    });

    python.on('error', (err) => {
      reject(new Error(`Failed to start Python: ${err.message}`));
    });
  });
}

/**
 * Overlay headshot on PDF using PyMuPDF
 * Creates a Python script inline to do the overlay
 */
async function overlayHeadshot(
  pdfPath: string,
  headshotPath: string,
  outputPath: string
): Promise<void> {
  // Coordinates for headshot placement on the baseball card
  // These should match the template layout
  const HEADSHOT_X = 36; // Left margin
  const HEADSHOT_Y = 100; // Top position
  const HEADSHOT_WIDTH = 144; // 2 inches at 72 DPI
  const HEADSHOT_HEIGHT = 216; // 3 inches at 72 DPI (2:3 ratio)

  const overlayScript = `
import fitz  # PyMuPDF
import sys

pdf_path = sys.argv[1]
headshot_path = sys.argv[2]
output_path = sys.argv[3]

# Open the PDF
doc = fitz.open(pdf_path)
page = doc[0]  # First page

# Define the rectangle for the headshot
rect = fitz.Rect(${HEADSHOT_X}, ${HEADSHOT_Y}, ${HEADSHOT_X + HEADSHOT_WIDTH}, ${HEADSHOT_Y + HEADSHOT_HEIGHT})

# Insert the image
page.insert_image(rect, filename=headshot_path)

# Save
doc.save(output_path)
doc.close()

print(f"Headshot overlaid successfully: {output_path}")
`;

  const tempDir = path.dirname(pdfPath);
  const scriptPath = path.join(tempDir, 'overlay_headshot.py');

  fs.writeFileSync(scriptPath, overlayScript);

  await runPythonScript(scriptPath, [pdfPath, headshotPath, outputPath]);
}

/**
 * Parse PDF field JSON from LLM output
 */
export function parsePdfFields(llmOutput: string): PdfField[] {
  // Try to extract JSON from the response
  // The LLM might wrap it in markdown code blocks
  let jsonStr = llmOutput;

  // Try to find JSON in code blocks
  const codeBlockMatch = llmOutput.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  }

  // Try to find raw JSON array
  const arrayMatch = jsonStr.match(/\[\s*\{[\s\S]*\}\s*\]/);
  if (arrayMatch) {
    jsonStr = arrayMatch[0];
  }

  try {
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) {
      throw new Error('Expected JSON array');
    }
    return parsed as PdfField[];
  } catch (error) {
    console.error('Failed to parse PDF fields:', error);
    throw new Error('Failed to parse PDF field data from LLM response');
  }
}
