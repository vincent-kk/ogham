# Bundled Resources - Design Guide for Resource Bundling

## Overview

Bundled Resources refer to executable code, reference documentation, and output resources packaged together with skills. Effective resource bundling significantly enhances skill reusability and automation levels.

---

## scripts/ - Executable Code

### When to Include Scripts?

#### ✅ Should Include

**1. Deterministic Tasks**
- **Examples**: PDF manipulation, image processing, file conversion
- **Reason**: Same input always produces same output
- **Benefit**: Faster and more consistent than LLM generation

```python
# scripts/rotate_image.py
def rotate_image(input_path: str, degrees: int) -> str:
    """Rotate image exactly N degrees - identical result every time"""
    # Deterministic transformation
```

**2. Repetitive Code Patterns**
- **Examples**: API client generation, data parsing templates
- **Reason**: No need to generate same pattern repeatedly
- **Benefit**: Code consistency, reuse verified patterns

```python
# scripts/generate_api_client.py
def generate_client(api_spec: dict) -> str:
    """Generate client code from OpenAPI spec - standard pattern"""
    # Template-based generation
```

**3. Performance-Critical Tasks**
- **Examples**: Large dataset processing, complex calculations
- **Reason**: Compiled code much faster than LLM generation
- **Benefit**: Reduced user wait time

```python
# scripts/process_large_dataset.py
def process_data(csv_path: str) -> pd.DataFrame:
    """Process 1GB+ CSV - optimized pandas usage"""
    # Performance-optimized processing
```

**4. Complex External Tool Integration**
- **Examples**: Database migrations, deployment scripts
- **Reason**: Multi-step tool coordination needed
- **Benefit**: Verified integration logic

```bash
# scripts/deploy.sh
# Docker build, test, deploy automation
```

#### ❌ Should Not Include

**1. Simple LLM Tasks**
- **Examples**: Text summarization, code explanation
- **Reason**: Claude can perform directly
- **Problem**: Unnecessary script complexity

**2. Highly Context-Dependent**
- **Examples**: Project-specific custom logic
- **Reason**: Not reusable
- **Problem**: Reduces skill generality

**3. Frequently Changing Logic**
- **Examples**: Business rules
- **Reason**: Script maintenance burden
- **Problem**: Frequent skill updates

---

### Script Design Principles

#### Principle 1: Single Responsibility

**✅ Correct Example:**
```python
# scripts/validate_pdf.py - PDF validation only
def validate_pdf(pdf_path: str) -> ValidationResult:
    """Validate PDF file"""
    pass

# scripts/generate_pdf.py - PDF generation only
def generate_pdf(md_path: str, output: str) -> str:
    """Generate PDF from Markdown"""
    pass
```

**❌ Wrong Example:**
```python
# scripts/pdf_tool.py - Too many responsibilities
def do_everything(action: str, *args):
    """Handle PDF generation, validation, conversion, compression"""
    if action == "validate": ...
    elif action == "generate": ...
    elif action == "convert": ...
    # Too complex!
```

---

#### Principle 2: Clear Interface

**CLI Standard Pattern:**
```python
#!/usr/bin/env python3
"""
PDF Validator - Validate PDF file integrity

Usage:
    validate_pdf.py <input.pdf> [--strict] [--output-report <report.json>]

Arguments:
    input.pdf           PDF file to validate

Options:
    --strict            Enable strict validation mode
    --output-report     Generate detailed JSON report

Exit Codes:
    0: Valid PDF
    1: Invalid PDF
    2: File not found
    3: Validation error

Examples:
    validate_pdf.py document.pdf
    validate_pdf.py document.pdf --strict --output-report report.json
"""

import argparse
import sys
from pathlib import Path

def validate_pdf(pdf_path: Path, strict: bool = False) -> tuple[bool, str]:
    """
    Validate PDF file.

    Args:
        pdf_path: Path to PDF file
        strict: Enable strict validation

    Returns:
        (is_valid, error_message)
    """
    try:
        # Validation logic
        return True, ""
    except Exception as e:
        return False, str(e)

def main():
    parser = argparse.ArgumentParser(
        description="Validate PDF file integrity",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    parser.add_argument("input", type=Path, help="PDF file to validate")
    parser.add_argument("--strict", action="store_true", help="Strict mode")
    parser.add_argument("--output-report", type=Path, help="Report output")

    args = parser.parse_args()

    if not args.input.exists():
        print(f"Error: {args.input} not found", file=sys.stderr)
        sys.exit(2)

    is_valid, error = validate_pdf(args.input, args.strict)

    if not is_valid:
        print(f"Validation failed: {error}", file=sys.stderr)
        sys.exit(1)

    print(f"✓ {args.input} is valid")

    if args.output_report:
        # Generate detailed report
        pass

    sys.exit(0)

if __name__ == "__main__":
    main()
```

