# 38G Talent Search — CG Briefing Context

> Use this document as context when drafting a memorandum for the USACAPOC Commanding General describing the 38G Talent Search application, its capabilities, resource requirements, and path to production deployment.

---

## Purpose

38G Talent Search is a web application that solves two problems for Civil Affairs leadership:

1. **Finding the right officer for a mission** — Commanders and staff can search the entire 38G population using plain-language queries like "Find Arabic speakers with threat finance experience" or "Who has coordinated with USAID in the CENTCOM AOR?" The system understands intent, not just keywords, and returns ranked recommendations with explanations.

2. **Building standardized officer profiles** — Individual 38G officers complete an AI-guided interview that produces a one-page "baseball card" PDF capturing their military and civilian qualifications in a consistent, shareable format.

---

## What It Does — Talent Search

The search interface works like a conversation. A user types a question describing what they need, and the system:

- Searches all officer profiles using semantic matching (understanding meaning, not just matching words)
- Returns a ranked list of recommended officers with explanations of why each is a fit
- Allows follow-up questions to refine results ("What about someone with a law degree?" or "Narrow that to officers with TS/SCI")
- Displays full officer profiles on demand, including a downloadable PDF baseball card

This replaces the current process of manually searching spreadsheets, calling branch managers, or relying on institutional memory to identify qualified officers.

---

## What It Does — Card Builder

The card builder walks an officer through creating their profile:

- The officer can upload existing documents (resume, certificates, ORB) and the system reads them automatically
- An AI interviewer asks structured follow-up questions to fill any gaps
- A live preview of the baseball card updates in real time as the interview progresses
- Every field is directly editable if the officer wants to correct anything
- The officer uploads a photo, which is processed into a standardized professional headshot
- The final product is a one-page PDF baseball card and a searchable database record

### Data Captured Per Officer

| Category | Fields |
|---|---|
| Identity | Name, Rank, Unit, Position, MOS/Skill Identifier |
| Professional | Civilian Occupation, Skills (up to 12), Credentials/Licenses |
| Experience | Operational Deployments, Exercises, Prior Assignments |
| Education | Degrees, Institutions, 38G-specific Training/Courses |
| Security | Clearance Level & Expiration, Passport Expirations |
| Languages | Language Proficiencies with L/R/S Ratings |
| Awards | Pre-38G and Post-38G Awards |
| Narrative | Free-text block covering best employment, combat experience, and contact info |
| Photo | Professional headshot (uploaded or AI-generated) |

---

## Current State

The application is functional and demonstrated with 20 fictional officer profiles. Both the search and builder features work end-to-end, including PDF generation. It is ready for user testing with real officer data in a controlled environment.

The codebase includes a containerized deployment configuration (Docker) that packages the entire application into a single deployable unit.

---

## Production Resource Requirements

### Hosting

The application requires a server or container environment with:

- **Compute**: A single application server running Node.js and Python (modest requirements — no GPU needed, no AI models run locally)
- **Storage**: Persistent disk for the database file. All officer data, photos, and PDFs are stored in a single SQLite database file. For the current 38G population size (~300-500 officers), storage needs are minimal (estimated <1 GB)
- **Network**: HTTPS access for end users; outbound HTTPS to three cloud AI services (see below)

A single container on a DoD-approved cloud platform (such as Cloud One/DISA milCloud or Army cARMY) would be sufficient. There is no need for a database server, message queue, or other infrastructure services — the application is self-contained by design.

### Cloud AI Services

The application relies on three external AI services. None of these run locally — they are accessed via API:

| Service | What It Does | Provider |
|---|---|---|
| Claude (Large Language Model) | Powers the search recommendations and builder interview | Anthropic, accessed through Azure AI Foundry |
| Text Embeddings | Converts officer profiles and queries into vectors for semantic search | Azure OpenAI |
| Image Generation | Generates standardized professional headshots from uploaded photos | Google Gemini |

**Azure AI Foundry** is already FedRAMP-authorized and available through existing DoD Azure agreements. The embedding service runs on Azure OpenAI, also within the Azure Government ecosystem. The Google Gemini integration for headshot generation could be replaced with an Azure-hosted alternative or made optional if Google services are not approved for the target environment.

### Cost Estimate

AI API costs are usage-based and scale with the number of searches and profiles built. For an organization of this size, expected costs are low — on the order of tens of dollars per month for typical usage patterns. The primary cost driver would be the hosting environment itself, not the AI services.

---

## Authentication & Authorization — Required Before Production

**The application currently has no authentication or authorization layer.** This is the most significant gap between the current prototype and a production deployment.

Before deploying with real officer data, the application needs:

### Authentication (Who are you?)

- Integration with a DoD identity provider — CAC/PKI authentication, DoD SSO, or the target platform's existing identity service
- This must be implemented within the Defense network environment where the application is hosted, as it depends on DoD-specific infrastructure (certificate authorities, Active Directory/LDAP, etc.)

### Authorization (What can you see?)

- **Role-based access control** to distinguish between:
  - **Searchers** (commanders, staff, branch managers) who can query the full population
  - **Officers** who can create and edit their own profiles
  - **Administrators** who can manage users and system configuration
- Access logging and audit trail for compliance

### Data Sensitivity Considerations

Officer profiles contain PII and security clearance information. The production deployment must comply with:

- DoD Privacy Act requirements
- Appropriate data handling for clearance information
- Network classification requirements (the application should reside on NIPRNet given the data types involved, with clearance details potentially requiring additional controls)

### Recommended Approach

Authentication should be implemented at the platform level using whatever identity services are provided by the hosting environment (e.g., Platform One SSO, cARMY identity services, or a reverse proxy with CAC authentication). This is standard practice for DoD web applications and does not require changes to the core application logic — it would be added as a middleware layer during the deployment process.

---

## What This Means for USACAPOC

- **Immediate capability**: Leadership can query the entire 38G talent pool in seconds using natural language, replacing manual processes
- **Standardized profiles**: Every 38G officer gets a consistent, professional one-page summary that is easy to share and compare
- **Low infrastructure burden**: Single container, single database file, no complex infrastructure
- **Path to production**: The application is functionally complete; the remaining work is security integration (authentication) and hosting on an approved DoD platform
- **Scalable**: The architecture handles the full 38G population without modification; semantic search actually improves with more data

---

## Key Terms (for non-technical readers)

- **Semantic search**: Search that understands meaning. "Find someone who speaks Arabic" also finds officers listed as speaking "Modern Standard Arabic" or "Levantine Arabic" without needing exact keyword matches.
- **RAG (Retrieval-Augmented Generation)**: The technique of searching a database first, then having an AI summarize and explain the results. This is how the search feature works — it retrieves matching officers, then Claude explains why they fit.
- **Baseball card**: A one-page standardized PDF profile summarizing an officer's qualifications, modeled after the informal "baseball card" format used across DoD for quick personnel summaries.
- **Vector embeddings**: A mathematical representation of text that captures meaning. This is what enables semantic search — similar concepts end up near each other in the vector space.
- **Container (Docker)**: A self-contained package that includes the application and everything it needs to run, making deployment consistent and repeatable across different servers.
