# Skill Constructor Examples

Real-world scenarios demonstrating the 4 operating modes of skill-constructor (CREATE, REFACTOR, IMPROVE, FIX).

---

## Example 1: Simple Skill - Image Rotator

**Mode:** CREATE
**Complexity:** Simple (Score: 0.28)
**Scenario:** Creating a simple skill that provides image rotation and flipping functionality

### Input

**User Request:**
> "Create a skill that rotates and flips images. It should support PNG and JPG formats."

### Process

**Phase 0: Mode Detection**
```json
{
  "mode": "CREATE",
  "confidence": 0.95,
  "reasons": ["New skill request", "No existing skill found"],
  "existing_skill": false
}
```

**Phase 1: Requirements Discovery**
```
Q: What should this skill do? (3-5 examples)
A:
  1. Rotate images 90°, 180°, 270°
  2. Flip images horizontally or vertically
  3. Support PNG and JPG formats
  4. Save processed images

Q: What triggers this skill?
A: User requests like "rotate this image", "flip image horizontally"

Q: Any special resources needed?
A: Python script using Pillow library for image processing
```

**Phase 2: Complexity Evaluation**
```python
# Input
spec = {
  "file_count": 3,  # SKILL.md + 2 scripts
  "has_mcp_integration": False,
  "workflow_steps": 2,  # detect operation → execute
  "conditionals": 2,  # rotate vs flip
  "external_deps": 1   # Pillow
}

# Calculation
score = (3/20)*0.3 + 0*0.2 + (2/10)*0.1 + (2/15)*0.15 + (1/5)*0.25
      = 0.045 + 0 + 0.02 + 0.02 + 0.05
      = 0.135 × 2.07 (normalization)
      = 0.28

# Result
{
  "score": 0.28,
  "category": "simple",
  "structure_recommendation": {
    "skill_md_target": "2-3k words",
    "include_reference_md": false,
    "include_examples_md": false,
    "scripts_count": "1-2"
  }
}
```

**Phase 3: Structure Generation**
```
image-rotator/
├── SKILL.md (2.5k words)
└── scripts/
    ├── rotate.py
    └── flip.py
```

**Phase 4-6: Implementation & Validation**

### Output

**Generated SKILL.md (excerpt):**
```markdown
---
name: image-rotator
description: Rotate and flip images (PNG, JPG) with simple operations. Use when user requests image rotation (90°, 180°, 270°) or flipping (horizontal, vertical). Provides quick image transformation without complex editing tools.
---

# Image Rotator

## Quick Start
Rotate or flip images with simple commands using Pillow-based scripts.

## When to Use This Skill
- User requests: "rotate this image 90 degrees"
- User requests: "flip image horizontally"
- Simple image transformations without GUI

## Workflow
1. **Detect Operation**: Parse user request for rotation angle or flip direction
2. **Execute Script**: Run appropriate script (rotate.py or flip.py)
3. **Save Result**: Output processed image to specified location

## Resources
### scripts/rotate.py
Rotates images by 90°, 180°, or 270°. Usage: `python rotate.py <image> <angle>`

### scripts/flip.py
Flips images horizontally or vertically. Usage: `python flip.py <image> <direction>`

## Quick Reference
```bash
# Rotate 90° clockwise
python scripts/rotate.py photo.jpg 90

# Flip horizontally
python scripts/flip.py photo.jpg horizontal
```
```

**scripts/rotate.py:**
```python
#!/usr/bin/env python3
"""Rotate images by specified angle"""

import sys
from pathlib import Path
from PIL import Image

def rotate_image(image_path: str, angle: int) -> str:
    """Rotate image and save to new file"""
    if angle not in [90, 180, 270]:
        raise ValueError("Angle must be 90, 180, or 270")

    img = Image.open(image_path)
    rotated = img.rotate(-angle, expand=True)  # Negative for clockwise

    output_path = f"{Path(image_path).stem}_rotated_{angle}{Path(image_path).suffix}"
    rotated.save(output_path)
    return output_path

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: rotate.py <image> <angle>")
        sys.exit(1)

    result = rotate_image(sys.argv[1], int(sys.argv[2]))
    print(f"Saved to: {result}")
```

**Validation Result:**
```
✅ PASS: YAML frontmatter format is valid
✅ PASS: Name 'image-rotator' follows hyphen-case convention
✅ PASS: Description is adequately detailed
✅ PASS: SKILL.md size is appropriate (2,487 words)
✅ PASS: scripts/ directory present
✅ PASS: Found 2 Python script(s)

✅ VALIDATION PASSED
```

---

## Example 2: Medium Skill - API Client Builder

**Mode:** CREATE
**Complexity:** Medium (Score: 0.52)
**Scenario:** Skill for auto-generating REST/GraphQL API client code

### Input

**User Request:**
> "Build a skill that generates API client code from API specifications. Support REST and GraphQL, various authentication methods."

### Process

**Phase 2: Complexity Evaluation**
```python
spec = {
  "file_count": 8,  # SKILL.md, reference.md, examples.md, 5 scripts
  "has_mcp_integration": False,
  "workflow_steps": 5,  # discovery, planning, generation, testing, deployment
  "conditionals": 7,  # REST vs GraphQL, auth types, language choice
  "external_deps": 3   # requests, jinja2, pytest
}

score = (8/20)*0.3 + 0*0.2 + (5/10)*0.1 + (7/15)*0.15 + (3/5)*0.25
      = 0.12 + 0 + 0.05 + 0.07 + 0.15
      = 0.39 × 1.33 (normalization)
      = 0.52

category = "medium"
```

### Output

**File Structure:**
```
api-client-builder/
├── SKILL.md (3.8k words)
├── reference.md (6.5k words)
├── examples.md (2.8k words)
└── scripts/
    ├── parse_spec.py          # Parse OpenAPI/GraphQL schemas
    ├── generate_client.py     # Generate client code
    ├── template_engine.py     # Jinja2 templating
    ├── auth_handlers.py       # Authentication logic
    └── test_generator.py      # Generate test stubs
```

