# Manifest Execution Workflow

## Preconditions

Before loading the manifest, verify pipeline state:

```
1. Call run_get to read current state
2. For type "stories":
   - Verify (split.status === "completed" AND split.pending_review === false) OR (split.status === "escaped" AND split.escape_code === "E2-3")
   - Error if not met: "Cannot execute stories manifest: split phase not completed or pending review"
3. For type "devplan":
   - Verify devplan.status === "completed" AND devplan.pending_review === false
   - Error if not met: "Cannot execute devplan manifest: devplan phase not completed or pending review"
```

## Step 1 — Load Manifest & Pending Count

1. Determine run: --run argument or most recent run via run_get.
2. Load manifest based on type:
   - "stories" → call manifest_get(project_ref, run_id, type: "stories")
   - "devplan" → call manifest_get(project_ref, run_id, type: "devplan")
3. Calculate pending items:
   - Count items where status == "pending" (no issue_ref)
   - Items with existing issue_ref are SKIPPED (idempotency)
4. If pending count == 0:
   Display: "All items already created. Nothing to execute."
   → Exit.

## Step 2 — Dry-Run Mode (when --dry-run is specified)

For "stories" type:
  Display planned actions:
  1. Epic creation (if manifest has epic entry without issue_ref)
  2. Story creation (list: id, title, type)
  3. Link creation (list: type, from → to)
  → Exit after display.

For "devplan" type:
  Call manifest_plan(project_ref, run_id) for execution plan.
  Display each step:
  1. Tasks to create (id, title)
  2. Task Subtasks to create (id, title, parent task)
  3. Links to create (type, from → to)
  4. Story Subtasks to create (id, title, parent story)
  5. Feedback comments to post (target story, type)
  → Exit after display.

## Step 2.5 — Drift Check (State Reconciliation)

  For manifests with existing issue_ref values (resume/re-run scenarios):
  1. Collect all items where status == "created" (have issue_ref).
  2. For each issue_ref, verify remote state:

     [jira] provider:
       - Call getJiraIssue(issue_ref) for each created item.
       - Check: issue exists, not deleted, status matches expectation.

     [github] provider:
       - Run: gh issue view <number> --repo <repo> --json state,labels
       - Check: issue exists, not deleted, labels intact.

  3. Classify results:
     - MATCH: Remote state consistent with manifest → proceed normally.
     - DRIFT_DELETED: issue_ref exists in manifest but issue deleted remotely
       → WARN user: "Issue <ref> was deleted externally. Reset to pending? [y/N]"
       → If yes: clear issue_ref, set status = "pending" (will be re-created)
       → If no: skip item, mark status = "skipped"
     - DRIFT_STATE: issue exists but in unexpected state (e.g., already Done)
       → WARN user: "Issue <ref> is already in '<state>' state. Skip? [y/N]"
       → If yes: mark status = "skipped"
       → If no: proceed with planned action

  4. If any DRIFT detected:
     - Display drift summary table before proceeding to Step 3.
     - Save reconciled manifest via manifest_save.

  5. If no items have issue_ref (fresh run): skip this step entirely.

## Step 3 — User Confirmation

Display execution summary:
- Type: stories | devplan
- Project: <KEY>
- Run: <run-id>
- Items to create: <pending count>
- Items to skip (already created): <skip count>

Ask: "Proceed with Jira issue creation? (y/n)"
- "n" → exit without changes.
- "y" → proceed to Step 4.

## Step 4 — Batch Execution

CRITICAL: After EACH item creation, immediately save the manifest
with updated status/issue_ref via manifest_save. This enables
crash recovery — re-running skips already-created items.

### For "stories" type

Execution order (fixed):

#### Phase 4a — Epic Creation (if needed)
- If manifest has epic_ref == null and Epic entry exists:
  1. Call Atlassian MCP: createJiraIssue(project: KEY, type: "Epic", summary, description)
  2. Store returned issue_ref in manifest epic_ref
  3. Save manifest immediately

#### Phase 4b — Story Creation
For each story in manifest.stories where status == "pending":
  1. Call Atlassian MCP: createJiraIssue(
       project: KEY,
       type: "Story",
       summary: story.title,
       description: story.description,
       parent: epic_ref (if available)
     )
  2. Update story: status = "created", issue_ref = <returned key>
  3. Save manifest immediately

#### Phase 4c — Link Creation (1:N Expansion)
For each link in manifest.links where status == "pending":
  - Resolve "from" ID to issue_ref (lookup in stories array)
  - For EACH target in link.to array (1:N expansion):
    1. Resolve target ID to issue_ref
    2. Call Atlassian MCP: createIssueLink(
         type: link.type,
         inwardIssue: resolve(link.from),
         outwardIssue: resolve(target)
       )
  - Update link: status = "created"
  - Save manifest immediately

#### Partial Failure Handling (1:N Links)

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

### For "devplan" type

Follow execution_order from manifest (dependency-ordered):

#### Step 1 — create_tasks
For each task in manifest.tasks where status == "pending":
  1. Call Atlassian MCP: createJiraIssue(
       project: KEY,
       type: "Task",
       summary: task.title,
       description: task.description
     )
  2. Update task: status = "created", issue_ref = <returned key>
  3. Save manifest immediately

#### Step 2 — create_task_subtasks
For each task in manifest.tasks:
  For each subtask in task.subtasks where status == "pending":
    1. Call Atlassian MCP: createJiraIssue(
         project: KEY,
         type: "Sub-task",
         summary: subtask.title,
         description: subtask.description,
         parent: task.issue_ref
       )
    2. Update subtask: status = "created", issue_ref = <returned key>
    3. Save manifest immediately

#### Step 3 — create_links
For each task in manifest.tasks:
  For each blocked_story_id in task.blocks:
    1. Resolve story_id to issue_ref from stories-manifest.json
    2. Call Atlassian MCP: createIssueLink(
         type: "Blocks",
         inwardIssue: task.issue_ref,
         outwardIssue: story_issue_ref
       )
Save manifest after all links created

#### Step 4 — create_story_subtasks
For each entry in manifest.story_subtasks:
  For each subtask in entry.subtasks where status == "pending":
    1. Call Atlassian MCP: createJiraIssue(
         project: KEY,
         type: "Sub-task",
         summary: subtask.title,
         description: subtask.description,
         parent: entry.story_key
       )
    2. Update subtask: status = "created", issue_ref = <returned key>
    3. Save manifest immediately

#### Step 5 — add_feedback_comments
For each comment in manifest.feedback_comments where status == "pending":
  1. Call Atlassian MCP: addCommentToJiraIssue(
       issueIdOrKey: comment.target_ref,
       body: comment.comment
     )
  2. Update comment: status = "created"
  3. Save manifest immediately

IDEMPOTENCY: For every item, check status and issue_ref before creating.
If issue_ref already exists → skip. This makes re-execution safe after
partial failures.

## Step 5 — Result Report

Display execution results:
- Total items processed: <count>
- Successfully created: <count>
- Skipped (already existed): <count>
- Failed: <count>

If failures exist:
- List failed items with error details
- Display: "Re-run /imbas:manifest <type> --run <run-id> to retry failed items."

If all succeeded:
- For stories: "All Stories created in Jira. Proceed to /imbas:devplan for Phase 3."
- For devplan: "All Tasks, Subtasks, and links created. Pipeline complete."
