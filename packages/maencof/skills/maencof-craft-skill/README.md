## What Is This?

Skill Constructor is a meta-skill — a skill that builds other skills. It replaces manual scaffolding with a systematic, mode-based workflow for creating, restructuring, enhancing, and fixing Claude Code skills.

Instead of hand-crafting directory structures, guessing at file organization, and hoping the result follows best practices, Skill Constructor automates the entire lifecycle:

- **Evaluates complexity** of your skill idea using a weighted formula
- **Generates the right structure** (simple, medium, or complex) based on that score
- **Validates the output** against a 15-point quality checklist
- **Packages the skill** for deployment

It works through four operating modes, each with a 6-phase workflow tailored to its purpose.

---

## The Four Modes

### CREATE — Build a new skill from scratch

**Triggers:** "create new skill", "build skill", "initialize"

Takes you from a vague idea to a fully structured, validated skill. The process:

1. **Requirements Discovery** — Gathers 3–5 concrete usage examples and identifies needed resources
2. **Complexity Evaluation** — Calculates a score (0–1) and recommends a structure tier
3. **Structure Generation** — Creates the directory hierarchy
4. **Implementation** — Builds SKILL.md, scripts, references, and examples
5. **Validation** — Runs automated checks
6. **Deployment** — Packages for distribution

### REFACTOR — Restructure an existing skill

**Triggers:** "refactor skill", "restructure", "reorganize"

Improves internal organization without changing functionality. Typical use: a SKILL.md that has grown beyond 5,000 words and needs to be split into layered files.

- Generates a diff preview before making changes
- Requires user approval
- Produces a migration guide and impact report
- Measures before/after metrics (load time, maintainability, validation score)

### IMPROVE — Add features to an existing skill

**Triggers:** "improve skill", "add feature", "enhance"

Extends capabilities incrementally while maintaining backward compatibility.

- Assesses how the new feature changes the complexity score
- Warns if the skill jumps complexity categories (e.g., simple → medium)
- Adds new scripts, documentation, and examples
- Updates version (minor bump: 1.x.0)

### FIX — Repair a broken skill

**Triggers:** "fix bug", "resolve issue", "debug"

Applies targeted, minimal fixes with full regression testing.

- Diagnoses root cause
- Designs the smallest possible change
- Verifies both the fix and unchanged behavior
- Updates troubleshooting documentation
- Updates version (patch bump: 1.0.x)

---

## Quick Start

### Creating a new skill

```bash
# 1. Score complexity interactively
node scripts/complexity_scorer.mjs --interactive

# 2. Generate directory structure
node scripts/structure_generator.mjs --name my-skill --complexity medium --path ./

# 3. Implement (fill in SKILL.md, write scripts, add examples)

# 4. Validate
node scripts/enhanced_validator.mjs ./my-skill

# 5. Package
node scripts/package_skill.mjs ./my-skill
```

### Analyzing an existing skill

```bash
# Score an existing skill's complexity
node scripts/complexity_scorer.mjs --analyze ./my-skill

# Detect which mode to use based on a request
node scripts/mode_detector.mjs --request "add MCP integration" --skill-path ./my-skill

# Validate a skill
node scripts/enhanced_validator.mjs ./my-skill
```

---

## How Complexity Scoring Works

Every skill gets a complexity score between 0 and 1, calculated from five factors:

```
score = (file_count/20 × 0.3)
      + (mcp_integration × 0.2)
      + (workflow_steps/10 × 0.1)
      + (conditionals/15 × 0.15)
      + (external_deps/5 × 0.25)
```

| Factor | Weight | What it measures |
|--------|--------|------------------|
| File count | 30% | Total files the skill will contain |
| MCP integration | 20% | Whether it integrates with MCP servers (0 or 1) |
| Workflow steps | 10% | Number of steps in the core workflow |
| Conditionals | 15% | Branching logic (if/else paths) |
| External deps | 25% | Third-party libraries and tools needed |

The score maps to three structure tiers:

### Simple (score < 0.4)

```
my-skill/
├── SKILL.md          (2–3k words)
└── scripts/
    └── main.py
```

Suitable for single-purpose tools like image rotators or file converters.

### Medium (score 0.4–0.7)

```
my-skill/
├── SKILL.md          (3–4k words)
├── reference.md      (detailed workflows)
├── examples.md       (real-world usage)
└── scripts/
    ├── analyze.py
    ├── generate.py
    └── validate.py
```

Suitable for multi-step workflows like API client builders or test frameworks.

### Complex (score > 0.7)

```
my-skill/
├── SKILL.md          (4–5k words, compressed)
├── reference.md      (10k+ words)
├── examples.md       (5k+ words)
├── knowledge/        (deep-dive theory)
│   ├── architecture.md
│   └── best-practices.md
├── scripts/          (5–7+ scripts)
│   ├── analyzer.py
│   ├── generator.py
│   └── ...
└── docs/             (guides and troubleshooting)
    ├── migration-guide.md
    └── troubleshooting.md
```

Suitable for full-stack generators, MCP-integrated skills, or complex automation.

---

## Progressive Disclosure

Skills use a 3-layer loading system to minimize context window usage:

| Layer | What | When loaded | Size |
|-------|------|-------------|------|
| **Layer 1: Metadata** | YAML frontmatter (name + description) | Always — for skill discovery | ~100 words |
| **Layer 2: SKILL.md** | Core workflow and resource index | When the skill is triggered | < 5k words |
| **Layer 3: Deep Resources** | reference.md, examples.md, knowledge/, docs/ | On demand, as needed | Unlimited |