**SKILL.md (excerpt):**
```markdown
---
name: api-client-builder
description: Generate API client code from OpenAPI/GraphQL specifications with authentication support. Use when user needs to integrate external APIs, wants type-safe client libraries, or requires automated client generation from spec files. Supports REST, GraphQL, OAuth2, API keys, and JWT authentication.
---

# API Client Builder

## Quick Start
Generate production-ready API client code from specification files.

## When to Use This Skill
- User provides OpenAPI 3.0 or GraphQL schema
- Need type-safe API client in Python, TypeScript, or Go
- Automating client library generation for microservices
- Integrating third-party APIs with proper authentication

## Core Workflow
1. **Parse Specification**: Extract endpoints, schemas, auth requirements
2. **Plan Generation**: Choose language, auth strategy, client structure
3. **Generate Code**: Create client classes, models, auth handlers
4. **Generate Tests**: Produce test stubs with mock responses
5. **Package**: Bundle as installable library

For detailed workflows, see [reference.md](reference.md).

## Resources
### reference.md
Detailed workflows for REST/GraphQL, authentication patterns, template customization.

### examples.md
Real-world examples: Stripe API, GitHub GraphQL, custom microservices.

### scripts/
See [reference.md#scripts-reference](reference.md#scripts-reference) for detailed usage.

## Quick Reference
```bash
# Generate Python client from OpenAPI spec
python scripts/generate_client.py \
  --spec api-spec.yaml \
  --lang python \
  --auth oauth2

# Generate TypeScript client from GraphQL schema
python scripts/generate_client.py \
  --spec schema.graphql \
  --lang typescript \
  --auth bearer-token
```
```

**reference.md (excerpt):**
```markdown
# API Client Builder - Detailed Reference

## Table of Contents
- [Mode Workflows](#mode-workflows)
- [REST Client Generation](#rest-client-generation)
- [GraphQL Client Generation](#graphql-client-generation)
- [Authentication Patterns](#authentication-patterns)
- [Template Customization](#template-customization)
- [Scripts Reference](#scripts-reference)

## REST Client Generation

### Phase 1: Parse OpenAPI Specification
```python
# scripts/parse_spec.py extracts:
{
  "endpoints": [
    {"path": "/users", "method": "GET", "auth": "oauth2"},
    {"path": "/users/{id}", "method": "GET", "auth": "oauth2"}
  ],
  "schemas": {
    "User": {"id": "integer", "name": "string", "email": "string"}
  },
  "auth": {"type": "oauth2", "flows": ["authorization_code"]}
}
```

### Phase 2-3: Code Generation
Templates in `scripts/templates/` generate:
- Client class with method for each endpoint
- Model classes from schemas
- Authentication handler
- Type hints/interfaces

... [continues with detailed workflows]
```

**Complexity Analysis:**
- Initial files: 8
- Target SKILL.md: 3.8k words ✅
- Supporting docs: reference.md (6.5k), examples.md (2.8k)
- Scripts: 5 specialized tools
- **Score: 0.52 → Medium structure appropriate**

---

## Example 3: Complex Skill - Full Stack Generator

**Mode:** CREATE
**Complexity:** Complex (Score: 0.81)
**Scenario:** Creating full-stack applications including frontend + backend + DB + deployment

### Input

**User Request:**
> "Create a skill that generates complete full-stack applications from high-level requirements. Include frontend (React/Vue), backend (Node/Python), database (PostgreSQL/MongoDB), testing, and deployment configuration."

### Process

**Phase 2: Complexity Evaluation**
```python
spec = {
  "file_count": 18,  # SKILL.md, reference.md, examples.md,
                     # 3 knowledge/, 2 docs/, 10 scripts
  "has_mcp_integration": True,  # playwright for testing, context7 for framework docs
  "workflow_steps": 8,  # requirements → architecture → backend → frontend
                        # → testing → deployment → monitoring → iteration
  "conditionals": 12,  # framework choices, DB types, deployment targets,
                       # auth strategies, testing approaches
  "external_deps": 6   # Multiple framework CLIs, Docker, Kubernetes tools
}

score = (18/20)*0.3 + 1*0.2 + (8/10)*0.1 + (12/15)*0.15 + (6/5)*0.25
      = 0.27 + 0.2 + 0.08 + 0.12 + 0.25 (capped deps)
      = 0.92 (normalized to 0.81)

category = "complex"
```

### Output

**File Structure:**
```
full-stack-generator/
├── SKILL.md (4.5k words - compressed with references)
├── reference.md (12k words)
├── examples.md (5k words - 10 examples)
├── knowledge/
│   ├── architecture-patterns.md (4k words)
│   ├── framework-selection.md (3.5k words)
│   ├── deployment-strategies.md (4.2k words)
│   ├── testing-pyramid.md (3.8k words)
│   └── security-best-practices.md (4k words)
├── scripts/
│   ├── requirements_analyzer.py
│   ├── architecture_designer.py
│   ├── backend_generator.py
│   ├── frontend_generator.py
│   ├── database_schema_generator.py
│   ├── test_suite_generator.py
│   ├── docker_composer.py
│   ├── k8s_manifest_generator.py
│   ├── ci_cd_configurator.py
│   └── monitoring_setup.py
└── docs/
    ├── migration-guide.md
    ├── troubleshooting.md
    ├── framework-compatibility.md
    ├── deployment-checklist.md
    └── scaling-guide.md
```

**SKILL.md (excerpt):**
```markdown
---
name: full-stack-generator
description: Generate production-ready full-stack applications from requirements with frontend (React/Vue/Angular), backend (Node.js/Python/Go), database (PostgreSQL/MongoDB/MySQL), complete testing suite, Docker containerization, and Kubernetes deployment manifests. Use when starting new projects, prototyping MVPs, or standardizing microservice architectures. Includes authentication, API design, CI/CD pipelines, and monitoring setup.
---

# Full Stack Generator

## Quick Start
Generate complete, production-ready applications from high-level requirements in minutes.

## When to Use This Skill
- Starting new full-stack project with modern architecture
- Rapid MVP prototyping with production-quality foundation
- Standardizing microservice templates across organization
- Learning full-stack patterns through working examples

## Core Workflow (High-Level)
1. **Requirements Analysis**: Extract features, constraints, preferences
2. **Architecture Design**: Choose frameworks, DB, deployment strategy
3. **Backend Generation**: API, business logic, data models
4. **Frontend Generation**: UI components, state management, routing
5. **Integration**: Connect frontend ↔ backend with type safety
6. **Testing**: Unit, integration, E2E test suites
7. **Deployment**: Docker, K8s, CI/CD configuration
8. **Monitoring**: Logging, metrics, alerting setup

**Detailed workflows in [reference.md](reference.md).**

## Resources
### reference.md
Complete phase-by-phase workflows, decision trees for framework selection, detailed script usage.

### examples.md
10 real-world examples: SaaS dashboard, e-commerce platform, social network, API gateway, etc.

### knowledge/
Deep-dive topics on architecture patterns, framework selection, deployment strategies, testing pyramid, security.

### scripts/
10 specialized generators - see [reference.md#automation-tools](reference.md#automation-tools).

### docs/
Migration guides, troubleshooting, compatibility matrix, deployment checklists, scaling strategies.

## Quick Reference
```bash
# Interactive mode (recommended for first use)
python scripts/requirements_analyzer.py --interactive

