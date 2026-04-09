# Workflow

## Workflow

```
Step 1 — Load Run & Manifest Checks
  1. Call run_get(project_ref, run_id) to load state.json.
  2. Verify split phase preconditions:
     - split.status == "completed" && split.pending_review == false
     - OR split.status == "escaped" && split.escape_code == "E2-3"
     - If not met → error with specific guidance.
  3. Call manifest_get(project_ref, run_id, type: "stories")
     to load stories-manifest.json.
  4. Check Story statuses:
     - All "created" (issue_ref present) → proceed.
     - Any "pending" → block: "Execute stories manifest first: /imbas:imbas-manifest stories"
     - Exception (E2-3): if split.status == "escaped" && split.escape_code == "E2-3",
       a single pending Story is the expected upstream state (no Jira writes yet).
       Proceed without blocking. See preconditions.md "Exception — E2-3 escape upstream".
  5. Call run_transition:
     - action: "start_phase", phase: "devplan"
     → Sets devplan.status = "in_progress", current_phase = "devplan"

Step 1.5 — Codebase Resolution
  Resolve codebase path: --codebase argument > config.defaults.codebase > STOP
  IF codebase is null:
    → STOP: "Devplan requires --codebase. Subtask generation needs a codebase to explore.
       Usage: /imbas:imbas-devplan --run <run-id> --codebase /path/to/repo"

Step 2 — imbas-engineer Agent Spawn
  - Spawn agent: imbas-engineer
  - Model: config.defaults.llm_model.devplan (default: "opus")
  - Input provided to agent:
    - stories-manifest.json (Story descriptions with issue_refs)
    - source.md (read-only reference — original planning document for domain context)
    - Codebase root path (resolved --codebase value from Step 1.5)
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
      - Tools: ast_search for pattern matching, ast_analyze for
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

    Step 2e — Output Generation (Branch)
      - IF all Stories can proceed:
        → Generate devplan-manifest.json (full manifest)
      - IF some Stories are blocked (missing dependencies, structural constraints):
        → Generate devplan-manifest.json for unblocked Stories
        → Generate devplan-blocked-report.md for blocked Stories
      - IF ALL Stories are blocked:
        → Generate devplan-blocked-report.md only (no manifest)
        → Agent returns blocked report content
      - Compile (when manifest generated): tasks[], story_subtasks[], feedback_comments[], execution_order[]
      - execution_order follows dependency: Tasks → Task Subtasks → Links → Story Subtasks → Feedback

  - Agent returns: devplan-manifest.json content (or devplan-blocked-report.md if blocked)

  See [ast-fallback.md](./ast-fallback.md) for AST fallback detection details.

  IF agent returns devplan-blocked-report.md (all Stories blocked):
    1. Save devplan-blocked-report.md to run directory
    2. Call run_transition:
       - action: "complete_phase", phase: "devplan", result: "BLOCKED"
       → Sets devplan.status = "completed", devplan.result = "BLOCKED"
    3. Display blocked report to user with guidance:
       "Phase 3 blocked. Review blocked report and resolve dependencies."
    4. STOP — do not proceed to Step 3 or Step 4

  IF agent returns partial output (some blocked, some unblocked):
    1. Save devplan-blocked-report.md to run directory
    2. Save devplan-manifest.json (unblocked Stories only) to run directory
    3. Continue to Step 3 with the partial manifest

Step 3 — B→A Feedback Collection — provider-specific

  Provider routing:
  - jira   → jira/workflow.md Step 3 (target_ref is a Jira key; feedback later
             posted as Jira comments by manifest skill)
  - github → github/workflow.md Step 3 (target_ref is owner/repo#N; feedback
             later posted as GitHub issue comments by manifest skill)
  - local  → local/workflow.md Step 3 (target_ref is a local S-<N> ID; feedback
             later appended to the file's ## Digest section by manifest skill)

  Both branches share the invariant: "Problem space tree unchanged" — Stories
  themselves are NOT modified. Divergences become comments (Jira) or digest
  appends (local).

  Call manifest_save to persist feedback_comments in devplan-manifest.json.

Step 4 — User Review Flow
  1. Display manifest summary:
     - Task count and descriptions
     - Per-Story Subtask counts
     - Execution order (execution_order steps)
     - B→A feedback items (if any)
     - AST fallback mode indicator (if activated)
  2. Wait for user decision:

  Option A — Approve:
    1. Call manifest_validate(project_ref, run_id, type: "devplan")
       - If validation errors: display and request correction before approval.
    2. Call run_transition:
       - action: "complete_phase", phase: "devplan"
       - pending_review: false
       → Sets devplan.status = "completed", devplan.pending_review = false
    3. Display the provider-specific completion message (see jira/workflow.md
       or local/workflow.md Step 4).

  Option B — Request modifications:
    1. User specifies changes (add/remove/modify Tasks or Subtasks).
    2. Re-enter Step 2 with targeted modifications.
    3. Re-validate and return to Step 4.
```
