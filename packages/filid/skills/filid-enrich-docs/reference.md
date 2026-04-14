# filid-enrich-docs — Reference Documentation

Detailed workflow, quality rubric, MCP tool call signatures, and output format
templates for the INTENT.md enrichment skill. For the quick-start overview,
see [SKILL.md](./SKILL.md).

## Section 1 — Path Validation

Validation checks, performed in order:

1. Resolve the target path to an absolute path. If `path` is omitted, use the
   current working directory.
2. Confirm the directory exists (fail fast if not).
3. Walk up from the target to locate the nearest `.filid/config.json`. If
   none exists, abort with:

   ```
   Error: target <path> is not inside a FCA-AI project (.filid/config.json not found).
   Run /filid:filid-setup first.
   ```

4. Resolve `--depth`. If omitted, treat as unlimited.
5. Read the `[filid:lang]` tag injected by the UserPromptSubmit hook (e.g.,
   `[filid:lang] ko`). If the tag is absent, fall back to the system language
   and default to English. The resolved language is forwarded to every
   `context-manager` delegation so rewrites follow the project language.

## Section 2 — Discovery

Collection steps:

1. Glob for INTENT.md under the target directory, respecting `--depth`:

   ```
   // depth unlimited
   Glob("<path>/**/INTENT.md")

   // depth N (e.g., N = 3)
   Glob("<path>/INTENT.md")
   Glob("<path>/*/INTENT.md")
   Glob("<path>/*/*/INTENT.md")
   Glob("<path>/*/*/*/INTENT.md")
   ```

2. For every hit, build a `DocEntry`:

   ```ts
   type DocEntry = {
     absPath: string;            // absolute INTENT.md path
     moduleRoot: string;         // directory containing INTENT.md
     content: string;            // full file content
     lineCount: number;
     children: string[];         // immediate child directories of moduleRoot
     implFiles: string[];        // *.ts, *.tsx, *.js under moduleRoot (non-test, non-nested fractal)
     classification: "fractal" | "organ" | "hybrid" | "pure-function";
   };
   ```

3. Resolve classification for each `moduleRoot` via a single `mcp_t_fractal_scan`:

   ```
   mcp_t_fractal_scan({ path: "<target-path>" })
   // Returns: ScanReport { tree: { nodes: Map<path, FractalNode>, root: string }, modules: [...], ... }
   ```

   Skip `organ` nodes — INTENT.md is prohibited there and should be surfaced
   as a `filid-scan` violation, not an enrichment target.

4. When `--include-detail` is set, also Glob for `DETAIL.md` and add each as
   a peer `DocEntry` with kind `detail`. DETAIL.md entries are scored on the
   same rubric but against their own templates (see Section 3.5).

5. Detect `MISSING` candidates: for every `fractal` node in the scan whose
   module root is under the target directory but lacks an INTENT.md, create
   a `DocEntry` with `content = null` and `lineCount = 0`.

## Section 3 — Quality Audit

### 3.1 Scoring Axes

Each INTENT.md receives a score ∈ [0, 100] computed from four independent
axes, each worth 25 points.

| Axis         | What it measures                                                             |
| ------------ | ---------------------------------------------------------------------------- |
| Structure    | Does the file cite real child directories or real file/function names?      |
| Conventions  | Does the file list 3+ concrete rules specific to the module?                 |
| Boundaries   | Do the 3-tier sections go beyond generic boilerplate?                        |
| Dependencies | Does the file name concrete upstream or downstream modules?                  |

### 3.2 Structure axis (25 pts)

Parse the `## Structure` section:

- +10 if any child directory listed in `DocEntry.children` appears verbatim
- +10 if any implementation filename (`implFiles` without extension) appears
- +5  if the section uses a table (`| ... |`) rather than a raw list
- Cap at 25.

### 3.3 Conventions axis (25 pts)

Parse the `## Conventions` section. Count non-empty bullet lines.

- 0 pts for 0 bullets
- 10 pts for 1-2 bullets
- 20 pts for 3-4 bullets
- 25 pts for 5+ bullets
- Subtract 10 if every bullet is < 40 characters (too terse to be useful)

### 3.4 Boundaries axis (25 pts)

Inspect the three sub-sections (`### Always do`, `### Ask first`, `### Never do`):

- +8 per sub-section that has at least one bullet, capped at +24
- +1 if no sub-section contains the phrase `모듈 경계 외부 로직 인라인` or
  `do not import` as its only bullet (boilerplate detector)
- Cap at 25. Files that literally match the `filid-setup` scaffold template
  receive 0 on this axis.

### 3.5 Dependencies axis (25 pts)

Parse the `## Dependencies` section:

- +15 if the section names at least one module path (pattern `src/...`,
  `packages/...`, or any path segment with `/`)
- +10 if the section distinguishes internal vs external dependencies
- Cap at 25.

DETAIL.md rubric differs: replace `Structure` with `Requirements` and
`Conventions` with `API Contracts`. Boundaries and Dependencies axes do not
apply — DETAIL.md is scored against `Requirements`, `API Contracts`, and
`Last Updated` freshness (last-updated within 90 days from today, 2026-04-12).

### 3.6 Classification

```
score >= min-quality        → RICH   (skip)
0 < score < min-quality     → SPARSE (enrich)
content is null             → MISSING (create)
```

Default `min-quality = 70`.

## Section 4 — Enrichment Plan

Build a `PlanItem` per SPARSE / MISSING entry:

```ts
type PlanItem = {
  docPath: string;               // INTENT.md path (may not yet exist)
  moduleRoot: string;            // directory to scope the rewrite
  kind: "sparse" | "missing";
  currentScore: number;          // 0 for missing
  axesToRewrite: Axis[];         // axes under their threshold
  implFilesToRead: string[];     // capped at 6
  childDirs: string[];           // fed into Structure section
};
```