# From specification file
python scripts/architecture_designer.py --spec requirements.yaml

# Generate complete stack
python scripts/backend_generator.py --architecture arch.json
python scripts/frontend_generator.py --architecture arch.json
python scripts/test_suite_generator.py --architecture arch.json

# Containerize and deploy
python scripts/docker_composer.py --project ./output
python scripts/k8s_manifest_generator.py --project ./output
```

## MCP Integration
- **context7**: Official framework documentation lookup
- **playwright**: E2E test validation and screenshot testing

## Support
- **Troubleshooting**: See [docs/troubleshooting.md](docs/troubleshooting.md)
- **Compatibility**: See [docs/framework-compatibility.md](docs/framework-compatibility.md)
```

**Complexity Justification:**
- **18 files**: Comprehensive coverage requires extensive resources
- **MCP integration**: Playwright for testing, Context7 for docs
- **8 workflow steps**: Full lifecycle from requirements to monitoring
- **12 conditionals**: Multiple framework/DB/deployment choices
- **6 external deps**: Docker, kubectl, various framework CLIs

**Score: 0.81 → Full complex structure with knowledge/ and docs/ necessary**

---

## Example 4: REFACTOR Mode - Slimming Down Large SKILL.md

**Mode:** REFACTOR
**Complexity:** N/A (structural improvement)
**Scenario:** Refactoring 12k words SKILL.md to v2.0 structure

### Input

**Current Skill State:**
```
api-integration-helper/
├── SKILL.md (12,500 words - TOO LARGE!)
└── scripts/
    ├── oauth_handler.py
    ├── api_client.py
    └── rate_limiter.py
```

**User Request:**
> "Refactor this skill to follow v2.0 structure - it's taking too long to load."

### Process

**Phase 1: Current Structure Analysis**
```
Structural Issues Identified:
❌ SKILL.md is 12,500 words (max: 5,000)
❌ No layer separation - all content in one file
❌ 6 detailed workflow sections (should be in reference.md)
❌ 8 inline examples (should be in examples.md)
❌ Load time: ~18 seconds (target: <5 seconds)

Current Complexity: 0.52 (medium)
```

**Phase 2: Refactoring Plan**
```diff
Refactoring Plan for api-integration-helper
============================================

Files to CREATE:
+ reference.md (8,200 words from SKILL.md extraction)
  - Detailed OAuth flows (lines 120-450)
  - API client patterns (lines 480-680)
  - Error handling strategies (lines 720-920)
  - Rate limiting algorithms (lines 950-1100)

+ examples.md (3,100 words)
  - Extract 8 inline examples (scattered throughout)
  - Add 2 new comprehensive examples
  - Real-world integration scenarios

Files to MODIFY:
M SKILL.md
  - Remove lines 120-450 → reference.md
  - Remove lines 480-680 → reference.md
  - Remove lines 720-920 → reference.md
  - Remove lines 950-1100 → reference.md
  - Extract examples → examples.md
  - Add resource index section
  - Compress to high-level workflow only
  - Target: 4,200 words (66% reduction)

Files to REORGANIZE:
scripts/ → No changes (already well-organized)

Impact Analysis:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Size Impact:
- SKILL.md: 12,500 → 4,200 words (📉 66% reduction)
- Total size: 12,500 → 15,500 words (📈 24% increase)
- Deferred loading: 11,300 words

Load Time Impact:
- Current: ~18 seconds
- After: ~5 seconds (⚡ 72% faster)

Quality Impact:
- Validation: 0.65 → 1.0 (✅ 54% improvement)
- Progressive disclosure: No → Yes
- Maintainability: 0.70 → 0.92 (✅ 31% improvement)

Approve this refactoring? (yes/no):
```

**User:** yes

**Phase 3: Diff-based Transformation**
```
Executing refactoring plan...

[1/4] Creating reference.md...
  ✅ Extracted OAuth flows (330 words)
  ✅ Extracted API patterns (200 words)
  ✅ Extracted error handling (200 words)
  ✅ Extracted rate limiting (150 words)
  ✅ Total: 8,200 words written to reference.md

[2/4] Creating examples.md...
  ✅ Extracted 8 inline examples
  ✅ Added 2 comprehensive examples
  ✅ Total: 3,100 words written to examples.md

[3/4] Updating SKILL.md...
  ✅ Removed extracted sections
  ✅ Added resource index
  ✅ Compressed workflows to high-level
  ✅ New size: 4,187 words (within target)

[4/4] Updating cross-references...
  ✅ Updated internal links
  ✅ Added reference.md navigation
  ✅ Added examples.md references

Refactoring complete!
```

### Output

**Before/After Comparison**

**Before:**
```markdown
<!-- SKILL.md - 12,500 words -->
---
name: api-integration-helper
description: ...
---

# API Integration Helper

## Overview
[200 words]

## OAuth 2.0 Integration
### Authorization Code Flow
[Detailed 2,500 word explanation with code samples]

### Client Credentials Flow
[Detailed 1,800 word explanation]

### Implicit Flow (Deprecated)
[1,200 words]

## API Client Patterns
[Detailed 2,000 word section]

## Error Handling
[Detailed 2,000 word section]

## Rate Limiting
[Detailed 1,500 word section]

## Examples
### Example 1: GitHub API
[400 words inline]

### Example 2: Stripe API
[350 words inline]

... [6 more inline examples]
```

