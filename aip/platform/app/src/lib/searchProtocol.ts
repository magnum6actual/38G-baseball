export interface SearchOfficer { id: string; name: string; rank?: string }
const reference = /\[([^\]\n]+)\]\(officer:(primary|also)\/([^\s)]+)\)/g;
const normalize = (text:string) => text.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const includesWords = (text:string, words:string) => !!words && ` ${text} `.includes(` ${words} `);

// Identity and tier travel with the name in the answer, rather than in a second,
// independently generated list that can disagree with the prose.
export const SEARCH_REFERENCE_INSTRUCTIONS = `Every mention of an officer must be a Markdown reference in this exact form:
[the supplied rank and full name](officer:primary/the-exact-supplied-id) for a core recommendation, or
[the supplied rank and full name](officer:also/the-exact-supplied-id) for an alternative, comparison, or other reference.
Use these references inside your natural-language answer, including tables, lists, and follow-ups. Keep core recommendations ranked and alternatives separate. Mark every member of the requested core team primary, not just the first member. Reference every additional officer you mention as also. Repeated references are fine. Do not output a separate ID list or PRIMARY_TEAM/ALSO_MENTIONED metadata. Never show machine IDs as visible text. If there are no matches, explain without officer references.`;

export function searchProse(text:string):string {
  let prose=text.replace(reference,'$1');
  // Hide an unfinished reference while tokens are arriving. A completed response
  // with an unfinished/malformed reference is rejected by parseTeams below.
  prose=prose.replace(/\[[^\]\n]*(?:\](?:\([^)\n]*)?)?$/,'');
  return prose.trimEnd();
}

export function mentionedOfficers(prose:string, available:readonly SearchOfficer[]):string[] {
  const text=normalize(prose);
  return available.filter(officer=>{
    const name=normalize(officer.name);
    const parts=name.split(' ');
    const surname=parts.at(-1) || '';
    const uniqueSurname=available.filter(o=>normalize(o.name).split(' ').at(-1)===surname).length===1;
    return includesWords(text,normalize(officer.id)) || includesWords(text,name) ||
      (parts.length>2 && includesWords(text,`${parts[0]} ${surname}`)) ||
      (uniqueSurname && includesWords(text,surname));
  }).map(o=>o.id);
}

export function parseTeams(text:string, available:readonly SearchOfficer[]) {
  const primary:string[]=[]; const also:string[]=[];
  const allowed=new Map(available.map(officer=>[officer.id,officer]));
  for(const match of text.matchAll(reference)) {
    const [,label,tier,id]=match;
    const officer=allowed.get(id);
    if(!officer)throw new Error('AIP referenced an officer outside the available search results.');
    const name=normalize(officer.name);
    if(normalize(label)!==name && normalize(label)!==normalize(`${officer.rank || ''} ${officer.name}`))
      throw new Error('AIP attached a reference to the wrong officer name.');
    const team=tier==='primary'?primary:also;
    if(!team.includes(id))team.push(id);
  }
  const prose=text.replace(reference,'$1').trimEnd();
  if(/officer:|PRIMARY_TEAM:|ALSO_MENTIONED:/.test(prose))throw new Error('AIP returned malformed officer references.');
  // Check visible names (including unique surnames and omitted middle initials)
  // against the full roster, so even an unlinked mention cannot silently vanish.
  const missing=mentionedOfficers(prose,available).filter(id=>!primary.includes(id)&&!also.includes(id));
  if(missing.length)throw new Error(`AIP omitted sidebar references for: ${missing.join(', ')}.`);
  return {prose,primary,also:also.filter(id=>!primary.includes(id))};
}
