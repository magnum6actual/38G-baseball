#!/usr/bin/env python3
"""Prepare local preview seed data from the versioned fictional roster and photos."""
from pathlib import Path
import json
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from demo_data import load_demo_officers

root = Path(__file__).resolve().parents[2]
officers = load_demo_officers()
seed = root / 'aip/platform/ontology/seed/001-officers.mts'
seed.write_text('import { TalentOfficer } from "@ontology/sdk";\nimport { createSeed } from "./$createSeed.mjs";\nconst officers = ' + json.dumps(officers, indent=2) + ';\nexport default createSeed(seed => { for (const officer of officers) seed.create(TalentOfficer, officer); });\n')
print(f'Prepared {len(officers)} fictional preview officers with original photo bytes.')