**After - SKILL.md (4,187 words):**
```markdown
---
name: api-integration-helper
description: ...
---

# API Integration Helper

## Quick Start
Integrate external APIs with OAuth 2.0, rate limiting, and error handling.

## When to Use This Skill
[Specific trigger scenarios]

## Core Workflow
1. **Authentication Setup**: Configure OAuth 2.0 or API keys
2. **Client Generation**: Create API client with automatic retries
3. **Request Handling**: Execute requests with rate limiting
4. **Error Management**: Handle failures gracefully

For detailed workflows, see [reference.md](reference.md).

## Resources
### reference.md
- Detailed OAuth 2.0 flows (Authorization Code, Client Credentials, PKCE)
- API client design patterns
- Comprehensive error handling strategies
- Rate limiting algorithms and implementations

### examples.md
- 10 real-world integration examples
- GitHub, Stripe, Twilio, SendGrid, AWS APIs
- End-to-end scenarios with authentication

### scripts/
[Brief script descriptions]

## Quick Reference
[Condensed cheat sheet]
```

**After - reference.md (8,200 words):**
```markdown
# API Integration Helper - Detailed Reference

## Table of Contents
- [OAuth 2.0 Flows](#oauth-flows)
- [API Client Patterns](#client-patterns)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)

## OAuth 2.0 Flows

### Authorization Code Flow
[Full 2,500 word detailed explanation with code samples]

### Client Credentials Flow
[Full 1,800 word detailed explanation]

... [all extracted content with full detail]
```

**After - examples.md (3,100 words):**
```markdown
# API Integration Helper - Examples

## Example 1: GitHub API with OAuth
[Full 400 word example]

## Example 2: Stripe API with API Keys
[Full 350 word example]

... [all 10 examples]
```

**Validation:**
```
✅ PASS: SKILL.md size is appropriate (4,187 words)
✅ PASS: reference.md exists as referenced
✅ PASS: examples.md exists as referenced
✅ PASS: All cross-references are valid
✅ PASS: Version updated to 2.0.0
✅ PASS: Complexity field added (medium)

✅ VALIDATION PASSED
```

**Impact Report:**
```
# Impact Analysis - api-integration-helper Refactoring

Load Time: 18s → 5s (⚡ 72% faster)
Initial Context: 12,500 → 4,187 words (66% reduction)
Validation Score: 0.65 → 1.0 (54% improvement)
Maintainability: 0.70 → 0.92 (31% improvement)

✅ REFACTORING SUCCESSFUL
```

---

## Example 5: IMPROVE Mode - Adding MCP Integration

**Mode:** IMPROVE
**Complexity Change:** 0.45 → 0.65 (Simple → Medium)
**Scenario:** Adding Playwright MCP to existing skill for E2E testing support

### Input

**Current Skill:**
```
web-scraper/
├── SKILL.md (3.2k words)
└── scripts/
    ├── fetch_html.py
    └── parse_content.py
```

**User Request:**
> "Improve the web-scraper skill to support JavaScript-heavy sites using Playwright for browser automation."

### Process

**Phase 1: Enhancement Analysis**
```
Current State:
- Complexity: 0.45 (simple)
- Capabilities: Static HTML scraping only
- Limitation: Cannot handle JavaScript-rendered content

Improvement Request:
- Add Playwright MCP integration
- Support dynamic content scraping
- Add screenshot capability
- Enhance with browser automation

Complexity Impact:
- Current: 0.45
- Projected: 0.65 (MCP +0.2)
- Category change: Simple → Medium
- Structure adjustment: Need reference.md
```

**Phase 2: Feature Planning**
```
New Features:
✅ Playwright MCP integration
✅ JavaScript rendering support
✅ Screenshot capture
✅ Cookie/auth handling
✅ Dynamic content waiting

New Resources Needed:
+ reference.md (for Playwright workflows)
+ examples.md (browser automation examples)
+ scripts/browser_scraper.py

SKILL.md Updates:
- Add MCP integration section
- Update workflow to include browser option
- Document new capabilities
- Size: 3.2k → 4.1k words (still under limit)

Breaking Changes: None (backward compatible)
```

**Phase 3: Incremental Implementation**

### Output

**Updated Structure:**
```
web-scraper/
├── SKILL.md (4.1k words)
├── reference.md (3.5k words - NEW)
├── examples.md (2.2k words - NEW)
└── scripts/
    ├── fetch_html.py (existing)
    ├── parse_content.py (existing)
    └── browser_scraper.py (NEW - Playwright wrapper)
```

**Before/After SKILL.md:**

**Before (v1.0.0):**
```markdown
---
name: web-scraper
description: Scrape static HTML content...
---

# Web Scraper

## Workflow
1. Fetch HTML
2. Parse content
3. Extract data
```

**After (v2.0.0):**
```markdown
---
name: web-scraper
description: Scrape static and dynamic web content with optional JavaScript rendering via Playwright MCP. Use for static HTML scraping (fast) or JavaScript-heavy sites (browser automation). Supports screenshots, authentication, and dynamic content waiting.
---

# Web Scraper

## Quick Start
Scrape web content with automatic detection of static vs dynamic sites.

## When to Use This Skill
- Static HTML sites → Fast fetch_html.py
- JavaScript-heavy sites → Playwright browser automation
- Need screenshots or authenticated scraping

## Core Workflow
1. **Detect Site Type**: Static HTML or JavaScript-rendered
2. **Choose Method**:
   - Static → fetch_html.py (faster)
   - Dynamic → browser_scraper.py with Playwright
3. **Extract Data**: Parse content with selectors
4. **Capture**: Optional screenshots for verification

See [reference.md](reference.md) for Playwright workflows.

## Resources
### reference.md (NEW)
Detailed Playwright integration, browser automation patterns, anti-detection strategies.

### examples.md (NEW)
Real-world examples: SPA scraping, authenticated sessions, infinite scroll handling.

### scripts/
- `fetch_html.py`: Fast static HTML fetching (existing)
- `parse_content.py`: Content parsing (existing)
- `browser_scraper.py`: Playwright browser automation (NEW)

## MCP Integration
**Playwright**: Enable with `/sc:mcp playwright` for JavaScript-rendered sites.

## Quick Reference
```bash
# Static site (fast)
python scripts/fetch_html.py https://example.com

# Dynamic site (Playwright)
python scripts/browser_scraper.py https://spa-app.com --wait-for ".content"

# With screenshot
python scripts/browser_scraper.py https://app.com --screenshot
```
```

