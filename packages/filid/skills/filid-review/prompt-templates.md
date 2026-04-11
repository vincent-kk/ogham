# filid-review — Subagent Prompt Templates

Literal prompt templates the chairperson fills in when spawning Phase
A / B / C1 / C2 subagents via `Task(subagent_type: "general-purpose",
run_in_background: true)`. The meta-rules governing how to fill them
in live in `contracts.md` → "Subagent Prompt Rules". Batch partitioning
thresholds live in `mcp-map.md` → "Batch Partitioning Thresholds".

## Common Structure

Every template follows the same skeleton:

```
Your PRIMARY DELIVERABLE is writing `<REVIEW_DIR>/<OUTPUT_FILE>`.
You MUST write this file before completing — all analysis is meaningless without it.

Read and follow the instructions in `<resolved phase file path>`.

Context:
<phase-specific key-value pairs>

[Input hints, when applicable]

Language: Write all output in the language specified by the `[filid:lang]` tag in system context. If no tag is present, follow the system's language setting. Default: English.
Technical terms, code identifiers, rule IDs, and file paths remain in original form.

REMINDER: Write `<REVIEW_DIR>/<OUTPUT_FILE>` before you finish.
<budget-fallback hint>
```

The chairperson resolves each phase file path via
`${CLAUDE_PLUGIN_ROOT}/skills/filid-review/phases/<phase>.md` with a
`Glob(**/skills/filid-review/phases/<phase>.md)` fallback.

## Phase A — Structure Pre-Check

**Agent type**: `general-purpose` · **Model**: `sonnet` ·
**Output**: `structure-check.md`

```
Your PRIMARY DELIVERABLE is writing `<REVIEW_DIR>/structure-check.md`.
You MUST write this file before completing — all analysis is meaningless without it.

Read and follow the instructions in `<resolved phase-a path>`.

Context:
- REVIEW_DIR: <actual review dir>
- PROJECT_ROOT: <actual project root>
- BASE_REF: <actual base ref>
- BRANCH: <actual branch>
- BATCH_ID: <integer or empty>
- BATCH_FILES: <newline-separated file paths or empty>
  # If BATCH_ID is set, operate ONLY on these files. Write output to
  # structure-check.partial-<BATCH_ID>.md instead of structure-check.md.

Language: Write all output in the language specified by the `[filid:lang]` tag in system context. If no tag is present, follow the system's language setting. Default: English.
Technical terms, code identifiers, rule IDs, and file paths remain in original form.

REMINDER: Write `<REVIEW_DIR>/structure-check.md` before you finish.
If you run low on budget, skip remaining stages and write the file with
partial results (mark skipped stages as SKIP).
```

## Phase B — Analysis & Committee Election

**Agent type**: `general-purpose` · **Model**: `haiku` ·
**Output**: `session.md`

`haiku` is chosen for speed; committee quality is ensured by the
structured `review_manage(elect-committee)` MCP tool rather than LLM
reasoning depth.

```
Your PRIMARY DELIVERABLE is writing `<REVIEW_DIR>/session.md`.
You MUST write this file before completing — all analysis is meaningless without it.

Read and follow the instructions in `<resolved phase-b path>`.

Context:
- BRANCH: <actual branch>
- NORMALIZED: <actual normalized name>
- REVIEW_DIR: <actual review dir>
- BASE_REF: <actual base ref>
- SCOPE: <actual scope>
- PROJECT_ROOT: <actual project root>
- NO_STRUCTURE_CHECK: <true|false>
- ADJUDICATOR_MODE: <true|false>   # from --solo flag; passed to review_manage(elect-committee) as adjudicatorMode

Language: Write all output in the language specified by the `[filid:lang]` tag in system context. If no tag is present, follow the system's language setting. Default: English.
Technical terms, code identifiers, rule IDs, and file paths remain in original form.

REMINDER: Write `<REVIEW_DIR>/session.md` before you finish.
If you run low on budget, skip remaining analysis and write the file
with partial results.
```

## Phase C1 — Metrics

**Agent type**: `general-purpose` · **Model**: `sonnet` ·
**Output**: `verification-metrics.md`

```
Your PRIMARY DELIVERABLE is writing `<REVIEW_DIR>/verification-metrics.md`.
You MUST write this file before completing — all analysis is meaningless without it.

Read and follow the instructions in `<resolved phase-c1 path>`.

Context:
- REVIEW_DIR: <actual review dir>
- PROJECT_ROOT: <actual project root>
- BATCH_ID: <integer or empty>
- BATCH_FILES: <newline-separated file paths or empty>
  # If BATCH_ID is set, operate ONLY on these files. Write output to
  # verification-metrics.partial-<BATCH_ID>.md instead of the
  # consolidated file.

Input: Read `<REVIEW_DIR>/session.md` for session context.
If `<REVIEW_DIR>/structure-check.md` exists, read it for Phase A context.

Language: Write all output in the language specified by the `[filid:lang]` tag in system context. If no tag is present, follow the system's language setting. Default: English.
Technical terms, code identifiers, rule IDs, and file paths remain in original form.

REMINDER: Write `<REVIEW_DIR>/verification-metrics.md` before you finish.
Skip remaining checks and write partial results (mark skipped as SKIP) if budget is tight.
```

## Phase C2 — Structure / Dependency / Drift / Debt

**Agent type**: `general-purpose` · **Model**: `sonnet` ·
**Output**: `verification-structure.md`

```
Your PRIMARY DELIVERABLE is writing `<REVIEW_DIR>/verification-structure.md`.
You MUST write this file before completing — all analysis is meaningless without it.

Read and follow the instructions in `<resolved phase-c2 path>`.

Context:
- REVIEW_DIR: <actual review dir>
- PROJECT_ROOT: <actual project root>
- BATCH_ID: <integer or empty>
- BATCH_FILES: <newline-separated file paths or empty>
- SCOPE_OVERRIDE: <per-file | global | empty>
  # C2 only: "global" means skip per-file checks and run only
  # structure_validate / drift_detect / debt_manage, writing
  # verification-structure.global.md.

Input: Read `<REVIEW_DIR>/session.md` for session context.
If `<REVIEW_DIR>/structure-check.md` exists, read it for Phase A context.

Language: Write all output in the language specified by the `[filid:lang]` tag in system context. If no tag is present, follow the system's language setting. Default: English.
Technical terms, code identifiers, rule IDs, and file paths remain in original form.

REMINDER: Write `<REVIEW_DIR>/verification-structure.md` before you finish.
Skip remaining checks and write partial results (mark skipped as SKIP) if budget is tight.
```

## Team-Promoted Phase C (> 30 changed files)

When `changedFilesCount > 30`, Phase C is promoted to a dedicated
`review-c-<normalized-branch>` team (distinct from Phase D's
`review-<normalized-branch>` team). Workers are spawned with
`team_name: "review-c-<normalized-branch>"` and names `c1-batch-<N>` /
`c2-batch-<N>` / `c2-global`. The base prompt template is identical to
the non-team Phase C1 / C2 variants above — only the spawn call adds
`team_name` and the worker follows the Team Worker Protocol defined in
each phase file's "Batch / Team-Promoted Execution" section.

`TeamDelete` the `review-c-<normalized-branch>` team as soon as all
C1/C2 workers complete — before entering Phase D.
