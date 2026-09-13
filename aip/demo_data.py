"""Materialize the fictional roster using the original, already-versioned photos."""
from pathlib import Path
import base64
import json

ROOT = Path(__file__).resolve().parents[1]

def load_demo_officers():
    officers = json.loads((ROOT / 'aip/demo-data/talent-officers.json').read_text())
    expected = {f'officer_{i:03}' for i in range(1, 21)}
    if {officer['id'] for officer in officers} != expected or len(officers) != 20:
        raise ValueError('The demo roster must contain only the original 20 fictional officers.')
    for officer in officers:
        # Historical filenames end in .png, but their bytes are JPEG. Never infer
        # the MIME type from the filename or modify the original image bytes.
        photo = (ROOT / 'generated_photos' / f'{officer["id"]}.png').read_bytes()
        mime = 'image/jpeg' if photo.startswith(b'\xff\xd8\xff') else 'image/png' if photo.startswith(b'\x89PNG\r\n\x1a\n') else None
        if not mime:
            raise ValueError(f'Unsupported demo image: {officer["id"]}')
        profile = json.loads(officer['profileJson'])
        profile['photo_processed'] = f'data:{mime};base64,{base64.b64encode(photo).decode()}'
        officer['profileJson'] = json.dumps(profile, separators=(',', ':'))
    return officers
