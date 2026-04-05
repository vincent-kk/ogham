# Manifest Execution Workflow — GitHub Provider

This file is loaded by the manifest skill when `config.provider === 'github'`.
Provider-agnostic preamble (manifest loading, dry-run preview, user confirmation,
result report) lives in `../workflow.md`. This file owns the GitHub-specific
execution steps: label bootstrap, drift check, and batch execution.

## Step 0 — Label Bootstrap

Before any `gh issue create` call, verify the required labels exist.

1. Run `gh label list --repo <owner/repo> --json name` and parse the name array.
2. Compute missing labels: diff against the required set:
   - `type:epic`, `type:story`, `type:task`, `type:subtask`
   - `status:todo`, `status:ready-for-dev`, `status:in-progress`, `status:in-review`, `status:done`
   - Any entries in `config.github.defaultLabels`
3. For each missing label:
   ```bash
   gh label create <name> --repo <owner/repo> --color <rrggbb>
   ```
   Suggested colors: `type:*` → `0075ca`, `status:*` → `e4e669`.
4. **Fail-fast on 403**: if `gh label create` exits non-zero with "HTTP 403"
   or "resource not accessible":
   - Emit: `"gh label create failed: insufficient scopes. Run 'gh auth refresh -s repo' and retry."`
   - Call `run_transition` → `blocked` state.
   - STOP. Do NOT proceed to `gh issue create`.
   See `label-bootstrap.md` for full protocol and `errors.md` for error taxonomy.

## Step 2.5 — Drift Check (GitHub branch)

For manifests with existing `issue_ref` values (resume/re-run scenarios):

1. Collect all items where `status == "created"` (have `issue_ref`).
2. Parse `owner/repo#N` from each `issue_ref`.
3. For each issue:
   ```bash
   gh issue view <N> --repo <owner/repo> --json state,labels,title
   ```
4. Classify:
   - MATCH: issue exists, `state` open, expected `type:*` label present → proceed.
   - DRIFT_DELETED: command exits 404/410 → WARN "Issue `<ref>` deleted externally."
     Offer to reset `status` to pending for re-creation, or skip.
   - DRIFT_STATE: closed unexpectedly → WARN "Issue `<ref>` is closed — expected open."
     Offer to skip or proceed.
5. If any drift detected, display summary table and save reconciled manifest via
   `manifest_save` before Step 3.
6. Skip entirely for fresh runs (no `issue_ref` anywhere).

## Step 4 — Batch Execution (GitHub)

CRITICAL: after EACH item creation, immediately save the manifest with the
updated `status` / `issue_ref` via `manifest_save`. Crash-recovery invariant.

`issue_ref` format is always `owner/repo#<number>` (§1.3).

### Stories type

#### Phase 4a — Epic Creation (if needed)

If manifest has `epic_ref == null` and an Epic entry exists:
1. ```bash
   gh issue create --repo <owner/repo> \
     --title "[Epic] <title>" \
     --body "<description>\n\n## Sub-tasks\n\n## Links" \
     --label type:epic --label status:todo
   ```
2. Parse returned issue URL to extract number. Store `owner/repo#<N>` in `epic_ref`.
3. `manifest_save` immediately.

#### Phase 4b — Story Creation

For each story in `manifest.stories` where `status == "pending"`:
1. ```bash
   gh issue create --repo <owner/repo> \
     --title "[Story] <title>" \
     --body "<description>\n\n## Sub-tasks\n\n## Links" \
     --label type:story --label status:todo
   ```
2. If epic exists, update epic body to append `- [ ] <story_ref>` under `## Sub-tasks`
   via `gh api` PATCH (see `link-handling.md` §Task-list maintenance).
3. Update story: `status = "created"`, `issue_ref = "owner/repo#<N>"`.
4. `manifest_save` immediately.

#### Phase 4c — Link Creation

For each link in `manifest.links` where `status == "pending"`:
- Resolve `from` ID to `issue_ref`.
- For EACH target in `link.to`:
  1. Resolve target ID to `issue_ref`.
  2. Write `## Links` section on source issue via `gh api` PATCH
     appending `- <linkType>: <target_ref>`.
  3. Write reverse entry on target issue (see `link-handling.md` §Mapping table).
- Update link `status`: `created` / `partial` / `failed`.
- `manifest_save` immediately.

See `link-handling.md` for the full `## Links` grammar and bidirectional write protocol.

### Devplan type

Follow `execution_order` from manifest (dependency-ordered).

#### Step 1 — create_tasks

For each task in `manifest.tasks` where `status == "pending"`:
1. ```bash
   gh issue create --repo <owner/repo> \
     --title "[Task] <title>" \
     --body "<description>\n\n## Sub-tasks\n\n## Links" \
     --label type:task --label status:todo
   ```
2. Update task: `status = "created"`, `issue_ref = "owner/repo#<N>"`.
3. `manifest_save` immediately.

#### Step 2 — create_task_subtasks

For each task, for each subtask where `status == "pending"`:
1. ```bash
   gh issue create --repo <owner/repo> \
     --title "[Subtask] <title>" \
     --body "<description>\n\n## Links" \
     --label type:subtask --label status:todo
   ```
2. PATCH parent task body to append `- [ ] <subtask_ref>` under `## Sub-tasks`.
3. Update subtask: `status = "created"`, `issue_ref = "owner/repo#<N>"`.
4. `manifest_save` immediately.

#### Step 3 — create_links (task.blocks relations)

For each task, for each `blocked_story_id` in `task.blocks`:
1. Resolve story `issue_ref` from `stories-manifest.json`.
2. PATCH task body `## Links`: append `- blocks: <story_ref>`.
3. PATCH story body `## Links`: append `- blocked-by: <task_ref>`.
Save manifest after all links created.

#### Step 4 — create_story_subtasks

For each entry in `manifest.story_subtasks`, for each subtask where `status == "pending"`:
1. `gh issue create` with `type:subtask` label, parent ref in body.
2. PATCH parent story body `## Sub-tasks`: append `- [ ] <subtask_ref>`.
3. Update subtask: `status = "created"`, `issue_ref = "owner/repo#<N>"`.
4. `manifest_save` immediately.

#### Step 5 — add_feedback_comments

For each comment in `manifest.feedback_comments` where `status == "pending"`:
1. Parse `owner/repo#N` from `target_ref`.
2. ```bash
   echo "<comment body>" | gh issue comment <N> --repo <owner/repo> --body-file -
   ```
3. Update comment: `status = "created"`.
4. `manifest_save` immediately.

IDEMPOTENCY: check `status` and `issue_ref` before creating. If `issue_ref`
already exists → run drift check and skip if confirmed present.

<!-- phase-3: insert jira snippet here -->