**Key Elements:**
- **Docstring**: Usage, arguments, exit codes, examples
- **argparse**: Standard CLI interface
- **Exit codes**: 0=success, 1+=error types
- **stderr**: Error messages
- **stdout**: Normal output

---

#### Principle 3: Executable Permissions

**Grant execute permissions to all scripts:**
```bash
chmod +x scripts/*.py
chmod +x scripts/*.sh
```

**Include Shebang:**
```python
#!/usr/bin/env python3
# Python script

#!/bin/bash
# Bash script
```

**Verification:**
```bash
# Should be directly executable
./scripts/validate_pdf.py input.pdf
```

---

#### Principle 4: Proper Error Handling

**Cover Error Scenarios:**
```python
import sys
from pathlib import Path

def process_file(input_path: Path) -> int:
    """
    Process file with comprehensive error handling.

    Returns exit code.
    """
    # 1. Input validation
    if not input_path.exists():
        print(f"Error: {input_path} not found", file=sys.stderr)
        return 2

    if not input_path.is_file():
        print(f"Error: {input_path} is not a file", file=sys.stderr)
        return 2

    # 2. Permission check
    if not input_path.stat().st_size > 0:
        print(f"Error: {input_path} is empty", file=sys.stderr)
        return 3

    # 3. Processing with error recovery
    try:
        # Process file
        result = do_processing(input_path)

    except PermissionError:
        print(f"Error: Permission denied for {input_path}", file=sys.stderr)
        return 4

    except MemoryError:
        print(f"Error: File too large to process", file=sys.stderr)
        return 5

    except Exception as e:
        print(f"Unexpected error: {e}", file=sys.stderr)
        return 1

    # 4. Success
    print(f"✓ Processed {input_path}")
    return 0
```

**Error Message Guidelines:**
- **Clarity**: What went wrong
- **Actionability**: How to fix
- **Context**: Relevant information (filename, line number, etc.)

---

### Script Organization

#### Small Skills (1-3 Scripts)

**Flat Structure:**
```
scripts/
├── generate.py
├── validate.py
└── deploy.sh
```

#### Medium Skills (4-7 Scripts)

**Group by Function:**
```
scripts/
├── validation/
│   ├── check_input.py
│   └── validate_output.py
├── generation/
│   ├── generate_code.py
│   └── generate_docs.py
└── deployment/
    ├── package.py
    └── deploy.sh
```

#### Large Skills (8+ Scripts)

**Hierarchical Structure:**
```
scripts/
├── core/
│   ├── __init__.py
│   ├── config.py
│   └── utils.py
├── validation/
│   ├── __init__.py
│   ├── input_validator.py
│   └── output_validator.py
├── generation/
│   ├── __init__.py
│   ├── code_generator.py
│   └── doc_generator.py
├── deployment/
│   ├── __init__.py
│   ├── packager.py
│   └── deployer.py
└── cli/
    ├── generate.py      # CLI entry point
    ├── validate.py      # CLI entry point
    └── deploy.py        # CLI entry point
```

---

## references/ - Reference Documentation

### When to Include References?

#### ✅ Should Include

**1. API Documentation**
- **Content**: RESTful API endpoints, parameters, response formats
- **Format**: OpenAPI/Swagger spec or Markdown
- **Usage**: API client generation, integration code writing

