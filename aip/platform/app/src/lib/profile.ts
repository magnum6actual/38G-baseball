import type { BuilderProfile } from './builder';

export interface OfficerRecord {
  id: string;
  ownerUserId?: string;
  name?: string;
  rank?: string;
  unit?: string;
  specialty?: string;
  civilianOccupation?: string;
  skills?: string;
  languages?: string;
  clearance?: string;
  narrative?: string;
  profileJson?: string;
}

export function profileFromOfficer(officer: OfficerRecord): BuilderProfile {
  // Keep the complete original schema, including fields that are not visible on the card.
  const raw: unknown = JSON.parse(officer.profileJson || '{}');
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('This profile has invalid supplemental data. It cannot be edited safely.');
  const p = raw as BuilderProfile;
  return {
    ...p,
    name: p.name ?? officer.name,
    rank: p.rank ?? officer.rank,
    unit: p.unit ?? officer.unit,
    skill_plain: p.skill_plain ?? officer.specialty,
    civilian_occupation: p.civilian_occupation ?? officer.civilianOccupation,
    clearance_level: p.clearance_level ?? officer.clearance,
    additional_info: p.additional_info ?? officer.narrative,
    skills: Array.isArray(p.skills) ? p.skills : (officer.skills || '').split(/[,\n]/).map(s => s.trim()).filter(Boolean),
    languages: Array.isArray(p.languages) ? p.languages : officer.languages ? [{ language: officer.languages, listening: '', reading: '', speaking: '' }] : [],
  };
}

export function printableValue(value: unknown): string {
  if (Array.isArray(value)) return value.map(printableValue).join('\n');
  if (value && typeof value === 'object') return Object.entries(value).map(([key, item]) => `${key.replace(/_/g, ' ')}: ${printableValue(item)}`).join(' · ');
  return String(value ?? '');
}

export function searchableProfile(profile: BuilderProfile): string {
  return Object.entries(profile).filter(([key]) => !key.startsWith('photo_')).map(([key, value]) => `${key.replace(/_/g, ' ')}: ${printableValue(value)}`).join('\n');
}

export function officerParameters(profile: BuilderProfile) {
  if (!profile.name?.trim()) throw new Error('Enter your name on the card before saving.');
  return {
    name: profile.name.trim(), rank: profile.rank || '', unit: profile.unit || '',
    specialty: profile.skill_plain || '', civilianOccupation: profile.civilian_occupation || '',
    skills: printableValue(profile.skills), languages: printableValue(profile.languages),
    clearance: profile.clearance_level || '', narrative: profile.additional_info || '',
    profileJson: JSON.stringify(profile), searchableText: searchableProfile(profile),
  };
}

export function photoFromProfile(profile: BuilderProfile): string | null {
  for (const photo of [profile.photo_original, profile.photo_processed]) {
    if (!photo) continue;
    if (/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=\r\n]+$/.test(photo)) return photo;
    if (/^[A-Za-z0-9+/=\r\n]+$/.test(photo)) {
      // Legacy BuilderProfile values were bare base64. Preserve their actual MIME
      // type rather than labelling PNG/WebP bytes as JPEG.
      const prefix=photo.replace(/\s/g,'');
      const mime=prefix.startsWith('/9j/')?'jpeg':prefix.startsWith('iVBORw0KGgo')?'png':prefix.startsWith('UklGR')?'webp':null;
      if(mime)return `data:image/${mime};base64,${photo}`;
    }
  }
  return null;
}

export function officerDetail(officer: OfficerRecord) {
  const profile = profileFromOfficer(officer);
  const photoUrl = photoFromProfile(profile);
  return {
    id: officer.id, ownerUserId: officer.ownerUserId, profile,
    name: profile.name || '', rank: profile.rank || '', unit: profile.unit || '',
    mos_skill: profile.mos_skill || '', clearance_level: profile.clearance_level || '',
    skills: printableValue(profile.skills), languages: printableValue(profile.languages),
    experience: printableValue(profile.prior_experience), deployments: printableValue(profile.deployments),
    education: profile.education || '', civilian_occupation: profile.civilian_occupation || '',
    additional_info: profile.additional_info || '',
    summary: `${profile.mos_skill || profile.skill_plain || ''}. ${profile.civilian_occupation || ''}`,
    hasPhoto: !!photoUrl, photoUrl,
  };
}

// An extraction may finish after an officer manually edits the preview. Keep those edits.
export function mergeExtraction(base: BuilderProfile, current: BuilderProfile, extracted: BuilderProfile): BuilderProfile {
  const merged = { ...current } as Record<string, unknown>;
  const before = base as Record<string, unknown>;
  for (const [key, value] of Object.entries(extracted)) {
    if (JSON.stringify(merged[key]) === JSON.stringify(before[key])) merged[key] = value;
  }
  return merged as BuilderProfile;
}

export function validateExtraction(raw: unknown): BuilderProfile {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('AIP returned an invalid profile update. Your card was preserved.');
  const scalars = ['name','rank','unit','date_assigned','position_title','mos_skill','skill_plain','residence','civilian_occupation','awards_prior','awards_38g','credentials','education','clearance_level','clearance_exp','passport_personal','passport_official','additional_info','detail_data'];
  const rows: Record<string,string[]> = {deployments:['dates','mission','location','position'], prior_experience:['dates','location','position'], exercises:['event','position_dates'], training_38g:['dates','course'], languages:['language','listening','reading','speaking']};
  const result: Record<string,unknown> = {};
  for (const [key,value] of Object.entries(raw)) {
    if (scalars.includes(key)) { if (typeof value !== 'string') throw new Error(`Invalid ${key} in profile update.`); result[key] = value; }
    else if (key === 'skills') { if (!Array.isArray(value) || value.some(v => typeof v !== 'string')) throw new Error('Invalid skills in profile update.'); result[key] = value; }
    else if (rows[key]) {
      if (!Array.isArray(value)) throw new Error(`Invalid ${key} in profile update.`);
      result[key] = value.map(row => {
        if (!row || typeof row !== 'object' || rows[key].some(field => typeof row[field] !== 'string')) throw new Error(`Invalid ${key} row in profile update.`);
        return Object.fromEntries(rows[key].map(field => [field,row[field]]));
      });
    }
  }
  return result;
}