This design means 50 skills can coexist in a library while consuming only ~5,000 words of context for discovery. A single active skill adds 3–5k words, and detailed resources load only when specifically needed.

The strict 5,000-word limit on SKILL.md is enforced by validation. Content that exceeds this limit should be moved to reference.md or examples.md.

---

## Directory Structure

```
skill-constructor/
├── SKILL.md                          # Core instructions (Layer 2)
├── reference.md                      # Detailed phase workflows, algorithms, validation rules
├── examples.md                       # 10 real-world examples across all 4 modes
├── LICENSE.txt                       # Apache 2.0
│
├── knowledge/                        # Deep-dive theory (Layer 3)
│   ├── skill-anatomy.md              # Structural design principles and patterns
│   ├── progressive-disclosure.md     # 3-layer loading system theory
│   ├── quality-standards.md          # Quality metrics and best practices
│   ├── bundled-resources.md          # scripts/, references/, assets/ design
│   └── mcp-integration.md            # MCP server integration patterns
│
├── scripts/                          # Automation tools
│   ├── mode_detector.mjs             # Detect CREATE/REFACTOR/IMPROVE/FIX from context
│   ├── complexity_scorer.mjs         # Calculate complexity score and recommend structure
│   ├── structure_generator.mjs       # Generate directory hierarchy from complexity tier
│   ├── enhanced_validator.mjs        # 15-point validation checklist
│   ├── init_skill.mjs                # Initialize a new skill with templates
│   ├── package_skill.mjs             # Validate + package for distribution
│   ├── deployment_helper.mjs         # Deployment automation
│   └── quick_validate.mjs            # Fast validation for development
│
└── docs/                             # Supplementary guides (Layer 3)
    ├── mode-comparison.md            # Side-by-side comparison of all 4 modes
    ├── complexity-tuning.md          # Customizing the complexity formula
    ├── migration-guide.md            # Migrating existing skills to v2.0
    ├── troubleshooting.md            # Common issues and solutions
    └── advanced-patterns.md          # Advanced techniques and anti-patterns
```

---

## Scripts Reference

All scripts output JSON for programmatic use and human-readable reports for manual review.

| Script | Purpose | Usage |
|--------|---------|-------|
| `mode_detector.mjs` | Detects the appropriate mode from a user request | `--request "add feature" [--skill-path ./]` |
| `complexity_scorer.mjs` | Calculates complexity score and recommends structure | `--interactive` or `--analyze <skill-path>` |
| `structure_generator.mjs` | Creates directory hierarchy with template files | `--name <name> --complexity <level> --path ./` |
| `enhanced_validator.mjs` | Runs 15-point validation checklist | `<skill-path>` |
| `init_skill.mjs` | Initializes a new skill with boilerplate | `<skill-name> [--complexity <level>]` |
| `package_skill.mjs` | Validates and packages a skill for distribution | `<skill-path>` |
| `deployment_helper.mjs` | Assists with deployment to target locations | `<skill-path> [--target <path>]` |
| `quick_validate.mjs` | Fast validation during development | `<skill-path>` |

---

## Documentation Map

Not sure where to look? Use this guide:

| I want to... | Read this |
|---------------|-----------|
| Understand the overall system | `SKILL.md` |
| Follow detailed phase-by-phase workflows | `reference.md` |
| See real-world examples of all 4 modes | `examples.md` |
| Learn skill design principles | `knowledge/skill-anatomy.md` |
| Understand the 3-layer loading system | `knowledge/progressive-disclosure.md` |
| Integrate MCP servers into a skill | `knowledge/mcp-integration.md` |
| Compare the 4 operating modes | `docs/mode-comparison.md` |
| Customize the complexity formula | `docs/complexity-tuning.md` |
| Migrate an existing skill to v2.0 | `docs/migration-guide.md` |
| Debug a problem | `docs/troubleshooting.md` |
| Learn advanced patterns and anti-patterns | `docs/advanced-patterns.md` |

---

## Validation Checklist

Before a skill is considered complete, it must pass these checks (automated via `enhanced_validator.mjs`):

- **YAML Frontmatter** — Starts with `---`, contains `name` (hyphen-case) and `description` (20-250 chars), no angle brackets
- **File Structure** — SKILL.md exists and is under 5k words; all referenced files exist; scripts are executable
- **Content Quality** — Imperative/infinitive writing style; clear workflow structure; valid resource references; complete examples
- **Organization** — Proper directory hierarchy; no duplicate information; clear separation of concerns

---

## Skill Lifecycle Example

A typical skill evolves through multiple modes over time:

```
v1.0.0  CREATE    →  Simple skill (score 0.32), basic test runner
v1.1.0  IMPROVE   →  Add coverage reporting (score 0.38)
v2.0.0  IMPROVE   →  Add E2E testing + MCP integration (score 0.62, simple → medium)
v2.1.0  REFACTOR  →  Reorganize scripts into modular structure (score 0.64)
v2.1.1  FIX       →  Fix coverage calculation bug (score 0.64)
```

Start simple. Add features incrementally. Refactor when complexity demands it. Fix bugs surgically.

---

## License

Apache License 2.0 — see [LICENSE.txt](LICENSE.txt) for full text.
