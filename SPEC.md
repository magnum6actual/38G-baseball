# 38G Talent Search - Product Specification

## Overview

A prototype system for discovering 38G Military Government Specialist talent through natural language search and guided profile creation. Two interfaces: one for commanders to search the talent pool via conversational AI, one for officers to build their baseball cards through an interview flow.

**Goal:** Build a working demo to secure USACAPOC and OCAR support for production development.

**Primary Success Metric:** Search quality - commanders can find exactly the right person through natural conversation, proving the RAG architecture works.

**Stakeholders:**
- OCAR (operator) - runs the system
- USACAPOC (client) - consumes the talent data
- CDAO (infrastructure) - provides Azure hosting and LLM access

## User Journeys

### Journey 1: Commander Search

A commander or staff officer needs to find 38G specialists for a mission.

1. Opens the search interface at `/search`
2. Types natural language query: "I need someone who understands threat finance and speaks Arabic"
3. LLM searches the talent database using RAG, reasons over all officer data
4. **Returns curated results** - not a list, but intelligent recommendations:
   - "I found 3 excellent candidates for your needs. The best match is MAJ Rodriguez because..."
   - Side panel shows officer preview cards (photo, name, rank, unit, LLM-generated summary)
   - Additional candidates available if top picks aren't right
5. Commander can:
   - Click any card to view full profile/PDF
   - Ask follow-up questions (full session memory maintained)
   - Ask about specific officers by name ("tell me more about Captain Smith")
   - Download PDF cards of selected candidates

**Clearance Handling:** Skills are the primary match criteria. Clearance is a strong preference but not a hard filter - commanders may upgrade clearances for the right candidate. LLM surfaces the best skill matches while noting clearance status, ranking cleared candidates higher but not hiding uncleared talent.

**Partial Matches:** Query-dependent. If great matches exist, LLM shows those. If results are sparse, LLM shows near-misses with explicit gap explanations ("has TS/SCI and threat finance but speaks Farsi, not Arabic").

**Supplemental Data:** Officers can have detail data beyond what fits on the card. The LLM can reference this in responses ("MAJ Smith also has JSOC experience not reflected on their card") but commanders see only the card when viewing profiles.

### Journey 2: Officer Profile Creation

A 38G officer needs to create their baseball card.

1. Opens the card builder interface at `/builder`
2. **Document upload** - can upload resume and any supporting documents at any time during the process. No restrictions on document types.
3. LLM extracts what it can, then conducts conversational interview:
   - Probes for interesting details ("You mentioned JSOC - tell me more about that work")
   - Asks about missing information naturally
   - Validates nothing rigidly - user is authoritative on their own career
   - Accepts sparse profiles for new officers
4. **Headshot capture:**
   - Officer uploads their photo
   - System sends to Google Gemini API for professionalization (prompt provided separately)
   - Generated image shown for approval
   - If rejected: can regenerate, use original, or upload different photo
5. **Supplemental detail capture:**
   - Throughout interview, LLM probes for details
   - At end: "Anything else you want searchable but not on your card?"
   - Can upload additional documents anytime
6. Officer says "generate my card" when ready (no minimum required fields)
7. **Completion screen:**
   - Preview of generated profile
   - Download button for PDF
   - Option to start new session
8. Profile added to searchable database with embeddings

**Data Authority:** User corrections always win. No formal extraction review - the interview flow naturally corrects any misreadings.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Frontend                                        │
│                    (Next.js + Tailwind + shadcn/ui)                         │
│                                                                              │
│   ┌─────────────────────────────────┐   ┌─────────────────────────────────┐ │
│   │         /search                  │   │          /builder               │ │
│   │  ┌──────────────┬──────────────┐│   │                                 │ │
│   │  │   Chat       │   Results    ││   │   Chat Interface                │ │
│   │  │   Panel      │   Panel      ││   │   + Document Upload             │ │
│   │  │              │ (officer     ││   │   + Headshot Capture            │ │
│   │  │              │  cards)      ││   │   → Completion Screen           │ │
│   │  └──────────────┴──────────────┘│   │                                 │ │
│   └─────────────────────────────────┘   └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         API Layer (Next.js)                                  │
│                                                                              │
│   /api/chat/search     - Search conversation endpoint                        │
│   /api/chat/builder    - Card builder conversation endpoint                  │
│   /api/officers        - Officer record operations                           │
│   /api/officers/:id/pdf - PDF download                                       │
│   /api/headshot        - Gemini professionalization endpoint                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
         │                           │                        │
         ▼                           ▼                        ▼