```markdown
# references/api-spec.md

## Authentication Endpoint

POST /api/v1/auth/login

Request:
{
  "email": "string",
  "password": "string"
}

Response (200):
{
  "token": "string",
  "expires_at": "ISO8601 timestamp"
}

Response (401):
{
  "error": "Invalid credentials"
}
```

**2. Database Schemas**
- **Content**: Table definitions, relationships, indexes
- **Format**: SQL DDL or ERD Markdown
- **Usage**: Migration creation, ORM model definition

```sql
-- references/schema.sql

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
```

**3. Domain Knowledge**
- **Content**: Business rules, calculation logic, policies
- **Format**: Markdown
- **Usage**: Domain logic implementation reference

```markdown
# references/business-rules.md

## Invoice Calculation Rules

### Tax Calculation
- Standard rate: 10%
- Reduced rate: 5% (books, food)
- Zero rate: 0% (exports)

### Discount Application Order
1. Volume discount (if quantity > 100)
2. Seasonal discount (if applicable)
3. Loyalty discount (if member)

Discounts do not stack - apply highest only.
```

**4. Detailed Procedures**
- **Content**: Complex workflows, decision trees
- **Format**: Flowchart Markdown, step-by-step guides
- **Usage**: Complex process implementation

---

### Reference Design Principles

#### Principle 1: Grep-Friendly Structure

**Consider Large Files:**
```markdown
# references/api-reference.md (5000+ lines)

## TABLE OF CONTENTS
1. Authentication APIs
2. User APIs
3. Product APIs
4. Order APIs
...

---

## 1. AUTHENTICATION APIS

### 1.1 Login
[Details]

### 1.2 Logout
[Details]

---

## 2. USER APIS

### 2.1 Get User Profile
[Details]
```

**Extract Sections with Grep:**
```bash
# Extract Section 2.1 only
grep -A 50 "### 2.1 Get User Profile" references/api-reference.md
```

---

#### Principle 2: Clear Heading Hierarchy

**Hierarchy Structure:**
```markdown
# Level 1: File title

## Level 2: Major sections

### Level 3: Subsections

#### Level 4: Detail items
```

**Auto-Generate TOC:**
```markdown
## Table of Contents
- [Authentication](#authentication)
  - [Login](#login)
  - [Logout](#logout)
- [Users](#users)
  - [Get Profile](#get-profile)
```

---

#### Principle 3: Example-Driven

**Examples Over Explanations:**

**❌ Explanation-Focused:**
```markdown
## User API

The user API allows you to retrieve user information. You can pass
various parameters to filter results. The response includes user data
in JSON format with nested objects for profile information...
```

**✅ Example-Focused:**
```markdown
## User API

### Get User by ID

**Request:**
```bash
GET /api/v1/users/123
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "id": 123,
  "name": "John Doe",
  "email": "john@example.com",
  "profile": {
    "avatar": "https://...",
    "bio": "..."
  }
}
```

**Error (404):**
```json
{
  "error": "User not found"
}
```
```

---

#### Principle 4: Specify Versions

**Framework/Library Versions:**
```markdown
# references/react-patterns.md

## React Patterns (React 18.2+)

### useState Hook
```jsx
// React 18.2 syntax
import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

