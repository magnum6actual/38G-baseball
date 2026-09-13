export interface ParsedDocument { filename:string; text:string }

// MS-DOC text pieces: https://learn.microsoft.com/en-us/openspecs/office_file_formats/ms-doc/01d5d8c4-cf9c-4ef9-80fd-439e763cfe01
// FcCompressed: https://learn.microsoft.com/en-us/openspecs/office_file_formats/ms-doc/aa2e55a2-f4f2-4795-bab5-6d9d7a0ed249
export async function extractLegacyWord(bytes:Uint8Array):Promise<string> {
  const cfb=await import('cfb');
  const file=cfb.read(bytes,{type:'array'});
  const entry=cfb.find(file,'WordDocument');
  if (!entry) throw new Error('This DOC file is not a Word binary document. Save it as DOCX and upload again.');
  const word=new Uint8Array(entry.content);
  const w=new DataView(word.buffer,word.byteOffset,word.byteLength);
  if (word.length<0x1aa || w.getUint16(0,true)!==0xa5ec || w.getUint16(2,true)<0xc1) throw new Error('This older DOC format must be saved as DOCX before uploading.');
  const flags=w.getUint16(0x0a,true);
  if (flags & 0x8100) throw new Error('Remove the document password before uploading.');
  const tableEntry=cfb.find(file,flags & 0x0200 ? '1Table':'0Table');
  if (!tableEntry) throw new Error('The DOC text table is missing.');
  const table=new Uint8Array(tableEntry.content);
  const t=new DataView(table.buffer,table.byteOffset,table.byteLength);
  let offset=w.getUint32(0x1a2,true);
  const end=offset+w.getUint32(0x1a6,true);
  if (end>table.length) throw new Error('The DOC text table is damaged.');
  while(offset<end && table[offset]===1) offset+=3+t.getUint16(offset+1,true);
  if(offset+5>end || table[offset]!==2) throw new Error('The DOC text pieces could not be read.');
  const length=t.getUint32(offset+1,true);
  const count=(length-4)/12;
  const start=offset+5;
  if (!Number.isInteger(count) || count<0 || start+length>end) throw new Error('The DOC text pieces are damaged.');
  const mainCharacters=w.getUint32(0x4c,true);
  let text='';
  for(let i=0;i<count;i++) {
    const from=t.getUint32(start+i*4,true);
    const to=Math.min(t.getUint32(start+(i+1)*4,true),mainCharacters);
    if (from>=mainCharacters) break;
    const fc=t.getUint32(start+(count+1)*4+i*8+2,true);
    const compressed=!!(fc&0x40000000);
    const position=(fc&0x3fffffff)/(compressed?2:1);
    const size=(to-from)*(compressed?1:2);
    if (size<0 || position+size>word.length) throw new Error('The DOC contains an invalid text location.');
    text+=new TextDecoder(compressed?'windows-1252':'utf-16le').decode(word.slice(position,position+size));
  }
  // eslint-disable-next-line no-control-regex -- Word field markers and binary text controls must be removed.
  return text.replace(/\x13[^\x14\x15]*\x14/g,'').replace(/[\x13-\x15]/g,'').replace(/[\r\x07\x0b\x0c]/g,'\n').replace(/[\x00-\x08\x0e-\x1f]/g,'').trim();
}

export async function parseDocument(file:File):Promise<ParsedDocument> {
  const extension=file.name.split('.').pop()?.toLowerCase();
  let text='';
  if(extension==='txt'||extension==='md') text=await file.text();
  else if(extension==='docx') {
    const mammoth=await import('mammoth');
    text=(await mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()})).value;
  } else if(extension==='doc') text=await extractLegacyWord(new Uint8Array(await file.arrayBuffer()));
  else if(extension==='pdf') {
    const pdfjs=await import('pdfjs-dist');
    const worker=await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
    pdfjs.GlobalWorkerOptions.workerSrc=worker.default;
    const task=pdfjs.getDocument({data:await file.arrayBuffer()});
    try {
      const document=await task.promise;
      const pages:string[]=[];
      for(let i=1;i<=document.numPages;i++) {
        const page=await document.getPage(i);
        const content=await page.getTextContent();
        pages.push(content.items.map(item=>'str' in item ? item.str+('hasEOL' in item && item.hasEOL?'\n':' '):'').join(''));
      }
      text=pages.join('\n\n');
    } finally { await task.destroy(); }
  } else throw new Error('Choose a TXT, Markdown, PDF, DOC, or DOCX document.');
  if(!text.trim()) throw new Error(`${file.name} contains no extractable text. Upload a text-based document or paste its contents into the interview.`);
  return {filename:file.name,text:text.trim()};
}
