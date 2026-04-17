# Manifest Execution Workflow — Local Provider

This file is loaded by the manifest skill when `config.provider === 'local'`.
Provider-agnostic preamble (manifest loading, dry-run preview, user confirmation,
result report) lives in `../workflow.md`. This file owns the local-specific
execution steps.

## Storage target

All created entities live under:

```
.imbas/<PROJECT-KEY>/issues/
├── stories/   → S-<N>.md
├── tasks/     → T-<N>.md
└── subtasks/  → ST-<N>.md
```

`<PROJECT-KEY>` comes from `config.defaults.project_ref`; fallback `LOCAL`.
Directory is the source of truth. No `.counter.json` or auxiliary state file.

For ID allocation rules see `id-allocation.md`.
For frontmatter schema and body layout see `file-format.md`.
For link handling (both sides of a link record each other) see `link-handling.md`.

## Step 2.5 — Drift Check (Local branch)

Local files cannot drift out of band the way Jira issues can, but files may be
manually deleted or renamed by the user. For each item where `status == "created"`
and `issue_ref` is non-null:

1. Compute expected path from the ID prefix:
   - `S-*` → `.imbas/<KEY>/issues/stories/<ID>.md`
   - `T-*` → `.imbas/<KEY>/issues/tasks/<ID>.md`
   - `ST-*` → `.imbas/<KEY>/issues/subtasks/<ID>.md`
2. `Glob` the expected path.
3. Classify:
   - MATCH: file exists → proceed.
   - DRIFT_DELETED: file missing → WARN "Local issue `<ID>` was deleted. Reset to pending? [y/N]"
     - Yes → clear `issue_ref`, set `status = "pending"`.
     - No → mark `status = "skipped"`.
4. If any drift detected, display summary table and save reconciled manifest via
   `mcp_tools_manifest_save` before Step 3.
5. Skip entirely for fresh runs (no `issue_ref` anywhere).

## Step 4 — Batch Execution (Local)

CRITICAL invariant: **allocate-then-write per item.** Never pre-compute all IDs
before any file is written. For every item:
  1. `Glob .imbas/<KEY>/issues/<type>/*.md` to find the current max N.
  2. Derive next ID = `<PREFIX>-(max+1)`.
  3. `Write` the file immediately with full frontmatter + `## Description` body
     + empty `## Digest` section (see `file-format.md`).
  4. Update manifest item: `status = "created"`, `issue_ref = <ID>`.
  5. `mcp_tools_manifest_save` immediately.

This ensures crash recovery leaves no orphan IDs. A mid-batch kill means the
next run's Glob will pick up from the highest written file.

### Stories type

#### Phase 4a — Epic (frontmatter field, not a separate file)
Local provider does NOT create a separate Epic file. Epic identity is recorded
in each Story's frontmatter `epic:` field. If the manifest has an epic entry:
  - Record the epic name/ref as a string (e.g. `auth-rewrite`).
  - Apply to every story created in Phase 4b via `epic: <ref>`.
  - Mark manifest `epic_ref = <ref>` for idempotency.

#### Phase 4b — Story Creation
For each story in `manifest.stories` where `status == "pending"`:
  1. Allocate next `S-<N>`.
  2. `Write .imbas/<KEY>/issues/stories/S-<N>.md` per `file-format.md`:
     - `type: Story`
     - `title: story.title`
     - `status: To Do`
     - `epic: <epic_ref or null>`
     - `verification`, `size_check`, `split_from`, `split_into` fields from manifest.
     - `## Description` body from `story.description`.
     - Empty `## Digest` section.
  3. Update story: `status = "created"`, `issue_ref = "S-<N>"`.
  4. `mcp_tools_manifest_save` immediately.

#### Phase 4c — Link Creation (bidirectional)
See `link-handling.md`. For each link in `manifest.links` where `status == "pending"`:
  - Resolve `from` ID to its file path.
  - For EACH target in `link.to`:
    1. Resolve target ID to its file path.
    2. `Edit` the source file's frontmatter `links[]` to append
       `{type: link.type, to: <target>}`.
    3. `Edit` the target file's frontmatter `links[]` to append the reverse
       (e.g. `blocks` → `is blocked by`).
  - Update link status per the 1:N rules (`created` / `partial` / `failed`).
  - Save manifest immediately.

#### Phase 4d — Source Issue Transitions
For each transition in `manifest.transitions` where `status == "pending"`:
  1. Resolve `issue_ref`:
     - If it matches a manifest Story ID → lookup `issue_ref` from stories array.
     - If it is already an external ref → resolve to file path via ID prefix.
  2. `Read` the target file, parse frontmatter `status`.
     - If `status` already equals `transition.target_status` → set transition `status = "skipped"`, save manifest immediately. Continue to next.
  3. `Edit` the target file frontmatter: `status: <transition.target_status>`.
     - On failure → set transition `status = "failed"`, log warning. Save manifest immediately. Continue to next (do NOT block pipeline).
  4. Set transition `status = "created"`. Save manifest immediately.

### Devplan type

Follow `execution_order` from manifest (dependency-ordered).

#### Step 1 — create_tasks
For each task in `manifest.tasks` where `status == "pending"`:
  1. Allocate next `T-<N>`.
  2. `Write .imbas/<KEY>/issues/tasks/T-<N>.md`:
     - `type: Task`
     - `title`, `description`
     - `links[]` initially empty (blocks relations recorded in Step 3).
  3. Update task: `status = "created"`, `issue_ref = "T-<N>"`.
  4. `mcp_tools_manifest_save` immediately.

#### Step 2 — create_task_subtasks
For each task, for each subtask in `task.subtasks` where `status == "pending"`:
  1. Allocate next `ST-<N>`.
  2. `Write .imbas/<KEY>/issues/subtasks/ST-<N>.md`:
     - `type: Subtask`
     - `parent: task.issue_ref` (the `T-<N>` allocated in Step 1).
  3. Update subtask: `status = "created"`, `issue_ref = "ST-<N>"`.
  4. `mcp_tools_manifest_save` immediately.

#### Step 3 — create_links (task.blocks relations)
For each task, for each `blocked_story_id` in `task.blocks`:
  1. Resolve `story_id` to `S-<N>` from `stories-manifest.json`.
  2. `Edit` the task file to append `{type: blocks, to: S-<N>}` to `links[]`.
  3. `Edit` the story file to append `{type: is blocked by, to: T-<N>}` to `links[]`.
  4. `mcp_tools_manifest_save` immediately.

#### Step 4 — create_story_subtasks
For each entry in `manifest.story_subtasks`, for each subtask where `status == "pending"`:
  1. Allocate next `ST-<N>`.
  2. `Write .imbas/<KEY>/issues/subtasks/ST-<N>.md` with `parent: entry.story_key`.
  3. Update subtask: `status = "created"`, `issue_ref = "ST-<N>"`.
  4. `mcp_tools_manifest_save` immediately.

#### Step 5 — add_feedback_comments
For each comment in `manifest.feedback_comments` where `status == "pending"`:
  1. Resolve `target_ref` to the file path.
  2. `Edit` the file's `## Digest` section, appending the comment body (do NOT
     replace the section). Format:
     ```
     ### <timestamp>
     <comment body>
     ```
  3. Update comment: `status = "created"`.
  4. `mcp_tools_manifest_save` immediately.

IDEMPOTENCY: for every item, check `imbas-status` and `issue_ref` before writing.
If `issue_ref` already exists, re-verify the file exists (Glob) and skip.
Re-execution is safe after partial failure.
