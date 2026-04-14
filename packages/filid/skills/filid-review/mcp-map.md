# filid-review — MCP Tools & Operational Reference

MCP tool catalog, per-phase usage map, batch partitioning thresholds,
checkpoint resume table, and debt bias injection levels. SKILL.md and
the phase files point here rather than duplicating the mappings.

## Available MCP Tools (chairperson-level)

| Tool             | Action              | Purpose                                                 |
| ---------------- | ------------------- | ------------------------------------------------------- |
| `mcp_t_review_manage`  | `normalize-branch`  | Normalize branch name for review directory path         |
| `mcp_t_review_manage`  | `ensure-dir`        | Create `.filid/review/<branch>/` directory              |
| `mcp_t_review_manage`  | `elect-committee`   | Deterministic committee election (Phase B). Accepts optional `adjudicatorMode: boolean` to force the integrated `adjudicator` fast-path agent. Emits TRIVIAL/LOW/MEDIUM/HIGH complexity with committees of 1/2/4/6 members. |
| `mcp_t_review_manage`  | `checkpoint`        | Check existing review progress for resume               |
| `mcp_t_review_manage`  | `cleanup`           | Delete review session files (--force or on pass)        |
| `mcp_t_review_manage`  | `content-hash`      | Compute and persist content hash for cache              |
| `mcp_t_review_manage`  | `check-cache`       | Check if review can be skipped (cache hit)              |
| `mcp_t_review_manage`  | `format-pr-comment` | Format review results into collapsible PR comment       |
| `mcp_t_debt_manage`    | `calculate-bias`    | Compute debt bias level for Phase C2 + D deliberation   |

Phase D (deliberation) uses Claude Code's native team tools —
`TeamCreate`, `TeamDelete`, `TaskCreate`, `TaskUpdate`, `TaskList`,
`SendMessage`, `Task` — NOT MCP tools. See
`phases/phase-d-deliberation.md` for the full team orchestration
protocol.

## MCP Tool Usage Map by Phase

### Phase A (Structure Agent, sonnet) — diff scope only

| Tool                 | Action / Parameters                     | Stage | Purpose                                          |
| -------------------- | --------------------------------------- | ----- | ------------------------------------------------ |
| `mcp_t_fractal_navigate`   | `action: "classify"`                    | 1     | Classify changed dirs for boundary check         |
| `mcp_t_structure_validate` | `path: <changed dir>`                   | 1     | Fractal/organ boundary validation (diff only)    |
| `mcp_t_doc_compress`       | `mode: "auto"`                          | 2     | INTENT.md line count (changed INTENT.md only)    |
| `mcp_t_test_metrics`       | `action: "check-312"`                   | 3     | 3+12 rule on changed spec.ts files only          |
| `mcp_t_ast_analyze`        | `analysisType: "lcom4"`                 | 4     | Module cohesion on changed source files          |
| `mcp_t_ast_analyze`        | `analysisType: "cyclomatic-complexity"` | 4     | Complexity on changed source files               |
| `mcp_t_test_metrics`       | `action: "decide"`                      | 4     | Split/compress recommendation                    |
| `mcp_t_ast_analyze`        | `analysisType: "dependency-graph"`      | 5     | DAG + cycle detection on changed files           |

### Phase B (Analysis Agent, haiku)

| Tool               | Action             | Purpose                              |
| ------------------ | ------------------ | ------------------------------------ |
| `mcp_t_review_manage`    | `normalize-branch` | Branch name → filesystem-safe string |
| `mcp_t_review_manage`    | `ensure-dir`       | Create `.filid/review/<branch>/`     |
| `mcp_t_review_manage`    | `elect-committee`  | Deterministic committee election     |
| `mcp_t_fractal_navigate` | `classify`         | Classify changed directories         |
| `mcp_t_fractal_scan`     | —                  | Build full fractal tree              |

### Phase C1 (Metrics Agent, sonnet) — changed files only

