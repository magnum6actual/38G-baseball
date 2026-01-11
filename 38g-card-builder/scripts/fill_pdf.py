#!/usr/bin/env python3
"""
Fill a 38G Baseball Card PDF template with officer data.

Usage:
    python fill_pdf.py <template.pdf> <field_values.json> <output.pdf>

The field_values.json should be an array of objects with:
    - field_id: The PDF form field ID
    - value: The value to fill
    - page: Page number (always 1 for baseball cards)
    - description: Human-readable field name (optional, for documentation)

Example:
    [
        {"field_id": "3", "value": "John Smith", "page": 1, "description": "Name"},
        {"field_id": "4", "value": "MAJ", "page": 1, "description": "Rank"}
    ]
"""

import json
import sys
from pathlib import Path

def fill_pdf(template_path: str, field_values_path: str, output_path: str) -> None:
    """Fill PDF form fields with provided values."""
    try:
        from pypdf import PdfReader, PdfWriter
    except ImportError:
        print("Error: pypdf not installed. Run: pip install pypdf")
        sys.exit(1)
    
    # Load field values
    with open(field_values_path, 'r') as f:
        field_values = json.load(f)
    
    # Read template
    reader = PdfReader(template_path)
    writer = PdfWriter()
    
    # Clone the template
    writer.append(reader)
    
    # Build field dictionary
    fields_dict = {}
    for entry in field_values:
        field_id = str(entry.get("field_id", ""))
        value = entry.get("value", "")
        if field_id and value:  # Only set non-empty values
            fields_dict[field_id] = value
    
    # Update form fields
    writer.update_page_form_field_values(writer.pages[0], fields_dict)
    
    # Write output
    with open(output_path, "wb") as f:
        writer.write(f)
    
    print(f"Created: {output_path}")
    print(f"Fields filled: {len(fields_dict)}")


def validate_field_values(field_values_path: str) -> list:
    """Validate field values JSON and return any errors."""
    errors = []
    
    with open(field_values_path, 'r') as f:
        field_values = json.load(f)
    
    if not isinstance(field_values, list):
        errors.append("Field values must be a JSON array")
        return errors
    
    required_fields = {"3", "4", "5", "7", "9", "10", "11", "12", "73", "74"}
    found_fields = set()
    
    for i, entry in enumerate(field_values):
        if not isinstance(entry, dict):
            errors.append(f"Entry {i} is not an object")
            continue
        
        if "field_id" not in entry:
            errors.append(f"Entry {i} missing field_id")
        else:
            found_fields.add(str(entry["field_id"]))
        
        if "value" not in entry:
            errors.append(f"Entry {i} missing value")
        
        if "page" not in entry:
            errors.append(f"Entry {i} missing page")
    
    # Check for required fields
    missing = required_fields - found_fields
    if missing:
        # Check if they have empty values (allowed) vs completely missing
        for entry in field_values:
            if str(entry.get("field_id")) in missing and entry.get("value"):
                missing.discard(str(entry.get("field_id")))
    
    # Warn about truly missing required fields (but don't error)
    for field_id in missing:
        field_names = {
            "3": "Name", "4": "Rank", "5": "Date Assigned",
            "7": "Position Title", "9": "MOS/Branch/Skill",
            "10": "Skill (Plain English)", "11": "Residence Location",
            "12": "Civilian Occupation", "73": "Clearance Level",
            "74": "Clearance Expiration"
        }
        print(f"Warning: Required field {field_id} ({field_names.get(field_id, 'Unknown')}) is empty")
    
    return errors


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print(__doc__)
        sys.exit(1)
    
    template = sys.argv[1]
    values = sys.argv[2]
    output = sys.argv[3]
    
    # Validate first
    errors = validate_field_values(values)
    if errors:
        print("Validation errors:")
        for e in errors:
            print(f"  - {e}")
        sys.exit(1)
    
    # Fill the PDF
    fill_pdf(template, values, output)
