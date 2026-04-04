# Blocker Report Templates

Two report formats: STOPPED (gate failure) and COMPLETE (full success).

---

## Stopped Report

Emit when pipeline halts at any gate. Provides actionable details and resume commands.

```markdown
# imbas Pipeline — STOPPED

## Run
- Run ID: <run-id>
- Project: <KEY>
- Source: <source>
- Stopped at: Phase <N> (<phase-name>)

## Gate Failed: <gate-name>

### Reason
<1-2 sentence summary of why the pipeline stopped>

### Details
<structured details specific to the gate that failed>

For GATE 1 (Validate):
  List BLOCKING issues from validation-report.md:
  | # | Type | ID | Title | Severity |
  |---|------|----|-------|----------|
  | 1 | Contradiction | V-C01 | OAuth vs basic auth | BLOCKING |

For GATE 2 (Split Quality):
  If escape condition:
    Escape code: <code>
    <escape report content — structured per escape type>

  If verification failure:
    | # | Story | Field | Expected | Actual |
    |---|-------|-------|----------|--------|
    | 1 | S-001 | anchor_link | true | false |
    | 2 | S-003 | coherence | PASS | FAIL |

For GATE 3 (Devplan Quality):
  If validation errors:
    | # | Error |
    |---|-------|
    | 1 | Duplicate task ID: "T1" |

  If needs_review flags:
    | # | Item | Reason |
    |---|------|--------|
    | 1 | T1-ST2 | Cross-layer: API + DB in one Subtask |

### Warnings (accumulated from earlier phases)
- [Phase 1] validation warning count: N
  - V-M01: Missing error handling spec (WARNING)
  - V-D02: Minor divergence in section 3.2 (WARNING)

## Resume Options

### Option A — Fix and re-run full pipeline
Fix the issues listed above in the source document, then:
`/imbas:pipeline <source> --project <KEY> [--parent <KEY>]`

### Option B — Continue with manual review
Use individual skills with manual approval at each step:
1. `/imbas:split --run <run-id>` (review flagged Stories)
2. `/imbas:manifest stories --run <run-id>`
3. `/imbas:devplan --run <run-id>`
4. `/imbas:manifest devplan --run <run-id>`

### Option C — Check current state
`/imbas:status <run-id>`
```

---

## Complete Report

Emit when pipeline finishes all phases successfully.

```markdown
# imbas Pipeline — COMPLETE

## Run
- Run ID: <run-id>
- Project: <KEY>
- Source: <source>

## Results

| Phase | Result | Details |
|-------|--------|---------|
| 1. Validate | <PASS\|PASS_WITH_WARNINGS> | <blocking_issues> blocking, <warning_issues> warnings |
| 2. Split | Auto-approved | <N> Stories |
| 2.5. Manifest Stories | <Created\|Dry-run> | <issue_refs list or "preview only"> |
| 3. Devplan | Auto-approved | <N> Tasks, <M> Subtasks |
| 3.5. Manifest Devplan | <Created\|Dry-run> | <N> Tasks, <M> Subtasks, <L> Links |

## Created Issues

### Epic
- <EPIC-KEY>: <title> (or "none" or "existing: <KEY>")

### Stories
- <STORY-KEY>: <title>
- <STORY-KEY>: <title>
- ...

### Tasks
- <TASK-KEY>: <title> (blocks: <STORY-KEY>, <STORY-KEY>)
- ...

### Subtasks
- <count> Subtasks created across <story-count> Stories and <task-count> Tasks

## Notes

### Warnings
<accumulated warnings from Phase 1, if any>

### B→A Feedback
<feedback_comments summary, if any>
- <target_ref>: <comment summary> (type: <mapping_divergence|story_split_issue>)

### AST Mode
<native | fallback ("@ast-grep/napi not installed — results approximate")>

### Partial Failures
<any manifest items that failed, with retry command>
```

---

## Dry-Run Report

Emit when `--dry-run` flag is active. Shows what would be created without executing.

```markdown
# imbas Pipeline — DRY RUN COMPLETE

## Run
- Run ID: <run-id>
- Project: <KEY>
- Source: <source>
- Mode: dry-run (no Jira issues created)

## Results

| Phase | Result | Details |
|-------|--------|---------|
| 1. Validate | <result> | <details> |
| 2. Split | Auto-approved | <N> Stories |
| 2.5. Manifest Stories | Preview | <N> Stories would be created |
| 3. Devplan | Auto-approved | <N> Tasks, <M> Subtasks |
| 3.5. Manifest Devplan | Preview | <execution plan summary> |

## Execution Preview

### Stories (would create)
| # | ID | Title | Type |
|---|----|-------|------|
| 1 | S1 | <title> | Story |

### Devplan (would create)
<execution_order steps with pending counts>

## To Execute
Remove --dry-run flag:
`/imbas:pipeline <source> --project <KEY> [--parent <KEY>]`
```

---

## Progress Report

Emit when `--stop-at` halts the pipeline at a specified phase. Not an error — intentional stop.

```markdown
# imbas Pipeline — STOPPED AT <phase-name>

## Run
- Run ID: <run-id>
- Project: <KEY>
- Source: <source>
- Stopped at: <phase-name> (--stop-at)

## Completed Phases
<table of completed phases with results>

## To Continue
Resume from the next phase using individual skills:
<exact commands for remaining phases>
```
