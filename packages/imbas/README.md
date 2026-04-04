# @ogham/imbas

A Claude Code plugin that converts product specification documents into structured Jira development tasks.

Writing specs is easy. Turning them into a well-organized backlog of Stories, Tasks, and Subtasks — with correct dependencies, size estimates, and implementation grounding — is tedious and error-prone. imbas automates this through a **3-phase pipeline** driven by specialized AI agents.

---

## Installation

### Via Marketplace (Recommended)

```bash
# 1. Add the repository to your marketplace
claude plugin marketplace add https://github.com/vincent-kk/ogham

# 2. Install the plugin
claude plugin install imbas
```

All components (Skills, MCP, Agents, Hooks) register automatically. No manual configuration needed.

### For Development (Local Setup)

```bash
# From monorepo root
yarn install

# Build the plugin
cd packages/imbas
yarn build          # TypeScript compile + bundling

# Load in Claude Code
claude --plugin-dir ./packages/imbas
```

Building produces two outputs:

- `bridge/mcp-server.cjs` — MCP server (16 pipeline tools)
- `bridge/*.mjs` — 5 hook scripts (automatic lifecycle management)

---

## The Idea

Product teams write specs. Engineering teams break them down into tickets. This handoff is where context is lost — requirements get misinterpreted, edge cases get missed, and dependencies get tangled.

imbas sits between spec and backlog. It reads your planning document, validates it for contradictions and gaps, decomposes it into Stories with acceptance criteria, then grounds each Story in your actual codebase to generate implementable Tasks and Subtasks.

The key insight: **Story decomposition is a product concern, but Task planning is an engineering concern**. imbas uses separate specialized agents for each, so product logic and implementation logic never contaminate each other.

---

## How It Works

### The 3-Phase Pipeline

```
Document → [Validate] → [Split] → [Devplan] → Jira Issues
              ↓             ↓           ↓
         Report.md    Stories.json  Devplan.json
```

**Phase 1 — Validate:** The `imbas-analyst` agent reads your spec and checks for contradictions, divergences between sections, missing requirements, and logical infeasibilities. It produces a validation report. If blocking issues are found, the pipeline stops here — fix the spec first.

**Phase 2 — Split:** The `imbas-planner` agent decomposes the validated document into INVEST-compliant Jira Stories. Each Story gets:
- User Story syntax ("As a... I want... So that...")
- Given/When/Then acceptance criteria
- A 3-step verification: anchor link back to source → coherence check → reverse inference (can you reconstruct the original requirement from the Stories alone?)
- Size check — Stories too large get split horizontally

**Phase 3 — Devplan:** The `imbas-engineer` agent takes the Stories and explores your local codebase (via AST analysis) to produce:
- EARS-format Subtasks per Story (scoped to max 200 lines / 10 files / 1 hour review)
- Cross-Story shared Tasks (extracted via N:M merge-point detection)
- Dependency links and execution order
- Feedback comments when Stories contain ambiguity that needs product clarification

Each phase writes its output to a manifest file. Manifests are then executed against Jira to batch-create issues, links, and comments.

### State Machine

Every run is tracked by a state machine (`state.json`) with strict transition rules:

- `imbas:validate` → always starts
- `imbas:split` → only after validate passes (PASS or PASS_WITH_WARNINGS)
- `imbas:devplan` → only after split completes and Stories are reviewed

Phases can be escaped (abnormal termination with a reason code) or skipped. The pipeline is resume-friendly — if interrupted, `imbas:status resume` picks up where it left off.

### Working Directory

All state is stored locally in `.imbas/`:

```
.imbas/
├── config.json                 # Global config (languages, LLM models, Jira settings)
├── <PROJECT_KEY>/
│   ├── cache/                  # Cached Jira metadata (24h TTL)
│   │   ├── project-meta.json
│   │   ├── issue-types.json
│   │   ├── link-types.json
│   │   └── workflows.json
│   └── runs/
│       └── 20250404-001/       # Run ID: YYYYMMDD-NNN
│           ├── state.json      # Phase state machine
│           ├── source.md       # Input document
│           ├── supplements/    # Supporting files (optional)
│           ├── validation-report.md
│           ├── stories-manifest.json
│           └── devplan-manifest.json
└── .temp/                      # Media analysis working directory
```

---

## How to Use

imbas skills are **LLM prompts**, not CLI commands. You invoke them in Claude Code as natural language conversations.

### Initial Setup

```
/imbas:setup
/imbas:setup --project PROJ
```

Creates `.imbas/`, sets up `config.json`, and caches your Jira project metadata (issue types, link types, workflows).

### Run the Full Pipeline

```
/imbas:pipeline ./spec.md
/imbas:pipeline ./spec.md --project PROJ
```

Runs validate → split → manifest-stories → devplan → manifest-devplan end-to-end with auto-approval at quality gates. This is the primary entry point for most users.

### Run Phases Individually

For more control, run each phase separately:

```
# Phase 1: Validate the document
/imbas:validate

# Phase 2: Split into Stories
/imbas:split

# Phase 3: Generate dev plan
/imbas:devplan
```

Each phase reads from the previous phase's output and writes its own manifest.

### Execute Manifests to Jira

```
/imbas:manifest stories     # Create Story issues
/imbas:manifest devplan     # Create Tasks, Subtasks, and links
/imbas:manifest stories --dry-run   # Preview without creating
```

