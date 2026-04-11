# filid-review — Reference Documentation

Detailed output format templates, Opinion Frontmatter Contract, MCP tool
usage map, committee → agent mapping, and workflow reference for the
multi-persona code review governance pipeline.

## Committee → Agent File Mapping

Phase D spawns committee members as real Claude Code subagents. Each
`PersonaId` from `src/types/review.ts` corresponds to exactly one agent
file under `packages/filid/agents/`:

| PersonaId (MCP + session.md) | Agent file                          | Role / Branch                       | Election tier     |
| ---------------------------- | ----------------------------------- | ----------------------------------- | ----------------- |
| `adjudicator`              | `agents/adjudicator.md`           | Integrated fast-path (6 lenses)     | `TRIVIAL` / `--solo` only |
| `engineering-architect`      | `agents/engineering-architect.md`   | Legislative — Structure             | LOW / MEDIUM / HIGH |
| `knowledge-manager`          | `agents/knowledge-manager.md`       | Judicial — Documentation            | MEDIUM / HIGH     |
| `operations-sre`             | `agents/operations-sre.md`          | Judicial — Stability                | LOW / MEDIUM / HIGH |
| `business-driver`            | `agents/business-driver.md`         | Executive — Velocity                | MEDIUM / HIGH     |
| `product-manager`            | `agents/product-manager.md`         | Translator — User value             | HIGH              |
| `design-hci`                 | `agents/design-hci.md`              | Humanist — Cognitive load           | HIGH              |

All seven agents are **read-only** (Read, Glob, Grep, Bash only — no
Write/Edit). They are spawned via `Task(subagent_type: filid:<id>)`
exclusively by `phase-d-deliberation.md`.

- **`adjudicator`** is a standalone `Task` (NO `team_name`). It runs
  when the committee is `['adjudicator']` — either TRIVIAL auto-tier
  or `--solo` manual flag. It internalizes all six specialist
  perspectives in a single pass, skips the state machine, and emits one
  `round-1-adjudicator.md` opinion that maps directly to the verdict.
- **Six specialist agents** run as team workers inside the
  `review-<normalized-branch>` team when committee size >= 2. They
  participate in the multi-round state machine deliberation.

Adding a new specialist persona requires a coordinated edit in three places:

1. `src/types/review.ts` — add the ID to the `PersonaId` union
2. `src/mcp/tools/review-manage/review-manage.ts` — add to committee
   arrays (LOW / MEDIUM / HIGH) and adversarial pair logic as appropriate
3. `packages/filid/agents/<id>.md` — create the agent file with the
   Team Worker Protocol and Round Output Contract

Do NOT add new personas to the TRIVIAL tier — that tier is reserved for
the integrated `adjudicator` fast path.

## Opinion Frontmatter Contract

Every `<REVIEW_DIR>/rounds/round-<N>-<persona-id>.md` file MUST begin with
a YAML frontmatter block matching the schema below. The chairperson grep-
parses these fields during state machine evaluation.

```yaml
---
round: <integer, 1..5>
persona: <PersonaId>
state: SYNTHESIS | VETO | ABSTAIN
confidence: <0.0-1.0>
rebuttal_targets: [<PersonaId>, ...]   # Round >= 2 only
fix_items:
  - id: <FIX-candidate-id or null>
    severity: CRITICAL | HIGH | MEDIUM | LOW
    source: structure | code-quality
    type: code-fix | filid-promote | filid-restructure
    path: <file path>
    rule: <violated rule id>
    current: <measured value>
    recommended_action: <short imperative>
    evidence: <verification line reference or stage reference>
compromise_accepted: <true|false>   # Optional — set when re-evaluating a VETO compromise
reasoning_gaps: [<free-form strings>]   # Metrics the persona needed but could not find
---
```

### Field semantics

- **`round`** — 1-indexed round number. Must match the file name suffix.
- **`persona`** — MUST equal the `name` in the agent's frontmatter.
- **`state`** — drives Lead's state machine transition:
  - `SYNTHESIS` — agreement (with or without fix_items)
  - `VETO` — hard rejection; requires veto reason in body
  - `ABSTAIN` — excluded from effective denominator in quorum math
  - Solo deliberation prohibits `ABSTAIN`.