| Tool              | Action                  | Purpose                                         |
| ----------------- | ----------------------- | ----------------------------------------------- |
| `mcp_t_ast_analyze`     | `lcom4`                 | Cohesion verification (split needed?)           |
| `mcp_t_ast_analyze`     | `cyclomatic-complexity` | Complexity verification                         |
| `mcp_t_test_metrics`    | `check-312`             | 3+12 rule validation                            |
| `mcp_t_test_metrics`    | `count`                 | Test case counting                              |
| `mcp_t_test_metrics`    | `decide`                | Split/compress/parameterize decision            |
| `mcp_t_coverage_verify` | —                       | Shared dependency test coverage (WARN only)     |

Phase C1 writes `verification-metrics.md`.

### Phase C2 (Structure Agent, sonnet) — diff-focused

| Tool                 | Action             | Purpose                               |
| -------------------- | ------------------ | ------------------------------------- |
| `mcp_t_structure_validate` | —                  | FCA-AI fractal boundary rules         |
| `mcp_t_ast_analyze`        | `dependency-graph` | Circular dependency check             |
| `mcp_t_ast_analyze`        | `tree-diff`        | Semantic change / interface analysis  |
| `mcp_t_drift_detect`       | —                  | Structure drift detection             |
| `mcp_t_doc_compress`       | `auto`             | Document compression state            |
| `mcp_t_rule_query`         | `list`             | Active rules listing                  |
| `mcp_t_debt_manage`        | `list`             | Existing debt load                    |
| `mcp_t_debt_manage`        | `calculate-bias`   | Debt bias level determination         |

Phase C2 writes `verification-structure.md`.

### Phase D (Chairperson, direct team orchestration)

No MCP measurement tool calls. The chairperson reads `session.md`,
`verification.md` (merged from C1 + C2 in Step D.0),
`verification-metrics.md`, `verification-structure.md`, and
`structure-check.md`.

**Solo path** (committee is `['adjudicator']`): spawn a standalone
`Task(subagent_type: filid:adjudicator)` — no Team infrastructure is
used. Read `round-1-adjudicator.md` and write `review-report.md` /
`fix-requests.md`.

**Team path** (committee size >= 2): uses Claude Code's native team
tools:

| Tool                         | Purpose                                            |
| ---------------------------- | -------------------------------------------------- |
| `TeamCreate`                 | Create `review-<normalized-branch>` team           |
| `TeamDelete`                 | Dismantle team after CONCLUSION                    |
| `TaskCreate` + `TaskUpdate`  | Round task creation and owner assignment           |
| `TaskList`                   | Monitor round progress                             |
| `Task` (with `team_name`)    | Spawn committee members as team workers            |
| `SendMessage`                | Round triggers, probes, shutdown requests          |

**Phase C batch team** (optional): when Phase C is team-promoted
(`changedFilesCount > 30`), a separate `review-c-<normalized-branch>`
team is created to parallelize C1/C2 batches. This team is dismantled
before Phase D begins.

## Batch Partitioning Thresholds

All three diff-analysis phases (A / C1 / C2) enforce **streaming-write
discipline**: the subagent writes the output skeleton first, then
appends one result row per file immediately after each MCP call,
dropping the raw response from its working memory before moving to the
next file. This prevents context accumulation on large diffs.

In addition, the chairperson applies threshold-based partitioning:

| Changed files    | Phase A                         | Phase C1 / C2                                                    |
| ---------------- | ------------------------------- | ---------------------------------------------------------------- |
| `<= 15`          | 1 subagent                      | 1 C1 + 1 C2 subagent                                             |
| `> 15, <= 30`    | N parallel subagents (10/batch) | N C1 batches + N C2 per-file batches + 1 C2 global               |
| `> 30`           | N parallel subagents (10/batch) | Team-promoted: `review-c-<normalized-branch>` team (worker/batch)|

Partial output files use `<base>.partial-<batchId>.md` naming. The
chairperson merges partials into the canonical output file before Phase
D begins.

### Batch context block (passed to each batched subagent)

Each batched subagent receives its batch file list in the `Context`
block of its prompt:

```
Context:
- REVIEW_DIR: <actual review dir>
- PROJECT_ROOT: <actual project root>
- BASE_REF: <actual base ref>          # Phase A only
- BRANCH: <actual branch>              # Phase A only
- BATCH_ID: <integer or empty>
- BATCH_FILES: <newline-separated file paths or empty>
  # If BATCH_ID is set, operate ONLY on these files. Write output to
  # <base>.partial-<BATCH_ID>.md instead of the consolidated file.
- SCOPE_OVERRIDE: <per-file | global | empty>
  # C2 only: "global" means skip per-file checks and run only
  # mcp_t_structure_validate / mcp_t_drift_detect / mcp_t_debt_manage, writing
  # verification-structure.global.md.
```