**Note:** This syntax is for React 18+. For React 16-17, see
references/react-16-patterns.md
```

---

## assets/ - Output Resources

### When to Include Assets?

#### ✅ Should Include

**1. Templates**
- **Examples**: PowerPoint templates, HTML boilerplate, LaTeX templates
- **Usage**: Ensure consistent output formats
- **Format**: Actual file formats (.pptx, .html, .tex)

```
assets/templates/
├── presentation.pptx      # PowerPoint template
├── report.html            # HTML report template
└── invoice.tex            # LaTeX invoice template
```

**2. Brand Resources**
- **Examples**: Logos, fonts, color palettes
- **Usage**: Maintain brand consistency
- **Format**: Images (.png, .svg), fonts (.ttf, .woff)

```
assets/branding/
├── logo.svg
├── logo-dark.svg
├── fonts/
│   ├── brand-font-regular.ttf
│   └── brand-font-bold.ttf
└── colors.json            # Color palette
```

**3. Sample Data**
- **Examples**: Test data, example inputs
- **Usage**: Demos, testing, example execution
- **Format**: CSV, JSON, XML

```
assets/samples/
├── sample-users.json
├── sample-orders.csv
└── sample-products.xml
```

**4. Configuration Files**
- **Examples**: Default configs, template settings
- **Usage**: Quick start, provide best practices
- **Format**: JSON, YAML, TOML

```
assets/config/
├── default-config.yaml    # Default configuration
├── production.yaml        # Production config
└── development.yaml       # Development config
```

---

### Asset Design Principles

#### Principle 1: Ready-to-Use

**Minimal Modification Needed:**

**PowerPoint Template:**
```
assets/templates/presentation.pptx
- Slide 1: Title slide (company name, presentation title placeholders)
- Slides 2-5: Content slides (title + body layout)
- Slide 6: Thank you slide

User: Replace placeholder text only
```

**HTML Template:**
```html
<!-- assets/templates/report.html -->
<!DOCTYPE html>
<html>
<head>
    <title>{{REPORT_TITLE}}</title>
    <style>/* Complete styles */</style>
</head>
<body>
    <header>
        <img src="logo.png" alt="Logo">
        <h1>{{REPORT_TITLE}}</h1>
        <p>Generated: {{DATE}}</p>
    </header>

    <main>
        {{CONTENT}}
    </main>

    <footer>
        <p>&copy; {{YEAR}} Company Name</p>
    </footer>
</body>
</html>
```

**Usage:**
```python
template = read_file("assets/templates/report.html")
report = template.replace("{{REPORT_TITLE}}", "Q4 Sales Report")
report = report.replace("{{DATE}}", datetime.now())
report = report.replace("{{CONTENT}}", generated_content)
```

---

#### Principle 2: Clear Naming

**File Naming Rules:**
```
✅ Good:
assets/templates/invoice-template.docx
assets/branding/logo-light-background.svg
assets/samples/user-data-100-records.json

❌ Bad:
assets/temp1.docx
assets/logo.svg (which version?)
assets/data.json (what data?)
```

---

#### Principle 3: Usage Documentation

**README in assets/:**
```markdown
# assets/README.md

## Templates

### presentation.pptx
PowerPoint presentation template with 6 slides.

**Usage:**
```python
from pptx import Presentation
prs = Presentation("assets/templates/presentation.pptx")
# Modify slides
prs.save("output.pptx")
```

### report.html
HTML report template with header, main, footer.

**Placeholders:**
- `{{REPORT_TITLE}}`: Report title
- `{{DATE}}`: Generation date
- `{{CONTENT}}`: Main content
- `{{YEAR}}`: Copyright year

**Usage:**
```python
template = open("assets/templates/report.html").read()
report = template.replace("{{REPORT_TITLE}}", "My Report")
```

## Branding

### logo.svg
Company logo (light background version)

**Dimensions:** 500x200px
**Usage:** Include in HTML with `<img src="assets/branding/logo.svg">`
```

---

## Real-World Example: PDF Generator Skill

**Complexity:** 0.45 (Medium)

### File Structure
```
pdf-generator/
├── SKILL.md
├── reference.md
├── examples.md
├── scripts/
│   ├── generate_pdf.py
│   ├── validate_pdf.py
│   └── merge_pdfs.py
├── references/
│   └── markdown-extensions.md
└── assets/
    ├── templates/
    │   ├── report-template.html
    │   └── invoice-template.html
    ├── styles/
    │   ├── default.css
    │   └── corporate.css
    └── fonts/
        ├── NotoSans-Regular.ttf
        └── NotoSans-Bold.ttf