- **`confidence`** — 0.0-1.0 self-reported certainty. Used as tiebreaker
  when aggregating fix_items from multiple personas.
- **`rebuttal_targets`** — list of PersonaIds whose prior-round opinion
  this persona explicitly disagrees with. Round 1 MUST leave this empty.
- **`fix_items`** — structured fixes that will be promoted to FIX-XXX
  entries in `fix-requests.md`. The chairperson deduplicates by
  `path + rule` across all personas.
- **`compromise_accepted`** — only set in VETO re-evaluation rounds. If
  `true`, the opinion's `state` should transition from prior VETO to
  SYNTHESIS with an acknowledgement in the body.
- **`reasoning_gaps`** — free-form list of measurements the persona
  needed but could not find in the verification artifacts. Does NOT
  block a SYNTHESIS verdict by itself; contributes to ABSTAIN rationale
  when the gap is structural.

### Special cases

- **Forced ABSTAIN** from the recovery plan: the chairperson writes a
  synthetic opinion file with `state: ABSTAIN`, `confidence: 0`, and
  `reasoning_gaps: ["worker unrecoverable after 2 respawn attempts"]`.
  The Deliberation Log MUST note `recovery: forced-abstain` for that
  persona.
- **Business Driver compromise file**: when Business Driver writes
  `round-<N>-business-driver-compromise.md` in response to a VETO, the
  frontmatter is extended with a `compromise_proposals` array (see
  `agents/business-driver.md` for the schema).

## Review Report Format (`review-report.md`)

```markdown
# Code Review Report — <branch name>

**Date**: <ISO 8601>
**Scope**: <branch|pr|commit>
**Base**: <base ref>
**Verdict**: APPROVED | REQUEST_CHANGES | INCONCLUSIVE

## Committee Composition

| Persona               | Election Basis            | Final Position |
| --------------------- | ------------------------- | -------------- |
| Engineering Architect | LCOM4 verification needed | SYNTHESIS      |
| Knowledge Manager     | INTENT.md change detected | SYNTHESIS      |
| ...                   | ...                       | ...            |

## Structure Compliance (Phase A)

> Omitted if `--no-structure-check` was used.

| Stage | Name         | Result      | Issues |
|-------|--------------|-------------|--------|
| 1     | Structure    | PASS / FAIL | N      |
| 2     | Documents    | PASS / FAIL | N      |
| 3     | Tests        | PASS / FAIL | N      |
| 4     | Metrics      | PASS / FAIL | N      |
| 5     | Dependencies | PASS / FAIL | N      |
| **Overall** |       | **PASS/FAIL** | **N total** |

Structure violations elevated to committee agenda: <N critical/high items>

## Technical Verification Results

### FCA-AI Structure Verification (diff scope)

| Check                 | Result         | Detail |
| --------------------- | -------------- | ------ |
| Fractal boundary      | PASS/WARN/FAIL | ...    |
| INTENT.md compliance  | PASS/WARN/FAIL | ...    |
| 3+12 rule             | PASS/WARN/FAIL | ...    |
| LCOM4                 | PASS/WARN/FAIL | ...    |
| CC                    | PASS/WARN/FAIL | ...    |
| Circular dependencies | PASS/WARN/FAIL | ...    |
| Structure drift       | PASS/WARN/FAIL | ...    |

### Debt Status

| Existing Debts | PR-Related Debts | Total Weight | Bias Level   |
| -------------- | ---------------- | ------------ | ------------ |
| N              | M (weight X)     | Y            | <bias level> |

## Deliberation Log

### Round 1 — PROPOSAL

[details...]

### Round N — CONCLUSION

[final agreement...]

## Final Verdict

**<VERDICT>** — N fix request items generated.
See `fix-requests.md` for details.
```

## Fix Requests Format (`fix-requests.md`)

Structure violations (CRITICAL/HIGH findings from `structure-check.md`) are
included as FIX-XXX items alongside code quality issues. Phase D is responsible
for assigning IDs sequentially across both sources.

````markdown
# Fix Requests — <branch name>

**Generated**: <ISO 8601>
**Total Items**: N (structure: S, code quality: Q)

---

## FIX-001: <title>