**New reference.md:**
```markdown
# Web Scraper - Detailed Reference

## Playwright Integration

### When to Use Playwright
- Site requires JavaScript execution
- Content loads dynamically (AJAX, infinite scroll)
- Need to interact with page (clicks, form fills)
- Require screenshots for verification
- Must handle authentication flows

### Browser Automation Workflow
1. **Launch Browser**: Playwright starts headless Chrome/Firefox
2. **Navigate**: Go to target URL
3. **Wait Strategy**: Wait for selectors, network idle, or timeouts
4. **Interact**: Optional clicks, scrolls, form fills
5. **Extract**: Get rendered HTML or specific elements
6. **Screenshot**: Capture page state
7. **Close**: Clean up browser resources

... [detailed workflows continue]
```

**Version Management:**
```markdown
# CHANGELOG.md

## [2.0.0] - 2026-02-12

### Added
- Playwright MCP integration for JavaScript-rendered sites
- `browser_scraper.py` script for dynamic content
- Screenshot capture capability
- Cookie and authentication handling
- `reference.md` with Playwright workflows
- `examples.md` with browser automation examples

### Changed
- SKILL.md updated to 4.1k words (from 3.2k)
- Complexity upgraded from simple to medium
- Description expanded to cover new capabilities

### Backward Compatibility
- ✅ All existing scripts work unchanged
- ✅ Static HTML scraping still available
- ✅ No breaking changes to API

### Migration
No action required. New features are opt-in via Playwright MCP.
```

**Validation:**
```
✅ PASS: SKILL.md size is appropriate (4,087 words)
✅ PASS: reference.md exists as referenced
✅ PASS: examples.md exists as referenced
✅ PASS: MCP integration documented
✅ PASS: Backward compatibility maintained
✅ PASS: Version updated to 2.0.0

Complexity Check:
- Old score: 0.45 (simple)
- New score: 0.65 (medium)
- Category change: Simple → Medium
⚠️  WARNING: Structure was upgraded to medium (reference.md added)

✅ VALIDATION PASSED
```

---

## Example 6: FIX Mode - Correcting Validation Logic

**Mode:** FIX
**Complexity:** Unchanged
**Scenario:** Fixing bug in enhanced_validator.mjs

### Input

**Bug Report:**
> "Bug: enhanced_validator.mjs incorrectly flags valid hyphen-case names as errors when they contain numbers (e.g., 'api-v2-client' is valid but gets rejected)."

**Current Code (buggy):**
```python
# scripts/enhanced_validator.mjs line 1527
if not re.match(r'^[a-z-]+$', name):
    result.add_error(f"Name '{name}' must be hyphen-case (lowercase, hyphens only)")
```

### Process

**Phase 1: Issue Diagnosis**
```
Reported Issue:
- Valid names like 'api-v2-client', 'oauth2-helper' incorrectly rejected
- Regex pattern: ^[a-z-]+$ (missing numbers)

Root Cause:
- Pattern only allows lowercase letters and hyphens
- Should allow numbers: ^[a-z0-9-]+$

Impact:
- Blocks valid skill names with version numbers
- Severity: Medium (workflow blocker for some users)

Files Affected:
- scripts/enhanced_validator.mjs (line 1527)
```

**Phase 2: Minimal Fix Design**
```
Fix Specification:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
File: scripts/enhanced_validator.mjs
Line: 1527
Change: ^[a-z-]+$ → ^[a-z0-9-]+$

Scope: Single line change
Side Effects: None
Breaking Changes: None
```

**Phase 3: Targeted Implementation**

### Output

**Before:**
```python
# scripts/enhanced_validator.mjs (buggy)
def validate_yaml_frontmatter(skill_path: Path, result: ValidationResult):
    """Validate YAML frontmatter in SKILL.md"""
    # ... [previous code]

    # Validate name format
    name_match = re.search(r'name:\s*(.+)', frontmatter)
    if name_match:
        name = name_match.group(1).strip()
        if not re.match(r'^[a-z-]+$', name):  # ❌ BUG: missing numbers
            result.add_error(f"Name '{name}' must be hyphen-case (lowercase, hyphens only)")
        elif name.startswith('-') or name.endswith('-') or '--' in name:
            result.add_error(f"Name '{name}' cannot start/end with hyphen or have consecutive hyphens")
        else:
            result.add_pass(f"Name '{name}' follows hyphen-case convention")
```

**After:**
```python
# scripts/enhanced_validator.mjs (fixed)
def validate_yaml_frontmatter(skill_path: Path, result: ValidationResult):
    """Validate YAML frontmatter in SKILL.md"""
    # ... [previous code unchanged]

    # Validate name format
    name_match = re.search(r'name:\s*(.+)', frontmatter)
    if name_match:
        name = name_match.group(1).strip()
        if not re.match(r'^[a-z0-9-]+$', name):  # ✅ FIXED: added 0-9
            result.add_error(f"Name '{name}' must be hyphen-case (lowercase, hyphens only)")
        elif name.startswith('-') or name.endswith('-') or '--' in name:
            result.add_error(f"Name '{name}' cannot start/end with hyphen or have consecutive hyphens")
        else:
            result.add_pass(f"Name '{name}' follows hyphen-case convention")
```

**Phase 4: Regression Testing**
```
Test Cases:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ 'api-client' → PASS (unchanged)
✅ 'oauth2-helper' → PASS (previously failed, now fixed)
✅ 'api-v2-client' → PASS (previously failed, now fixed)
✅ 'skill-123-test' → PASS (previously failed, now fixed)
❌ 'API-Client' → FAIL (uppercase, expected)
❌ 'api_client' → FAIL (underscore, expected)
❌ 'api client' → FAIL (space, expected)
❌ '-api-client' → FAIL (starts with hyphen, expected)
❌ 'api-client-' → FAIL (ends with hyphen, expected)
❌ 'api--client' → FAIL (double hyphen, expected)

All tests pass! ✅
```

**Phase 5: Documentation Update**
```markdown
# docs/troubleshooting.md (updated)

## Common Validation Issues

### Name Validation Errors

**Issue**: "Name must be hyphen-case (lowercase, hyphens only)"

**Valid formats**:
✅ lowercase-with-hyphens
✅ with-numbers-v2
✅ oauth2-api-client
✅ api-123-helper

**Invalid formats**:
❌ UpperCase-Names
❌ under_score_names
❌ names with spaces
❌ -starts-with-hyphen
❌ ends-with-hyphen-
❌ double--hyphens

**Fixed in**: v2.0.1 (previously rejected valid names with numbers)
```

