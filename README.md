# 38G Talent Search

Military Government Specialist (38G) talent discovery and profile management system. Enables commanders to find specialists through natural language search and allows officers to create their "baseball card" profiles through an AI-guided interview.

## Current Status

**Working:**
- Search interface with RAG-powered officer discovery
- Streaming responses with real-time text display
- Markdown rendering with GFM table support
- Smart result grouping (primary team vs also-referenced officers)
- Officer detail modal with photo display
- Card Builder interview flow UI
- Headshot generation via Gemini 3 Pro Image Preview (with auto-resize for large photos)
- PDF generation with headshot overlay (flatten form fields → insert image)
- Database seeded with 20 fictional officers (with AI-generated photos and PDFs)
- All API integrations tested and functional

**Needs Testing:**
- Full Card Builder end-to-end flow (interview → headshot → PDF generation)

## Features

### Search Interface (`/search`)
- Natural language talent discovery using RAG (Retrieval-Augmented Generation)
- **Streaming responses** - see Claude's recommendations as they generate in real-time
- Semantic search across officer profiles
- Conversational refinement with context memory
- Markdown rendering with full table support (GFM)
- Officer preview cards with photos and summaries
- **Smart result grouping** - primary team recommendations separated from also-referenced officers
- Full profile detail modal with PDF download

### Card Builder (`/builder`)
- AI-guided interview flow for profile creation
- Document upload support (resume, certifications)
- Professional headshot generation using Google Gemini 3 Pro Image Preview
- Automatic image resizing for large phone photos
- Automated PDF generation from interview data
- Integration with search database

## Prerequisites

- Node.js 20+
- Python 3.9+ (for PDF generation)
- API keys for:
  - Claude API via Azure AI Foundry
  - Azure OpenAI (for embeddings)
  - Google AI Studio (for Gemini headshot generation)

## Setup

### 1. Clone and install dependencies

```bash
git clone https://github.com/magnum6actual/38G-baseball.git
cd 38G-baseball
npm install
```

### 2. Install Python dependencies

Create a virtual environment and install dependencies:

```bash
python3 -m venv venv
source venv/bin/activate
pip install pypdf pymupdf
```

The application will automatically use the venv Python when available.

### 3. Configure environment

Copy `.env.example` to `.env` and fill in your API keys:

```bash
cp .env.example .env
```

Required environment variables:
```env
# Azure Claude (via AI Foundry)
AZURE_CLAUDE_ENDPOINT=https://your-resource.services.ai.azure.com
AZURE_CLAUDE_API_KEY=your-key

# Azure OpenAI (for embeddings)
AZURE_OPENAI_ENDPOINT=https://your-resource.cognitiveservices.azure.com
AZURE_OPENAI_API_KEY=your-key
AZURE_EMBEDDING_DEPLOYMENT=text-embedding-3-small

# Google AI Studio (for Gemini headshots)
GOOGLE_API_KEY=your-google-ai-studio-key
```

### 4. Initialize database and seed officers

```bash
npx tsx scripts/init-db.ts
npx tsx scripts/seed-officers.ts
```

This creates the SQLite database and populates it with 20 sample officer profiles.

### 5. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the application.

## Project Structure

```
38G-baseball/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/               # API routes
│   │   │   ├── chat/          # Chat endpoints (search, builder)
│   │   │   ├── generate-pdf/  # PDF generation
│   │   │   ├── headshot/      # Gemini headshot processing
│   │   │   └── officers/      # Officer CRUD
│   │   ├── builder/           # Card builder page
│   │   └── search/            # Search page
│   ├── components/            # React components
│   │   └── ui/               # shadcn/ui components
│   ├── lib/                   # Core services
│   │   ├── db.ts             # SQLite + sqlite-vec
│   │   ├── claude.ts         # Claude API client (Azure)
│   │   ├── embeddings.ts     # Azure OpenAI embeddings
│   │   ├── headshot.ts       # Gemini 3 Pro Image Preview
│   │   ├── search.ts         # RAG search logic
│   │   ├── builder.ts        # Interview logic
│   │   └── pdf.ts            # PDF generation
│   └── types/                # TypeScript types
├── 38g-card-builder/         # PDF templates and scripts
│   ├── assets/               # PDF template, example data
│   ├── references/           # Field definitions
│   └── scripts/              # fill_pdf.py
├── scripts/                  # Database and test scripts
├── data/                     # SQLite database (gitignored)
├── Style_Reference.png       # Headshot style reference image
├── gemini-image-prompt.txt   # Headshot generation prompt template
└── fictional_officers.json   # Seed data for testing
```

## Docker Deployment

Build and run with Docker:

```bash
docker build -t 38g-talent-search .
docker run -p 3000:3000 \
  -e AZURE_CLAUDE_ENDPOINT=your-endpoint \
  -e AZURE_CLAUDE_API_KEY=your-key \
  -e AZURE_OPENAI_ENDPOINT=your-endpoint \
  -e AZURE_OPENAI_API_KEY=your-key \
  -e AZURE_EMBEDDING_DEPLOYMENT=text-embedding-3-small \
  -e GOOGLE_API_KEY=your-google-key \
  38g-talent-search
```

## Technology Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16.1 (App Router, Turbopack) |
| **Frontend** | React 19, TypeScript 5, Tailwind CSS 4, shadcn/ui (Radix UI) |
| **Backend** | Next.js API Routes with SSE streaming |
| **Database** | SQLite via better-sqlite3, sqlite-vec for vector similarity search (1536-dim) |
| **LLM** | Claude Opus 4.5 via Azure AI Foundry |
| **Embeddings** | Azure OpenAI text-embedding-3-small |
| **Image Generation** | Google Gemini 3 Pro Image Preview (professional headshots) |
| **PDF Generation** | Python 3.9+ with pypdf and PyMuPDF (subprocess) |
| **Markdown** | react-markdown with remark-gfm (tables, formatting) |
| **Deployment** | Docker with standalone Next.js output |

## Usage

### Search Flow
1. Navigate to `/search`
2. Enter natural language queries (e.g., "Find Arabic speakers with threat finance experience")
3. Review matched officers in the results panel
4. Refine your search through conversation
5. Click officer cards to view full profiles and download PDFs

### Builder Flow
1. Navigate to `/builder`
2. Optionally upload your resume or supporting documents
3. Answer the AI interviewer's questions about your background
4. Upload a photo for professional headshot processing
5. Approve or regenerate the AI-enhanced headshot
6. Generate your baseball card PDF
7. Your profile is automatically added to the search database

## Utility Scripts

Located in `scripts/`:

**Test scripts:**
- `test-headshot-module.ts` - Test Gemini headshot generation directly
- `test-aistudio-gemini3.ts` - Test Gemini 3 Pro Image Preview API
- `test-services.ts` - Test all API connections

**Data generation scripts:**
- `generate-fake-photos.ts` - Generate AI headshots for fictional officers using Gemini 3 Pro
- `test-pdf-generation.ts` - Generate baseball card PDFs for fictional officers
- `import-photos-pdfs.ts` - Import generated photos and PDFs into the database

Run with: `npx tsx scripts/<script-name>.ts`

Example: Generate all test data:
```bash
npx tsx scripts/generate-fake-photos.ts     # Generate all 20 photos
npx tsx scripts/test-pdf-generation.ts officer_001  # Generate one PDF
npx tsx scripts/import-photos-pdfs.ts       # Import into database
```

## License

Proprietary - U.S. Army Civil Affairs
