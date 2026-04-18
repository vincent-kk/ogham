# imbas-implement-plan

Generate a DAG-based implementation schedule that groups Stories and cross-story
Tasks into parallel batches with explicit ordering, e.g. `[S1,S2,S5] -> [T1,S3] -> [S4,S6,S7]`.

## What it does

1. Loads `stories-manifest.json` (and optionally `devplan-manifest.json`).
2. Builds a dependency DAG from:
   - `StoryLink` with type `blocks` / `is-blocked-by`
   - `TaskItem.blocks` (cross-story Tasks pointing at Stories/Tasks)
3. Assigns topological levels via Kahn's algorithm; breaks cycles deterministically.
4. Chunks each level into groups (optionally capped by `--max-parallel`).
5. Saves:
   - `.imbas/<KEY>/runs/<run-id>/implement-plan.json`
   - `.imbas/<KEY>/runs/<run-id>/implement-plan-report.md`

## Typical usage

```bash
# Standard usage after Phase 3.5
/imbas:imbas-implement-plan

# Target a specific run with parallelism cap
/imbas:imbas-implement-plan --run 2026-04-18T12-00-00 --max-parallel 3

# Degraded stories-only mode (before devplan)
/imbas:imbas-implement-plan --source stories
```

## Precision by source

| Source | Available signals | Accuracy |
|---|---|---|
| `stories` | StoryLink blocks/is-blocked-by | Low — degraded |
| `devplan` | StoryLink + Task.blocks + cross-story Task extraction | High |

The default is `devplan`.

## Limitations

- Subtasks are not scheduled (they belong to parent Stories).
- Tickets without `issue_ref` are still scheduled; re-run after issue creation to get full references in the report.
