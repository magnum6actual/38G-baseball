/**
 * Document parsing utilities
 *
 * Extracts text content from various document formats including PDFs.
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Extract text from a PDF using PyMuPDF
 */
export async function extractTextFromPdf(pdfBase64: string): Promise<string> {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-extract-'));
  const pdfPath = path.join(tempDir, 'document.pdf');
  const outputPath = path.join(tempDir, 'output.txt');

  try {
    // Write PDF to temp file
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    fs.writeFileSync(pdfPath, pdfBuffer);

    // Python script to extract text
    const extractScript = `
import fitz  # PyMuPDF
import sys

pdf_path = sys.argv[1]
output_path = sys.argv[2]

doc = fitz.open(pdf_path)
text_content = []
page_count = len(doc)

for page_num in range(page_count):
    page = doc[page_num]
    text_content.append(page.get_text())

doc.close()

with open(output_path, 'w', encoding='utf-8') as f:
    f.write('\\n\\n'.join(text_content))

print(f"Extracted {page_count} pages")
`;

    const scriptPath = path.join(tempDir, 'extract_text.py');
    fs.writeFileSync(scriptPath, extractScript);

    // Run extraction
    await runPythonScript(scriptPath, [pdfPath, outputPath]);

    // Read extracted text
    const text = fs.readFileSync(outputPath, 'utf-8');
    return text.trim();
  } finally {
    // Cleanup
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
    const venvPython = path.resolve('./venv/bin/python3');
    const pythonPath = fs.existsSync(venvPython) ? venvPython : 'python3';
    const python = spawn(pythonPath, [script, ...args]);

    let stderr = '';

    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    python.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`PDF extraction failed: ${stderr}`));
      }
    });

    python.on('error', (err) => {
      reject(new Error(`Failed to start Python: ${err.message}`));
    });
  });
}

/**
 * Parse a document from base64, returning extracted text
 */
export async function parseDocument(
  base64Content: string,
  filename: string
): Promise<string> {
  const ext = path.extname(filename).toLowerCase();

  if (ext === '.pdf') {
    return extractTextFromPdf(base64Content);
  }

  // For text files, just decode
  if (['.txt', '.md', '.json', '.csv'].includes(ext)) {
    const buffer = Buffer.from(base64Content, 'base64');
    return buffer.toString('utf-8');
  }

  // Try to decode as text for unknown types
  try {
    const buffer = Buffer.from(base64Content, 'base64');
    return buffer.toString('utf-8');
  } catch (e) {
    return `[Unable to parse document: ${filename}]`;
  }
}
