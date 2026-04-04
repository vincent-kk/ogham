---
name: imbas-manifest
user_invocable: true
description: >
  Execute a stories-manifest or devplan-manifest to batch-create Jira issues.
  Supports dry-run, resume from failure, and selective execution.
  Trigger: "execute manifest", "매니페스트 실행", "jira 생성"
version: "1.0.0"
complexity: moderate
plugin: imbas
---

# imbas-manifest — Manifest Execution (Jira Batch Creation)

Executes a stories-manifest or devplan-manifest to batch-create Jira issues,
links, and comments. Supports dry-run preview, crash recovery via per-item save,
and idempotent re-execution.

## When to Use This Skill

- After Phase 2 (split) to create Stories in Jira
- After Phase 3 (devplan) to create Tasks, Subtasks, links, and feedback comments
- To resume a partially failed batch execution
- To preview what will be created (dry-run)

## Arguments

```
/imbas:manifest <type> [--run <run-id>] [--dry-run]

<type>    : "stories" | "devplan"
--run     : Run ID (if omitted, uses most recent eligible run)
--dry-run : Preview execution plan without creating any Jira issues
```

## Workflow

```
Step 1 — Load Manifest & Pending Count
  1. Determine run: --run argument or most recent run via imbas_run_get.
  2. Load manifest based on type:
     - "stories" → call imbas_manifest_get(project_key, run_id, type: "stories")
     - "devplan" → call imbas_manifest_get(project_key, run_id, type: "devplan")
  3. Calculate pending items:
     - Count items where status == "pending" (no jira_key)
     - Items with existing jira_key are SKIPPED (idempotency)
  4. If pending count == 0:
     Display: "All items already created. Nothing to execute."
     → Exit.

Step 2 — Dry-Run Mode (when --dry-run is specified)
  For "stories" type:
    Display planned actions:
    1. Epic creation (if manifest has epic entry without jira_key)
    2. Story creation (list: id, title, type)
    3. Link creation (list: type, from → to)
    → Exit after display.

  For "devplan" type:
    Call imbas_manifest_plan(project_key, run_id) for execution plan.
    Display each step:
    1. Tasks to create (id, title)
    2. Task Subtasks to create (id, title, parent task)
    3. Links to create (type, from → to)
    4. Story Subtasks to create (id, title, parent story)
    5. Feedback comments to post (target story, type)
    → Exit after display.

Step 3 — User Confirmation
  Display execution summary:
  - Type: stories | devplan
  - Project: <KEY>
  - Run: <run-id>
  - Items to create: <pending count>
  - Items to skip (already created): <skip count>

  Ask: "Proceed with Jira issue creation? (y/n)"
  - "n" → exit without changes.
  - "y" → proceed to Step 4.

Step 4 — Batch Execution
  CRITICAL: After EACH item creation, immediately save the manifest
  with updated status/jira_key via imbas_manifest_save. This enables
  crash recovery — re-running skips already-created items.

  === For "stories" type ===
  Execution order (fixed):

  Phase 4a — Epic Creation (if needed)
    - If manifest has epic_key == null and Epic entry exists:
      1. Call Atlassian MCP: createJiraIssue(project: KEY, type: "Epic", summary, description)
      2. Store returned jira_key in manifest epic_key
      3. Save manifest immediately

  Phase 4b — Story Creation
    For each story in manifest.stories where status == "pending":
      1. Call Atlassian MCP: createJiraIssue(
           project: KEY,
           type: "Story",
           summary: story.title,
           description: story.description,
           parent: epic_key (if available)
         )
      2. Update story: status = "created", jira_key = <returned key>
      3. Save manifest immediately

  Phase 4c — Link Creation (1:N Expansion)
    For each link in manifest.links where status == "pending":
      - Resolve "from" ID to jira_key (lookup in stories array)
      - For EACH target in link.to array (1:N expansion):
        1. Resolve target ID to jira_key
        2. Call Atlassian MCP: createIssueLink(
             type: link.type,
             inwardIssue: resolve(link.from),
             outwardIssue: resolve(target)
           )
      - Update link: status = "created"
      - Save manifest immediately

  === For "devplan" type ===
  Follow execution_order from manifest (dependency-ordered):

  Step 1 — create_tasks
    For each task in manifest.tasks where status == "pending":
      1. Call Atlassian MCP: createJiraIssue(
           project: KEY,
           type: "Task",
           summary: task.title,
           description: task.description
         )
      2. Update task: status = "created", jira_key = <returned key>
      3. Save manifest immediately

  Step 2 — create_task_subtasks
    For each task in manifest.tasks:
      For each subtask in task.subtasks where status == "pending":
        1. Call Atlassian MCP: createJiraIssue(
             project: KEY,
             type: "Sub-task",
             summary: subtask.title,
             description: subtask.description,
             parent: task.jira_key
           )
        2. Update subtask: status = "created", jira_key = <returned key>
        3. Save manifest immediately

  Step 3 — create_links
    For each task in manifest.tasks:
      For each blocked_story_id in task.blocks:
        1. Resolve story_id to jira_key from stories-manifest.json
        2. Call Atlassian MCP: createIssueLink(
             type: "Blocks",
             inwardIssue: task.jira_key,
             outwardIssue: story_jira_key
           )
    Save manifest after all links created

  Step 4 — create_story_subtasks
    For each entry in manifest.story_subtasks:
      For each subtask in entry.subtasks where status == "pending":
        1. Call Atlassian MCP: createJiraIssue(
             project: KEY,
             type: "Sub-task",
             summary: subtask.title,
             description: subtask.description,
             parent: entry.story_key
           )
        2. Update subtask: status = "created", jira_key = <returned key>
        3. Save manifest immediately

  Step 5 — add_feedback_comments
    For each comment in manifest.feedback_comments where status == "pending":
      1. Call Atlassian MCP: addCommentToJiraIssue(
           issueIdOrKey: comment.target_key,
           body: comment.comment
         )
      2. Update comment: status = "created"
      3. Save manifest immediately

  IDEMPOTENCY: For every item, check status and jira_key before creating.
  If jira_key already exists → skip. This makes re-execution safe after
  partial failures.

Step 5 — Result Report
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
```

