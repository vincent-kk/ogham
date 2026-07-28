# cross-review — Output Templates

## `session.md`

```markdown
---
branch: <branch>
base_ref: <base ref>
source_hash: <prepared source hash>
review_directory: <absolute path returned by review_state>
changed_files_count: <n>
created_at: <ISO 8601>
---

## Changed Files

| Path | Change | Owning Fractal |
| ---- | ------ | -------------- |
```

## Evidence Artifacts

Use the exact layouts in `phases/evidence.md` for `verification.md` and `structure-check.md`. Both files must carry matching source and snapshot hashes.

## Perspective Opinions

`opinions/contract.md`, `opinions/structure.md`, and `opinions/verification.md` use the Opinion Contract in `contracts.md`. `opinions/adversarial.md` uses the Arbitration Contract.

## `review-report.md`

```markdown
---
verdict: APPROVED | REQUEST_CHANGES | INCONCLUSIVE
branch: <branch>
base_ref: <base ref>
source_hash: <prepared source hash>
snapshot_hash: <shared snapshot hash or unavailable>
perspectives: [contract, structure, verification]
generated_at: <ISO 8601>
---

# FCA Cross-Review — <branch>

## Scope

<changed files and owning fractals>

## Evidence Status

| Evidence     | Status   | Hash   | Diagnostics |
| ------------ | -------- | ------ | ----------- |
| Snapshot     | <status> | <hash> | <summary>   |
| Structure    | <status> | <hash> | <summary>   |
| Verification | <status> | <hash> | <summary>   |

## Perspective Results

| Perspective | State | Findings | Checked | Gaps |
| ----------- | ----- | -------- | ------- | ---- |

## Arbitration Log

| Candidate | Verdict | Evidence | Reason |
| --------- | ------- | -------- | ------ |

## Confirmed FCA Findings

| ID  | Severity | Path | Rule | Consequence | Action |
| --- | -------- | ---- | ---- | ----------- | ------ |

## Refuted Candidates

| ID  | Refuting Evidence | Reason |
| --- | ----------------- | ------ |

## Final Verdict

**<VERDICT>** — <one sentence derived from contracts.md>.
```

For `INCONCLUSIVE`, keep every section, name the missing or inconsistent evidence, and do not present unresolved rows as findings.

## `fix-requests.md`

Write this file only when the verdict is `REQUEST_CHANGES`. It contains confirmed FCA findings only:

```markdown
# FCA Fix Requests — <branch>

## FIX-001: <rule at path>

- **Severity**: error | warning
- **Perspective**: contract | structure | verification
- **Path**: `<project-relative path>`
- **Rule**: <FCA rule or DETAIL requirement>
- **Evidence**: <canonical artifact section or file:line>
- **Consequence**: <specific broken contract or boundary>
- **Recommended Action**: <bounded correction>
```

Cross-review never edits project files and never embeds an automatic patch.

## PR Comment

Posted only when the branch has a pull request. The verdict table stays **outside** the collapsible sections so the result reads without expanding anything; everything bulky is folded.

```markdown
## Code Review Governance — <verdict>

| Field        | Value                                           |
| ------------ | ----------------------------------------------- |
| Verdict      | <APPROVED \| REQUEST_CHANGES \| INCONCLUSIVE>   |
| Branch       | `<branch>`                                      |
| Base         | `<base ref>`                                    |
| Snapshot     | `<snapshot hash, or unavailable>`               |
| Perspectives | contract · structure · verification             |
| Findings     | <c> confirmed · <r> refuted · <i> indeterminate |
| Generated    | <ISO 8601>                                      |

<details><summary>Confirmed FCA findings (<c>)</summary>

<the Confirmed FCA Findings table from review-report.md, or `None`>

</details>

<details><summary>Perspective results and arbitration</summary>

<the Perspective Results and Arbitration Log tables from review-report.md>

</details>

<details><summary>Unresolved evidence</summary>

<the gaps that forced INCONCLUSIVE>

</details>

> Full report: `<REVIEW_DIR>/review-report.md`
```

Rules:

- Strip the report's raw frontmatter from any body copied into a `<details>` block — the table above already carries those fields.
- Omit a `<details>` block whose content would be empty, except `Confirmed FCA findings`, which is always present so a reader sees a zero count rather than a missing section.
- Keep the comment within the host's comment size limit. When it would exceed, keep the table and the confirmed-findings block, replace the remainder with the report pointer, and say that the rest was truncated.
- A comment carrying the `## Code Review Governance` heading is this skill's own. Update that comment in place rather than adding a second one, so a re-run leaves one comment per branch.

## Terminal Output

After a successful seal, emit exactly:

```text
Review verdict: APPROVED
```

or the corresponding `REQUEST_CHANGES` / `INCONCLUSIVE` value. Before seal, no terminal verdict marker is valid.
