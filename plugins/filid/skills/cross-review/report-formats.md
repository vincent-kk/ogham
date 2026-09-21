# cross-review — Sealed Output Formats

`review_state({ action: "seal", ... })` computes the verdict and renders these artifacts. Read the returned paths and publish the rendered comment unchanged. This skill contains the output contract; no implementation module document is needed to interpret or deliver it. Angle-bracket values below are placeholders for sealed evidence.

## Verdict

Only a successful seal returns a terminal verdict. Policy errors return diagnostics without a verdict. If every merged opinion is missing for reviewable groups, seal stops without a verdict; the documents-only/source-dirty path may still seal INCONCLUSIVE from worktree evidence.

Use `summary.verdict` and `summary.reviewComplete` independently. Dirty worktrees remain INCONCLUSIVE. Source-matched trusted confirmed defects produce REQUEST_CHANGES even when evidence or coverage is incomplete. Without confirmed defects, incomplete review is INCONCLUSIVE and only complete review is APPROVED. Untrusted sources and invalid decision sets cannot confirm defects. INCONCLUSIVE never implies a human decision: agent evidence recovery and human choices are separate blocker routes.

## Review report

`review-report.md` records all evidence and verdict-neutral observations. Preserve metadata and section order. Include `review_complete` and include `blockers_report` whenever blockers exist, including REQUEST_CHANGES.

```markdown
---
review_schema: 7
verdict: <APPROVED | REQUEST_CHANGES | INCONCLUSIVE>
review_complete: <true | false>
blockers_report: review-blockers.md
branch: <branch>
base_ref: <base ref>
source_hash: <source hash>
snapshot_hash: <snapshot hash or unavailable>
files_total: <count>
files_reviewed: <count>
files_skipped: <count>
generated_at: <timestamp>
---

# Cross-Review — <branch>

## Review blockers

<up to five blocker IDs, questions, routes and next actions, remaining count and sidecar link; whenever blockers exist>

## Scope

| Path           | Owner           |
| -------------- | --------------- |
| <changed path> | <owner fractal> |

## Evidence Status

| Field               | Value                          |
| ------------------- | ------------------------------ |
| source_hash         | <source hash>                  |
| snapshot_hash       | <snapshot hash or unavailable> |
| evidence_complete   | <true or false>                |
| structure_status    | <status>                       |
| verification_status | <status>                       |
| worktree            | <classification>               |

### Incremental Reuse

| Field                        | Value   |
| ---------------------------- | ------- |
| reusedGroups                 | <count> |
| reusedFiles                  | <count> |
| reviewFiles                  | <count> |
| rerunGroups                  | <count> |
| newGroups                    | <count> |
| removedGroups                | <count> |
| bookkeepingGroups            | <count> |
| remainingMaxReviewerHandoffs | <count> |

## Coverage

<review target, reviewed, pending, excluded, and total counts; exclusion reasons with up to three representative paths>

| Path   | Change   | Group   | Result                          | Reason   |
| ------ | -------- | ------- | ------------------------------- | -------- |
| <path> | <change> | <group> | <reviewed, skipped, or pending> | <reason> |

## Verification Log

| Candidate | Category   | Verdict                                | Evidence   | Reason   |
| --------- | ---------- | -------------------------------------- | ---------- | -------- |
| <ID>      | <category> | <CONFIRMED, REFUTED, or INDETERMINATE> | <evidence> | <reason> |

## Confirmed Findings

| ID   | Severity   | Category   | Path   | Rule   | Consequence   | Action   |
| ---- | ---------- | ---------- | ------ | ------ | ------------- | -------- |
| <ID> | <severity> | <category> | <path> | <rule> | <consequence> | <action> |

## Refuted Candidates

| ID   | Category   | Refuting Evidence | Reason   |
| ---- | ---------- | ----------------- | -------- |
| <ID> | <category> | <evidence>        | <reason> |

## Unresolved Evidence

| Source   | Path   | Rule   | Detail   | Affects Verdict |
| -------- | ------ | ------ | -------- | --------------- |
| <source> | <path> | <rule> | <detail> | <yes or no>     |

## Final Verdict

**<verdict>** — <reason derived from the sealed evidence>
```