**CHANGELOG.md:**
```markdown
## [2.0.1] - 2026-02-12

### Fixed
- Fixed validation regex in `enhanced_validator.mjs` to allow numbers in skill names
- Names like 'api-v2-client', 'oauth2-helper' now correctly pass validation
- Updated troubleshooting documentation with valid name format examples

### Technical Details
- File: `scripts/enhanced_validator.mjs` line 1527
- Change: Regex pattern `^[a-z-]+$` → `^[a-z0-9-]+$`
- Impact: Single-line fix, no breaking changes
```

**Validation:**
```
✅ Fixed behavior verified
✅ Regression tests pass
✅ Documentation updated
✅ CHANGELOG.md updated
✅ No breaking changes
✅ Minimal surface area (1 line)

✅ FIX VALIDATED
```

---

## Example 7: CREATE Mode with MCP - Documentation Generator

**Mode:** CREATE
**Complexity:** Medium (Score: 0.58)
**Scenario:** Framework documentation generation skill using Context7 MCP

### Input

**User Request:**
> "Create a skill that generates comprehensive documentation for code projects, using Context7 to fetch official framework documentation and patterns."

### Process

**Phase 2: Complexity Evaluation**
```python
spec = {
  "file_count": 7,  # SKILL.md, reference.md, examples.md, 4 scripts
  "has_mcp_integration": True,  # Context7
  "workflow_steps": 4,  # analyze code → fetch patterns → generate docs → validate
  "conditionals": 5,  # framework detection, doc format, output style
  "external_deps": 2   # AST parser, markdown generator
}

score = (7/20)*0.3 + 1*0.2 + (4/10)*0.1 + (5/15)*0.15 + (2/5)*0.25
      = 0.105 + 0.2 + 0.04 + 0.05 + 0.1
      = 0.495 × 1.17 (normalization)
      = 0.58

category = "medium"
```

### Output

**Structure:**
```
documentation-generator/
├── SKILL.md (3.6k words)
├── reference.md (5.8k words)
├── examples.md (2.5k words)
└── scripts/
    ├── code_analyzer.py       # AST analysis
    ├── context7_fetcher.py    # MCP integration
    ├── doc_generator.py       # Markdown generation
    └── validator.py           # Link checking
```

**SKILL.md (excerpt):**
```markdown
---
name: documentation-generator
description: Generate comprehensive project documentation with official framework patterns via Context7 MCP. Analyzes code structure, fetches official docs, generates README, API references, and usage guides. Use when starting new projects, open-sourcing code, or improving existing documentation. Supports React, Vue, Angular, Express, Django, Flask, and more.
---

# Documentation Generator

## Quick Start
Generate professional documentation by analyzing code and fetching official patterns.

## When to Use This Skill
- New project needs README and API docs
- Open-sourcing project requiring comprehensive docs
- Onboarding documentation for team
- Framework migration requires updated docs

## Core Workflow
1. **Analyze Code**: Extract structure, dependencies, API surfaces
2. **Fetch Patterns**: Use Context7 for official framework documentation
3. **Generate Docs**: Create README, API reference, usage guides
4. **Validate**: Check links, examples, completeness

## MCP Integration
**Context7**: Fetches official framework documentation and best practices.

Enable: `/sc:mcp context7`

## Resources
### reference.md
Detailed workflows, Context7 integration patterns, doc generation algorithms.

### examples.md
React app docs, Express API docs, Python library docs.

## Quick Reference
```bash
# Analyze project and generate docs
python scripts/code_analyzer.py ./src
python scripts/context7_fetcher.py --framework react
python scripts/doc_generator.py --output ./docs

# All-in-one
python scripts/doc_generator.py --auto-detect ./src --output ./docs
```
```

**Key Feature - Context7 Integration:**
```python
# scripts/context7_fetcher.py
def fetch_official_patterns(framework: str, topics: List[str]) -> Dict:
    """
    Use Context7 MCP to fetch official framework documentation.

    Example:
        patterns = fetch_official_patterns('react', ['hooks', 'context', 'routing'])
        # Returns official React docs for hooks, context, routing
    """
    # MCP call to context7
    result = mcp_context7_query(
        library_id=framework,
        topics=topics
    )

    return {
        'official_patterns': result.patterns,
        'best_practices': result.recommendations,
        'code_examples': result.examples
    }
```

**Complexity Justification:**
- MCP integration adds 0.2 to score
- Medium structure with reference.md, examples.md appropriate
- 4 specialized scripts for analysis, fetching, generation, validation

---

## Example 8: REFACTOR Mode - Monolithic to Modular Scripts

**Mode:** REFACTOR
**Complexity:** Unchanged (Medium)
**Scenario:** Modularizing monolithic script in scripts/ directory

### Input

**Current State:**
```
data-pipeline-builder/
├── SKILL.md (4.2k words)
├── reference.md (6k words)
└── scripts/
    └── pipeline.py (2,500 lines - TOO LARGE!)
```

**Problem:**
- pipeline.py is too large at 2,500 lines
- Extract, Transform, Load logic is mixed together
- Difficult to test and maintain

**User Request:**
> "Refactor the monolithic pipeline.py script into modular components."

### Process

**Phase 2: Refactoring Plan**
```diff
Refactoring Plan for data-pipeline-builder/scripts
===================================================

Current Structure:
scripts/
└── pipeline.py (2,500 lines)
    ├── extract_*() functions (800 lines)
    ├── transform_*() functions (900 lines)
    ├── load_*() functions (600 lines)
    └── orchestration (200 lines)

Proposed Structure:
scripts/
├── pipeline.py (200 lines - orchestration only)
├── extractors/
│   ├── __init__.py
│   ├── database.py (300 lines)
│   ├── api.py (250 lines)
│   └── file.py (250 lines)
├── transformers/
│   ├── __init__.py
│   ├── cleaner.py (300 lines)
│   ├── aggregator.py (300 lines)
│   └── validator.py (300 lines)
└── loaders/
    ├── __init__.py
    ├── database.py (200 lines)
    ├── warehouse.py (200 lines)
    └── file.py (200 lines)

Changes:
M pipeline.py (2,500 → 200 lines, orchestration only)
+ extractors/__init__.py
+ extractors/database.py
+ extractors/api.py
+ extractors/file.py
+ transformers/__init__.py
+ transformers/cleaner.py
+ transformers/aggregator.py
+ transformers/validator.py
+ loaders/__init__.py
+ loaders/database.py
+ loaders/warehouse.py
+ loaders/file.py

Benefits:
✅ Improved testability (unit test each module)
✅ Better code organization (clear separation)
✅ Easier maintenance (smaller files)
✅ Reusability (import specific extractors/transformers/loaders)
✅ No functional changes (backward compatible)
```

