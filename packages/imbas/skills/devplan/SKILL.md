---
name: imbas-devplan
user_invocable: true
description: >
  Phase 3 of the imbas pipeline. Generates EARS-format Subtasks and extracts
  cross-Story Tasks by exploring the local codebase. Operates on approved Stories only.
  Trigger: "create devplan", "dev 계획", "Phase 3", "subtask 생성"
version: "1.0.0"
complexity: complex
plugin: imbas
---

# imbas-devplan — Phase 3 Development Plan Generation

Generates EARS-format Subtasks per Story and extracts cross-Story Tasks
by exploring the local codebase. Produces a devplan-manifest.json for
batch Jira issue creation.

## When to Use This Skill

- After Phase 2 (split) is completed and reviewed
- After stories-manifest has been executed (Stories exist in Jira)
- To regenerate devplan for specific Stories after changes

## Arguments

```
/imbas:devplan [--run <run-id>] [--stories <S1,S2,...>]

--run      : Run ID (if omitted, uses most recent eligible run)
--stories  : Target Story IDs (comma-separated; if omitted, processes all Stories)
```

## Preconditions

From state.json:
- `split.status == "completed"` AND `split.pending_review == false`
  OR `split.status == "escaped"` AND `split.escape_code == "E2-3"`

From stories-manifest.json:
- All Stories must have `status: "created"` with valid `jira_key`
- If any Story has `status: "pending"` → block with message:
  "Run /imbas:manifest stories first to create Jira issues."

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

  AST FALLBACK DETECTION:
    If imbas_ast_search or imbas_ast_analyze returns a response containing
    "sgLoadError" field:
    1. Log warning ONCE per session:
       "[WARN] @ast-grep/napi not installed. Using LLM fallback — results may be approximate."
       "Install: npm install -g @ast-grep/napi"
    2. Switch to fallback mode for remaining AST operations:

       | Native Tool | Fallback Method |
       |-------------|-----------------|
       | imbas_ast_search | Convert meta-variables to regex → Grep search → LLM false-positive filtering |
       | imbas_ast_analyze (dependency-graph) | Read source → LLM extracts import/export/call patterns |
       | imbas_ast_analyze (cyclomatic-complexity) | Read source → LLM counts branch statements (if/for/while/switch/catch/&&/||/?) |

       Meta-variable → Regex conversion rules:
       | Meta-Variable | Regex | Matches |
       |---------------|-------|---------|
       | $NAME | [\w.]+ | Single identifier or dot path |
       | $VALUE | [\w.]+ | Single value expression |
       | $TYPE | [\w.<>,\[\] ]+ | Type annotation |
       | $$$ARGS | [\s\S]*? | Multiple arguments (non-greedy) |
       | $$$BODY | [\s\S]*? | Block body (non-greedy) |

       Conversion algorithm:
       1. Escape regex special characters (except $)
       2. $$$[A-Z_]+ → [\s\S]*?
       3. $[A-Z_]+ → [\w.]+
       4. Whitespace → \s+

       Limitations:
       - Accuracy: text matching, no AST structure guarantee
       - Scale: recommended for ≤500 files
       - Unsupported: rule-based matching, fix patterns, type-aware matching

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

## Output

`devplan-manifest.json` saved in the run directory at:
`.imbas/<KEY>/runs/<run-id>/devplan-manifest.json`

Schema defined in SPEC-state.md §6.

## Tools Used

### imbas MCP Tools

| Tool | Usage |
|------|-------|
| `imbas_run_get` | Load run state, verify preconditions |
| `imbas_run_transition` | start_phase(devplan), complete_phase(devplan) |
| `imbas_manifest_get` | Load stories-manifest.json to read Story data |
| `imbas_manifest_save` | Save devplan-manifest.json |
| `imbas_manifest_validate` | Validate devplan manifest structural integrity |
| `imbas_ast_search` | AST pattern search for code exploration (engineer agent) |
| `imbas_ast_analyze` | Dependency graph and complexity analysis (engineer agent) |

### Atlassian MCP Tools

| Tool | Usage |
|------|-------|
| `getJiraIssue` | Read Story details from Jira (latest state, comments) |
| `searchJiraIssuesUsingJql` | Search for related existing issues in Jira |

## Agent Spawn

| Agent | Model | Purpose |
|-------|-------|---------|
| `imbas-engineer` | config.defaults.llm_model.devplan (opus) | Codebase exploration, EARS Subtask generation, Task extraction |

### imbas-engineer Spawn Instructions

- Provide stories-manifest.json (filtered by --stories if specified)
- Provide codebase root path for exploration
- Grant access to imbas_ast_search and imbas_ast_analyze tools
- Agent also uses Read, Grep, Glob for code exploration
- Set subtask_limits from config.json
- Agent returns devplan-manifest.json content — skill handles state updates
- Agent does NOT have pipeline state tools — skill manages all transitions
- If AST tools return sgLoadError, instruct agent to use LLM fallback mode

## Error Handling

| Error | Action |
|-------|--------|
| Split not completed/reviewed | Display: "Phase 2 must be completed and reviewed. Run /imbas:split first." |
| Stories not in Jira (pending) | Display: "Stories must exist in Jira. Run /imbas:manifest stories first." |
| AST tools unavailable (sgLoadError) | Log warning once, switch to LLM fallback mode. Continue execution. |
| imbas-engineer fails | Save partial manifest if available. Display: "Engineer agent error. Partial results saved. Re-run with --stories to complete." |
| Manifest validation errors | Display errors. Allow user to fix and re-approve. |
| No Subtasks generated for a Story | Flag Story in review. Display: "Story <ID> produced no Subtasks — verify Story scope." |
| imbas_run_transition fails | Display precondition error from tool. |

## State Transitions

```
Entry state:
  split.status = "completed", split.pending_review = false
  OR split.status = "escaped", split.escape_code = "E2-3"
  devplan.status = "pending"

During execution:
  start_phase("devplan") → devplan.status = "in_progress"

Exit states:
  complete_phase("devplan", pending_review=false):
    → devplan.status = "completed", devplan.pending_review = false
    → manifest execution ALLOWED

  complete_phase("devplan", pending_review=true):
    → devplan.status = "completed", devplan.pending_review = true
    → manifest execution DENIED until review approved
```
