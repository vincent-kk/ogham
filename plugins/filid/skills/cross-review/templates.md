# cross-review — Output Templates

## `session.md`

```markdown
---
review_schema: 5
branch: <branch>
base_ref: <base ref>
source_hash: <prepared source hash>
review_directory: <absolute path returned by review_state>
changed_files_count: <n>
created_at: <ISO 8601>
---

## Change Context

<concise summary of the pull-request body or BASE_REF..HEAD commit subjects and bodies>

## Changed Files

| Path | Change | Owning Fractal |
| --- | --- | --- |

## Review Checklist

| Path | Status | Group | Rules | Result | Reason |
| --- | --- | --- | --- | --- | --- |
```

The checklist contains every changed `(path, status)` entry. Start reviewable rows as `pending`; close every row as `reviewed` or `skipped` before report generation. A mechanical reviewer-failure artifact uses `result: unavailable`, but its matching checklist rows remain `pending` and force `INCONCLUSIVE`.

## Evidence Artifacts

Use the exact layouts in `phases/evidence.md` for `verification.md` and `structure-check.md`. Both files carry matching source and snapshot hashes.

## Review Artifacts

Each `opinions/review-NN.md` uses the Review Contract in `contracts.md`. Its frontmatter accounts for every file assigned to that group, including `unavailable` rows in a mechanical reviewer-failure artifact.

## Verification Artifacts

Each `opinions/verify-NN.md` uses the Verification Contract in `contracts.md`. Together they decide every deduplicated candidate exactly once. When there are no candidates, `opinions/verify-01.md` contains a valid empty decision set.

## `review-report.md`

```markdown
---
review_schema: 5
verdict: APPROVED | REQUEST_CHANGES | INCONCLUSIVE
branch: <branch>
base_ref: <base ref>
source_hash: <prepared source hash>
snapshot_hash: <shared snapshot hash or unavailable>
files_total: <integer>
files_reviewed: <integer>
files_skipped: <integer>
generated_at: <ISO 8601>
---

# Cross-Review — <branch>

## Scope

<changed files and owning fractals>

## Evidence Status

| Evidence | Status | Hash | Diagnostics |
| --- | --- | --- | --- |
| Snapshot | <status> | <hash> | <summary> |
| Structure | <status> | <hash> | <summary> |
| Verification | <status> | <hash> | <summary> |

## Coverage

| Path | Status | Group | Result | Reason |
| --- | --- | --- | --- | --- |

## Verification Log

| Candidate | Category | Verdict | Evidence | Reason |
| --- | --- | --- | --- | --- |

## Confirmed Findings

| ID | Severity | Category | Path | Rule | Consequence | Action |
| --- | --- | --- | --- | --- | --- | --- |

## Refuted Candidates

| ID | Category | Refuting Evidence | Reason |
| --- | --- | --- | --- |

## Unresolved Evidence

| Source | Path | Rule | Detail | Affects Verdict |
| --- | --- | --- | --- | --- |

## Final Verdict

**<VERDICT>** — <one sentence derived from contracts.md>.
```

Derive `files_total`, `files_reviewed`, and `files_skipped` from the checklist. In the Verification Log, obtain `Category` by joining each decision to its candidate through `finding_id`; verification decisions do not duplicate that field.

`Unresolved Evidence` includes reviewer gaps, `INDETERMINATE` candidate decisions, verifier observations, and unavailable evidence. Set `Affects Verdict` from the ordered Verdict Derivation. A verifier observation and an `INDETERMINATE` warning are verdict-neutral. Write `none` under the heading when there are no unresolved rows.

If either canonical evidence file records `evidence_complete: false`, report that sentinel under Evidence Status and derive `INCONCLUSIVE` even when its tables contain no finding rows.

For `INCONCLUSIVE`, keep every section, name the missing or inconsistent evidence, and do not present unresolved rows as findings.

## `fix-requests.md`

Write this file only when the verdict is `REQUEST_CHANGES`. It contains confirmed findings only:

```markdown
# Fix Requests — <branch>

## FIX-001: <rule at path>

- **Severity**: error | warning
- **Category**: bug | security | performance | maintainability | test | documentation | contract | structure | verification
- **Path**: `<project-relative path>`
- **Rule**: <USR-NNN, rule item, repository rule, or DETAIL requirement>
- **Claim**: <falsifiable defect statement>
- **Evidence**: <file:line or canonical evidence row>
- **Consequence**: <specific broken contract or boundary>
- **Recommended Action**: <bounded correction>
```

`Claim` is the confirmed candidate's `message` verbatim. Preserve every field from that candidate; `resolve` and `revalidate` use the FIX ID to carry this canonical payload across stages.

Cross-review never edits project files and never embeds an automatic patch.

## PR Comment

Post only when the branch has a pull request. The verdict table stays **outside** collapsible sections so the result reads without expansion; bulky evidence stays folded.

```markdown
## Code Review Governance — <verdict>

| Field | Value |
| --- | --- |
| Verdict | <APPROVED \| REQUEST_CHANGES \| INCONCLUSIVE> |
| Branch | `<branch>` |
| Base | `<base ref>` |
| Snapshot | `<snapshot hash, or unavailable>` |
| Coverage | <r> reviewed · <s> skipped · <t> total |
| Findings | <c> confirmed · <r> refuted · <i> indeterminate |
| Generated | <ISO 8601> |

<details><summary>Confirmed findings (<c>)</summary>

<the Confirmed Findings table from review-report.md, or `None`>

</details>

<details><summary>Coverage and verification log</summary>

<the Coverage and Verification Log tables from review-report.md>

</details>

<details><summary>Unresolved evidence</summary>

<the Unresolved Evidence rows whose Affects Verdict is `yes`>

</details>

> Full report: `<REVIEW_DIR>/review-report.md`
```

Rules:

- Strip raw report frontmatter from bodies copied into a `<details>` block; the table above already carries those fields.
- Omit a `<details>` block whose content would be empty, except `Confirmed findings`, which is always present so a reader sees a zero count rather than a missing section.
- Keep the comment within the host's size limit. When it would exceed the limit, keep the table and Confirmed Findings block, replace the remainder with the report pointer, and state that the rest was truncated.
- A comment carrying the `## Code Review Governance` heading is this skill's own. Update that comment in place rather than adding a second one, so a rerun leaves one comment per branch.

## Terminal Output

After a successful seal, emit exactly:

```text
Review verdict: APPROVED
```

or the corresponding `REQUEST_CHANGES` / `INCONCLUSIVE` value. Before seal, no terminal verdict marker is valid.