Manifest execution is idempotent — re-running skips already-created issues (tracked by `issue_ref` in the manifest).

### Check Pipeline Status

```
/imbas:status              # Current run status
/imbas:status list         # All runs for a project
/imbas:status resume       # Resume an interrupted run
```

### Additional Tools

```
# Compress a Jira issue into a structured summary comment
/imbas:digest PROJ-123

# Analyze media attachments (images, videos, GIFs)
/imbas:fetch-media <url-or-path>
```

---

## Agents

imbas uses 4 specialized subagents, each with constrained roles:

| Agent | Model | Role | Phase |
|-------|-------|------|-------|
| `imbas-analyst` | Sonnet | Document validation (contradictions, gaps, infeasibilities) | Validate, Split (reverse inference) |
| `imbas-planner` | Sonnet | Story decomposition (INVEST criteria, acceptance criteria) | Split |
| `imbas-engineer` | Opus | Task planning (codebase exploration, subtask generation) | Devplan |
| `imbas-media` | Sonnet | Media analysis (keyframe extraction, visual description) | Fetch-media |

Agent roles are enforced at runtime via the `SubagentStart` hook — agents cannot overstep their assigned responsibilities.

---

## What Runs Automatically

With the plugin active, these hooks fire **without user intervention**:

| When | What | Why |
|------|------|-----|
| Session starts | Initializes cache directory + logging | Ensures `.imbas/` structure exists |
| Read/Write/Edit a file | Validates tool inputs | Prevents invalid operations on `.imbas/` state files |
| Sub-agent starting | Injects role restrictions | Prevents agents from overstepping assigned phase |
| User submits a prompt | Injects run/manifest context | Agents are aware of current pipeline state |
| Session ends | Cleans up temp files | Removes `.imbas/.temp/` working directory |

---

## Skills Reference

| Skill | User-invocable | What it does |
|-------|---------------|--------------|
| `/imbas:setup` | Yes | Initialize `.imbas/`, configure project and Jira settings |
| `/imbas:pipeline` | Yes | End-to-end pipeline execution with auto-approval gates |
| `/imbas:validate` | Yes | Phase 1: Validate document for contradictions and gaps |
| `/imbas:split` | Yes | Phase 2: Decompose document into INVEST Stories |
| `/imbas:devplan` | Yes | Phase 3: Generate Tasks/Subtasks grounded in codebase |
| `/imbas:manifest` | Yes | Execute manifests to batch-create Jira issues |
| `/imbas:status` | Yes | View run status, list runs, resume interrupted runs |
| `/imbas:digest` | Yes | Compress a Jira issue into a structured summary |
| `/imbas:fetch-media` | Yes | Download and analyze media attachments |
| `/imbas:cache` | No | Internal: Manage Jira metadata cache (24h TTL) |
| `/imbas:read-issue` | No | Internal: Read and structure Jira issue context |

---

## Expected Results

### Input

A planning document (Markdown, Confluence page, or Jira epic description) describing what to build — features, user flows, requirements, constraints.

### Output

A fully structured Jira backlog:

- **Stories** with User Story syntax, Given/When/Then acceptance criteria, and verification metadata
- **Tasks** for cross-cutting concerns extracted from multiple Stories
- **Subtasks** scoped to implementable units (≤200 lines, ≤10 files, ≤1 hour review)
- **Links** encoding dependencies (blocks, split-into, relates-to)
- **Execution order** — numbered steps for creating issues in the right sequence
- **Feedback comments** flagging ambiguities that need product team input

### What It Catches

During validation:
- **Contradictions** — section A says X, section B says not-X
- **Divergences** — terminology or scope drifts between sections
- **Omissions** — referenced features/flows with no specification
- **Infeasibilities** — requirements that conflict with technical constraints

During split:
- **INVEST violations** — Stories that are too large, not independently deliverable, or missing testability
- **Semantic loss** — reverse inference verifies no requirements were dropped during decomposition

During devplan:
- **Missing implementation paths** — Stories that can't be mapped to existing code patterns
- **Cross-Story overlaps** — shared logic that should be a single Task, not duplicated across Subtasks

---

## Configuration

`config.json` supports:

```jsonc
{
  "language": {
    "documents": "ko",           // Source document language
    "skills": "en",              // Agent prompt language
    "issue_content": "ko",       // Jira issue content language
    "reports": "ko"              // Report output language
  },
  "defaults": {
    "project_ref": "PROJ",       // Default Jira project
    "llm_model": {
      "validate": "sonnet",      // Model per phase
      "split": "sonnet",
      "devplan": "opus"
    },
    "subtask_limits": {
      "max_lines": 200,          // Max lines per subtask
      "max_files": 10,           // Max files per subtask
      "review_hours": 1          // Max review time per subtask
    }
  }
}
```

Modify via:

```
/imbas:setup set-language documents=en
/imbas:setup set-project NEWPROJ
```

---

## Development

```bash
yarn dev            # TypeScript watch mode
yarn test           # Vitest watch
yarn test:run       # Single run
yarn typecheck      # Type checking only
yarn build          # tsc + MCP server + hooks bundling
```

### Tech Stack

TypeScript 5.7, @modelcontextprotocol/sdk, @ast-grep/napi, esbuild, Vitest, Zod

---

## License

MIT
