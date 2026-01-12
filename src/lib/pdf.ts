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
 * Uses venv Python if available for pypdf/pymupdf dependencies
 */
function runPythonScript(script: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    // Use venv Python if available, otherwise fall back to system python3
    const venvPython = path.resolve('./venv/bin/python3');
    const pythonPath = fs.existsSync(venvPython) ? venvPython : 'python3';
    const python = spawn(pythonPath, [script, ...args]);

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
 * Flatten PDF form fields and overlay headshot using PyMuPDF
 *
 * The PDF template has editable form fields which can conflict with image overlay.
 * This function:
 * 1. Flattens all form fields (converts widget annotations to static content)
 * 2. Overlays the headshot image
 *
 * This ensures the image renders correctly without form field layer conflicts.
 */
async function overlayHeadshot(
  pdfPath: string,
  headshotPath: string,
  outputPath: string
): Promise<void> {
  // Coordinates for headshot placement on the baseball card
  // Matches Field '8' in template.pdf (the photo placeholder)
  const HEADSHOT_X = 47;
  const HEADSHOT_Y = 111;
  const HEADSHOT_WIDTH = 104;
  const HEADSHOT_HEIGHT = 154;

  const overlayScript = `
import fitz  # PyMuPDF
import sys
import os

pdf_path = sys.argv[1]
headshot_path = sys.argv[2]
output_path = sys.argv[3]

# Create a temporary output path if saving to same file
temp_output = output_path + ".tmp" if pdf_path == output_path else output_path

# Open the PDF
doc = fitz.open(pdf_path)
page = doc[0]  # First page

# Step 1: Flatten form fields by converting widget annotations to static content
# Iterate through all pages and flatten widgets
for page_num in range(len(doc)):
    p = doc[page_num]
    # Get all widget annotations (form fields) and convert them to static appearances
    for widget in p.widgets():
        widget.update()  # Ensure appearance stream is current

        # Get the widget's rectangle and appearance
        rect = widget.rect

        # If the widget has an appearance, we'll keep it as-is
        # The key is to delete the widget annotation after baking its appearance

    # Now delete all widget annotations (this removes form field interactivity)
    # but keeps the visual appearance that was already rendered
    annot = p.first_annot
    while annot:
        next_annot = annot.next
        if annot.type[0] == fitz.PDF_ANNOT_WIDGET:
            # Before deleting, ensure the appearance is baked into the page
            p.delete_annot(annot)
        annot = next_annot

# Step 2: Insert the headshot image
page = doc[0]
rect = fitz.Rect(${HEADSHOT_X}, ${HEADSHOT_Y}, ${HEADSHOT_X + HEADSHOT_WIDTH}, ${HEADSHOT_Y + HEADSHOT_HEIGHT})

# Insert the image
page.insert_image(rect, filename=headshot_path)

# Save with garbage collection to clean up orphaned objects
doc.save(temp_output, garbage=4, deflate=True)
doc.close()

# If we used a temp file, move it to the final location
if temp_output != output_path:
    os.replace(temp_output, output_path)

print(f"PDF flattened and headshot overlaid successfully: {output_path}")
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
