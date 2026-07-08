# Phase C2 — Structure, Dependency, Drift & Debt Verification

> **MANDATORY OUTPUT**: You MUST write `<REVIEW_DIR>/verification-structure.md`
> before completing. This is your PRIMARY DELIVERABLE. If you run low on
> budget, skip remaining checks and write the file with partial results
> (mark skipped checks as `SKIP`).

> **STREAMING-WRITE DISCIPLINE (context budget control)**: Some C2 steps
> are project-wide single calls (`mcp__plugin_filid_t__structure_validate`, `mcp__plugin_filid_t__drift_detect`,
> `mcp__plugin_filid_t__debt_manage(list)`) — record their results into the output file
> immediately after each call, then drop the response from memory. Other
> steps are per-file (`mcp__plugin_filid_t__ast_analyze(dependency-graph)`,
> `mcp__plugin_filid_t__ast_analyze(tree-diff)`, per-file doc compliance) — apply the same
> incremental append pattern used by Phase C1:
>
> 1. `Write` the full skeleton FIRST.
> 2. Run project-wide calls in order; append each result row to the
>    skeleton immediately.
> 3. For per-file calls, `Edit`-append the row and drop the raw response
>    before moving on.
> 4. Never batch-accumulate dependency graphs or tree-diffs across
>    multiple files.
> 5. Set the `structure_passed` sentinel to its real true/false value as your
>    LAST edit, only after every row is written — it stays `PENDING` in the
>    skeleton and is the done-marker consumers key on.
>
> When the chairperson uses batch partitioning (../SKILL.md Step 3), you
> operate on a 10-file batch for per-file checks only — project-wide
> scans still run once globally. Partial output file name:
> `verification-structure.partial-<batchId>.md`.

You are a Phase C2 verification agent. Execute the **structure-focused** half
of FCA-AI technical verification using MCP tools. Your scope is fractal
boundary compliance, dependency acyclicity, semantic diff analysis, structure
drift, documentation state, and technical debt bias. The metrics half (LCOM4,
CC, 3+12, coverage) runs in parallel as Phase C1.

## Execution Context (provided by chairperson)

- `REVIEW_DIR`: `.filid/review/<normalized>/`
- `PROJECT_ROOT`: Project root directory

## Steps

### C2.0 — Load Session + Phase A Context

Read `<REVIEW_DIR>/session.md` to extract:

- `changed_fractals`, `changed_files_count`, `committee`
- Changed file paths from the summary table

Read `<REVIEW_DIR>/structure-check.md` if it exists and store:

- `stage_results.structure` → `PHASEA_STRUCTURE`
- `stage_results.documents` → `PHASEA_DOCUMENTS`
- `stage_results.dependencies` → `PHASEA_DEPS`
- All CRITICAL/HIGH findings from the Findings section

**Scope rule**: When PHASEA_STRUCTURE is PASS, skip full-project
`mcp__plugin_filid_t__drift_detect` and only verify the changed fractals. When PHASEA_DOCUMENTS is
PASS, skip independent doc-compliance scans.

### C2.1 — Fractal Boundary Verification

```
mcp__plugin_filid_t__structure_validate(path: <PROJECT_ROOT>)
```

Record PASS/WARN/FAIL for fractal boundary compliance. Limit reporting to
nodes that intersect `changed_fractals`.

### C2.2 — Dependency Acyclicity

For each changed source file:

```
mcp__plugin_filid_t__ast_analyze(source: <file content>, analysisType: "dependency-graph")
```

Record any circular dependencies as FAIL.

### C2.3 — Semantic Diff Analysis

For files with both old and new versions:

```
mcp__plugin_filid_t__ast_analyze(source: <new>, oldSource: <old>, analysisType: "tree-diff")
```

Use to detect interface-level changes (exported symbol additions/removals).

### C2.4 — Structure Drift

```
mcp__plugin_filid_t__drift_detect(path: <PROJECT_ROOT>)
```

Skip if `PHASEA_STRUCTURE === PASS`. Otherwise record drift findings.

### C2.5 — Document Compliance

For each INTENT.md file inside `changed_fractals`:

- Line count (target: <= 50)
- Presence of all three tier sections: "Always do", "Ask first", "Never do"

If `PHASEA_DOCUMENTS === PASS`, reference Phase A instead of re-scanning.

### C2.6 — Technical Debt Bias

Load existing debts and calculate bias:

```
mcp__plugin_filid_t__debt_manage(action: "list", projectRoot: <PROJECT_ROOT>)
```

If debts exist for changed fractals:

```
mcp__plugin_filid_t__debt_manage(
  action: "calculate-bias",
  projectRoot: <PROJECT_ROOT>,
  debts: <debt list>,
  changedFractalPaths: <changed fractals from session>,
  currentCommitSha: <git rev-parse HEAD>
)
```

Always emit a `debt_bias_level` even when no debts exist (use `LOW_PRESSURE`
for zero debts).

### C2.7 — Write verification-structure.md

Write to `<REVIEW_DIR>/verification-structure.md`:

```markdown
---
session_ref: session.md
scope: structure-half
structure_check_ref: structure-check.md # present if Phase A ran
tools_executed:
  - mcp__plugin_filid_t__structure_validate
  - mcp__plugin_filid_t__ast_analyze(dependency-graph)
  - mcp__plugin_filid_t__ast_analyze(tree-diff)
  - mcp__plugin_filid_t__drift_detect
  - mcp__plugin_filid_t__doc_compress
  - mcp__plugin_filid_t__debt_manage(list)
  - mcp__plugin_filid_t__debt_manage(calculate-bias)
structure_passed: <true|false>
critical_failures: <count>
debt_count: <existing debt count>
debt_total_weight: <weight sum>
debt_bias_level: <LOW_PRESSURE|MODERATE_PRESSURE|HIGH_PRESSURE|CRITICAL_PRESSURE>
created_at: <ISO 8601>
---

## Structure & Dependency Verification

> Note: The `Cap applied` column makes the rule scope explicit so downstream
> personas in Phase D do not extend INTENT.md's 50-line cap to DETAIL.md.
> INTENT.md = 50-line hard cap. DETAIL.md = no line cap (in-place
> restructure required on each update; append-only growth forbidden).

| Check                 | Cap applied                          | Result         | Detail                                 |
| --------------------- | ------------------------------------ | -------------- | -------------------------------------- |
| Fractal boundary      | n/a                                  | PASS/WARN/FAIL | <violating paths>                      |
| INTENT.md compliance  | 50 lines hard cap                    | PASS/WARN/FAIL | <files over 50 lines, missing tiers>   |
| DETAIL.md compliance  | none (in-place restructure required) | PASS/WARN/FAIL | <append-only growth, missing sections> |
| Circular dependencies | n/a                                  | PASS/WARN/FAIL | <cycle chains>                         |
| Semantic diff         | n/a                                  | INFO           | <interface additions/removals>         |
| Structure drift       | n/a                                  | PASS/WARN/FAIL | <drift findings>                       |

## Debt Status

| Existing Debts | PR-Related Debts      | Total Weight | Bias Level |
| -------------- | --------------------- | ------------ | ---------- |
| N              | M (fractal, weight X) | Y            | <level>    |

### Related Debt List

| ID  | Fractal Path | Rule Violated | Weight | Created |
| --- | ------------ | ------------- | ------ | ------- |
| ... | ...          | ...           | ...    | ...     |
```

## Important Notes

- Scope is changed fractals + changed files (from session.md).
- Do NOT call `mcp__plugin_filid_t__ast_analyze(lcom4)`, `mcp__plugin_filid_t__ast_analyze(cyclomatic-complexity)`,
  `mcp__plugin_filid_t__test_metrics`, or `mcp__plugin_filid_t__coverage_verify` — those belong to Phase C1.
- Always include `debt_bias_level` even when no debts exist — Phase D's
  Business Driver persona requires this field.
- Write ONLY `verification-structure.md` — no other files.

## Batch / Team-Promoted Execution

Phase C2 has two kinds of work: **project-wide scans**
(`mcp__plugin_filid_t__structure_validate`, `mcp__plugin_filid_t__drift_detect`, `mcp__plugin_filid_t__debt_manage(list, calculate-bias)`)
that must run once globally, and **per-file checks**
(`mcp__plugin_filid_t__ast_analyze(dependency-graph)`, `mcp__plugin_filid_t__ast_analyze(tree-diff)`, per-file doc
compliance). The chairperson partitions only the per-file work when batch
mode is active.

### Batch mode (> 15, <= 30 files)

You receive `BATCH_ID`, `BATCH_FILES`, and `SCOPE_OVERRIDE` in the context
block. Behavior depends on `SCOPE_OVERRIDE`:

- **`per-file`**: Run ONLY the per-file checks on `BATCH_FILES`. Skip
  `mcp__plugin_filid_t__structure_validate` / `mcp__plugin_filid_t__drift_detect` / `mcp__plugin_filid_t__debt_manage`. Write output to
  `<REVIEW_DIR>/verification-structure.partial-<BATCH_ID>.md` with
  `scope: partial-per-file-<BATCH_ID>` in the frontmatter.
- **`global`**: Run ONLY the project-wide scans. Skip per-file checks.
  Write output to `<REVIEW_DIR>/verification-structure.global.md` with
  `scope: global-structure`.
- **empty**: Fall back to full Phase C2 (single subagent, no batching).

### Team-promoted mode (> 30 files)

- You are spawned as a team worker in the `review-c-<normalized-branch>`
  team with name `c2-batch-<BATCH_ID>` (per-file) or `c2-global`
  (project-wide scans).
- Claim your assigned task via `TaskList` / `TaskUpdate`, execute with
  streaming-write discipline, report completion via `SendMessage`, and
  handle `shutdown_request` as usual.
- The C batch workers are **separate** from Phase D's committee workers;
  the chairperson confirms they have terminated (TaskStop any straggler)
  as soon as all C1/C2 outputs are merged.

### Merge protocol (executed by chairperson)

After all partials arrive, the chairperson merges:

1. Combine per-file partials into one set of per-file rows
2. Append the project-wide rows from `verification-structure.global.md`
3. Write the unified `verification-structure.md` with
   `scope: structure-half` in the frontmatter.