- **Severity**: LOW | MEDIUM | HIGH | CRITICAL
- **Source**: structure | code-quality        ← origin of the finding
- **Type**: code-fix | promote | restructure ← dispatch type (default: code-fix)
- **Path**: `<file path>`
- **Rule**: <violated rule>
- **Current**: <current value>
- **Raised by**: <persona name>              ← "Phase A" for structure items
- **Recommended Action**: <description>
- **Code Patch**:
  ```typescript
  // suggested fix (omit if structural — describe action instead)
  ```

Type classification (bare-word tokens — see `skills/filid-pipeline/stages.md` for policy):
- `code-fix`: standard inline code patches (default when omitted)
- `filid-promote`: 3+12 rule violations → resolved by test file promotion/splitting
- `filid-restructure`: LCOM4 >= 2 or structural drift → resolved by module reorganization
````


## PR Comment Format

Use `review_manage(action: "format-pr-comment")` to generate the PR comment.
The tool reads `review-report.md`, `structure-check.md`, and `fix-requests.md`,
wraps each in collapsible `<details>` sections, and returns a ready-to-post
markdown string in the `markdown` field. Post it via `gh pr comment --body`.

The tool handles size limits (truncates if >50,000 chars) and extracts the
verdict automatically. No manual formatting is needed.

### Generated Output Structure

```markdown
## Code Review Governance — <Verdict>

<details><summary>Phase A — Structure Compliance</summary>

{full structure-check.md content — 5-stage structural verification results}

</details>

<details><summary>Review Report (Phase B~D)</summary>

{full review-report.md content — committee composition, technical verification, deliberation log, final verdict}

</details>

<details><summary>Fix Requests</summary>

{full fix-requests.md content — FIX-XXX items with severity, path, recommended action}

</details>

> Full report: `.filid/review/<branch>/review-report.md`
```

Each `<details>` block is included only when the corresponding file exists.
`structure-check.md` (Phase A) and `fix-requests.md` are optional; `review-report.md`
is required. PR reviewers can expand each section to inspect full review details
without access to local files.

## MCP Tool Usage Map by Phase

### Phase A (Structure Agent, sonnet) — diff scope only

| Tool                 | Action / Parameters              | Stage | Purpose                                          |
| -------------------- | -------------------------------- | ----- | ------------------------------------------------ |
| `fractal_navigate`   | `action: "classify"`             | 1     | Classify changed dirs for boundary check         |
| `structure_validate` | `path: <changed dir>`            | 1     | Fractal/organ boundary validation (diff only)    |
| `doc_compress`       | `mode: "auto"`                   | 2     | INTENT.md line count (changed INTENT.md only)    |
| `test_metrics`       | `action: "check-312"`            | 3     | 3+12 rule on changed spec.ts files only          |
| `ast_analyze`        | `analysisType: "lcom4"`          | 4     | Module cohesion on changed source files          |
| `ast_analyze`        | `analysisType: "cyclomatic-complexity"` | 4 | Complexity on changed source files          |
| `test_metrics`       | `action: "decide"`               | 4     | Split/compress recommendation                    |
| `ast_analyze`        | `analysisType: "dependency-graph"` | 5  | DAG + cycle detection on changed files           |

### Phase B (Analysis Agent, haiku)

| Tool               | Action             | Purpose                              |
| ------------------ | ------------------ | ------------------------------------ |
| `review_manage`    | `normalize-branch` | Branch name → filesystem-safe string |
| `review_manage`    | `ensure-dir`       | Create `.filid/review/<branch>/`     |
| `review_manage`    | `elect-committee`  | Deterministic committee election     |
| `fractal_navigate` | `classify`         | Classify changed directories         |
| `fractal_scan`     | —                  | Build full fractal tree              |

### Phase C1 (Metrics Agent, sonnet) — changed files only

| Tool            | Action                  | Purpose                                         |
| --------------- | ----------------------- | ----------------------------------------------- |
| `ast_analyze`   | `lcom4`                 | Cohesion verification (split needed?)           |
| `ast_analyze`   | `cyclomatic-complexity` | Complexity verification                         |
| `test_metrics`  | `check-312`             | 3+12 rule validation                            |
| `test_metrics`  | `count`                 | Test case counting                              |
| `test_metrics`  | `decide`                | Split/compress/parameterize decision            |
| `coverage_verify` | —                     | Shared dependency test coverage (WARN only)     |

