# Manifest Execution Workflow — Jira Provider

This file is loaded by the manifest skill when `config.provider === 'jira'`. Provider-agnostic preamble (manifest loading, dry-run preview, user confirmation, result report) lives in `../workflow.md`. This file owns the Jira-specific execution steps (Step 2.5 drift check, Step 4 batch execution).

## Step 2.5 — Drift Check (Jira-specific branch)

For manifests with existing `issue_ref` values (resume/re-run scenarios):

1. Collect all items where `status == "created"` (have `issue_ref`).
2. For each `issue_ref`, call `[OP: get_issue] issue_ref=<issue_ref>`.
3. Verify: issue exists, not deleted, `status` matches expectation.
4. Classify as MATCH / DRIFT_DELETED / DRIFT_STATE per the shared skeleton, then:
   - DRIFT_DELETED → offer to reset to pending.
   - DRIFT_STATE → offer to skip or proceed.
5. If any drift detected, display summary table and save reconciled manifest via `mcp__plugin_imbas_tools__manifest_save` before Step 3.
6. Skip entirely for fresh runs (no `issue_ref` anywhere).

## Step 4 — Batch Execution (Jira)

CRITICAL: after EACH item creation, immediately save the manifest with the updated `status` / `issue_ref` via `mcp__plugin_imbas_tools__manifest_save`. This is the crash-recovery invariant — re-runs skip already-created items.

### Stories type

Execution order is fixed:

#### Phase 4a — Epic Creation (if needed)

- If manifest has `epic_ref == null` and an Epic entry exists:
  1. Call `[OP: create_issue] project=KEY, type="Epic", summary=<summary>, description=<description>, labels=[<config.labels.managed>]`.
  2. Store returned ref in manifest `epic_ref`.
  3. Save manifest immediately.

#### Phase 4b — Story Creation

For each story in `manifest.stories` where `status == "pending"`:

1. Call `[OP: create_issue] project=KEY, type="Story", summary=<story.title>, description=<story.description>, parent=<epic_ref>, labels=[<config.labels.managed>]`.
2. Update story: `status = "created"`, `issue_ref = <returned key>`.
3. Save manifest immediately.

#### Phase 4c — Link Creation (1:N expansion)

For each link in `manifest.links` where `status == "pending"`:

- Resolve `from` ID to `issue_ref` (lookup in stories array).
- For EACH target in `link.to`:
  1. Resolve target ID to `issue_ref`.
  2. Call `[OP: create_link] type=<link.type>, inward=<resolve(link.from)>, outward=<resolve(target)>`.
- Update link `status`:
  - `"created"` — all targets succeeded
  - `"partial"` — some succeeded, some failed
  - `"failed"` — all failed
- Save manifest immediately.

#### Phase 4d — Source Issue Transitions

For each transition in `manifest.transitions` where `status == "pending"`:

1. Resolve `issue_ref`:
   - If it matches a manifest Story ID → lookup `issue_ref` from stories array.
   - If it is already an external ref (e.g., source_issue_ref) → use directly.
2. `[OP: get_issue] issue_ref=<resolved_ref>` → check current status.
   - If already at `target_status` → set transition `status = "skipped"`, save manifest immediately. Continue to next.
3. `[OP: get_transitions] issue_ref=<resolved_ref>` → find transition ID matching `target_status`.
   - If no matching transition available → set transition `status = "failed"`, log warning: "Cannot transition <ref> to <target_status>: no available transition. Manual action may be required." Save manifest immediately. Continue to next (do NOT block pipeline).
4. `[OP: transition_issue] issue_ref=<resolved_ref>, transition.id=<matched_id>`.
   - On failure → set transition `status = "failed"`, log warning. Save manifest immediately. Continue to next (do NOT block pipeline).
5. Set transition `status = "created"`. Save manifest immediately.

## Step 6 — Post-Execution Label Transitions

After all items in Step 4 are created successfully, apply lifecycle labels. See `../label-transitions.md` for the full transition table and idempotency rules.

### Stories type

1. Load run state via `mcp__plugin_imbas_tools__run_get`.
2. Load label config via `mcp__plugin_imbas_tools__config_get` with field `"labels"`.
3. For each created `issue_ref` in manifest (stories + epic):
   - If `split.pending_review === true`: `[OP: edit_issue] issue_ref=<ref>`, add `<config.labels.review_pending>` to labels.
   - If `split.pending_review === false`: `[OP: edit_issue] issue_ref=<ref>`, add `<config.labels.review_complete>` to labels.