### Merge protocol (chairperson-side)

After every batch path, the chairperson merges partials:

1. **Phase A**: `structure-check.partial-*.md` → `structure-check.md`
   (deduplicate findings by `path + rule`, sum `critical_count`).
2. **Phase C1**: `verification-metrics.partial-*.md` →
   `verification-metrics.md` (concatenate finding tables, dedupe by
   `path + rule`, recompute `metrics_passed` and count fields).
3. **Phase C2**: `verification-structure.partial-*.md` +
   `verification-structure.global.md` → `verification-structure.md`
   (merge per-file rows from partials, keep project-wide rows from the
   global file).

The batch list is computed once and reused for both C1 and C2 so that
the same batch boundaries apply to both halves.

## Checkpoint Resume Table

The chairperson calls `mcp_t_review_manage(action: "checkpoint", ...)` before
entering Phase A. The response indicates which files exist in
`<REVIEW_DIR>`; the chairperson then selects the next phase from the
table below (based on files present):

| Files present                                                                                        | Resume from |
| ---------------------------------------------------------------------------------------------------- | ----------- |
| None                                                                                                 | Phase A     |
| `structure-check.md` only                                                                            | Phase B     |
| `session.md` only (`no_structure_check: true` in frontmatter)                                        | Phase C1+C2 |
| `session.md` only (`no_structure_check: false` or absent)                                            | Phase A *   |
| `structure-check.md` + `session.md` (neither verification file)                                      | Phase C1+C2 |
| `session.md` + one of `verification-metrics.md` / `verification-structure.md`                        | Resume missing C-half |
| `session.md` + `verification-metrics.md` + `verification-structure.md` (no `verification.md`)        | Phase D (Step D.0 merge) |
| `session.md` + `verification.md` (merged)                                                            | Phase D (Step D.1 branch) |
| `session.md` + `verification.md` + `rounds/round-N-*.md` (no `review-report.md`)                     | Phase D (Step D.3 round N+1) |
| `session.md` + `verification.md` + `review-report.md` + `fix-requests.md`                            | Complete    |

> \* **`session.md` only (no structure check)**: Phase A likely failed
> while Phase B succeeded in parallel. Preserve existing `session.md`
> and **increment `resume_attempts` by 1** in its frontmatter using the
> `Edit` tool: read the file, locate the `resume_attempts: <N>` line
> between the `---` markers, then `Edit(old_string: 'resume_attempts:
> <N>', new_string: 'resume_attempts: <N+1>')`. If the field is absent,
> add `resume_attempts: 1`. Then restart only Phase A. After Phase A
> completes and writes `structure-check.md`, re-evaluate this table to
> determine the next phase (typically Phase C).

When `--no-structure-check` is active, Phase A is skipped and resume
starts from Phase B even when no checkpoint files exist.

### Max-retry guard (LOGIC-011)

When the checkpoint response has `resumeExhausted: true`
(`resume_attempts >= 3`), the skill MUST terminate with verdict
`INCONCLUSIVE` instead of restarting Phase A. Report: "Resume exhausted
after 3 Phase A retries — manual intervention required. Inspect
`.filid/review/<branch>/session.md` and re-run with `--force` to start
fresh." Then END execution. Do not enter any further phase.

## Debt Bias Injection

The chairperson injects debt context into Phase D deliberation based on
the `debt_bias_level` field emitted by Phase C2
(`verification-structure.md` frontmatter):

| Bias Level               | Committee Behavior                    | Business Driver Impact                |
| ------------------------ | ------------------------------------- | ------------------------------------- |
| LOW_PRESSURE (0-5)       | Normal review, debt issuance allowed  | CoD claims accepted                   |
| MODERATE_PRESSURE (6-15) | Strong debt repayment recommendation  | CoD claims need quantitative evidence |
| HIGH_PRESSURE (16-30)    | Near-prohibition on new debt          | CoD claims effectively rejected       |
| CRITICAL_PRESSURE (31+)  | No PR approval without debt repayment | VETO by default                       |