Axis thresholds for "needs rewrite":

- Structure < 15
- Conventions < 15
- Boundaries < 15
- Dependencies < 10

MISSING items always rewrite all four axes. When a SPARSE item passes every
axis threshold individually but its total is still below `min-quality`, mark
all four axes for rewrite.

Implementation file selection heuristic (cap 6 per entry):

1. Pick `index.ts` / `main.ts` if present (priority boost).
2. Pick the eponymous file (`auth/auth.ts` for directory `auth/`).
3. Pick up to 4 more source files by size descending, excluding `*.test.ts`,
   `*.spec.ts`, `*.bench.ts`, `*.d.ts`.

## Section 5 — Approval Gate

Summary printed before asking:

```
## Enrich-docs Plan — <path>

**Total discovered**: <n> INTENT.md (+<m> DETAIL.md)
**Classification**: RICH=<r>, SPARSE=<s>, MISSING=<x>
**Will enrich**: <s + x> files
**Axes rewritten**: Structure=<a>, Conventions=<b>, Boundaries=<c>, Dependencies=<d>

<file list with per-item axes and impl files>
```

Then call `AskUserQuestion`:

```
AskUserQuestion({
  question: "Approve INTENT.md enrichment for <s+x> files?",
  options: [
    { label: "approve",  description: "Proceed with parallel enrichment" },
    { label: "modify",   description: "I want to adjust the plan" },
    { label: "cancel",   description: "Abort without changes" },
  ],
})
```

On `modify`, ask the user which files or axes to drop, regenerate the plan,
and re-prompt. On `cancel`, skip to Stage 8 with status `CANCELLED`. On
`approve`, proceed to Stage 6.

`--dry-run` bypasses the prompt entirely — print the plan and jump to
Stage 8 with status `DRY_RUN`.

`--auto-approve` bypasses the prompt and proceeds to Stage 6.

## Section 6 — Parallel Enrichment

Batch `PlanItem`s into groups of at most 4 and dispatch one `context-manager`
subagent per batch in a single tool-call block. Each delegation prompt
includes:

```
Target: <docPath>
Kind: SPARSE | MISSING
Module root: <moduleRoot>
Language: <lang from .filid/config.json>
Axes to rewrite: [Structure, Conventions, Boundaries, Dependencies]
Implementation files to read before writing: [...]
Child directories: [...]

Instructions:
1. Read every file listed above before writing.
2. Preserve English section headings exactly:
   ## Purpose / ## Structure / ## Conventions / ## Boundaries
   ### Always do / ### Ask first / ### Never do / ## Dependencies
3. Body text MUST be in <language>.
4. INTENT.md MUST stay within 50 lines total.
5. Structure section MUST reference at least one real child directory or
   real file/function name from the implementation files above.
6. Conventions section MUST contain 3+ concrete rules specific to this
   module (not generic FCA-AI advice).
7. Boundaries sections MUST NOT be boilerplate; cite real boundary cases.
8. Dependencies section MUST name concrete upstream/downstream modules.
9. For MISSING targets, create the file with this scaffold then fill it in:

   # <module-name> — <one-line description>

   ## Purpose
   ## Structure
   | File | Role |
   ## Conventions
   ## Boundaries
   ### Always do
   ### Ask first
   ### Never do
   ## Dependencies

10. Return { docPath, status: "written" | "skipped" | "error", reason? }.
```

When `--include-detail` is set, DETAIL.md prompts replace the INTENT.md
scaffold with:

```
## Requirements
## API Contracts
## Last Updated
```

and relax the 50-line rule per project configuration.

## Section 7 — Validate

For every file the agent reports as `written`:

```
mcp_t_doc_compress({ mode: "auto", filePath: "<docPath>", content: "<new content>" })
// Returns: { needsCompression: boolean, suggestedContent?: string, lineCount: number }

mcp_t_structure_validate({ path: "<moduleRoot>" })
// Returns: { passed: boolean, violations: Violation[] }
```

Decision logic:

- `needsCompression === true` → dispatch a second-pass `context-manager` with
  the `suggestedContent` and instruction "compress to 50 lines preserving all
  four rewritten axes"; retry limit = 1.
- `mcp_t_structure_validate` reports a missing tier section → mark file as
  `NEEDS_REWORK`, revert the on-disk content, and report in Stage 8.
- Both checks pass → mark as `ACCEPTED`.

## Section 8 — Report

```
## Enrich-docs Report — <path>

**Date**: <ISO 8601>
**Mode**: normal | dry-run | auto-approve
**Target**: <absolute path>
**Language**: <lang>

### Discovery
INTENT.md files discovered: <n>
DETAIL.md files discovered: <m> (--include-detail only)
Fractal modules: <f>, Organ modules skipped: <o>

### Quality Audit
RICH:    <r> (score >= <min-quality>)
SPARSE:  <s>
MISSING: <x>
Average score: <avg>/100

### Enrichment
Status: APPLIED | DRY_RUN | CANCELLED | SKIPPED_ALL_RICH
Batches dispatched: <b>
Files accepted: <a>
Files needing rework: <nr>
Files errored: <e>

### Per-file Changes

| File | Kind | Score before → after | Lines before → after | Axes rewritten | Status |
| ---- | ---- | -------------------- | -------------------- | -------------- | ------ |

### Summary
Overall: PASS | NEEDS_ATTENTION | FAIL
```

### Terminal stage markers

Emit exactly one of:

- `Enrich-docs complete: <a> files enriched`
- `Enrich-docs dry-run complete`
- `Enrich-docs skipped: all RICH`
- `Enrich-docs cancelled`

Register these markers in `.omc/research/terminal-markers.json` per the
Tier-2b anti-yield contract.
