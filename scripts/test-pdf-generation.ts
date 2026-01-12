/**
 * Test PDF generation for a fictional officer
 *
 * Usage:
 *   npx tsx scripts/test-pdf-generation.ts officer_001
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const OFFICERS_JSON_PATH = './fictional_officers.json';
const PDF_TEMPLATE_PATH = './38g-card-builder/assets/template.pdf';
const FILL_PDF_SCRIPT = './38g-card-builder/scripts/fill_pdf.py';
const PHOTOS_DIR = './generated_photos';
const OUTPUT_DIR = './generated_pdfs';

interface Officer {
  id: string;
  name: string;
  rank: string;
  unit: string;
  date_assigned: string;
  position_title: string;
  mos_skill: string;
  skill_plain: string;
  residence: string;
  civilian_occupation: string;
  additional_info: string;
  skills: string[];
  deployments: Array<{ dates: string; mission: string; location: string; position: string }>;
  exercises: Array<{ event: string; position_dates: string }>;
  prior_experience: Array<{ dates: string; location: string; position: string }>;
  awards_prior: string;
  awards_38g: string;
  credentials: string;
  education: string;
  training_38g: Array<{ dates: string; course: string }>;
  clearance_level: string;
  clearance_exp: string;
  passport_personal: string;
  passport_official: string;
  languages: Array<{ language: string; listening: string; reading: string; speaking: string }>;
}

interface PdfField {
  field_id: string;
  description: string;
  page: number;
  value: string;
}

/**
 * Convert officer data to PDF field format
 */
function officerToPdfFields(officer: Officer): PdfField[] {
  const fields: PdfField[] = [];

  const addField = (id: string, desc: string, value: string) => {
    if (value) {
      fields.push({ field_id: id, description: desc, page: 1, value });
    }
  };

  // Profile section
  addField('3', 'Name', officer.name);
  addField('4', 'Rank', officer.rank);
  addField('5', 'Date Assigned', officer.date_assigned);
  addField('7', 'Position Title', officer.position_title);
  addField('9', 'MOS/Branch/Skill', officer.mos_skill);
  addField('10', 'Skill (Plain English)', officer.skill_plain);
  addField('11', 'Residence Location', officer.residence);
  addField('12', 'Civilian Occupation', officer.civilian_occupation);
  addField('2', 'Unit', officer.unit);
  addField('6', 'Additional Information', officer.additional_info);

  // Skills (12 slots)
  const skillFieldIds = ['13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24'];
  officer.skills.slice(0, 12).forEach((skill, i) => {
    addField(skillFieldIds[i], `Skill ${i + 1}`, skill);
  });

  // Deployments (4 rows)
  const deploymentFields = [
    { dates: '27', mission: '29', location: '30', position: '34' },
    { dates: '28', mission: '32', location: '33', position: '40' },
    { dates: '31', mission: '37', location: '39', position: '42' },
    { dates: '36', mission: '38', location: '41', position: '43' },
  ];
  officer.deployments.slice(0, 4).forEach((dep, i) => {
    addField(deploymentFields[i].dates, `Deployment ${i + 1} Dates`, dep.dates);
    addField(deploymentFields[i].mission, `Deployment ${i + 1} Mission`, dep.mission);
    addField(deploymentFields[i].location, `Deployment ${i + 1} Location`, dep.location);
    addField(deploymentFields[i].position, `Deployment ${i + 1} Position`, dep.position);
  });

  // Exercises (5 rows)
  const exerciseFields = [
    { event: '87', position: '86' },
    { event: '63', position: '64' },
    { event: '67', position: '68' },
    { event: '71', position: '72' },
    { event: '77', position: '78' },
  ];
  officer.exercises.slice(0, 5).forEach((ex, i) => {
    addField(exerciseFields[i].event, `Exercise ${i + 1} Event`, ex.event);
    addField(exerciseFields[i].position, `Exercise ${i + 1} Position/Dates`, ex.position_dates);
  });

  // Prior Experience (4 rows)
  const expFields = [
    { dates: '45', location: '46', position: '47' },
    { dates: '49', location: '50', position: '51' },
    { dates: '52', location: '53', position: '54' },
    { dates: '55', location: '56', position: '57' },
  ];
  officer.prior_experience.slice(0, 4).forEach((exp, i) => {
    addField(expFields[i].dates, `Experience ${i + 1} Dates`, exp.dates);
    addField(expFields[i].location, `Experience ${i + 1} Location`, exp.location);
    addField(expFields[i].position, `Experience ${i + 1} Position`, exp.position);
  });

  // Awards
  addField('35', 'Awards Prior', officer.awards_prior);
  addField('44', 'Awards as 38G', officer.awards_38g);

  // Education and credentials
  addField('48', 'Professional Credentials', officer.credentials);
  addField('58', 'Civilian Education', officer.education);

  // Training (5 rows)
  const trainingFields = [
    { dates: '59', course: '60' },
    { dates: '61', course: '62' },
    { dates: '65', course: '66' },
    { dates: '69', course: '70' },
    { dates: '75', course: '76' },
  ];
  officer.training_38g.slice(0, 5).forEach((tr, i) => {
    addField(trainingFields[i].dates, `Training ${i + 1} Dates`, tr.dates);
    addField(trainingFields[i].course, `Training ${i + 1} Course`, tr.course);
  });

  // Clearance
  addField('73', 'Clearance Level', officer.clearance_level);
  addField('74', 'Clearance Expiration', officer.clearance_exp);

  // Passports
  addField('79', 'Personal Passport Exp', officer.passport_personal);
  addField('80', 'Official Passport Exp', officer.passport_official);

  // Languages (first language only for now)
  if (officer.languages.length > 0) {
    const lang = officer.languages[0];
    addField('81', 'Language', lang.language);
    addField('82', 'Listening', lang.listening);
    addField('83', 'Reading', lang.reading);
    addField('85', 'Speaking', lang.speaking);
  }

  // Version
  addField('85_1', 'Version', new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));

  return fields;
}

