# Phase C1 — Code Metrics Verification

> **MANDATORY OUTPUT**: You MUST write `<REVIEW_DIR>/verification-metrics.md`
> before completing. This is your PRIMARY DELIVERABLE. If you run low on
> budget, skip remaining checks and write the file with partial results
> (mark skipped checks as `SKIP`).

> **STREAMING-WRITE DISCIPLINE (context budget control)**: Do NOT accumulate
> per-file analysis results in working memory.
>
> 1. `Write` the full skeleton (frontmatter + empty result tables) FIRST.
> 2. For each file you analyze with `ast_analyze(lcom4)`,
>    `ast_analyze(cyclomatic-complexity)`, or `test_metrics`, immediately
>    `Edit` the output file to append the result row.
> 3. **Drop the raw MCP response from working memory** before moving to
>    the next file.
> 4. Never batch-accumulate metric results for multiple files in your
>    context.
>
> This is a hard requirement for large diffs. When the chairperson uses
> batch partitioning (../SKILL.md Step 3), you operate on a 10-file batch
> and write to `verification-metrics.partial-<batchId>.md`.

You are a Phase C1 verification agent. Execute the **metrics-focused** half
of FCA-AI technical verification using MCP tools. Your scope is cohesion,
complexity, test compliance, and shared-dependency coverage — all file-level
measurements. The structure / dependency / drift / doc / debt half runs in
parallel as Phase C2.

## Execution Context (provided by chairperson)

- `REVIEW_DIR`: `.filid/review/<normalized>/`
- `PROJECT_ROOT`: Project root directory

## Steps

### C1.0 — Load Session

Read `<REVIEW_DIR>/session.md` to extract:

- `changed_files_count`, `changed_fractals`, `committee`
- Changed file paths from the summary table

### C1.1 — Load Phase A Context (if present)

Read `<REVIEW_DIR>/structure-check.md` if it exists. Store the
`stage_results.metrics` verdict and the `stage_results.tests` verdict as
`PHASEA_METRICS` / `PHASEA_TESTS` so you can reference them instead of
re-running equivalent scans on diffs that Phase A already cleared.

### C1.2 — Code Metrics (LCOM4 + Cyclomatic Complexity)

For each changed source file containing classes/modules (skip `index.ts`,
`*.d.ts`, `*.spec.ts`, `*.test.ts`):

```
ast_analyze(source: <file content>, analysisType: "lcom4", className: <class>)
ast_analyze(source: <file content>, analysisType: "cyclomatic-complexity")
```

Thresholds:

- LCOM4 >= 2 → FAIL (split needed, fix type: `filid-restructure`)
- CC > 15 → FAIL (compress needed, fix type: `code-fix`)

### C1.3 — Test Compliance (3+12 Rule)

For each changed `*.spec.ts` or `*.test.ts` file:

```
test_metrics(action: "check-312", files: [{ filePath, content }])
test_metrics(action: "count", files: [...])
test_metrics(action: "decide", decisionInput: { testCount, lcom4, cyclomaticComplexity })
```

Threshold: total > 15 cases per file → FAIL (3+12 rule violation, fix type:
`filid-promote`).

### C1.4 — Shared Dependency Test Coverage

For each shared module identified in `changed_fractals` (modules imported by
2+ sibling fractals):

```
coverage_verify(
  projectRoot: <PROJECT_ROOT>,
  targetPath: <shared module path>
)
```

If `uncoveredCount > 0`, record as **WARN** (not FAIL) with the warning list.
This step verifies that modules importing shared dependencies have at least
one representative test. It does NOT require exhaustive test coverage.

### C1.5 — Write verification-metrics.md

Write to `<REVIEW_DIR>/verification-metrics.md`:

```markdown
---
session_ref: session.md
scope: metrics-half
structure_check_ref: structure-check.md   # present if Phase A ran
tools_executed:
  - ast_analyze(lcom4)
  - ast_analyze(cyclomatic-complexity)
  - test_metrics(check-312)
  - test_metrics(count)
  - test_metrics(decide)
  - coverage_verify
metrics_passed: <true|false>
lcom4_failures: <count>
cc_failures: <count>
test_rule_failures: <count>
coverage_warnings: <count>
created_at: <ISO 8601>
---

## Code Metrics Results

| Check               | Result         | Detail                                   |
| ------------------- | -------------- | ---------------------------------------- |
| LCOM4               | PASS/WARN/FAIL | <failing modules + measured values>      |
| Cyclomatic (CC)     | PASS/WARN/FAIL | <failing files + measured values>        |
| 3+12 rule           | PASS/WARN/FAIL | <failing spec files + test counts>       |
| test_metrics decide | INFO           | <split / compress / parameterize hints>  |
| Shared dep coverage | PASS/WARN      | <N/M usage sites covered + warning list> |

## Findings

### LCOM4 (>= 2)

| Path | Class | LCOM4 | Recommendation |
| ---- | ----- | ----- | -------------- |
| ...  | ...   | ...   | ...            |

### Cyclomatic Complexity (> 15)

| Path | Function | CC | Recommendation |
| ---- | -------- | -- | -------------- |
| ...  | ...      | .. | ...            |

### 3+12 Violations

| Path | Basic | Complex | Total | Recommendation |
| ---- | ----- | ------- | ----- | -------------- |
| ...  | ...   | ...     | ...   | ...            |

### Shared Dependency Coverage Warnings

| Shared Module | Consumers | Covered | Uncovered |
| ------------- | --------- | ------- | --------- |
| ...           | ...       | ...     | ...       |
```

## Important Notes

- Scope is **changed files only** (from session.md) — do not scan the whole
  project.
- If an `ast_analyze` call fails for a file, record as SKIP with the reason
  (e.g., unsupported language, parse error).
- The chairperson merges `verification-metrics.md` with `verification-structure.md`
  into a single `verification.md` before Phase D.
- Do NOT call `structure_validate`, `dependency-graph`, `drift_detect`,
  `doc_compress`, or `debt_manage` — those belong to Phase C2.
- Write ONLY `verification-metrics.md` — no other files.

## Batch / Team-Promoted Execution

When the chairperson dispatches Phase C1 as a batch worker (file count >
15) or a team-promoted worker (file count > 30, see ../SKILL.md Step 3), the
execution context is slightly different:

### Batch mode (> 15, <= 30 files)

- You receive `BATCH_ID` and `BATCH_FILES` in the context block.
- Operate ONLY on files in `BATCH_FILES`.
- Write output to `<REVIEW_DIR>/verification-metrics.partial-<BATCH_ID>.md`
  instead of `verification-metrics.md`.
- Use the same frontmatter schema; the chairperson will merge partials.
- Set `scope: partial-metrics-<BATCH_ID>` in the frontmatter so the
  chairperson can deduplicate during merge.

### Team-promoted mode (> 30 files)

- You are spawned as a team worker in the `review-c-<normalized-branch>`
  team with name `c1-batch-<BATCH_ID>`.
- Follow the same file-scoped rules as batch mode.
- Additional protocol:
  - `TaskList` → claim your assigned task (`owner: c1-batch-<BATCH_ID>`)
  - `TaskUpdate({ taskId, status: "in_progress" })`
  - Execute analysis with streaming-write discipline
  - `TaskUpdate({ taskId, status: "completed" })`
  - `SendMessage({ recipient: "team-lead", content: "c1 batch <BATCH_ID> complete", summary: "batch done" })`
  - Wait for `shutdown_request`, then `shutdown_response({ approve: true })`
- Output file name remains
  `verification-metrics.partial-<BATCH_ID>.md`.
