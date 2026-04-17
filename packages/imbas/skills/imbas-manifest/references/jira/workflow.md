# Manifest Execution Workflow — Jira Provider

This file is loaded by the manifest skill when `config.provider === 'jira'`.
Provider-agnostic preamble (manifest loading, dry-run preview, user confirmation,
result report) lives in `../workflow.md`. This file owns the Jira-specific
execution steps (Step 2.5 drift check, Step 4 batch execution).

## Step 2.5 — Drift Check (Jira-specific branch)

For manifests with existing `issue_ref` values (resume/re-run scenarios):

1. Collect all items where `status == "created"` (have `issue_ref`).
2. For each `issue_ref`, call `[OP: get_issue] issue_ref=<issue_ref>`.
3. Verify: issue exists, not deleted, `imbas-status` matches expectation.
4. Classify as MATCH / DRIFT_DELETED / DRIFT_STATE per the shared skeleton, then:
   - DRIFT_DELETED → offer to reset to pending.
   - DRIFT_STATE → offer to skip or proceed.
5. If any drift detected, display summary table and save reconciled manifest via
   `mcp_tools_manifest_save` before Step 3.
6. Skip entirely for fresh runs (no `issue_ref` anywhere).

## Step 4 — Batch Execution (Jira)

CRITICAL: after EACH item creation, immediately save the manifest with the
updated `imbas-status` / `issue_ref` via `mcp_tools_manifest_save`. This is the crash-recovery
invariant — re-runs skip already-created items.

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
  - Update link `imbas-status`:
    - `"created"`  — all targets succeeded
    - `"partial"`  — some succeeded, some failed
    - `"failed"`   — all failed
  - Save manifest immediately.

### Devplan type

Follow `execution_order` from manifest (dependency-ordered).

#### Step 1 — create_tasks
For each task in `manifest.tasks` where `status == "pending"`:
  1. `[OP: create_issue] project=KEY, type="Task", summary=<task.title>, description=<task.description>, labels=[<config.labels.managed>]`.
  2. Update task: `status = "created"`, `issue_ref = <returned key>`.
  3. Save manifest immediately.

#### Step 2 — create_task_subtasks
For each task, for each subtask in `task.subtasks` where `status == "pending"`:
  1. `[OP: create_issue] project=KEY, type="Sub-task", summary=<summary>, description=<description>, parent=<task.issue_ref>, labels=[<config.labels.managed>]`.
  2. Update subtask: `status = "created"`, `issue_ref = <returned key>`.
  3. Save manifest immediately.

#### Step 3 — create_links
For each task, for each `blocked_story_id` in `task.blocks`:
  1. Resolve `story_id` to `issue_ref` from `stories-manifest.json`.
  2. `[OP: create_link] type="Blocks", inward=<task.issue_ref>, outward=<story_issue_ref>`.
  3. Save manifest immediately.

#### Step 4 — create_story_subtasks
For each entry in `manifest.story_subtasks`, for each subtask in `entry.subtasks`
where `status == "pending"`:
  1. `[OP: create_issue] project=KEY, type="Sub-task", summary=<summary>, description=<description>, parent=<entry.story_key>, labels=[<config.labels.managed>]`.
  2. Update subtask: `status = "created"`, `issue_ref = <returned key>`.
  3. Save manifest immediately.

#### Step 5 — add_feedback_comments
For each comment in `manifest.feedback_comments` where `status == "pending"`:
  1. `[OP: add_comment] issue_ref=<comment.target_ref>, body=<comment.comment>`.
  2. Update comment: `status = "created"`.
  3. Save manifest immediately.

IDEMPOTENCY: for every item, check `imbas-status` and `issue_ref` before creating.
If `issue_ref` already exists → skip. Re-execution is safe after partial failure.

## Step 6 — Post-Execution Label Transitions

After all items in Step 4 are created successfully, apply lifecycle labels.
See `../label-transitions.md` for the full transition table and idempotency rules.

### Stories type (Phase 2.5)

1. Load run state via `mcp_tools_run_get`.
2. Load label config via `mcp_tools_config_get` with field `"labels"`.
3. For each created `issue_ref` in manifest (stories + epic):
   - If `split.pending_review === true`:
     `[OP: editJiraIssue] issue_ref=<ref>`, add `<config.labels.review_pending>` to labels.
   - If `split.pending_review === false`:
     `[OP: editJiraIssue] issue_ref=<ref>`, add `<config.labels.review_complete>` to labels.

### Devplan type (Phase 3.5)

1. Load label config via `mcp_tools_config_get` with field `"labels"`.
2. Collect all parent story `issue_ref`s from `stories-manifest.json`.
3. For each parent story `issue_ref`:
   a. `[OP: editJiraIssue] issue_ref=<ref>`, remove `<config.labels.review_complete>`, add `<config.labels.dev_waiting>`.
   b. `[OP: transitionJiraIssue] issue_ref=<ref>, transition=<config.jira.workflow_states[config.jira.phase_to_workflow.pipeline_exit]>`
      - On failure (HTTP 400/403/404):
        Log: `"WARNING: Jira transition to '<status>' failed for <ref>: <error>. Label '<dev_waiting>' was applied. Transition may require manual action."`
        Continue pipeline — do NOT block. (AC16)
