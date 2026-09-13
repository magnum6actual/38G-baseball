import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { profileFromOfficer, officerParameters, mergeExtraction, validateExtraction, officerDetail, photoFromProfile } from '../app/src/lib/profile.ts';
import { parseTeams, searchProse } from '../app/src/lib/searchProtocol.ts';
import { sseData } from '../app/src/lib/sse.ts';
import { extractLegacyWord } from '../app/src/lib/documents.ts';

const profile={name:'Alex Testerson',mos_skill:'38G-TEST',skill_plain:'Water Infrastructure',residence:'Example City',clearance_exp:'2030',passport_personal:'2031',passport_official:'2032',education:'BS Civil Engineering',skills:['Water treatment'],languages:[{language:'Spanish',listening:'2',reading:'2',speaking:'1+'}],deployments:[{dates:'2020',mission:'Test',location:'Example',position:'Advisor'}],detail_data:'Searchable project details'};

test('editing a migrated card preserves the entire original field schema and search content',()=>{
  const imported=profileFromOfficer({id:'a',profileJson:JSON.stringify(profile)});
  const saved=officerParameters({...imported,rank:'CPT'});
  const recovered=JSON.parse(saved.profileJson);
  for(const [key,value] of Object.entries(profile))assert.deepEqual(recovered[key],value,key);
  for(const value of ['38G-TEST','2031','2032','Spanish','listening: 2','Searchable project details'])assert.ok(saved.searchableText.includes(value),value);
  assert.equal('ownerUserId' in saved,false);
});
test('malformed stored JSON cannot be silently replaced during editing',()=>{
  for(const profileJson of ['{','[]','null'])assert.throws(()=>profileFromOfficer({id:'a',profileJson}));
});
test('AI extraction cannot overwrite a manual edit made while it was pending',()=>{
  const merged=mergeExtraction({name:'Before',rank:'CPT'},{name:'Manual correction',rank:'CPT'},{name:'AI rewrite',rank:'MAJ'});
  assert.equal(merged.name,'Manual correction');assert.equal(merged.rank,'MAJ');
});
test('extraction accepts structured language scores and rejects corrupt rows or scalar types',()=>{
  assert.deepEqual(validateExtraction(profile).languages,profile.languages);
  assert.throws(()=>validateExtraction({languages:'Spanish'}));
  assert.throws(()=>validateExtraction({languages:[{language:'Spanish',speaking:2}]}));
  assert.throws(()=>validateExtraction({name:{text:'Test'}}));
});
const roster = [
  {id:'officer_012',rank:'MAJ',name:'Thomas K. Reilly'},
  {id:'officer_003',rank:'LTC',name:'Jennifer R. Okonkwo'},
  {id:'officer_008',rank:'CPT',name:'Michael R. Santos'},
  {id:'officer_011',rank:'CPT',name:'Elena V. Petrova'},
  {id:'officer_018',rank:'CPT',name:'Brian L. Murphy'},
  {id:'officer_006',rank:'LTC',name:'Robert J. Thornton'},
];
const ref=(id,tier='primary')=>{const o=roster.find(o=>o.id===id);return `[${o.rank} ${o.name}](officer:${tier}/${id})`;};
test('the reported six-officer answer yields exactly three primary and three additional references',()=>{
  const text=readFileSync(new URL('./fixtures/irrigation-answer.md',import.meta.url),'utf8');
  const result=parseTeams(text,roster);
  assert.deepEqual(result.primary,['officer_012','officer_003','officer_008']);
  assert.deepEqual(result.also,['officer_011','officer_018','officer_006']);
  assert.equal(result.prose.includes('officer:'),false);
  for(const o of roster)assert.ok(result.prose.includes(o.name));
});
test('the previous incomplete metadata cannot silently omit or demote named officers',()=>{
  assert.throws(()=>parseTeams('Core: MAJ Thomas K. Reilly, LTC Jennifer R. Okonkwo, CPT Michael R. Santos\nPRIMARY_TEAM: ["officer_012"]\nALSO_MENTIONED: ["officer_003"]',roster));
});
test('repeated mentions appear once in first recommendation order; primary membership wins',()=>{
  const result=parseTeams(`${ref('officer_003','also')} ${ref('officer_012')} ${ref('officer_003')} ${ref('officer_012')}`,roster);
  assert.deepEqual(result.primary,['officer_012','officer_003']);assert.deepEqual(result.also,[]);
});
test('unlinked full names, first/last names and unique surnames cannot disappear from the sidebar',()=>{
  for(const text of ['LTC Jennifer R. Okonkwo','Jennifer Okonkwo','Okonkwo','officer_003'])
    assert.throws(()=>parseTeams(`${ref('officer_012')} Other option: ${text}`,roster),/omitted/);
});
test('unknown IDs, wrong names and malformed references fail validation',()=>{
  for(const text of ['[MAJ Thomas K. Reilly](officer:primary/invented)', '[LTC Jennifer R. Okonkwo](officer:primary/officer_012)', '[MAJ Thomas K. Reilly](officer:other/officer_012)'])
    assert.throws(()=>parseTeams(text,roster));
});
test('no-match and alternative-only responses are valid',()=>{
  assert.deepEqual(parseTeams('No suitable match is available.',roster),{prose:'No suitable match is available.',primary:[],also:[]});
  assert.deepEqual(parseTeams(ref('officer_018','also'),roster).also,['officer_018']);
});
test('streamed references display names and never expose partial officer destinations',()=>{
  const markup=ref('officer_003');
  for(let end=1;end<markup.length;end++)assert.equal(searchProse('Answer '+markup.slice(0,end)),'Answer');
  assert.equal(searchProse('Answer '+markup),'Answer LTC Jennifer R. Okonkwo');
});
test('photo bytes and MIME types survive save, search details and reopen without entering model text',()=>{
  for(const [type,base64] of [['jpeg','/9j/AA=='],['png','iVBORw0KGgoAAA=='],['webp','UklGRgAAAAA=']]) {
    for(const value of [base64,`data:image/${type};base64,${base64}`]) {
      const saved=officerParameters({...profile,photo_original:value});
      const result=officerDetail({id:'a',...saved});
      assert.equal(result.photoUrl,`data:image/${type};base64,${base64}`);
      assert.equal(result.hasPhoto,true);
      assert.equal(result.profile.photo_original,value);
      assert.equal(saved.searchableText.includes(base64),false);
    }
  }
  assert.equal(photoFromProfile({photo_original:'https://untrusted.invalid/photo',photo_processed:'data:image/png;base64,iVBORw0KGgoAAA=='}),'data:image/png;base64,iVBORw0KGgoAAA==');
  assert.equal(photoFromProfile({photo_original:'data:image/svg+xml;base64,AA=='}),null);
});
test('SSE handles split CRLF boundaries and multi-byte UTF-8 without dropping events',async()=>{
  const bytes=new TextEncoder().encode('data: {"text":"café"}\r\n\r\ndata: [DONE]\r\n\r\n');
  const stream=new ReadableStream({start(controller){for(const byte of bytes)controller.enqueue(Uint8Array.of(byte));controller.close();}});
  const events=[];for await(const event of sseData(stream))events.push(event);
  assert.deepEqual(events,['{"text":"café"}','[DONE]']);
});
test('truncated SSE fails visibly instead of appearing complete',async()=>{
  const stream=new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode('data: {"text":'));controller.close();}});
  await assert.rejects(async()=>{for await(const event of sseData(stream))assert.fail(event);},/incomplete/);
});
test('real Word binary input retains name, MOS and language scores',async()=>{
  const text=await extractLegacyWord(readFileSync(new URL('./fixtures/resume.doc',import.meta.url)));
  for(const value of ['Alex Testerson','38G - TEST','Speaking 1+'])assert.ok(text.includes(value),value);
});
