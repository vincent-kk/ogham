# Progressive Disclosure - The Three-Layer Loading Theory

## Concept Definition

Progressive Disclosure is a design principle that organizes information hierarchically so users access only what they need. In the skill system, it's implemented through a 3-layer loading mechanism to maximize context window efficiency.

---

## The Three-Layer Loading System

### Layer 1: Metadata (Always Loaded)

**Purpose**: Skill discovery and matching

**Size**: ~100 words

**Content**:
```yaml
---
name: skill-name
description: Complete description with specific trigger scenarios...
user-invocable: true
---
```

**Loading Time**:
- Loaded during Claude Code initialization for all skills
- Used for skill matching during user request analysis

**Context Cost**:
- 100 words × 50 skills = 5,000 words
- ~2.5% of total context (based on 200k tokens)

**Optimization Strategy**:
- Write descriptions with maximum information density
- Include clear trigger keywords
- Keep under 250 characters (longer descriptions are auto-truncated in skill list)

---

### Layer 2: SKILL.md (Conditionally Loaded)

**Purpose**: Provide execution guide and workflow

**Size**: 2-5k words (varies by complexity)

**Content**:
- Quick Start (2-3 sentences)
- When to Use (specific triggers)
- Core Workflow (high-level steps)
- Resources Index (references to deep resources)
- Quick Reference (cheat sheet)

**Loading Time**:
- After skill is selected
- Before user starts task

**Context Cost**:
- Average 3.5k words = ~4,700 tokens
- ~2.3% of total context

**Optimization Strategy**:
- Move detailed content to reference.md
- Keep only high-level overview
- Use "See reference.md Section X.Y" format for references
- Strictly adhere to 5k word limit

---

### Layer 3: Deep Resources (On-Demand)

**Purpose**: Detailed information for specific task support

**Size**: Unlimited

