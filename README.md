# 38G Talent Search

Military Government Specialist (38G) talent discovery and profile management system. Enables commanders to find specialists through natural language search and allows officers to create their "baseball card" profiles through an AI-guided interview.

## Features

### Search Interface (`/search`)
- Natural language talent discovery using RAG (Retrieval-Augmented Generation)
- Semantic search across officer profiles
- Conversational refinement with context memory
- Officer preview cards with photos and summaries
- Full profile detail modal with PDF download

### Card Builder (`/builder`)
- AI-guided interview flow for profile creation
- Document upload support (resume, certifications)
- Professional headshot generation using FLUX.2
- Automated PDF generation from interview data
- Integration with search database

## Prerequisites

- Node.js 20+
- Python 3.9+ (for PDF generation)
- API keys for:
  - Claude API (via Anthropic or Azure)
  - Azure OpenAI (for embeddings)
  - Azure AI (for FLUX.2 headshot generation)

## Setup

### 1. Clone and install dependencies

```bash
git clone <repository-url>
cd 38g-talent-search
npm install
```

### 2. Install Python dependencies

```bash
pip install pypdf pymupdf
```

### 3. Configure environment

Copy `.env.example` to `.env` and fill in your API keys:

```bash
cp .env.example .env
```

Required environment variables:
- `ANTHROPIC_API_KEY` or `AZURE_CLAUDE_ENDPOINT` + `AZURE_CLAUDE_API_KEY`
- `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `AZURE_EMBEDDING_DEPLOYMENT`
- `AZURE_AI_ENDPOINT`, `AZURE_AI_API_KEY` (for headshot generation)

### 4. Initialize database and seed officers

```bash
npx tsx scripts/seed-officers.ts
```

This creates the SQLite database and populates it with sample officer profiles.

### 5. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the application.

## Project Structure

```
38g-talent-search/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/               # API routes
│   │   │   ├── chat/          # Chat endpoints (search, builder)
│   │   │   ├── generate-pdf/  # PDF generation
│   │   │   ├── headshot/      # Headshot processing
│   │   │   └── officers/      # Officer CRUD
│   │   ├── builder/           # Card builder page
│   │   └── search/            # Search page
│   ├── components/            # React components
│   │   └── ui/               # shadcn/ui components
│   ├── lib/                   # Core services
│   │   ├── db.ts             # SQLite + sqlite-vec
│   │   ├── claude.ts         # Claude API client
│   │   ├── embeddings.ts     # Azure OpenAI embeddings
│   │   ├── headshot.ts       # FLUX.2 integration
│   │   ├── search.ts         # RAG search logic
│   │   ├── builder.ts        # Interview logic
│   │   └── pdf.ts            # PDF generation
│   └── types/                # TypeScript types
├── 38g-card-builder/         # PDF templates and scripts
│   ├── assets/               # PDF template, example data
│   ├── references/           # Field definitions
│   └── scripts/              # fill_pdf.py
├── scripts/                  # Database initialization
└── data/                     # SQLite database (created at runtime)
```

## Docker Deployment

Build and run with Docker:

```bash
docker build -t 38g-talent-search .
docker run -p 3000:3000 \
  -e ANTHROPIC_API_KEY=your-key \
  -e AZURE_OPENAI_ENDPOINT=your-endpoint \
  -e AZURE_OPENAI_API_KEY=your-key \
  -e AZURE_EMBEDDING_DEPLOYMENT=text-embedding-3-small \
  -e AZURE_AI_ENDPOINT=your-endpoint \
  -e AZURE_AI_API_KEY=your-key \
  38g-talent-search
```

## Technology Stack

- **Frontend**: Next.js 16, React, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes
- **Database**: SQLite with sqlite-vec for vector search
- **AI/ML**:
  - Claude (reasoning and conversation)
  - Azure OpenAI text-embedding-3-small (embeddings)
  - FLUX.2 [pro] via Azure AI (headshot generation)
- **PDF**: Python pypdf + PyMuPDF

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
5. Generate your baseball card PDF
6. Your profile is automatically added to the search database

## License

Proprietary - U.S. Army Civil Affairs
