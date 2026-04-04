# Workflow

## Workflow

```
Step 1 — Load Run & Manifest Checks
  1. Call imbas_run_get(project_key, run_id) to load state.json.
  2. Verify split phase preconditions:
     - split.status == "completed" && split.pending_review == false
     - OR split.status == "escaped" && split.escape_code == "E2-3"
     - If not met → error with specific guidance.
  3. Call imbas_manifest_get(project_key, run_id, type: "stories")
     to load stories-manifest.json.
  4. Check Story statuses:
     - All "created" (jira_key present) → proceed.
     - Any "pending" → block: "Execute stories manifest first: /imbas:manifest stories"
  5. Call imbas_run_transition:
     - action: "start_phase", phase: "devplan"
     → Sets devplan.status = "in_progress", current_phase = "devplan"

Step 2 — imbas-engineer Agent Spawn
  - Spawn agent: imbas-engineer
  - Model: config.defaults.llm_model.devplan (default: "opus")
  - Input provided to agent:
    - stories-manifest.json (Story descriptions with jira_keys)
    - Local codebase root path (project working directory)
    - Architecture documents path (if available)
    - config.json subtask_limits:
      - max_lines: 200 (max lines of code per Subtask)
      - max_files: 10 (max files touched per Subtask)
      - review_hours: 1 (max review time per Subtask)
    - If --stories specified: filter to those Story IDs only

  - Agent execution steps:
    Step 2a — Per-Story Code Exploration
      - Extract domain keywords from each Story description
      - Identify code entry points matching keywords
      - Traverse related code areas (imports, exports, call sites)
      - Tools: imbas_ast_search for pattern matching, imbas_ast_analyze for
        dependency graphs and complexity metrics
      - Also uses: Read, Grep, Glob for broader exploration

    Step 2b — Per-Story Subtask Drafts (EARS format)
      - Generate Subtasks in EARS format:
        "When <trigger>, the system shall <action>"
      - Each Subtask must satisfy ALL 4 termination criteria:
        1. max_lines ≤ 200 (lines of code change)
        2. max_files ≤ 10 (files touched)
        3. review_hours ≤ 1 (estimated review time)
        4. Single responsibility (one coherent change)

    Step 2c — Cross-Story Duplicate Detection
      - Compare all Subtasks across Stories for overlap
      - Use code path similarity (same files/functions referenced)
      - Identify Subtasks that serve multiple Stories

    Step 2d — Task Candidate Extraction
      - Duplicates exceeding threshold → promote to Task
      - Task: independent work unit that blocks multiple Stories
      - Generate "blocks" links: Task → [Story1, Story2, ...]
      - Remove redundant Subtasks from individual Stories

    Step 2e — devplan-manifest.json Generation
      - Compile: tasks[], story_subtasks[], feedback_comments[], execution_order[]
      - execution_order follows dependency: Tasks → Task Subtasks → Links → Story Subtasks → Feedback

  - Agent returns: devplan-manifest.json content

  See [ast-fallback.md](./ast-fallback.md) for AST fallback detection details.

Step 3 — B→A Feedback Collection
  - When Story definition ≠ code reality, record in feedback_comments:
    - target_story: Story ID
    - target_key: Story Jira key
    - comment: description of divergence
    - type: "mapping_divergence" (Story↔code mismatch) or "story_split_issue" (split problem)
  - IMPORTANT: "Problem space tree unchanged" principle — Stories themselves are
    NOT modified. Divergences are recorded as Jira comments only.
  - Call imbas_manifest_save to persist feedback_comments in devplan-manifest.json.

Step 4 — User Review Flow
  1. Display manifest summary:
     - Task count and descriptions
     - Per-Story Subtask counts
     - Execution order (execution_order steps)
     - B→A feedback items (if any)
     - AST fallback mode indicator (if activated)
  2. Wait for user decision:

  Option A — Approve:
    1. Call imbas_manifest_validate(project_key, run_id, type: "devplan")
       - If validation errors: display and request correction before approval.
    2. Call imbas_run_transition:
       - action: "complete_phase", phase: "devplan"
       - pending_review: false
       → Sets devplan.status = "completed", devplan.pending_review = false
    3. Display: "Phase 3 complete. Run /imbas:manifest devplan to create Jira issues."

  Option B — Request modifications:
    1. User specifies changes (add/remove/modify Tasks or Subtasks).
    2. Re-enter Step 2 with targeted modifications.
    3. Re-validate and return to Step 4.
```
