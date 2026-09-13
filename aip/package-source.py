#!/usr/bin/env python3
"""Build an allowlisted source handoff. Never package dev credentials or Marketplace state."""
from pathlib import Path
import hashlib,json,shutil,zipfile,argparse
from demo_data import load_demo_officers
ROOT=Path(__file__).resolve().parents[1]
PLATFORM=ROOT/'aip/platform'
parser=argparse.ArgumentParser();parser.add_argument('--stage-only',action='store_true');args=parser.parse_args()
stage=ROOT/'aip/delivery/38g-talent-source'
stage.mkdir(parents=True,exist_ok=True)
def copy(src,dst):
    dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(src,dst)
for folder in ['src']:
    for source in (PLATFORM/'app'/folder).rglob('*'):
        if source.is_file():copy(source,stage/'app'/source.relative_to(PLATFORM/'app'))
for name in ['index.html','tsconfig.json','postcss.config.mjs','eslint.config.mjs']:
    copy(PLATFORM/'app'/name,stage/'app'/name)
copy(PLATFORM/'tsconfig.base.json',stage/'tsconfig.base.json')
copy(PLATFORM/'ontology/src/ontology.mts',stage/'ontology/ontology.mts')
# Generated SDK source and runtime metadata contain type definitions, not deployed resources.
# Release inputs are checked in so packaging works from a clean Git checkout,
# without a developer enrollment, generated local SDK, or preinstalled packages.
sdk=ROOT/'aip/source-handoff/sdk'
for source in sdk.rglob('*'):
    if source.is_file():copy(source,stage/'ontology/sdk'/source.relative_to(sdk))
manifest=json.loads((ROOT/'aip/source-handoff/package.json').read_text())
copy(ROOT/'aip/source-handoff/package-lock.json',stage/'app/package-lock.json')
(stage/'app/package.json').write_text(json.dumps(manifest,indent=2)+'\n')
(stage/'app/vite.config.ts').write_text('''import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
const root=path.dirname(fileURLToPath(import.meta.url));
export default defineConfig({plugins:[react()],resolve:{alias:{'@':path.resolve(root,'src')}},server:{host:'127.0.0.1',port:8080}});
''')
(stage/'app/.npmrc').write_text('install-links=true\n')
(stage/'app/.env.example').write_text('''VITE_FOUNDRY_API_URL=https://YOUR-ENROLLMENT.example
VITE_FOUNDRY_ONTOLOGY_RID=YOUR-DESTINATION-ONTOLOGY-RID
VITE_FOUNDRY_CLIENT_ID=YOUR-DEVELOPER-CONSOLE-CLIENT-ID
VITE_FOUNDRY_REDIRECT_URL=https://YOUR-APP-HOST.example/auth/callback
VITE_USE_MOCK_AUTH=false
''')
(stage/'app/scripts').mkdir(exist_ok=True)
(stage/'app/scripts/check-config.mjs').write_text('''import { loadEnv } from 'vite';
const env={...loadEnv('production',process.cwd(),'VITE_'),...process.env};
const keys=['VITE_FOUNDRY_API_URL','VITE_FOUNDRY_ONTOLOGY_RID','VITE_FOUNDRY_CLIENT_ID','VITE_FOUNDRY_REDIRECT_URL'];
const missing=keys.filter(key=>!env[key]||env[key].includes('YOUR-'));
if(missing.length)throw new Error('Configure destination values before building: '+missing.join(', '));
if(env.VITE_USE_MOCK_AUTH==='true')throw new Error('Mock authentication cannot be used for a source installation.');
for(const key of ['VITE_FOUNDRY_API_URL','VITE_FOUNDRY_REDIRECT_URL'])if(!env[key].startsWith('https://'))throw new Error(key+' must use HTTPS for deployment.');
''')
for source in (PLATFORM/'tests').rglob('*'):
    if source.is_file():copy(source,stage/'tests'/source.relative_to(PLATFORM/'tests'))
for source in (ROOT/'aip/source-handoff/original-design').rglob('*'):
    if source.is_file():copy(source,stage/'original-design'/source.relative_to(ROOT/'aip/source-handoff/original-design'))
for source in (ROOT/'aip/demo-data').glob('*'):
    if source.is_file() and source.suffix=='.md':copy(source,stage/'demo-data'/source.name)
(stage/'demo-data/talent-officers.json').write_text(json.dumps(load_demo_officers(),indent=2)+'\n')
for source in (ROOT/'aip/source-handoff').glob('*.md'):
    target=stage/'ontology/CONTRACT.md' if source.name=='ONTOLOGY_CONTRACT.md' else stage/source.name
    copy(source,target)
(stage/'.gitignore').write_text('node_modules/\napp/dist/\n.env*\n!.env.example\n*.pem\n')

if args.stage_only:
    print(stage);raise SystemExit
lock=stage/'app/package-lock.json'
if not lock.exists():raise SystemExit('Run npm install in the staged app before packaging; a reproducible source handoff requires package-lock.json.')
locked=json.loads(lock.read_text())['packages']['']
for section in ['dependencies','devDependencies']:
    if locked.get(section)!=(manifest.get(section)):raise SystemExit('Staged dependency lock is stale. Run npm install in the staged app before packaging.')
# Explicit file allowlist. Building in this directory must never add installed dependencies, secrets, or compiled deployment assets to the source ZIP.
files=[]
for source in stage.rglob('*'):
    if not source.is_file():continue
    rel=source.relative_to(stage)
    if any(part in {'node_modules','dist','.git'} for part in rel.parts) and not str(rel).startswith('ontology/sdk/dist/'):continue
    if source.name.startswith('.env') and source.name!='.env.example':continue
    if source.name=='MANIFEST.sha256':continue
    if source.suffix not in {'.md','.json','.tsx','.ts','.mts','.mjs','.css','.html','.woff2','.map','.js','.txt','.doc','.docx','.pdf'} and source.name not in {'.env.example','.gitignore','.npmrc'}:continue
    files.append(source)
files.sort(key=lambda p:str(p.relative_to(stage)))
assert not any(p.suffix in {'.pem','.db'} or '.palantir' in p.parts for p in files)
(stage/'MANIFEST.sha256').write_text(''.join(f'{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.relative_to(stage).as_posix()}\n' for p in files))
files.append(stage/'MANIFEST.sha256')
archive=stage.parent/'38g-talent-source.zip'
temporary=archive.with_suffix('.tmp')
with zipfile.ZipFile(temporary,'w',zipfile.ZIP_DEFLATED,strict_timestamps=False) as out:
    for p in files:out.write(p,Path(stage.name)/p.relative_to(stage))
temporary.replace(archive)
print(json.dumps({'archive':str(archive),'bytes':archive.stat().st_size,'files':len(files),'sha256':hashlib.sha256(archive.read_bytes()).hexdigest()}))
