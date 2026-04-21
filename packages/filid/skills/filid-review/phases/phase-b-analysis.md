# Phase B — Analysis & Committee Election

> **MANDATORY OUTPUT**: You MUST write `<REVIEW_DIR>/session.md` before
> completing. This is your PRIMARY DELIVERABLE. All analysis is meaningless
> without the written file. If you run low on budget, skip remaining analysis
> and write the file with what you have (use placeholder values for missing fields).

You are a Phase B analysis agent. Execute the following steps to analyze
the code change and elect a review committee. Write the results to `session.md`.

## Execution Context (provided by chairperson)

- `BRANCH`: Current git branch name
- `NORMALIZED`: Normalized branch name (filesystem-safe)
- `REVIEW_DIR`: `.filid/review/<NORMALIZED>/`
- `BASE_REF`: Comparison base reference
- `SCOPE`: Review scope (branch|pr|commit)
- `PROJECT_ROOT`: Project root directory
- `ADJUDICATOR_MODE`: `true` or `false` (from `--solo` flag; when true,
  elect-committee returns the integrated `adjudicator` agent)

## Steps

### B.0 — Load Structure Pre-Check Results (if present)

> **NO_STRUCTURE_CHECK skip**: If the execution context contains `NO_STRUCTURE_CHECK: true`,
> skip this entire step (B.0). Set `STRUCTURE_CRITICAL_COUNT = 0` and proceed directly to B.1.
> Phase A was intentionally bypassed, so `structure-check.md` will not exist.

Read `<REVIEW_DIR>/structure-check.md` if it exists.

Extract from its frontmatter:
- `critical_count`: total CRITICAL + HIGH structure findings
- `stage_results`: per-stage PASS/FAIL map
- `overall`: overall PASS/FAIL

Store as `STRUCTURE_CRITICAL_COUNT` for session.md recording (B.5).
If `structure-check.md` does not exist, set `STRUCTURE_CRITICAL_COUNT = 0`.

### B.1 — Collect Git Diff

```bash
git diff <BASE_REF>..HEAD --stat
git diff <BASE_REF>..HEAD --name-only
```

Count changed files and categorize by type (added/modified/deleted).
If `SCOPE=pr`, also run `gh pr view --json title,body` for intent context.

### B.2 — Identify Fractal Paths

First, scan the full project hierarchy to obtain node entries:

```
mcp_t_fractal_scan(path: <PROJECT_ROOT>)
// Returns: ScanReport { tree: { nodes: Map<path, FractalNode>, root: string }, ... }
```

Store `tree.nodesList` (array) as `SCAN_NODES` for use in classify calls below.
(`tree.nodes` is a path-keyed object in JSON — use `tree.nodesList` for iteration.)

For each changed file directory, call:

```
mcp_t_fractal_navigate(action: "classify", path: <directory>, entries: SCAN_NODES)
```

Build a list of unique fractal paths affected by the change.
Detect whether any interface files (index.ts, public API) are modified.

### B.3 — Elect Committee

Call the deterministic committee election MCP tool:

```
mcp_t_review_manage(
  action: "elect-committee",
  projectRoot: <PROJECT_ROOT>,
  changedFilesCount: <count>,
  changedFractalsCount: <count>,
  hasInterfaceChanges: <boolean>,
  adjudicatorMode: <ADJUDICATOR_MODE from context, true or false>
)
```

Result contains: `complexity`, `committee`, `adversarialPairs`.

**Solo mode**: When `ADJUDICATOR_MODE=true` (user passed `--solo`), the MCP
handler short-circuits complexity calculation and returns:
`{ complexity: 'TRIVIAL', committee: ['adjudicator'], adversarialPairs: [] }`.

**Complexity tiers** (without solo mode):
- `TRIVIAL` — 1 member (`adjudicator`) when
  `changedFilesCount <= 1 && changedFractalsCount <= 1 && !hasInterfaceChanges`.
  The auto-selected TRIVIAL tier uses the same integrated fast-path agent
  as `--solo`, because the diff is too small for adversarial multi-persona
  debate to add value.
- `LOW` — 2 specialist members
- `MEDIUM` — 4 specialist members
- `HIGH` — 6 specialist members

Structure-bias escalation is performed main-side after Phase A completes
(see `SKILL.md` Step 2 → "Structure-bias escalation"). Do not adjust
complexity here.

### B.3.5 — Derive Deliberation Mode

After committee election, derive the Phase D dispatch hint the pipeline
main will consume via the
`verdict_gate` rule
(`packages/filid/skills/filid-review/DETAIL.md` → `## API Contracts`):

- `committee == ['adjudicator']` (TRIVIAL auto-tier or
  `adjudicator_mode: true`) → `deliberation_mode: solo-adjudicator`
- `committee.length >= 2` (LOW / MEDIUM / HIGH) → `deliberation_mode: team`

Set `failure_reason: none`. The A/B/C subagent boundary never emits a
non-`none` value — Phase D main-context execution is the only place
`phase-d-team-spawn-unavailable`, `team-incomplete`, or `round5-exhaust`
can surface. `chairperson-forbidden` is a
runtime-only marker produced when a subagent attempts a Phase D
protocol violation; it is never written to `session.md`. The pipeline
main's `verdict_gate` treats a missing frontmatter `deliberation_mode`
identically to `chairperson-forbidden`.

### B.4 — Ensure Review Directory

```
mcp_t_review_manage(
  action: "ensure-dir",
  projectRoot: <PROJECT_ROOT>,
  branchName: <BRANCH>
)
```

### B.5 — Write session.md

Write the following to `<REVIEW_DIR>/session.md`:

```markdown
---
branch: <BRANCH>
normalized_branch: <NORMALIZED>
base_ref: <BASE_REF>
complexity: <complexity from B.3; chairperson may overwrite after structure-bias escalation>
committee:
  - <persona-id>
  - ...
deliberation_mode: <solo-adjudicator|team>   # from B.3.5; consumed by verdict_gate in filid-pipeline
failure_reason: none                          # A/B/C boundary is always "none"; Phase D may surface other values
changed_files_count: <count>
changed_fractals:
  - <fractal path>
  - ...
interface_changes: <true|false>
no_structure_check: <true if --no-structure-check was set, false otherwise>
adjudicator_mode: <true|false>   # true if --solo flag was set
structure_critical_count: <STRUCTURE_CRITICAL_COUNT>
structure_overall: <PASS|FAIL|N/A>
created_at: <ISO 8601>
---

## Changed Files Summary

| File   | Change Type            | Fractal   | Lines Changed |
| ------ | ---------------------- | --------- | ------------- |
| <path> | added/modified/deleted | <fractal> | +N -M         |

## Complexity Assessment

Changed files: N, Fractals: M, Interface changes: <yes/no> → <complexity>

## Committee Election Basis

<complexity> complexity → mandatory members: <list>
Adversarial pairs: <persona A> ↔ <persona B list>
```

## Important Notes

- Use MCP tools for deterministic operations (committee election, branch normalization)
- Do NOT load persona agent definitions — Phase D spawns them as real
  subagents via `Task(subagent_type: filid:<persona-id>)` when needed
- Write ONLY `session.md` — no other files
- If `mcp_t_fractal_navigate` fails for a path, classify it as "unknown" and continue