/**
 * Run a Python script using the venv
 */
function runPythonScript(script: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    // Use venv Python if available, otherwise fall back to system python3
    const pythonPath = fs.existsSync('./venv/bin/python3') ? './venv/bin/python3' : 'python3';
    const python = spawn(pythonPath, [script, ...args]);
    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (data) => { stdout += data.toString(); });
    python.stderr.on('data', (data) => { stderr += data.toString(); });

    python.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`Python script failed: ${stderr}`));
      }
    });
  });
}

/**
 * Main function
 */
async function main() {
  const officerId = process.argv[2];
  if (!officerId) {
    console.error('Usage: npx tsx scripts/test-pdf-generation.ts <officer_id>');
    process.exit(1);
  }

  // Load officers
  const data = JSON.parse(fs.readFileSync(OFFICERS_JSON_PATH, 'utf-8'));
  const officer = data.officers.find((o: Officer) => o.id === officerId);

  if (!officer) {
    console.error(`Officer ${officerId} not found`);
    process.exit(1);
  }

  console.log(`Generating PDF for ${officer.rank} ${officer.name}...`);

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Convert officer to PDF fields
  const fields = officerToPdfFields(officer);
  console.log(`  Generated ${fields.length} PDF fields`);

  // Write fields to temp file
  const fieldsPath = path.join(OUTPUT_DIR, `${officerId}_fields.json`);
  fs.writeFileSync(fieldsPath, JSON.stringify(fields, null, 2));

  // Step 1: Fill PDF with text fields
  const filledPdfPath = path.join(OUTPUT_DIR, `${officerId}_filled.pdf`);
  console.log('  Filling PDF form fields...');
  await runPythonScript(FILL_PDF_SCRIPT, [
    path.resolve(PDF_TEMPLATE_PATH),
    fieldsPath,
    filledPdfPath,
  ]);

  // Step 2: Check for headshot
  const headshotPath = path.join(PHOTOS_DIR, `${officerId}.png`);
  const finalPdfPath = path.join(OUTPUT_DIR, `${officerId}.pdf`);

  if (fs.existsSync(headshotPath)) {
    console.log('  Flattening PDF and overlaying headshot...');

    // Headshot coordinates - matches Field '8' in template
    const HEADSHOT_X = 47;
    const HEADSHOT_Y = 111;
    const HEADSHOT_WIDTH = 104;
    const HEADSHOT_HEIGHT = 154;

    const overlayScript = `
import fitz
import sys

pdf_path = sys.argv[1]
headshot_path = sys.argv[2]
output_path = sys.argv[3]

doc = fitz.open(pdf_path)

# Flatten form fields
for page_num in range(len(doc)):
    p = doc[page_num]
    for widget in p.widgets():
        widget.update()

    annot = p.first_annot
    while annot:
        next_annot = annot.next
        if annot.type[0] == fitz.PDF_ANNOT_WIDGET:
            p.delete_annot(annot)
        annot = next_annot

# Insert headshot
page = doc[0]
rect = fitz.Rect(${HEADSHOT_X}, ${HEADSHOT_Y}, ${HEADSHOT_X + HEADSHOT_WIDTH}, ${HEADSHOT_Y + HEADSHOT_HEIGHT})
page.insert_image(rect, filename=headshot_path)

doc.save(output_path, garbage=4, deflate=True)
doc.close()
print("Done")
`;

    const scriptPath = path.join(OUTPUT_DIR, 'overlay.py');
    fs.writeFileSync(scriptPath, overlayScript);

    await runPythonScript(scriptPath, [filledPdfPath, headshotPath, finalPdfPath]);

    // Clean up intermediate files
    fs.unlinkSync(filledPdfPath);
    fs.unlinkSync(scriptPath);
  } else {
    console.log('  No headshot found, using filled PDF as final');
    fs.renameSync(filledPdfPath, finalPdfPath);
  }

  // Clean up fields file
  fs.unlinkSync(fieldsPath);

  console.log(`\n✓ Generated: ${finalPdfPath}`);
}

main().catch(console.error);