## Output

Updated manifest file with jira_key and status fields populated for each created item.

## Tools Used

### imbas MCP Tools

| Tool | Usage |
|------|-------|
| `imbas_manifest_get` | Load manifest file with summary (pending/created counts) |
| `imbas_manifest_save` | Save manifest after each item creation (crash recovery) |
| `imbas_manifest_plan` | Generate execution plan for devplan manifest (dry-run) |

### Atlassian MCP Tools

| Tool | Usage |
|------|-------|
| `createJiraIssue` | Create Epic, Story, Task, Sub-task issues |
| `createIssueLink` | Create links between issues (Blocks, is split into, relates to) |
| `editJiraIssue` | Update issue fields after creation (if needed) |
| `transitionJiraIssue` | Transition issue status (e.g., mark split-source Story as Done) |
| `addCommentToJiraIssue` | Post B→A feedback comments to Story issues |
| `getTransitionsForJiraIssue` | Get available transitions before transitioning |

## Agent Spawn

No agent spawn required. This skill executes directly using manifest data
and Atlassian MCP tools.

## Error Handling

| Error | Action |
|-------|--------|
| Manifest not found | Display: "No <type>-manifest.json found for run <run-id>. Complete the preceding phase first." |
| No pending items | Display: "All items already created. Nothing to execute." |
| createJiraIssue fails | Log error on the item (status remains "pending"), continue with next item. Report at end. |
| createIssueLink fails | Log error, continue. Common cause: target issue not found (check jira_key resolution). |
| ID resolution fails (no jira_key for referenced ID) | Skip link/subtask, log: "Cannot resolve <ID> — parent not yet created." |
| Atlassian MCP not connected | Display: "Atlassian MCP server is not available. Connect it first." |
| Partial failure mid-batch | Manifest is saved after each item. Re-run is safe — skips created items. |

## State Transitions

This skill does not directly modify run state (state.json). It operates on manifest files only.

Preconditions for execution:
- stories manifest: split.status == "completed" (or "escaped" with E2-3)
- devplan manifest: devplan.status == "completed", devplan.pending_review == false

The manifest itself tracks per-item state via status field:
```
"pending"  → item not yet created in Jira
"created"  → item created, jira_key populated
"failed"   → creation attempted but failed (retryable)
"skipped"  → intentionally skipped (e.g., umbrella Story)
```