### Output

**After Structure:**
```
data-pipeline-builder/
├── SKILL.md (4.2k words - updated references)
├── reference.md (6k words - updated script docs)
└── scripts/
    ├── pipeline.py (200 lines)
    ├── extractors/
    │   ├── __init__.py
    │   ├── database.py
    │   ├── api.py
    │   └── file.py
    ├── transformers/
    │   ├── __init__.py
    │   ├── cleaner.py
    │   ├── aggregator.py
    │   └── validator.py
    └── loaders/
        ├── __init__.py
        ├── database.py
        ├── warehouse.py
        └── file.py
```

**Before/After - pipeline.py:**

**Before (2,500 lines):**
```python
#!/usr/bin/env python3
"""Monolithic pipeline script"""

def extract_from_database(config):
    # 300 lines of database extraction logic
    pass

def extract_from_api(config):
    # 250 lines of API extraction logic
    pass

def transform_clean(data):
    # 300 lines of data cleaning logic
    pass

def transform_aggregate(data):
    # 300 lines of aggregation logic
    pass

# ... 1,500+ more lines ...

if __name__ == "__main__":
    # Orchestration logic
    pass
```

**After (200 lines):**
```python
#!/usr/bin/env python3
"""Pipeline orchestration"""

from extractors import DatabaseExtractor, APIExtractor, FileExtractor
from transformers import DataCleaner, Aggregator, Validator
from loaders import DatabaseLoader, WarehouseLoader, FileLoader

class Pipeline:
    def __init__(self, config):
        self.config = config
        self.extractor = self._init_extractor()
        self.transformer = self._init_transformer()
        self.loader = self._init_loader()

    def _init_extractor(self):
        extractor_type = self.config.get('source_type')
        if extractor_type == 'database':
            return DatabaseExtractor(self.config)
        elif extractor_type == 'api':
            return APIExtractor(self.config)
        else:
            return FileExtractor(self.config)

    def _init_transformer(self):
        return [
            DataCleaner(self.config),
            Aggregator(self.config),
            Validator(self.config)
        ]

    def _init_loader(self):
        loader_type = self.config.get('target_type')
        if loader_type == 'database':
            return DatabaseLoader(self.config)
        elif loader_type == 'warehouse':
            return WarehouseLoader(self.config)
        else:
            return FileLoader(self.config)

    def run(self):
        """Execute ETL pipeline"""
        # Extract
        data = self.extractor.extract()

        # Transform
        for transformer in self.transformer:
            data = transformer.transform(data)

        # Load
        self.loader.load(data)

        return True

if __name__ == "__main__":
    import sys
    config_file = sys.argv[1]
    pipeline = Pipeline.from_config(config_file)
    pipeline.run()
```

**Impact:**
```
Code Organization:
- Monolithic: 1 file × 2,500 lines
- Modular: 13 files × 150-300 lines each
- Average file size: 192 lines ✅

Testability:
- Before: Hard to unit test (everything coupled)
- After: Easy to test each module independently ✅

Maintainability:
- Before: Score 0.45 (large files, coupling)
- After: Score 0.88 (modular, clear structure) ✅

Backward Compatibility:
- CLI interface: Unchanged ✅
- Config format: Unchanged ✅
- Output: Identical ✅
```

---

## Example 9: IMPROVE Mode - Adding Validation Gates

**Mode:** IMPROVE
**Complexity:** 0.52 → 0.56 (Minor increase)
**Scenario:** Adding automatic validation steps to existing skill

### Input

**Current Skill:**
```
config-manager/
├── SKILL.md (3.9k words)
├── reference.md (5.2k words)
└── scripts/
    ├── generate_config.py
    └── deploy_config.py
```

**User Request:**
> "Add validation gates to prevent deploying invalid configurations."

### Process

**Phase 2: Feature Planning**
```
Enhancement Plan:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
New Feature: Validation Gates

Components:
1. Schema validation (JSON Schema, YAML)
2. Security checks (secrets detection, permission validation)
3. Consistency checks (cross-reference validation)
4. Pre-deployment dry-run

New Resources:
+ scripts/validator.py (new)
+ scripts/security_checker.py (new)
+ schemas/ directory with validation schemas

SKILL.md Changes:
- Add validation workflow step
- Document validation rules
- Size: 3.9k → 4.3k words

Complexity Impact:
- Files: 4 → 6 (+2 scripts)
- Workflow steps: 2 → 4 (+validation, security check)
- Score: 0.52 → 0.56
- Category: Medium (unchanged)
```

### Output

**Enhanced Structure:**
```
config-manager/
├── SKILL.md (4.3k words)
├── reference.md (6.8k words - added validation section)
├── examples.md (2.1k words - added validation examples)
├── schemas/
│   ├── app-config.schema.json
│   ├── db-config.schema.json
│   └── deploy-config.schema.json
└── scripts/
    ├── generate_config.py (existing)
    ├── validator.py (NEW)
    ├── security_checker.py (NEW)
    └── deploy_config.py (updated with validation calls)
```

**New Workflow (SKILL.md):**
```markdown
## Core Workflow

1. **Generate Configuration**: Create config from templates
2. **Validate Schema** (NEW): JSON Schema validation
3. **Security Check** (NEW): Detect secrets, validate permissions
4. **Dry Run** (NEW): Test deployment without applying
5. **Deploy**: Apply validated configuration

## Validation Gates

### Gate 1: Schema Validation
```bash
python scripts/validator.py --config app-config.yaml --schema schemas/app-config.schema.json
```
Checks: syntax, required fields, types, constraints

### Gate 2: Security Check
```bash
python scripts/security_checker.py --config app-config.yaml
```
Checks: hardcoded secrets, insecure permissions, exposed credentials

### Gate 3: Dry Run
```bash
python scripts/deploy_config.py --config app-config.yaml --dry-run
```
Simulates deployment, reports issues without applying changes
```