The Incremental Reuse subsection appears only for an observed-input generation. Its counters come from the persisted reuse decisions and report remaining reviewer handoffs, excluding verifier work and retries. An empty evidence table may render a `None` row. Findings retain their confirmed evidence; the orchestrator does not rewrite claims or add fixes during rendering.

At seal, the Verification Log records FCA candidates as `CONFIRMED` with `evidence.md#<id>` and `canonical structure evidence measured on snapshot <snapshotHash>`, and deterministically refuted findings outside the changed hunks as `REFUTED` with assigned hunk ranges and `finding lies outside the changed hunks`.

## Blocker report

New-format incomplete seals render `review-blockers.md`, including REQUEST_CHANGES with incomplete evidence. Explicit cause IDs aggregate occurrences across groups while preserving every affected scope, original detail and source. Rules alone never merge causes. Human decisions require concrete options and a reason evidence alone cannot decide; missing advice is triage, not a human requirement.

```markdown
---
blockers_schema: 1
source_hash: '<source hash>'
snapshot_hash: '<snapshot hash or unavailable>'
branch: '<branch>'
verdict: INCONCLUSIVE
---

# Review blockers — INCONCLUSIVE

## Human decision requests

### BLK-001

- **Question**: <the unresolved question>
- **Currently unknown**: <why the review cannot decide it>
- **Scope**: <path, group, finding, and rule when known>
- **Evidence needed**: <one to five concrete evidence items>
- **Next action**: <bounded proposed action>
- **Proposed owner**: <agent | human | unknown, with human reason when supplied>
- **Completion condition**: <what new evidence makes the question decidable>
- **Sources**: <canonical artifact plus JSON pointer or section>
```

Proposed owners and actions are not assignments, approvals, or permission. Conflicting proposals remain visible under triage. Actor-authored values render as inert escaped text; only canonical artifacts and anchors become navigation links. Resolving a card requires validating new evidence or a recorded decision through the review workflow, never editing the card or sealed verdict.

A current-policy sealed report with no `blockers_report` marker is a legacy cache: return `blockersPath: null` without writing it. A report with the marker must use the canonical filename and matching source, snapshot, branch, and verdict metadata. Missing or mismatched sidecars return `review-blockers-missing` or `review-blockers-invalid`; do not auto-force or rewrite the seal. Unsupported validation policy fails before this compatibility check.

## PR comment

`pr-comment.md` summarizes the same sealed review. Use `## Code Review Governance` to find the existing comment for an update. Keep all three disclosure blocks, including empty ones; the unresolved block contains only evidence that affects the verdict.

```markdown
## Code Review Governance — <verdict>

| Field     | Value                                                       |
| --------- | ----------------------------------------------------------- |
| Verdict   | <verdict>                                                   |
| Confirmed defects | <count> |
| Review complete | <true or false> |
| Human decision required | <true or false> |
| Agent next action | <bounded evidence recovery and correction work> |
| Branch    | `<branch>`                                                  |
| Base      | `<base ref>`                                                |
| Snapshot  | `<snapshot hash or unavailable>`                            |
| Coverage  | <count> reviewed · <count> skipped · <count> total          |
| Findings  | <count> confirmed · <count> refuted · <count> indeterminate |
| Generated | <timestamp>                                                 |

### Review blockers

<bounded blocker summary; Human decision requests, Needs triage, Evidence recovery; local artifact path remains plain text>

<details><summary>Confirmed findings (<count>)</summary>

<confirmed findings table, or None>

</details>

<details><summary>Coverage and verification log</summary>

### Coverage

<coverage table>

### Verification Log

<verification log table>

</details>

<details><summary>Unresolved evidence</summary>

<verdict-affecting unresolved evidence table, or None>

</details>

> Full report: `<returned reportPath>`
```

A sealed review remains valid if comment delivery fails. On a cached preparation, recover its paths through the idempotent seal action and retry publication without another reviewer round. Report publication status separately from the sealed verdict using the terminal output contract in [templates.md](./templates.md).
