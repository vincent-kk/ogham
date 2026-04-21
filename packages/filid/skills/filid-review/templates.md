# filid-review — Output Templates

Canonical output file templates for Phase D artifacts and the PR comment
format. The chairperson reads this file before writing `review-report.md`
and `fix-requests.md`; the `mcp_t_review_manage(format-pr-comment)` MCP tool
consumes these conventions when assembling PR comments.

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

Solo path note: when the committee is `['adjudicator']`, the Deliberation
Log contains a single round entry and a **Perspective Sweep** subsection
mirroring the six committee lenses (structure, documentation, stability,
velocity, user-value, cognitive load) so per-perspective coverage is
still surfaced.

### Failure Variant (Step D.7 fail dispatch)

When Phase D enters the fail dispatch (Step D.7 in `phases/phase-d-deliberation.md`),
the chairperson MUST still write `review-report.md` so that the pipeline
finalize stage and `mcp_t_review_manage(format-pr-comment)` can read a
consistent verdict field. Use this minimal variant alongside
`rounds/failure.md`:

```markdown
# Code Review Report — <branch name>

**Date**: <ISO 8601>
**Scope**: <branch|pr|commit>
**Base**: <base ref>
**Verdict**: INCONCLUSIVE
**Dispatch**: fail
**Failure Reason**: <from SubagentReturn or in-flight error>

## Committee Composition

| Persona    | Election Basis         | Final Position |
| ---------- | ---------------------- | -------------- |
| <persona>  | <from session.md>      | N/A (fail)     |

## Deliberation Log

### Fail Dispatch

- **Trigger**: <chairperson-forbidden | phase-d-team-spawn-unavailable | team-incomplete | veto-deadlock | team-in-flight-error>
- **Rationale**: <one-line rationale — mirrors rounds/failure.md>
- **Deliberation executed**: no (merge blocked by verdict_gate)

## Final Verdict

**INCONCLUSIVE** — Phase D deliberation could not produce a quorum verdict.
See `rounds/failure.md` for the raw failure record.
```

Sections omitted relative to the standard template:
- `## Structure Compliance (Phase A)` — include only if `structure-check.md` exists
- `## Technical Verification Results` — omit (no C1/C2 ingestion performed)
- `fix-requests.md` — NOT written in the fail path; reviewers inspect
  `rounds/failure.md` + `verification-metrics.md` / `verification-structure.md`
  directly

## Fix Requests Format (`fix-requests.md`)

Structure violations (CRITICAL/HIGH findings from `structure-check.md`)
are included as `FIX-XXX` items alongside code quality issues. Phase D
is responsible for assigning IDs sequentially across both sources.

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
````

Type classification (bare-word tokens — see `skills/filid-pipeline/stages.md`
for the dispatch policy):

- `code-fix` — standard inline code patches (default when omitted)
- `filid-promote` — 3+12 rule violations → resolved by test file
  promotion/splitting
- `filid-restructure` — LCOM4 >= 2 or structural drift → resolved by
  module reorganization

## PR Comment Format

Use `mcp_t_review_manage(action: "format-pr-comment")` to generate the PR
comment. The tool reads `review-report.md`, `structure-check.md`, and
`fix-requests.md`, wraps each in collapsible `<details>` sections, and
returns a ready-to-post markdown string in the `markdown` field. Post it
via `gh pr comment --body`.

The tool handles size limits (truncates if >50,000 chars) and extracts
the verdict automatically. No manual formatting is needed.

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

Each `<details>` block is included only when the corresponding file
exists. `structure-check.md` (Phase A) and `fix-requests.md` are
optional; `review-report.md` is required. PR reviewers can expand each
section to inspect full review details without access to local files.
