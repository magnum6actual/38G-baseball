import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { generatePdfFields, BuilderProfile } from '@/lib/builder';
import { generatePdf, parsePdfFields } from '@/lib/pdf';
import { createOfficer, saveEmbedding } from '@/lib/db';
import { generateEmbedding } from '@/lib/embeddings';
import { generateOfficerSummary } from '@/lib/claude';

interface GeneratePdfRequest {
  profile: BuilderProfile;
  headshotBase64?: string;
  saveToDatabase?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: GeneratePdfRequest = await request.json();
    const { profile, headshotBase64, saveToDatabase = true } = body;

    if (!profile || !profile.name) {
      return NextResponse.json(
        { error: 'Profile with name is required' },
        { status: 400 }
      );
    }

    // Step 1: Transform profile to PDF fields using Claude
    console.log('Transforming profile to PDF fields...');
    const pdfFieldsJson = await generatePdfFields(profile);
    const pdfFields = parsePdfFields(pdfFieldsJson);

    // Step 2: Generate the PDF
    console.log('Generating PDF...');
    const pdfBuffer = await generatePdf(pdfFields, headshotBase64);

    // Step 3: Optionally save to database
    let officerId: string | null = null;
    if (saveToDatabase) {
      officerId = uuidv4();
      console.log('Saving officer to database...');

      // Generate summary for search
      const summary = await generateOfficerSummary(JSON.stringify(profile));

      // Create officer record
      const officer = createOfficer({
        id: officerId,
        name: profile.name,
        rank: profile.rank || '',
        unit: profile.unit || '',
        clearance_level: profile.clearance_level || '',
        mos_skill: profile.mos_skill || '',
        skills: profile.skills?.join(', ') || '',
        experience: profile.prior_experience?.map(e => `${e.dates}: ${e.position} at ${e.location}`).join('; ') || '',
        deployments: profile.deployments?.map(d => `${d.dates}: ${d.mission} - ${d.location}`).join('; ') || '',
        languages: profile.languages?.map(l => `${l.language} (${l.speaking})`).join(', ') || '',
        education: profile.education || '',
        civilian_occupation: profile.civilian_occupation || '',
        credentials: profile.credentials || '',
        awards: [profile.awards_prior, profile.awards_38g].filter(Boolean).join('; ') || '',
        additional_info: profile.additional_info || '',
        detail_data: profile.detail_data || JSON.stringify(profile),
        summary,
        pdf_blob: pdfBuffer,
        photo_blob: headshotBase64 ? Buffer.from(headshotBase64, 'base64') : null,
        photo_original_blob: profile.photo_original ? Buffer.from(profile.photo_original, 'base64') : null,
      });

      // Generate and save embedding for search
      console.log('Generating embedding...');
      const searchableText = [
        profile.name,
        profile.rank,
        profile.unit,
        profile.mos_skill,
        profile.skill_plain,
        profile.civilian_occupation,
        profile.skills?.join(', '),
        profile.additional_info,
        profile.detail_data,
        summary,
      ].filter(Boolean).join(' ');

      const embedding = await generateEmbedding(searchableText);
      saveEmbedding(officerId, embedding);

      console.log('Officer saved:', officerId);
    }

    // Return PDF as base64
    const pdfBase64 = pdfBuffer.toString('base64');

    return NextResponse.json({
      success: true,
      pdfBase64,
      officerId,
      pdfUrl: officerId ? `/api/officers/${officerId}/pdf` : null,
    });
  } catch (error) {
    console.error('PDF generation error:', error);

    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';

    return NextResponse.json(
      { error: `PDF generation failed: ${errorMessage}`, success: false },
      { status: 500 }
    );
  }
}
