# Manifest Execution Workflow — Provider-agnostic skeleton

This file contains the shared steps that run identically for every provider.
Provider-specific execution (Step 2.5 drift check and Step 4 batch execution)
lives in `jira/workflow.md`, `github/workflow.md`, or `local/workflow.md`, selected by `config.provider`.

## Preconditions

Before loading the manifest, verify pipeline state:

```
1. Call mcp_tools_run_get to read current state
2. For type "stories":
   - Verify (split.status === "completed" AND split.pending_review === false) OR (split.status === "escaped" AND split.escape_code === "E2-3")
   - Error if not met: "Cannot execute stories manifest: split phase not completed or pending review"
3. For type "devplan":
   - Verify devplan.status === "completed" AND devplan.pending_review === false
   - Error if not met: "Cannot execute devplan manifest: devplan phase not completed or pending review"
```

## Step 1 — Load Manifest & Pending Count

1. Determine run: `--run` argument or most recent run via `mcp_tools_run_get`.
2. Load manifest based on type:
   - `stories` → `mcp_tools_manifest_get(project_ref, run_id, type: "stories")`
   - `devplan` → `mcp_tools_manifest_get(project_ref, run_id, type: "devplan")`
3. Calculate pending items:
   - Count items where `status == "pending"` (no `issue_ref`).
   - Items with existing `issue_ref` are SKIPPED (idempotency).
4. If pending count == 0:
   Display: "All items already created. Nothing to execute."
   → Exit.

## Step 2 — Dry-Run Mode (when `--dry-run` is specified)

For `stories` type:
  Display planned actions:
  1. Epic creation (if manifest has epic entry without `issue_ref`)
  2. Story creation (list: id, title, type)
  3. Link creation (list: type, from → to)
  → Exit after display.

For `devplan` type:
  Call `mcp_tools_manifest_plan(project_ref, run_id)` for execution plan.
  Display each step:
  1. Tasks to create (id, title)
  2. Task Subtasks to create (id, title, parent task)
  3. Links to create (type, from → to)
  4. Story Subtasks to create (id, title, parent story)
  5. Feedback comments to post (target story, type)
  → Exit after display.

## Step 2.5 — Drift Check (State Reconciliation) — provider-specific

Provider routing:
- `jira`    → `jira/workflow.md` Step 2.5
- `github`  → `github/workflow.md` Step 2.5
- `local`   → `local/workflow.md` Step 2.5

Both branches must return one of:
- MATCH: remote state consistent → proceed.
- DRIFT_DELETED: entity missing on the provider → offer reset to `pending` or skip.
- DRIFT_STATE (jira only): entity in unexpected status → offer skip or proceed.

After the provider branch runs, if any DRIFT was detected:
  - Display drift summary table.
  - Save reconciled manifest via `mcp_tools_manifest_save` before Step 3.
  - Skip this step entirely for fresh runs (no `issue_ref` anywhere).

## Step 3 — User Confirmation

Display execution summary:
- Type: stories | devplan
- Project: `<KEY>`
- Run: `<run-id>`
- Items to create: `<pending count>`
- Items to skip (already created): `<skip count>`

Ask: "Proceed with issue creation? (y/n)"
- `n` → exit without changes.
- `y` → proceed to Step 4.

## Step 4 — Batch Execution — provider-specific

Provider routing:
- `jira`   → `jira/workflow.md` Step 4 (Phases 4a/4b/4c for stories; Steps 1-5 for devplan)
- `github` → `github/workflow.md` Step 4 (label-based issue creation via gh CLI)
- `local`  → `local/workflow.md` Step 4 (same structure, file-based)

Both branches must honor:
- **Per-item save**: after EACH item, immediately `mcp_tools_manifest_save` so re-runs
  resume cleanly.
- **Idempotency**: check `imbas-status` and `issue_ref` before acting; skip if
  `issue_ref` already set.

### Partial Failure Handling (1:N Links)

When a link has multiple targets (`to` is an array) and some targets fail:

```
1. Track per-target status: each target in the to array is processed independently
2. Successfully created links are NOT rolled back
3. Failed targets are marked "failed" with error details
4. Link item status:
   - "created"  — all targets succeeded
   - "partial"  — some targets succeeded, some failed
   - "failed"   — all targets failed
5. On re-run (imbas:manifest re-execution), only retry targets without issue_ref confirmation
```

## Step 5 — Result Report

Display execution results:
- Total items processed: `<count>`
- Successfully created: `<count>`
- Skipped (already existed): `<count>`
- Failed: `<count>`

If failures exist:
- List failed items with error details.
- Display: "Re-run `/imbas:imbas-manifest <type> --run <run-id>` to retry failed items."

If all succeeded:
- For stories: "All Stories created. Proceed to `/imbas:imbas-devplan` for Phase 3."
- For devplan: "All Tasks, Subtasks, and links created. Pipeline complete."
