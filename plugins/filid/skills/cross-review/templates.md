# cross-review — Output Templates

Canonical output formats for review artifacts and the PR comment. The
chairperson reads this file before writing `review-report.md` and
`fix-requests.md`; `mcp__plugin_filid_t__review_manage(format-pr-comment)`
consumes these conventions when assembling PR comments.

## Review Report Format (`review-report.md`)

```markdown
---
verdict: APPROVED | REQUEST_CHANGES | INCONCLUSIVE
branch: <branch>
base_ref: <base ref>
run_id: <normalized>@<short sha>
committee: [<persona-id>, ...]
generated_at: <ISO 8601>
---

# Code Review Report — <branch>

**Date**: <ISO 8601> · **Scope**: <branch|pr|commit> · **Base**: <base ref>
**Verdict**: APPROVED | APPROVED (with notes) | REQUEST_CHANGES | INCONCLUSIVE

## Committee Positions

| Persona               | State     | Confidence | Blocking findings |
| --------------------- | --------- | ---------- | ----------------- |
| Engineering Architect | SYNTHESIS | 0.9        | 1                 |

## Technical Verification Results

<copy the Code Metrics / Structure & Dependency / Debt Status tables
from verification.md>

## Arbitration Log

One entry per arbitration event, in order:

- **Dedup**: `<path>+<rule>` raised by <persona A> (HIGH) and
  <persona B> (MEDIUM) → kept HIGH (confidence tiebreak: <n>)
- **Verified**: FIX-candidate `<path>:<line>` → CONFIRMED — <one-line
  evidence>
- **Dismissed (REFUTED)**: `<path>+<rule>` raised by <persona> —
  <refuting evidence, quoted line or rule scope>
- **VETO**: <persona> vetoed on <basis> → basis CONFIRMED, VETO stands
  (or: basis REFUTED, VETO dismissed)
- `critical_security_override: true` (when applied)
- **Forced ABSTAIN**: <persona> — worker failed

## Claim Verdicts

> Omit when verification.md lists no in-scope acceptance claims.
> Aggregation is worst-wins across non-ABSTAIN personas; non-PASS rows
> also appear as folded blocking fix items (FAIL → HIGH code-fix,
> INSUFFICIENT-EVIDENCE → MEDIUM harvest-required).

| Claim   | Scope    | Verdict                             | Evidence             |
| ------- | -------- | ----------------------------------- | -------------------- |
| CLM-001 | `<path>` | PASS / FAIL / INSUFFICIENT-EVIDENCE | <artifact reference> |

## Advisory Notes

> Omit when no advisory (LOW) items exist. Advisory items never block —
> an APPROVED verdict with entries below is presented as **APPROVED
> (with notes)** (presentation only; the frontmatter verdict stays
> APPROVED).

| ID      | Path     | Rule   | Consequence | Raised by | Ledger count |
| ------- | -------- | ------ | ----------- | --------- | ------------ |
| ADV-001 | `<path>` | <rule> | <one line>  | <persona> | <N>/3        |

> Entries whose ledger count reached 3 carry a `promoted to debt <id>`
> annotation in the Consequence column.

## Final Verdict

**<VERDICT>** — N blocking fix items (see `fix-requests.md`), M advisory
notes, K findings dismissed as refuted.
```

Solo path note: the adjudicator tags each fix_item with a `perspective`;
Committee Positions becomes a six-row per-lens coverage table (a lens
with no findings shows its `Checked:` line).

### INCONCLUSIVE Variant

When the verdict is `INCONCLUSIVE` (majority committee failure or
evidence unavailable), still write `review-report.md` — the pipeline and
`format-pr-comment` need a consistent frontmatter `verdict`. Keep the
frontmatter and header, include Committee Positions (with `N/A (failed)`
rows) and a single Arbitration Log entry naming the trigger, and omit
the other sections. `fix-requests.md` is NOT written.

## Fix Requests Format (`fix-requests.md`)

`fix-requests.md` carries the **surviving blocking partition only**
(severity >= MEDIUM, post-verification); advisory items live exclusively
in `review-report.md` → `## Advisory Notes`.

````markdown
# Fix Requests — <branch>

**Generated**: <ISO 8601>
**Total Items**: N (structure: S, code quality: Q) — blocking only; M advisory notes in review-report.md

