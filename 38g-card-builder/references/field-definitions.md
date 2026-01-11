# 38G Baseball Card Field Definitions

Complete field specifications for the 38G Baseball Card PDF form.

## Profile Section

| Field ID | Field Name | Validation | Example |
|----------|------------|------------|---------|
| 3 | Name | Text, as displayed | C. Wayne Culbreth |
| 4 | Rank | CPT, MAJ, LTC, COL | MAJ |
| 5 | Date Assigned to Unit | DD MMM YYYY | 18 APR 2025 |
| 7 | Position Title | Text | Military Government Officer |
| 9 | MOS / Branch / Skill | 38G-XX format | 38G - 6E |
| 10 | Skill (Plain English) | Skill identifier name | Commerce & Trade |
| 11 | Residence Location | City, State | Germantown, TN |
| 12 | Civilian Occupation | Job title, Company | Founder & CEO, Kinetiqs |
| 2 | Unit (top right header) | Full unit name | 353rd Civil Affairs Command |

## Additional Information (Field ID: 6)

Freeform narrative text. Recommended structure:
- Paragraph 1: Combat/operational experience
- Paragraph 2: Post-military civilian expertise
- Paragraph 3: Technical capabilities + "Best employed" statement
- Contact emails at end

Max ~200 words. Use line breaks (\n) between paragraphs.

## Military & Civilian Skills (12 slots, 2 columns)

| Field ID | Position |
|----------|----------|
| 13 | Row 1, Left |
| 14 | Row 1, Right |
| 15 | Row 2, Left |
| 16 | Row 2, Right |
| 17 | Row 3, Left |
| 18 | Row 3, Right |
| 19 | Row 4, Left |
| 20 | Row 4, Right |
| 21 | Row 5, Left |
| 22 | Row 5, Right |
| 23 | Row 6, Left |
| 24 | Row 6, Right |

Keep skills to 2-5 words each. Focus on differentiating capabilities.

## Mission/Exercise Deployment History (4 rows)

| Row | Dates | Mission | Location | Position |
|-----|-------|---------|----------|----------|
| 1 | 27 | 29 | 30 | 34 |
| 2 | 28 | 32 | 33 | 40 |
| 3 | 31 | 37 | 39 | 42 |
| 4 | 36 | 38 | 41 | 43 |

Date format: MMM YYYY - MMM YYYY (e.g., Apr 2004 - Nov 2005)

## Exercise Participation History (5 rows)

| Row | Exercise/Event | Position/Dates |
|-----|---------------|----------------|
| 1 | 87 | 86 |
| 2 | 63 | 64 |
| 3 | 67 | 68 |
| 4 | 71 | 72 |
| 5 | 77 | 78 |

## Prior Deployments/Staff/Civilian Experience (4 rows)

| Row | Dates | Assigned To/Location | Position |
|-----|-------|---------------------|----------|
| 1 | 45 | 46 | 47 |
| 2 | 49 | 50 | 51 |
| 3 | 52 | 53 | 54 |
| 4 | 55 | 56 | 57 |

## Awards

| Field ID | Section |
|----------|---------|
| 35 | Awards Prior to this Assignment |
| 44 | Awards Received As a 38G |

Comma-separated list. Use abbreviations (BSM, ARCOM, AAM, NDSM).

## Professional Credentials (Field ID: 48)

Certifications, licenses, bar admissions, etc. Leave blank if none.

## Civilian Education (Field ID: 58)

Condensed format: Degree, Institution Year; Degree, Institution Year

Example: BS EE (CompEng), USMA 1993; TRIUM Global EMBA 2018; PGDip Org Leadership, Oxford 2020

## 38G Related Formal Training (5 rows)

| Row | Dates | Course |
|-----|-------|--------|
| 1 | 59 | 60 |
| 2 | 61 | 62 |
| 3 | 65 | 66 |
| 4 | 69 | 70 |
| 5 | 75 | 76 |

## Clearance (Field IDs: 73, 74)

| Field ID | Field | Valid Values |
|----------|-------|--------------|
| 73 | Level | TS/SCI, TS, SECRET, CONFIDENTIAL |
| 74 | Expiration | MMM YYYY (e.g., Mar 2028) |

## Passport Expiration (Field IDs: 79, 80)

| Field ID | Type | Format |
|----------|------|--------|
| 79 | Personal | DD MMM YYYY |
| 80 | Official | DD MMM YYYY or N/A |

## Languages & Proficiency (1 row shown)

| Field ID | Field |
|----------|-------|
| 81 | Language |
| 82 | Listening |
| 83 | Reading |
| 85 | Speaking |

Proficiency: Native, Fluent, Professional, Limited, Basic

## Administrative

| Field ID | Field |
|----------|-------|
| 85_1 | Version (bottom right) |

Format: MMM YYYY (e.g., Jan 2026)

## JSON Output Format

```json
[
  {"field_id": "3", "description": "Name", "page": 1, "value": "C. Wayne Culbreth"},
  {"field_id": "4", "description": "Rank", "page": 1, "value": "MAJ"},
  ...
]
```

Each entry requires:
- `field_id`: String matching PDF field
- `description`: Human-readable field name
- `page`: Always 1
- `value`: Field content (empty string for blank)
