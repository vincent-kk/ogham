# cross-review — Output Templates

## `session.md`

```markdown
---
review_schema: 6
branch: <branch>
base_ref: <base ref>
source_hash: <prepared source hash>
review_directory: <absolute path returned by review_state>
changed_files_count: <n>
created_at: <ISO 8601>
---
## Change Context
<concise pull-request or commit-history summary>
## Review Checklist
| Path | Change | Group | Rules | Result | Reason |
| --- | --- | --- | --- | --- | --- |
```

Include every `(path, change)` once. Begin reviewable rows as `pending`; finish each as `reviewed` or `skipped`, with a concrete reason for every skip. Finalize the checklist by rewriting the whole `## Review Checklist` block in one write, not by in-place substitution.

## `opinions/review-NN.md`

```yaml
---
group: <NN>
state: COMPLETE | INDETERMINATE
source_hash: <review-state source hash>
files:
  - path: <project-relative path>
    change: A | M | D
    result: reviewed | skipped
    reason: <required when skipped>
findings:
  - id: R<NN>-<NNN>
    severity: error | warning
    category: bug | security | performance | maintainability | test | documentation | contract | structure | verification
    path: <project-relative path>
    lines: <start>-<end> | unknown
    rule: <USR-NNN | rule item id | repository rule | DETAIL requirement>
    message: <falsifiable defect statement>
    evidence: <file:line or canonical evidence row>
    consequence: <what fails or degrades>
    recommended_action: <bounded correction>
checked:
  - <path or evidence section>
gaps:
  - path: <assigned project-relative path>
    rule: <rule>
    detail: <evidence that could not be obtained>
---
## Risk Plan
<optional file-by-file risks when group churn exceeds 200 lines>
```

Every assigned file appears once. A normal evidence gap keeps its file `reviewed`, sets state to `INDETERMINATE`, and names that file under `gaps`; narrative text cannot add findings absent from frontmatter.

## `opinions/verify-NN.md`

```yaml
---
group: <NN>
state: COMPLETE | INDETERMINATE
source_hash: <review-state source hash>
decisions:
  - finding_id: <R<NN>-<NNN> | FCA-<NNN>
    verdict: CONFIRMED | REFUTED | INDETERMINATE
    evidence: <file:line or canonical evidence row>
    reason: <one falsifiable sentence>
observations:
  - path: <project-relative path>
    detail: <new concern noticed while verifying; verdict-neutral>
checked: [<paths and evidence sections>]
---
```

Include exactly one decision for every assigned ID and none for unknown IDs. `decisions` omit category; join it from the candidate by `finding_id` when rendering the report.

## `review-report.md`

```markdown
---
review_schema: 6
verdict: APPROVED | REQUEST_CHANGES | INCONCLUSIVE
branch: <branch>
base_ref: <base ref>
source_hash: <prepared source hash>
snapshot_hash: <scope snapshot hash>
files_total: <integer>
files_reviewed: <integer>
files_skipped: <integer>
generated_at: <ISO 8601>
---
# Cross-Review — <branch>
## Scope
<changed files and owners>
## Evidence Status
| Field | Value |
| --- | --- |
| source_hash | <evidence.md value> |
| snapshot_hash | <evidence.md value> |
| evidence_complete | <evidence.md value> |
| structure_status | <evidence.md value> |
| verification_status | <evidence.md value> |
| worktree | <evidence.md value> |

## Coverage

| Path | Change | Group | Result | Reason |
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

**<VERDICT>** — <one sentence justified by the ordered verdict table>.
```

Derive counts from the checklist. Include gaps, `INDETERMINATE` decisions, observations, and unavailable artifacts under Unresolved Evidence; write `none` when empty. Keep every section for `INCONCLUSIVE` and never present unresolved rows as findings.

## `fix-requests.md`

Write only for `REQUEST_CHANGES`, with confirmed findings numbered from `FIX-001`:

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

Copy `Claim` from the confirmed candidate's `message` verbatim and preserve its other fields. Cross-review never embeds a patch.

## PR Comment

Post only when the branch has a pull request. Keep the verdict table outside collapsible sections.

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

Strip copied frontmatter. Omit empty detail blocks except Confirmed findings. If the host limit would be exceeded, retain the verdict table and Confirmed findings, replace the rest with the report pointer, and state that it was truncated. Update this skill's existing `## Code Review Governance` comment rather than adding another.

## Terminal Output

After a successful seal, emit exactly:

```text
Review verdict: APPROVED
pr-comment: none
```

Substitute `REQUEST_CHANGES` or `INCONCLUSIVE` when applicable, and substitute `posted`, `unavailable`, or `failed: <reason>` for `none` according to Step 6. Before seal, no terminal verdict marker is valid.
