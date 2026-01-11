---
name: 38g-card-builder
description: Build 38G Military Government Specialist baseball cards through guided interview. Use when a user wants to create, update, or complete a 38G baseball card. Triggers on "baseball card", "38G card", "talent card", or when user provides a resume/bio and mentions 38G or Civil Affairs officer profile. Accepts resume text, partial data, or starts from scratch. Outputs filled PDF form.
---

# 38G Baseball Card Builder

Build professional 38G Military Government Specialist baseball cards through guided data collection and PDF generation.

## Workflow

```
1. INTAKE     → Accept resume/text OR start blank
2. EXTRACT    → Pre-fill fields from provided content
3. INTERVIEW  → Collect missing required fields
4. VALIDATE   → Verify data completeness and format
5. GENERATE   → Fill PDF template and output
```

## Quick Start

If user provides a resume or text:
1. Extract all applicable fields (see references/field-definitions.md)
2. Show user what was extracted
3. Interview for missing required fields
4. Generate PDF

If starting from scratch:
1. Collect Profile fields first (name, rank, MOS, etc.)
2. Then Military & Civilian Skills
3. Then deployment/experience history
4. Then administrative (clearance, passports, education)
5. Generate PDF

## Interview Guidelines

**Be efficient:** Don't ask for information already provided. Extract first, confirm, then fill gaps.

**Group related questions:** Ask for all Profile fields together, all deployment history together, etc.

**Validate as you go:**
- Dates in military format (18 APR 2025)
- Clearance levels: TS/SCI, TS, SECRET, CONFIDENTIAL
- MOS format: 38G with skill identifier (e.g., 38G-6E)

**Required fields (must collect):**
- Name, Rank, Date Assigned, Position Title
- MOS/Branch/Skill, Skill (Plain English)
- Residence Location, Civilian Occupation
- At least 4 Military & Civilian Skills
- Clearance Level and Expiration
- At least one deployment OR relevant civilian experience

**Optional but valuable:**
- Photo (user can add later)
- Languages, Passport dates
- 38G training courses
- Awards

## Field Reference

See `references/field-definitions.md` for complete field specifications, validation rules, and PDF field ID mappings.

## Generating Output

Use `scripts/fill_pdf.py` to generate the filled PDF:

```bash
python scripts/fill_pdf.py <input_template.pdf> <field_values.json> <output.pdf>
```

The script expects a JSON file with field values. See `assets/example-data.json` for the required format.

## Example Interview Flow

**User provides resume:**
```
User: Here's my resume, can you help me build my 38G card?
[resume text]

Claude: I've extracted the following from your resume:
- Name: John Smith
- Rank: CPT (based on O-3 reference)
- Education: BA Political Science, Georgetown 2015
- Civilian Job: Policy Analyst, State Department
[...continues...]

I still need:
1. Date assigned to your current unit
2. Your MOS skill identifier (e.g., 6E for Commerce & Trade)
3. Clearance level and expiration
4. 4-6 military/civilian skills to highlight

Let's start with #1 - when were you assigned to your current unit?
```

**Starting from scratch:**
```
User: I need to build my 38G baseball card

Claude: I'll help you build your 38G baseball card. Let's start with the basics.

What is your:
1. Full name (as you want it displayed)
2. Current rank
3. MOS and skill identifier (e.g., 38G-6E for Commerce & Trade)
4. Date assigned to current unit
5. Current position title
```

## Assets

- `assets/template.pdf` - Blank 38G baseball card form
- `assets/example-data.json` - Complete example (MAJ Culbreth) showing all field mappings

## Key Skill Identifiers (38G)

| Code | Specialty |
|------|-----------|
| 6A | Rule of Law / Legal |
| 6B | Public Safety |
| 6C | Governance / Pub Admin |
| 6D | Public Health |
| 6E | Commerce & Trade |
| 6F | Infrastructure |
| 6G | Information & Media |
| 6H | Education |
| 6J | Environmental Mgmt |
| 6K | Cultural Heritage |
| 6L | Agriculture |
| 6M | Dislocated Civilians |
| 6N | Civil Information Mgmt |
| 6V | Emergency Mgmt |
| 6Y | Intel / Security Sector |
