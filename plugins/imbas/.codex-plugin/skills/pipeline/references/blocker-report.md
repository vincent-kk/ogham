# Blocker Report Templates

Two report formats: STOPPED (gate failure) and COMPLETE (full success).

---

## Stopped Report

Emit when the pipeline halts at any gate. Provides actionable details and resume commands.

```markdown
# imbas Pipeline — STOPPED

## Run

- Run ID: <run-id>
- Project: <KEY>
- Source: <source>
- Stopped at: Phase <N> (<refine | estimate | split-decompose | split-create>)

## Gate Failed: <gate-name>

### Reason

<1-2 sentence summary of why the pipeline stopped>

### Details

For GATE 1 (Refine):
List BLOCKING issues from validation-report.md:

| #   | Type          | ID    | Title               | Severity |
| --- | ------------- | ----- | ------------------- | -------- |
| 1   | Contradiction | V-C01 | OAuth vs basic auth | BLOCKING |

For GATE 2 (Estimation Integrity):

| #   | Error                            |
| --- | -------------------------------- |
| 1   | Duplicate unit ID: "U-3"         |
| 2   | Unit "U-7" deps references U-404 |

For GATE 3 (Split Quality):
If escape condition:
Escape code: <code>
<escape report content — structured per escape type>

If verification failure:

| #   | Story | Field       | Expected | Actual |
| --- | ----- | ----------- | -------- | ------ |
| 1   | S-001 | anchor_link | true     | false  |
| 2   | S-003 | coherence   | PASS     | FAIL   |

For GATE 4 (Execution Result):

| #   | Item  | Error                          |
| --- | ----- | ------------------------------ |
| 1   | S-004 | 403 from provider (permission) |

### Warnings (accumulated from earlier phases)

- [refine] warning count: N — V-M01: Missing error handling spec (WARNING)
- [estimate] milestone "beta" beyond total_weeks (WARNING)

## Resume Options

### Option A — Fix and re-run full pipeline

Fix the issues listed above in the source document, then:
`/imbas:pipeline <source> --project <KEY> [--parent <KEY>]`

### Option B — Continue with individual skills (manual review)

1. `/imbas:refine <source>` (when the document changed)
2. `/imbas:estimate --run <run-id>` (re-estimate)
3. `/imbas:split --run <run-id>` (review, approve, and create — idempotent retry)

### Option C — Check current state

`/imbas:status <run-id>`
```

---

## Complete Report

Emit when the pipeline finishes all phases successfully.

```markdown
# imbas Pipeline — COMPLETE

## Run

- Run ID: <run-id>
- Project: <KEY>
- Source: <source>

## Results

| Phase       | Result                     | Details                                               |
| ----------- | -------------------------- | ----------------------------------------------------- |
| 1. Refine   | <PASS\|PASS_WITH_WARNINGS> | <blocking_issues> blocking, <warning_issues> warnings |
| 2. Estimate | <Estimated\|Skipped>       | <buffered_total> man-days, <total_weeks> weeks        |
| 3. Split    | Auto-approved              | <N> issues decomposed                                 |
| 3. Create   | <Created\|Dry-run>         | <N> created, <S> skipped                              |

## Estimation Summary (when not skipped)

- Total: <buffered_total> man-days (CI <lo>–<hi>)
- Schedule: <total_weeks> weeks on <team_size> tracks
- Top risks: <top 3 risks>
- Full report: .imbas/<KEY>/runs/<run-id>/estimation-report.md

## Created Issues

### Epic

- <EPIC-KEY>: <title> (or "none" or "existing: <KEY>")

### Issues

- <ISSUE-KEY>: <title> (<estimate_manday> md)
- ...

### Links & Transitions

- <type>: <from> → <to>
- transition: <issue_ref> → <target_status> (<reason>)

## Next Steps

- /imbas:scaffold-pr <issue-ref> — scaffold a draft PR for an issue
- /imbas:status <run-id> — run overview
- /imbas:digest <issue-ref> — summarize discussion on the source issue
```