```

### scripts/generate_pdf.py
```python
#!/usr/bin/env python3
"""
PDF Generator - Convert Markdown to styled PDF

Usage:
    generate_pdf.py <input.md> [options]

Options:
    --template TEMPLATE    HTML template (default: report-template.html)
    --style STYLE          CSS stylesheet (default: default.css)
    --output OUTPUT        Output PDF path (default: output.pdf)
    --toc                  Include table of contents

Exit Codes:
    0: Success
    1: Conversion error
    2: Input file not found
    3: Template not found
"""

import argparse
import sys
from pathlib import Path
from typing import Optional

def generate_pdf(
    markdown_path: Path,
    template: str = "report-template.html",
    style: str = "default.css",
    output: Path = Path("output.pdf"),
    include_toc: bool = False
) -> int:
    """
    Generate PDF from Markdown with template and styling.

    Args:
        markdown_path: Input Markdown file
        template: HTML template name
        style: CSS stylesheet name
        output: Output PDF path
        include_toc: Include table of contents

    Returns:
        Exit code (0 = success)
    """
    # 1. Validate inputs
    if not markdown_path.exists():
        print(f"Error: {markdown_path} not found", file=sys.stderr)
        return 2

    template_path = Path(__file__).parent.parent / "assets" / "templates" / template
    if not template_path.exists():
        print(f"Error: Template {template} not found", file=sys.stderr)
        return 3

    style_path = Path(__file__).parent.parent / "assets" / "styles" / style
    if not style_path.exists():
        print(f"Error: Style {style} not found", file=sys.stderr)
        return 3

    # 2. Convert Markdown to HTML
    try:
        import markdown
        md_content = markdown_path.read_text()
        html_content = markdown.markdown(md_content, extensions=['tables', 'fenced_code'])
    except Exception as e:
        print(f"Markdown conversion error: {e}", file=sys.stderr)
        return 1

    # 3. Apply template
    template_html = template_path.read_text()
    styled_html = template_html.replace("{{CONTENT}}", html_content)

    # 4. Generate PDF
    try:
        import pdfkit
        options = {
            'enable-local-file-access': None,
            'user-style-sheet': str(style_path)
        }
        if include_toc:
            options['toc'] = None

        pdfkit.from_string(styled_html, str(output), options=options)

    except Exception as e:
        print(f"PDF generation error: {e}", file=sys.stderr)
        return 1

    print(f"✓ Generated {output}")
    return 0

def main():
    parser = argparse.ArgumentParser(description="Convert Markdown to PDF")
    parser.add_argument("input", type=Path, help="Input Markdown file")
    parser.add_argument("--template", default="report-template.html", help="Template")
    parser.add_argument("--style", default="default.css", help="Stylesheet")
    parser.add_argument("--output", type=Path, default=Path("output.pdf"), help="Output")
    parser.add_argument("--toc", action="store_true", help="Include TOC")

    args = parser.parse_args()

    exit_code = generate_pdf(
        args.input,
        args.template,
        args.style,
        args.output,
        args.toc
    )

    sys.exit(exit_code)

if __name__ == "__main__":
    main()
```

---

## Best Practices Summary

### scripts/
✅ **DO:**
- Single responsibility principle
- Clear CLI interface
- Grant execute permissions
- Comprehensive error handling
- Docstrings and usage examples

❌ **DON'T:**
- Multi-purpose "swiss army knife" scripts
- Unclear arguments/options
- Fail without error messages
- Lack documentation

### references/
✅ **DO:**
- Grep-friendly structure
- Clear section divisions
- Example-driven explanations
- Specify version information

❌ **DON'T:**
- Single giant file
- Vague headings
- Only list explanations
- Omit version information

### assets/
✅ **DO:**
- Ready-to-use resources
- Clear file names
- Usage documentation (README)
- Logical directory structure

❌ **DON'T:**
- Require complex modifications
- Vague naming
- No documentation
- Disorganized file placement

---

## Conclusion

Effective Bundled Resources significantly enhance skill reusability and automation:

**Core Principles:**
1. **scripts/**: Deterministic, repetitive, performance-critical tasks
2. **references/**: Grep-friendly, example-driven, version-specified
3. **assets/**: Ready-to-use, clear naming, documented

Following these principles creates high-quality skills that users can easily understand and effectively utilize.