**Content**:
- **reference.md**: Detailed workflows, algorithms, API reference
- **examples.md**: 5-10 real use cases
- **knowledge/*.md**: Domain theory, design patterns
- **docs/*.md**: Migration guides, troubleshooting
- **scripts/**: Executable code (no context loading needed)

**Loading Time**:
- Only when specific section is needed
- When user explicitly requests
- During error handling (troubleshooting.md)
- For advanced features (knowledge/)

**Context Cost**:
- Selective loading of needed parts only
- Average 2-3k additional words (out of total 10-15k)

**Optimization Strategy**:
- Clear section divisions (Grep-friendly)
- Provide TOC for quick navigation
- Design independent sections (no sequential reading required)

---

## Benefits of Progressive Disclosure

### 1. Context Window Efficiency

**Traditional Approach (Monolithic):**
```
On skill selection:
- Load entire 15k words
- Uses ~7.5% of context
- Loading time: 15-20 seconds
```

**Progressive Disclosure Approach:**
```
Layer 1 (discovery): 100 words
Layer 2 (execution): 3.5k words
Layer 3 (as needed): 2-3k words

Total context: 5.6-6.6k words (~3% of total)
Savings: 8.4-9.4k words (56-63%)
Loading time: 5-7 seconds (67% improvement)
```

### 2. Fast Skill Matching

**Metadata-Only Loading:**
- 50 skills × 100 words = 5k words
- Entire skill library fits in context
- Instant matching to user requests

**Monolithic Approach:**
- 50 skills × 15k words = 750k words
- Exceeds context window → cannot load all skills simultaneously
- Sequential search required → slow

### 3. Scalability

**Adding New Skills:**
- Layer 1 only adds +100 words
- Layer 2, 3 load only when selected
- Infinite scalability possible

**Increasing Complexity:**
- Existing SKILL.md → move to reference.md
- SKILL.md size remains stable
- Only Layer 3 grows, Layer 2 stays constant

### 4. Developer Experience

**Clear Information Hierarchy:**
- Quick overview: SKILL.md Quick Start
- Detailed guide: reference.md
- Real examples: examples.md
- Theoretical background: knowledge/

**Easy Maintenance:**
- Each layer independently updatable
- Eliminates duplicate information
- Clear separation of concerns

---

## Layer-by-Layer Design Guide

### Layer 1 Design: Effective Metadata

**Name (Skill Name):**
```yaml
✅ Good: pdf-generator, api-client-builder, test-automation
❌ Bad: PDFGen, skill-1, my_awesome_tool
```

**Description:**
```yaml
✅ Good: >
  Use this skill when converting Markdown documentation to styled PDF reports.
  It provides template-based PDF generation with custom CSS styling,
  table of contents generation, and syntax highlighting for code blocks.
  Typical scenarios: Technical documentation, project reports, user manuals.
  Triggers: "convert to PDF", "generate PDF report", "create printable docs"

❌ Bad: >
  This skill helps with PDF tasks.
```

**Effective Description Formula:**
```
1. USE CASE: "Use this skill when [specific scenario]"
2. CAPABILITIES: "It provides [specific features] by [method]"
3. SCENARIOS: "Typical scenarios: [examples]"
4. TRIGGERS: "Triggers: [keywords]"
```

---

### Layer 2 Design: Concise SKILL.md

**Size Budget Allocation:**
```markdown
Section               | Simple | Medium | Complex
--------------------- | ------ | ------ | --------
Quick Start           | 150w   | 200w   | 250w
When to Use           | 200w   | 300w   | 400w
Core Workflow         | 800w   | 1500w  | 2000w
Resources Index       | 300w   | 600w   | 800w
Quick Reference       | 550w   | 900w   | 1050w
--------------------- | ------ | ------ | --------
Total                 | 2000w  | 3500w  | 4500w
```

**Workflow Compression Techniques:**

**Before (Detailed - Content to Move):**
```markdown
## Phase 1: Input Analysis

### Step 1.1: Parse Input Files
First, locate all Markdown files in the input directory. Use glob patterns
to match files: `*.md`, `*.markdown`. Exclude hidden files and directories.
Read each file and extract:
- Front matter (YAML)
- Headings structure
- Code blocks
- Images and links

Validate syntax using markdown-it parser. Handle errors gracefully...
[continues for 800 words]
```

**After (Compressed - Keep in SKILL.md):**
```markdown
## Phase 1: Input Analysis
Parse Markdown files, extract structure, validate syntax.
See reference.md Section 2.1 for detailed parsing algorithms.

**Quick Steps:**
1. Locate *.md files
2. Extract front matter and structure
3. Validate syntax
```

**Reference Link Pattern:**
- `See reference.md Section X.Y for [specific topic]`
- `Detailed algorithm in reference.md Section X.Y`
- `For troubleshooting, see docs/troubleshooting.md`

---

### Layer 3 Design: Structured Deep Resources

#### reference.md Structure

**TOC-Based Navigation:**
```markdown
# Detailed Reference for Skill Name

## Table of Contents
1. Introduction
2. Detailed Workflows
   2.1 Phase 1: Input Analysis
   2.2 Phase 2: Processing
   2.3 Phase 3: Output Generation
3. Algorithms & Pseudocode
4. API Reference
5. Configuration Options
6. Troubleshooting

---

## 2.1 Phase 1: Input Analysis

### Parsing Algorithm
[Detailed step-by-step algorithm]

### Error Handling
[Comprehensive error scenarios]

### Performance Optimization
[Advanced optimization techniques]
```

**Section Independence:**
- Each section understandable without reading others
- Cross-references explicit ("See Section 3.2")
- Specific sections extractable via Grep

#### examples.md Structure

**Example Template:**
```markdown
## Example N: [Descriptive Title] (Complexity: Simple/Medium/Complex)

### Scenario
[Real use case description]

### Input
[Concrete input data/files]

### Workflow
[Step-by-step execution process]

### Output
[Results and verification]

### Notes
[Caveats, variations]

---
```

**5-10 Example Coverage:**
1. Simple case (minimal features)
2. Standard case (typical usage)
3. Complex case (advanced features)
4. Edge case (boundary conditions)
5. Error handling (error cases)
6-10. Domain-specific scenarios

#### knowledge/ Structure

**Independent Topics:**
- Each file covers one theoretical subject
- Independent from SKILL.md/reference.md
- For deep learning purposes

**File Naming:**
```
knowledge/
├── architecture-patterns.md    # Architecture design patterns
├── security-best-practices.md  # Security best practices
├── performance-tuning.md       # Performance optimization
├── integration-strategies.md   # Integration strategies
└── domain-theory.md            # Domain theory
```

---

## When to Load Which Layer

### Scenario-Based Loading Strategy

#### Scenario 1: Skill Discovery

**User Request**: "I need to convert Markdown to PDF"

**Loading Sequence:**
1. **Layer 1 (Metadata)**: Scan all skills
2. Match: `pdf-generator` (description contains "convert Markdown to PDF")
3. **Layer 2 (SKILL.md)**: Load matched skill only
4. Present Quick Start

**Context Usage**: 5k + 3.5k = 8.5k words

---

#### Scenario 2: Basic Execution

**User Request**: "Generate PDF from my docs/ folder"

**Loading Sequence:**
1. Layer 1: Skill selection (already done)
2. **Layer 2 (SKILL.md)**: Reference Core Workflow
3. Execute workflow (call scripts/)

**Context Usage**: 8.5k words (Layer 3 not needed)

---

#### Scenario 3: Advanced Customization

**User Request**: "Customize PDF styling with corporate branding"

**Loading Sequence:**
1. Layer 1, 2: Basic loading (complete)
2. **Layer 3 (reference.md Section 4)**: "Configuration Options - Custom Styling"
3. **Layer 3 (examples.md Example 7)**: "Corporate Branding Example"

**Context Usage**: 8.5k + 2k (section only) = 10.5k words

---

#### Scenario 4: Error Resolution

**User**: "PDF generation failed with 'Font not found' error"

**Loading Sequence:**
1. Layer 1, 2: Basic loading
2. **Layer 3 (reference.md Section 6)**: "Troubleshooting - Font Issues"
3. Or **Layer 3 (docs/troubleshooting.md)**: Dedicated troubleshooting guide

**Context Usage**: 8.5k + 1.5k (troubleshooting section) = 10k words

---

#### Scenario 5: Learning and Deep Understanding

**User**: "Explain the PDF generation architecture"

**Loading Sequence:**
1. Layer 1, 2: Basic loading
2. **Layer 3 (knowledge/architecture-patterns.md)**: Architecture theory
3. **Layer 3 (reference.md Section 3)**: Algorithm details

**Context Usage**: 8.5k + 4k (knowledge file) = 12.5k words

---

## Token Optimization Strategies

### Strategy 1: Reference Compression

**Remove Duplication:**
```markdown
❌ Before (SKILL.md + reference.md both explain workflow):
SKILL.md: 500 words explaining Phase 1
reference.md: 500 words explaining Phase 1 again

✅ After (SKILL.md references, reference.md details):
SKILL.md: 50 words overview + "See reference.md 2.1"
reference.md: 800 words detailed explanation
```

**Savings**: 500 - 50 = 450 words (SKILL.md)

---

### Strategy 2: Example Extraction

**Extract Inline Examples:**
```markdown
❌ Before (examples in SKILL.md):
SKILL.md contains 5 examples × 200w = 1000w

✅ After (examples in examples.md):
SKILL.md: "See examples.md for 5 real-world scenarios"
examples.md: 5 examples × 200w = 1000w (on-demand)
```

**Savings**: 1000 words (SKILL.md, moved to Layer 3)

---

### Strategy 3: Knowledge Separation

**Separate Theoretical Content:**
```markdown
❌ Before (theory in SKILL.md):
SKILL.md includes 800w of architectural theory

✅ After (theory in knowledge/):
SKILL.md: High-level principles only
knowledge/architecture.md: Detailed theory (on-demand)
```

**Savings**: 600-700 words (SKILL.md)

---

### Strategy 4: Smart Sectioning

**Grep-Friendly Structure:**
```markdown
✅ Clear section markers:
## 2.1 Input Analysis Algorithm
[Content - easily extractable]

## 2.2 Validation Logic
[Content - easily extractable]

Claude can grep specific sections only:
"Load reference.md Section 2.1 only"
```

**Benefit**: Load only needed sections instead of entire file

---

## Progressive Disclosure by Complexity

### Simple Skill (Score < 0.4)

**Structure:**
```
skill/
└── SKILL.md (2-3k words)
```

**Disclosure:**
- Layer 1: Metadata (100w)
- Layer 2: SKILL.md (2-3k w)
- Layer 3: None (scripts/ don't need context)

**Total Context**: 2.1-3.1k words

---

### Medium Skill (Score 0.4-0.7)

**Structure:**
```
skill/
├── SKILL.md (3-4k words)
├── reference.md (5-8k words)
└── examples.md (2-4k words)
```

**Disclosure:**
- Layer 1: Metadata (100w)
- Layer 2: SKILL.md (3-4k w)
- Layer 3: reference.md + examples.md (selective 2-3k w)

**Total Context**: 5.1-7.1k words (when using Layer 3)

---

### Complex Skill (Score > 0.7)

**Structure:**
```
skill/
├── SKILL.md (4-5k words, compressed)
├── reference.md (10-15k words)
├── examples.md (4-6k words)
├── knowledge/ (5 files × 3k = 15k words)
└── docs/ (5 files × 2k = 10k words)
```

**Disclosure:**
- Layer 1: Metadata (100w)
- Layer 2: SKILL.md (4-5k w)
- Layer 3:
  - reference.md sections (2-3k w per session)
  - examples.md examples (500w per example)
  - knowledge/ files (3k w per file, selective)
  - docs/ files (2k w per file, selective)

**Total Context**: 6.1-11.1k words (actual usage)
**Full Skill Size**: 50k+ words (mostly on-demand)

---

## Performance Metrics

### Loading Time Improvements

**Before (Monolithic):**
- Skill discovery: 5 seconds (full scan)
- Skill load: 15 seconds (15k words)
- Total: 20 seconds

**After (Progressive):**
- Skill discovery: 1 second (metadata only)
- Skill load: 3 seconds (SKILL.md only)
- Layer 3 (as needed): 2 seconds
- Total: 6 seconds (basic), 8 seconds (advanced)

**Improvement**: 60-70% faster

---

### Context Usage Efficiency

**Before:**
- Per skill average: 12k words
- 50 skill library: 600k words (impossible)
- Concurrent loading: 3-4 skills max

**After:**
- Layer 1 (50 skills): 5k words
- Layer 2 (active skill): 3.5k words
- Layer 3 (selective): 2-3k words
- Total: 10.5-11.5k words
- **Concurrent consideration**: Entire skill library + active skill

**Improvement**: 50x more skills usable concurrently

---

## Conclusion

Progressive Disclosure is the core design principle of the skill system, ensuring:

1. **Efficiency**: 56-63% context savings
2. **Speed**: 60-70% loading time reduction
3. **Scalability**: Supports unlimited skill library
4. **Usability**: Clear information hierarchy

**Core Principles:**
- Layer 1: Always load (discovery)
- Layer 2: Load on selection (execution)
- Layer 3: Load as needed (deep dive)

Strict adherence to this 3-layer system enables fast, efficient work even with large-scale skill libraries.