---

## FIX-001: <title>

- **Severity**: MEDIUM | HIGH | CRITICAL
- **Source**: structure | code-quality | acceptance-claim
- **Type**: code-fix | promote | restructure | harvest-required
- **Path**: `<file path>`
- **Rule**: <violated rule>
- **Current**: <current value>
- **Consequence**: <what concretely breaks if left unaddressed>
- **Verification**: CONFIRMED | PLAUSIBLE — <verifier evidence>
- **Raised by**: <persona name>
- **Recommended Action**: <description>
- **Code Patch**:
  ```typescript
  // suggested fix (omit if structural — describe action instead)
  ```
````

Type tokens are bare words (never `filid:`-prefixed):

- `code-fix` — inline code patch (default when omitted)
- `promote` — stable `test.ts` → `spec.ts` consolidation (advisory; a `.test.ts` is exempt from the 3+12 cap, so this is not a rule violation). A `spec.ts` over the 15-case cap is remedied by `code-fix`/`restructure` (split / parameterize), not promote.
- `restructure` — LCOM4 >= 2 or structural drift → module reorganization
- `harvest-required` — oracle gap, not a code defect (never dispatched
  to code-surgeon): resolved via `/filid:harvest` (spike) or by
  supplying the claim's `observable` evidence (merge track), then
  re-running `/filid:cross-review`

### Harvest-Required Variant (unharvested spike branch)

When reviewing a `spike/*` branch without a current harvest manifest
(SKILL.md Step 1 guard), skip all later steps and write directly:

- `review-report.md` — standard header, `verdict: REQUEST_CHANGES`, a
  `## Claim Verdicts` section with the single row
  `ALL | <branch> | INSUFFICIENT-EVIDENCE | no current harvest manifest`,
  and one Arbitration Log entry `Harvest guard: manifest <missing|stale>`.
- `fix-requests.md` — exactly one item:

  ```markdown
  ## FIX-001: Harvest the spike before merge-track entry

  - **Severity**: MEDIUM
  - **Source**: acceptance-claim
  - **Type**: harvest-required
  - **Path**: `.filid/harvest/<normalized-branch>/manifest.json`
  - **Rule**: spike-harvest-gate
  - **Current**: manifest missing or stale (head moved past harvested sha)
  - **Consequence**: spike decisions remain unharvested — no oracle exists
    to judge this work, and merge-track entry is blocked
  - **Raised by**: Step 1 harvest guard
  - **Recommended Action**: Run /filid:harvest (keep/discard/defer
    interview), then re-run /filid:cross-review
  ```

## Advisory Ledger Format (`.filid/review/advisory-ledger.md`)

Project-level, shared across branches — outside per-branch cleanup
scope. One row per advisory key, updated in place in SKILL.md Step 5:

```markdown
# Advisory Ledger

| key           | path     | rule   | count | first_seen | last_seen_branch | last_run_id | status           | debt_id   |
| ------------- | -------- | ------ | ----- | ---------- | ---------------- | ----------- | ---------------- | --------- |
| <path>+<rule> | `<path>` | <rule> | <N>   | <ISO 8601> | <normalized>     | <run id>    | open \| promoted | <id or —> |
```

- `key` uses the same `path + rule` dedup key as fix_items.
- `count` increments at most once per run: a row whose `last_run_id`
  equals the current `session.md` `run_id` is skipped.
- At `count` 3 with `status: open`: promote via
  `mcp__plugin_filid_t__debt_manage(action: "create", projectRoot, debtItem: { severity: "LOW", original_fix_id: <ADV-id>, ... })`,
  set `status: promoted`, record `debt_id`. Promoted rows are never
  re-counted — the ledger never becomes an unbounded backlog.

## PR Comment Format

Use `mcp__plugin_filid_t__review_manage(action: "format-pr-comment")` —
it reads `review-report.md` (+ `fix-requests.md` when present), wraps
each in collapsible `<details>` sections, handles the 50,000-char limit,
and returns ready-to-post markdown. Post via
`gh pr comment --body-file`; when a `Code Review Governance` comment
already exists, edit it in place
(`gh api -X PATCH repos/<owner>/<repo>/issues/comments/<id>`).