Phase C1 writes `verification-metrics.md`.

### Phase C2 (Structure Agent, sonnet) — diff-focused

| Tool                 | Action             | Purpose                               |
| -------------------- | ------------------ | ------------------------------------- |
| `structure_validate` | —                  | FCA-AI fractal boundary rules         |
| `ast_analyze`        | `dependency-graph` | Circular dependency check             |
| `ast_analyze`        | `tree-diff`        | Semantic change / interface analysis  |
| `drift_detect`       | —                  | Structure drift detection             |
| `doc_compress`       | `auto`             | Document compression state            |
| `rule_query`         | `list`             | Active rules listing                  |
| `debt_manage`        | `list`             | Existing debt load                    |
| `debt_manage`        | `calculate-bias`   | Debt bias level determination         |

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
team is created to parallelize C1/C2 batches. This team is
dismantled before Phase D begins.

### Subagent Context Budget Controls (Phase A / C1 / C2)

All three diff-analysis phases enforce **streaming-write discipline**: the
subagent writes the output skeleton first, then appends one result row
per file immediately after each MCP call, dropping the raw response from
its working memory before moving to the next file. This prevents context
accumulation on large diffs.

In addition, the chairperson applies threshold-based partitioning in
SKILL.md Step 2 / Step 3:

| Changed files | Phase A                          | Phase C1 / C2                     |
| ------------- | -------------------------------- | --------------------------------- |
| `<= 15`       | 1 subagent                       | 1 C1 + 1 C2 subagent              |
| `> 15, <= 30` | N parallel subagents (10/batch)  | N C1 batches + N C2 per-file batches + 1 C2 global |
| `> 30`        | N parallel subagents (10/batch)  | Team-promoted: `review-c-<branch>` team with one worker per batch |

Partial output files use `<base>.partial-<batchId>.md` naming. The
chairperson merges partials into the canonical output file before Phase
D begins.

### Checkpoint (SKILL.md, before phases)

| Tool            | Action             | Purpose                     |
| --------------- | ------------------ | --------------------------- |
| `review_manage` | `normalize-branch` | Branch normalization        |
| `review_manage` | `checkpoint`       | Phase state detection       |
| `review_manage` | `cleanup`          | Delete review dir (--force) |

**Checkpoint resume order** (based on files present in `REVIEW_DIR`):

| Files present                                                                                        | Resume from |
| ---------------------------------------------------------------------------------------------------- | ----------- |
| None                                                                                                 | Phase A     |
| `structure-check.md` only                                                                           | Phase B     |
| `session.md` only (`no_structure_check: true` in frontmatter)                                       | Phase C1+C2 |
| `session.md` only (`no_structure_check: false` or absent)                                           | Phase A     |
| `structure-check.md` + `session.md` (neither verification file)                                     | Phase C1+C2 |
| `session.md` + one of verification-metrics.md / verification-structure.md                           | Resume missing C-half |
| `session.md` + `verification-metrics.md` + `verification-structure.md` (no `verification.md`)       | Phase D (Step D.0 merge) |
| `session.md` + `verification.md` (merged)                                                           | Phase D (Step D.1 branch) |
| `session.md` + `verification.md` + `rounds/round-N-*.md` (no `review-report.md`)                    | Phase D (Step D.3 round N+1) |
| `session.md` + `verification.md` + `review-report.md` + `fix-requests.md`                           | Complete    |

When `--no-structure-check` is active, Phase A is skipped and resume starts
from Phase B even when no checkpoint files exist.

## Debt Bias Injection

The chairperson injects debt context into Phase D deliberation:

| Bias Level               | Committee Behavior                    | Business Driver Impact                |
| ------------------------ | ------------------------------------- | ------------------------------------- |
| LOW_PRESSURE (0-5)       | Normal review, debt issuance allowed  | CoD claims accepted                   |
| MODERATE_PRESSURE (6-15) | Strong debt repayment recommendation  | CoD claims need quantitative evidence |
| HIGH_PRESSURE (16-30)    | Near-prohibition on new debt          | CoD claims effectively rejected       |
| CRITICAL_PRESSURE (31+)  | No PR approval without debt repayment | VETO by default                       |