**Version Update:**
```markdown
# CHANGELOG.md

## [2.1.0] - 2026-02-12

### Added
- **Validation gates**: 3-stage validation before deployment
- `validator.py`: JSON Schema validation script
- `security_checker.py`: Security and secrets detection
- `schemas/` directory with validation schemas
- Dry-run mode in `deploy_config.py`
- Validation examples in `examples.md`
- Detailed validation documentation in `reference.md`

### Changed
- SKILL.md updated to 4.3k words (added validation workflow)
- reference.md expanded to 6.8k words (validation rules)
- deploy_config.py now runs validation by default

### Backward Compatibility
- ✅ Validation can be skipped with `--skip-validation` flag
- ✅ Existing configs work without schema files (warning only)
- ✅ No breaking changes to deployment process
```

---

## Example 10: Complex Multi-Mode - Skill Evolution Lifecycle

**Modes Used:** CREATE → IMPROVE → REFACTOR → FIX
**Scenario:** Skill evolution through complete lifecycle

### Phase 1: CREATE (v1.0.0)

**Initial Creation:**
```
test-automation/
├── SKILL.md (2.8k words)
└── scripts/
    └── run_tests.py

Complexity: 0.32 (simple)
```

### Phase 2: IMPROVE (v1.1.0)

**Enhancement: Add coverage reporting**
```
test-automation/
├── SKILL.md (3.2k words)
└── scripts/
    ├── run_tests.py
    └── coverage_reporter.py (NEW)

Complexity: 0.38 (simple)
```

### Phase 3: IMPROVE (v2.0.0)

**Major Enhancement: Add Playwright E2E testing**
```
test-automation/
├── SKILL.md (4.5k words)
├── reference.md (NEW - 5k words)
├── examples.md (NEW - 2k words)
└── scripts/
    ├── run_tests.py
    ├── coverage_reporter.py
    └── e2e_tester.py (NEW - Playwright integration)

Complexity: 0.62 (medium) - MCP added
Category Change: Simple → Medium
```

### Phase 4: REFACTOR (v2.1.0)

**Structural Improvement: Organize test types**
```
test-automation/
├── SKILL.md (4.2k words - compressed)
├── reference.md (7k words - expanded)
├── examples.md (3.5k words - more examples)
└── scripts/
    ├── run_tests.py (orchestrator)
    ├── unit/
    │   └── runner.py
    ├── integration/
    │   └── runner.py
    ├── e2e/
    │   └── playwright_runner.py
    └── reporters/
        ├── coverage.py
        └── html_report.py

Complexity: 0.64 (medium)
Maintainability: 0.71 → 0.89
```

### Phase 5: FIX (v2.1.1)

**Bug Fix: Coverage calculation error**
```diff
# scripts/reporters/coverage.py
- coverage_percent = (covered / total)  # Bug: missing *100
+ coverage_percent = (covered / total) * 100  # Fixed
```

### Evolution Summary

```
Version History:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
v1.0.0 (CREATE)       Simple     0.32   Basic test running
v1.1.0 (IMPROVE)      Simple     0.38   + Coverage reporting
v2.0.0 (IMPROVE)      Medium     0.62   + E2E testing, MCP
v2.1.0 (REFACTOR)     Medium     0.64   Modular structure
v2.1.1 (FIX)          Medium     0.64   Coverage bug fix

Metrics Evolution:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Files:           1 → 2 → 5 → 10 → 10
SKILL.md:      2.8k → 3.2k → 4.5k → 4.2k → 4.2k
Complexity:    0.32 → 0.38 → 0.62 → 0.64 → 0.64
Quality Score:   70 → 75 → 82 → 91 → 92
Load Time:       3s → 3s → 6s → 5s → 5s
```

**Lessons Learned:**
1. **Start Simple**: v1.0 minimal viable skill
2. **Incremental Improvement**: v1.1 adds small features
3. **Strategic Upgrades**: v2.0 major capability addition
4. **Proactive Refactoring**: v2.1 improves before problems arise
5. **Quick Fixes**: v2.1.1 addresses bugs immediately

---

## Summary Table

| Example | Mode | Complexity | Key Learning |
|---------|------|------------|--------------|
| 1. Image Rotator | CREATE | Simple (0.28) | Minimal structure for simple tasks |
| 2. API Client Builder | CREATE | Medium (0.52) | Layered docs for moderate complexity |
| 3. Full Stack Generator | CREATE | Complex (0.81) | Full hierarchy for comprehensive skills |
| 4. Slim SKILL.md | REFACTOR | N/A | Extract content for progressive disclosure |
| 5. Add MCP | IMPROVE | 0.45→0.65 | MCP integration increases complexity |
| 6. Fix Validation | FIX | Unchanged | Minimal changes for bug fixes |
| 7. Doc Generator | CREATE | Medium (0.58) | MCP integration in CREATE mode |
| 8. Modular Scripts | REFACTOR | Unchanged | Organize code without functional changes |
| 9. Validation Gates | IMPROVE | 0.52→0.56 | Add features incrementally |
| 10. Lifecycle | All 4 | 0.32→0.64 | Evolution through multiple modes |

---

## Usage Guidelines

### When to Use Each Example

**Learning CREATE Mode:**
- Examples 1-3, 7: Different complexity levels
- Start with Example 1 (simple), progress to 3 (complex)

**Learning REFACTOR Mode:**
- Examples 4, 8: Structure vs code organization
- Example 4: Document restructuring
- Example 8: Code modularization

**Learning IMPROVE Mode:**
- Examples 5, 9: Feature additions
- Example 5: MCP integration (complexity increase)
- Example 9: Validation gates (minor enhancement)

**Learning FIX Mode:**
- Example 6: Bug fix with minimal changes
- Example 10 (Phase 5): Fix in context of evolution

**Understanding Complexity:**
- Compare Examples 1 (0.28), 2 (0.52), 3 (0.81)
- See how file count, MCP, workflow steps affect score

**End-to-End Learning:**
- Follow Example 10 for complete skill lifecycle

---

## Next Steps

After reviewing these examples:

1. **Practice**: Try creating your own skill following Example 1 or 2
2. **Reference**: Use PRD and reference.md for detailed workflows
3. **Validate**: Run `enhanced_validator.mjs` on your skills
4. **Iterate**: Use multi-turn refinement for quality improvement

For detailed mode workflows, see [reference.md](reference.md).