┌─────────────────┐    ┌─────────────────────────┐    ┌─────────────────┐
│   Claude API    │    │   SQLite (Document-style)│    │   Gemini API    │
│   (via CDAO)    │    │   + sqlite-vec           │    │   (Headshots)   │
│                 │    │                          │    │                 │
│ - Search RAG    │    │ - Officer profiles (JSON)│    │ - Photo         │
│ - Card interview│    │ - Supplemental detail    │    │   professionalize│
│ - Summaries     │    │ - Embeddings (vectors)   │    │                 │
│                 │    │ - PDF blobs              │    │                 │
│                 │    │ - Chat history           │    │                 │
└─────────────────┘    └─────────────────────────┘    └─────────────────┘
                                    │
                                    ▼
                       ┌─────────────────────────┐
                       │   OpenAI Embeddings     │
                       │   (text-embedding-3-small)│
                       └─────────────────────────┘
```

## Tech Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| UI Framework | Next.js 14+ (App Router) | Modern React, good DX, Azure-deployable |
| Styling | Tailwind + shadcn/ui | Rapid development, consistent design |
| Chat UI | Evaluate: vercel/ai-chatbot vs fresh build | Use if helpful, don't force if overhead |
| LLM - Primary | Claude (via Anthropic API) | CDAO has access, best for reasoning |
| LLM - Headshots | Google Gemini (AI Studio) | Image generation via `@google/generative-ai` SDK |
| Database | SQLite + sqlite-vec | Document-style JSON storage, vector search, portable |
| Embeddings | Google `text-embedding-004` | Consolidates with Gemini under one API key |
| PDF Generation | `fill_pdf.py` (pypdf + PyMuPDF) | pypdf for text fields, PyMuPDF overlays headshot |
| Deployment | Docker container on Azure | Consistent environments, flexible |

## Data Model

The database is document-centric. Officers have minimal structured identifiers plus free-text fields. The LLM handles formatting free text into PDF fields at generation time.

### Officers Table
```sql
CREATE TABLE officers (
  id TEXT PRIMARY KEY,

  -- Core identifiers (structured for display)
  name TEXT NOT NULL,
  rank TEXT,
  unit TEXT,
  clearance_level TEXT,

  -- Profile content (free text - LLM formats for PDF)
  mos_skill TEXT,
  skills TEXT,                    -- Free text, not arrays
  experience TEXT,                -- Free text narrative
  deployments TEXT,               -- Free text narrative
  languages TEXT,                 -- Free text (e.g., "fluent Arabic, conversational Farsi")
  education TEXT,
  civilian_occupation TEXT,
  credentials TEXT,
  awards TEXT,
  additional_info TEXT,           -- Rich narrative for the card

  -- Supplemental detail (searchable but not on card)
  detail_data TEXT,               -- Extended info beyond card capacity

  -- LLM-generated content
  summary TEXT,                   -- Generated at creation time, shown in search results

  -- File storage
  pdf_blob BLOB,                  -- Generated PDF
  photo_blob BLOB,                -- Professionalized headshot
  photo_original_blob BLOB,       -- Original uploaded photo

  -- Metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Embeddings Table
```sql
CREATE TABLE embeddings (
  id INTEGER PRIMARY KEY,
  officer_id TEXT REFERENCES officers(id) UNIQUE,  -- One embedding per officer
  text_content TEXT,              -- Full concatenated text that was embedded
  embedding BLOB,                 -- Vector from Google text-embedding-004

  FOREIGN KEY (officer_id) REFERENCES officers(id) ON DELETE CASCADE
);
```

**Note:** Single embedding per officer (no chunking) - text volume doesn't warrant it at this scale.

### Conversations Table
```sql
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  type TEXT,                      -- 'search' or 'builder'
  officer_id TEXT,                -- For builder: links to created officer
  messages JSON,                  -- Full conversation history
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Search Flow (RAG)

1. **User query** → "Find someone with threat finance experience who speaks Arabic"

2. **Full session context** - All previous queries and refinements are included. "Now filter by TS clearance" works without restating original query.

3. **Vector search:**
   - Embed query using Google `text-embedding-004`
   - Vector similarity search across officer embeddings
   - No structured SQL filters (skills are free text)
   - Embeddings handle synonyms: "threat finance" finds "illicit finance", "financial crimes"

4. **LLM reasoning over results:**
   - Analyzes all matching officers
   - Considers clearance as preference, not hard filter
   - Can reference supplemental detail data not on cards
   - Selects top candidates with reasoning

5. **Curated response:**
   ```
   "I found 3 excellent candidates for your threat finance mission:

   **Best match: MAJ Sarah Rodriguez** - 8 years in Treasury's illicit finance
   division, fluent Arabic, TS/SCI cleared. Her JSOC experience (not shown on
   her card) includes direct threat finance targeting.

   **Also strong: CPT James Chen** - Financial crimes investigator, speaks
   Mandarin (not Arabic), but deep threat finance expertise. Would need
   language support.

   **Consider: MAJ David Park** - SECRET clearance (upgradeable), solid
   sanctions evasion background.

   Want details on any of these, or should I look for additional candidates?"
   ```

6. **Results panel** updates with officer preview cards

## Card Builder Flow

1. **Start conversation** at `/builder`

2. **Document handling:**
   - User can upload documents anytime (resume suggested, anything accepted)
   - LLM extracts relevant information
   - No formal confirmation step - interview naturally corrects errors

3. **Interview conversation:**
   - LLM asks about missing fields conversationally
   - Probes interesting items for detail
   - Groups related questions naturally
   - Sparse responses accepted (new officers may have little to say)

4. **Headshot flow:**
   - User uploads their photo (in uniform)
   - User optionally enters enhancement requests (e.g., "reduce under-eye bags, soften wrinkles")
   - System sends to Gemini API:
     - User's photo + bundled `Style_Reference.png`
     - Prompt template with officer's name/rank + enhancement requests
   - Returns professional headshot (grey backdrop, flag, studio lighting)
   - User approves or: regenerate, use original, upload different photo

5. **Detail capture:**
   - Throughout: LLM probes for interesting details
   - End: "Anything else you want searchable but not on your card?"
   - Anytime: additional document uploads

6. **Generation trigger:**
   - User says "I'm done" or "generate my card"
   - No minimum required fields

7. **PDF generation:**
   - Transform profile_data JSON → PDF field format (see `38g-card-builder/assets/example-data.json`)
   - LLM formats `additional_info` to fit ~200 word limit
   - Call `fill_pdf.py` subprocess with field JSON
   - Create embeddings for all text content (search_text)
   - Generate summary for search results

8. **Completion screen:**
   - Profile preview
   - PDF download button
   - "Start new" option

## API Endpoints

### POST /api/chat/search
Handles search conversation with full RAG.

**Request:**
```json
{
  "conversationId": "uuid",
  "message": "Find someone with threat finance experience"
}
```

**Response:**
```json
{
  "conversationId": "uuid",
  "response": "I found 3 excellent candidates...",
  "officers": [
    {
      "id": "uuid",
      "name": "MAJ Sarah Rodriguez",
      "rank": "MAJ",
      "unit": "352nd CA BDE",
      "summary": "Threat finance expert with JSOC experience...",
      "photoUrl": "/api/officers/uuid/photo"
    }
  ]
}
```

### POST /api/chat/builder
Handles card builder conversation.

**Request:**
```json
{
  "conversationId": "uuid",
  "message": "My clearance is TS/SCI",
  "documents": ["base64-encoded-file"]  // Optional
}
```

**Response:**
```json
{
  "conversationId": "uuid",
  "response": "Great. Now tell me about your deployments...",
  "state": "interviewing" | "headshot" | "complete",
  "profile": { ... }  // Current extracted profile
}
```

### POST /api/headshot
Process headshot through Gemini.

**Request:**
```json
{
  "subjectImage": "base64-encoded-image",
  "name": "CULBRETH",
  "rank": "Major (oak leaf)",
  "enhancements": "reduce under-eye bags, soften wrinkles"  // optional
}
```

System combines with bundled `Style_Reference.png` and prompt template.

**Response:**
```json
{
  "processedImage": "base64-encoded-result",
  "success": true
}
```

### GET /api/officers/:id
Get officer profile.

### GET /api/officers/:id/pdf
Download officer PDF.

### GET /api/officers/:id/photo
Get officer headshot.

## UI Components

### Search Interface (`/search`)
- **Left panel:** Chat conversation
  - Message list (user + assistant)
  - Text input with send button
  - Full session memory - refinements build on previous queries

- **Right panel:** Results
  - Officer preview cards appear after searches
  - Each card shows: photo, name, rank, unit, LLM summary
  - Click card to view full profile/download PDF
  - Bulk download option for selected cards

### Card Builder Interface (`/builder`)
- Chat message list
- Text input with send button
- Document upload zone (drag-drop or click) - always available
- Headshot upload with:
  - Photo upload zone
  - Optional text input for enhancement requests (e.g., "reduce shadows, soften wrinkles")
  - Preview of generated headshot with approve/regenerate/use original options
- Progress indicator during PDF generation
- **Completion screen** when done:
  - Profile summary preview
  - Download PDF button
  - Start new session option

### Shared
- `/` redirects to `/search` (search is the landing page)
- `/builder` for card creation
- Light Army styling (gold/black color scheme)
- Responsive design (not mobile-optimized for prototype)

## Configuration

Environment variables:
```
ANTHROPIC_API_KEY=         # Claude API access
GOOGLE_API_KEY=            # Gemini (headshots) + embeddings
DATABASE_PATH=             # SQLite file path (default: ./data/38g.db)
PDF_TEMPLATE_PATH=         # Path to blank baseball card PDF
```

## Error Handling

Keep it simple for the prototype:
- API failures: Return detailed error message, stop operation
- No auto-retry logic
- No graceful degradation
- User sees clear error and can retry manually

## Development Phases

### Phase 1: Foundation
- Set up Next.js project structure
- Configure SQLite + sqlite-vec
- Basic two-page navigation (`/search`, `/builder`)
- Claude API integration
- OpenAI embeddings integration

### Phase 2: Search Implementation
- Officer data model
- Seed database with test data (JSON file provided)
- Embedding generation pipeline
- RAG search flow with hybrid vector search
- Search chat interface with side panel results
- Officer preview cards with photo/summary

### Phase 3: Card Builder Implementation
- Document upload handling (any type, anytime)
- Interview conversation flow
- Headshot flow with Gemini integration
- PDF generation integration
- Profile creation and embedding
- Summary generation
- Completion screen

### Phase 4: Polish + Deploy
- Light Army styling
- Conversation persistence (server-side)
- Error handling
- Docker containerization
- Azure deployment
- Demo video

## PDF Generation

Uses the existing `38g-card-builder` skill infrastructure with photo overlay:

**Two-step process:**
1. **Fill text fields** - `fill_pdf.py` with pypdf
2. **Overlay headshot** - PyMuPDF (fitz) places image at photo coordinates

**Template:** `38g-card-builder/assets/template.pdf` (with blank photo area - no placeholder image)

**Script:** `38g-card-builder/scripts/fill_pdf.py`
```bash
python fill_pdf.py <template.pdf> <field_values.json> <output.pdf>
```

**Field format:** Array of objects with `field_id`, `value`, `page`, `description`
```json
[
  {"field_id": "3", "value": "John Smith", "page": 1, "description": "Name"},
  {"field_id": "4", "value": "MAJ", "page": 1, "description": "Rank"},
  ...
]
```

**Field reference:** `38g-card-builder/references/field-definitions.md` - Complete mapping of 87+ PDF fields including:
- Profile fields (name, rank, unit, MOS, etc.)
- 12 skill slots (2 columns × 6 rows)
- 4 deployment rows
- 4 prior experience rows
- 5 training rows
- 5 exercise rows
- Languages, clearance, passports

**LLM transformation:** During PDF generation, the LLM takes free-text officer data and formats it into the PDF field array. The field-definitions.md provides constraints (e.g., 12 skill slots, ~200 word additional_info limit).

## Test Data

**File:** `fictional_officers.json` - 20 fictional 38G officers for testing

This is **seed data only** - structured for convenience in generating test PDFs. The production system stores free text, not this structured format.

**Seed process:**
1. Transform JSON officers → free text fields for database
2. Generate PDFs using the structured data directly (one-time seed)
3. Generate embeddings from the text content
4. Generate LLM summaries for each officer

## Future Features (Out of Scope for Prototype)

These are noted for design consideration but not implemented:

- **Clickable PDF editor:** Show PDF preview where users click fields to edit directly. Design: highlight on hover to show editable regions.
- **Authentication/authorization:** CDAO handles later
- **Profile updates:** Currently overwrite-only, no versioning
- **Duplicate detection:** One card per person logic (detect by name/email)
- **User tracking:** Recently viewed, saved candidates
- **Photo upload to existing cards**
- **Analytics/reporting**
- **Mobile optimization**

## Success Criteria

1. **Primary:** Commander finds exactly the right person through natural conversation - proves RAG works
2. Officer creates their card through painless conversational interview
3. Generated PDFs match the official template format
4. System deploys and runs on Azure
5. Demo video shows both flows end-to-end

## References

**External:**
- vercel/ai-chatbot: https://github.com/vercel/ai-chatbot (evaluate for use)
- sqlite-vec: https://github.com/asg017/sqlite-vec
- pypdf: https://pypi.org/project/pypdf/ (text field filling)
- PyMuPDF: https://pypi.org/project/PyMuPDF/ (headshot overlay)
- @google/generative-ai: https://www.npmjs.com/package/@google/generative-ai (Gemini SDK)

**Local resources:**
- `fictional_officers.json` - 20 test officers (seed data only)
- `38g-card-builder/` - PDF generation skill
  - `scripts/fill_pdf.py` - PDF field filling script
  - `assets/template.pdf` - Blank baseball card template
  - `assets/example-data.json` - Complete field mapping example (MAJ Culbreth)
  - `references/field-definitions.md` - All 87+ PDF field specifications
  - `SKILL.md` - Interview flow guidance
- `gemini-image-prompt.txt` - Headshot generation prompt template
- `Style_Reference.png` - Professional headshot style reference (grey backdrop, flag, studio lighting)
