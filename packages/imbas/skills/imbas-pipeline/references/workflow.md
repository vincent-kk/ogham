# Workflow

## Phase 0 — INPUT DETECTION, SMART DEFAULTS & ROUTING

Detect pipeline mode from input, resolve all options, display confirmation banner.

```
Step 0.1 — Input Mode Detection
  Examine the first positional argument to determine pipeline mode:

  IF argument matches Jira key pattern (e.g., PROJ-42 or PROJ-42,PROJ-43):
    → DEVPLAN PIPELINE mode
    → Parse comma-separated keys into story_keys[] list
    → <source> is NOT required (no document needed)

  ELSE (file path or URL):
    → DOCUMENT PIPELINE mode
    → Argument is <source> (document path or Confluence URL)

Step 0.2 — Option Resolution
  1. Call config_get to load config.json.
  2. Resolve each option by mode:

  DOCUMENT PIPELINE:
    - project_ref: --project argument > config.defaults.project_ref > STOP
    - codebase: --codebase argument > config.defaults.codebase > null
      (null = planning-only mode — pipeline stops after manifest-stories)
    - parent: --parent argument > "new" (auto-create Epic)
    - stop_at: --stop-at argument > none (full pipeline if codebase present)
    - dry_run: --dry-run flag > false

  DEVPLAN PIPELINE:
    - project_ref: extracted from story_keys (e.g., "PROJ" from "PROJ-42") > --project > config
    - codebase: --codebase argument > config.defaults.codebase > STOP
      (required — devplan pipeline cannot proceed without codebase)
    - parent: N/A (Stories already exist in Jira)
    - stop_at: --stop-at argument > none (devplan + manifest)
    - dry_run: --dry-run flag > false

Step 0.3 — Story Validation (DEVPLAN PIPELINE only)
  Validate all keys share the same project prefix BEFORE the per-key loop:
    - Extract project prefix from each key (e.g., "PROJ" from "PROJ-42")
    - If mixed prefixes detected (e.g., PROJ-42 + OTHER-10) → STOP: "Mixed project keys in Story input."

  For each key in story_keys[]:
    1. [OP: get_issue] issue_ref=<key>
    2. Verify issue type is "Story"
       - Not a Story → STOP: "<KEY> is a <type>, not a Story."
       - Not found → STOP: "Issue <KEY> not found in Jira."
    3. Collect: issue_ref, summary, description, status

  If any Story has status "Done" → warn: "<KEY> is already Done. Proceeding anyway."

Step 0.4 — Parent Issue Detection (DOCUMENT PIPELINE only)
  If --parent is a Jira issue key:
    1. [OP: get_issue] issue_ref=<parentKey>
    2. Read issue type:
       - Epic → use as parent Epic for Stories
       - Other → STOP: "<KEY> is a <type>. --parent accepts Epic key, 'new', or 'none'."
    3. If not found → STOP: "Issue <KEY> not found in Jira."

  If --parent is "new" → auto-create Epic in Phase 2.5
  If --parent is "none" → Stories created without parent Epic

Step 0.5 — Confirmation Banner
  DOCUMENT PIPELINE (full):
    imbas pipeline — configuration
      Input:    <source>
      Mode:     document pipeline — full (validate → split → devplan → Jira)
      Codebase: <path>
      Project:  <KEY> (from --project or config)
      Parent:   <new Epic | existing PROJ-100 | none>
      Jira:     <live | dry-run>
      Proceeding...

  DOCUMENT PIPELINE (planning-only):
    imbas pipeline — configuration
      Input:    <source>
      Mode:     document pipeline — planning only (validate → split → Stories)
      Codebase: (none — stops after manifest-stories)
      Project:  <KEY> (from --project or config)
      Parent:   <new Epic | existing PROJ-100 | none>
      Jira:     <live | dry-run>
      Proceeding...

  DEVPLAN PIPELINE:
    imbas pipeline — configuration
      Input:    PROJ-42, PROJ-43 (N Stories)
      Mode:     devplan pipeline (devplan → Jira)
      Codebase: <path>
      Project:  PROJ (from Story keys)
      Jira:     <live | dry-run>
      Proceeding...

Step 0.6 — Route
  DOCUMENT PIPELINE → Phase 1 (validate)
  DEVPLAN PIPELINE (codebase resolved) → Phase 3 (devplan), with story_keys[] as input
  DEVPLAN PIPELINE (codebase null) → STOP: "Devplan pipeline requires --codebase.
    Subtask generation needs a codebase to explore.
    Usage: /imbas:imbas-pipeline PROJ-42 --codebase /path/to/repo"
```

---

## Phase 1 — VALIDATE

Replicates `imbas:validate` skill workflow with automatic gate evaluation.
Skipped in devplan pipeline mode (input is Story keys).

```
Step 1.1 — Run Initialization
  1. Determine project key (already resolved in Phase 0).
  2. Call run_create with:
     - project_ref: <determined key>
     - source_file: <source argument>
     - supplements: <--supplements paths array> (if provided)
     → Returns: run_id, run_dir, initial state
  3. Call run_transition:
     - project_ref, run_id, action: "start_phase", phase: "validate"

Step 1.2 — Document Source Resolution
  - Local file (*.md, *.txt): Already copied to source.md by run_create. Read directly.
  - Confluence URL:
    - [OP: get_confluence] page_id=<extracted from URL>
    - Convert response to markdown and save as source.md in run directory.
    - If page contains embedded media (images, videos):
      → Display: "Media attachments detected. Run /imbas:imbas-fetch-media to include visual context."
      → Do NOT auto-invoke fetch-media.
  - If source contains references to other Confluence pages:
    - [OP: search_confluence] to resolve references.
    - Save referenced content as supplements.

Step 1.3 — imbas-analyst Agent Spawn
  - Spawn agent: imbas-analyst
  - Model: config.defaults.llm_model.validate (default: "sonnet")
  - Input: source.md + supplements/*.md + config.json language settings
  - Instructions: Perform 5-type validation (contradictions, divergences, omissions, infeasibilities, testability).
    Classify each issue as BLOCKING or WARNING.
  - Agent returns: validation-report.md content. Skill saves to run directory.

Step 1.4 — Result Evaluation
  Parse validation-report.md:
  - Count BLOCKING issues → blocking_issues
  - Count WARNING issues → warning_issues
  - Determine result:
    - blocking_issues > 0 → result = "BLOCKED"
    - blocking_issues == 0, warning_issues > 0 → result = "PASS_WITH_WARNINGS"
    - blocking_issues == 0, warning_issues == 0 → result = "PASS"

Step 1.5 — State Update
  Call run_transition:
  - action: "complete_phase", phase: "validate"
  - result, blocking_issues, warning_issues

>>> GATE 1: Validate Result (see auto-approval-gates.md)
  - PASS → continue to Phase 2
  - PASS_WITH_WARNINGS → accumulate warnings, display inline note, continue to Phase 2
  - BLOCKED → STOP: emit blocker report with blocking issues list

>>> --stop-at validate? → emit progress report, exit
```

---

## Phase 2 — SPLIT

Replicates `imbas:split` skill workflow (Steps 1-7) with auto-approval gate replacing Step 7 user review.

```
Step 2.1 — Start Phase
  Call run_transition:
  - action: "start_phase", phase: "split"

Step 2.2 — Parent Resolution (already resolved in Phase 0)
  Based on --parent (resolved in Phase 0 Step 0.2):
  - Epic key (verified): use as parent epic_ref for Stories.
  - "new": add Epic entry to stories-manifest.json (created in Phase 2.5).
  - "none": Stories created without parent Epic.

Step 2.3 — imbas-planner Agent Spawn
  - Spawn agent: imbas-planner
  - Model: config.defaults.llm_model.split (default: "sonnet")
  - Input: source.md + supplements/*.md + Epic information + config.json language settings
  - Instructions: Split into INVEST-compliant Stories with User Story + AC (Given/When/Then or EARS).
    Each Story must have explicit anchor link to source document section.
  - Agent returns: Story list as JSON

Step 2.4 — 3→1→2 Verification (per Story)
  For each Story produced by imbas-planner:

  [3] Anchor Link Check
    - Story has explicit reference to source document section?
    - Missing → set verification.anchor_link = false
    - Present → set verification.anchor_link = true, continue

  [1] Coherence Check
    - Story content aligns with overall document goals and context?
    - Deviation → set verification.coherence = "FAIL" or "REVIEW"
    - Coherent → set verification.coherence = "PASS", continue

  [2] Reverse-Inference Verification
    - Spawn agent: imbas-analyst
    - Input: ALL split Stories reassembled + original source.md
    - Instructions: Compare reassembled Stories against original. Identify semantic loss, mutation, addition.
    - Match → set verification.reverse_inference = "PASS"
    - Mismatch → set verification.reverse_inference = "FAIL" or "REVIEW"

Step 2.5 — Escape Condition Detection
  If any escape condition detected during splitting:

  | Code | Situation | Pipeline Action |
  |------|-----------|----------------|
  | E2-1 | Needs elaboration | STOP: list missing information items |
  | E2-2 | Contradiction found | STOP: list conflict points |
  | E2-3 | Split unnecessary | SKIP Phase 2.5, jump to Phase 3 |
  | EC-1 | Cannot comprehend | STOP: frozen scope + structured queries |
  | EC-2 | Source defect | STOP: recommend re-validate |

  On escape (except E2-3):
  - Call run_transition: action "escape_phase", phase "split", escape_code
  - Emit blocker report with escape details

  On E2-3:
  - Generate a single-Story stories-manifest.json wrapping the original document as one Story
  - Call manifest_save to persist it
  - Call run_transition: action "escape_phase", phase "split", escape_code "E2-3"
  - Skip Phase 2.5 (manifest-stories), proceed directly to Phase 3

Step 2.6 — Size Check + Horizontal Split / Umbrella
  Aligned with split skill Step 5. For each Story, verify 4 criteria:
  1. Appropriate scope — Represents a functionally complete unit that can be E2E tested on its own branch. (Do NOT split arbitrarily based on Subtask count)  2. Sufficient specification — AC detailed enough for development
  3. Independence — minimal coupling with other Stories
  4. Single responsibility — addresses one coherent concern

  If any criterion fails, branch by cause (mirrors split Step 5):

  (a) Size exceeded (criterion 1 or 4) → Horizontal Split
    - Re-invoke imbas-planner for the oversized Story only
    - Original Story marked for "Done" processing + links:
      "is split into" from original → new Stories
      "split from" from new Stories → original
    - New Stories undergo full 3→1→2 verification + size check (recursive loop)

  (b) Conceptually needs sub-Stories (criterion 3 failure where the Story is a
      true umbrella concept) → Umbrella Pattern
    - Keep original Story as umbrella (do NOT delete or mark Done)
    - Create child Stories under umbrella
    - Link children with "relates to" link to umbrella
    - Subtasks are created only on child Stories, NOT on umbrella

  (c) Insufficient spec (criterion 2) or pure coupling (criterion 3 without
      umbrella structure) → refine content within same Story

  Pipeline auto-selection heuristic between (a) and (b):
    - If imbas-planner can define ≥2 cohesive child Stories with distinct
      domains under one conceptual parent → (b) Umbrella
    - Otherwise → (a) Horizontal Split

Step 2.7 — Manifest Generation
  1. Compile stories-manifest.json with all Stories, verification results, links
  2. Call manifest_save(project_ref, run_id, type: "stories", manifest)
  3. Call manifest_validate(project_ref, run_id, type: "stories")
     - If validation errors: attempt auto-fix (dedup, link resolution), re-validate

>>> GATE 2: Split Quality (see auto-approval-gates.md)
  - All criteria pass → call run_transition(complete_phase, split, pending_review: false)
  - Any criterion fails → STOP with blocker report detailing which Stories/fields failed

>>> --stop-at split? → emit progress report, exit
```

---

## Phase 2.5 — MANIFEST STORIES

Replicates `imbas:manifest` skill workflow for "stories" type. No user confirmation — pipeline invocation is implicit consent.

**Drift auto-resolution policy** (pipeline-specific override of manifest Step 2.5):
Interactive [y/N] prompts from `imbas:manifest` Step 2.5 (Idempotency Check) are
replaced by deterministic auto-answers on pipeline resume:
  - DRIFT_DELETED → auto-answer "yes" (clear issue_ref, set status "pending", re-create)
  - DRIFT_STATE   → auto-answer "yes" (mark status "skipped", do not re-create)
  - Both events are recorded in the final pipeline report under "Drift Resolutions"
  - Override: `--strict-drift` flag (if set) converts DRIFT_* into blocker STOP instead

```
Step 2.5.1 — Dry-Run Check
  If --dry-run flag is set:
  - Display planned actions: Epic creation, Story creation (id, title), Link creation
  - Skip execution, continue to Phase 3 (if not --stop-at manifest-stories)

Step 2.5.2 — Batch Execution
  CRITICAL: After EACH item creation, immediately save manifest via manifest_save.

  Phase A — Epic Creation (if --parent "new" and manifest has Epic entry):
    1. [OP: create_issue] project=<KEY>, type="Epic", summary=<summary>, description=<description>
    2. Store issue_ref in manifest epic_ref
    3. Save manifest

  Phase B — Story Creation:
    For each story where status == "pending":
    1. [OP: create_issue] project=<KEY>, type="Story", summary=<summary>, description=<description>, parent=<epic_ref (if set)>
    2. Update story: status = "created", issue_ref = <returned key>
    3. Save manifest

  Phase C — Link Creation:
    For each link where status == "pending":
    1. Resolve from/to IDs to issue_refs
    2. For EACH target in link.to array:
       [OP: create_link] type=<type>, inward=<inwardIssue>, outward=<outwardIssue>
    3. Update link: status = "created"
    4. Save manifest

Step 2.5.3 — Execution Verification
  >>> GATE 4: Execution Result (see auto-approval-gates.md)
  - Check: all Stories have status "created" with valid issue_ref
  - Any "failed" items → STOP: "Manifest stories partially failed. Fix and re-run:
    /imbas:imbas-manifest stories --run <run-id>"
    (devplan requires all Story issue_refs to be present)

>>> --stop-at manifest-stories? → emit progress report, exit

>>> CODEBASE CHECK (Document Pipeline only):
  IF codebase is null (not resolved in Phase 0):
    → Pipeline stops here (planning-only mode).
    → No state transition required — `split` is already `completed` and
      `devplan` remains `pending`, which accurately reflects the planning-only exit.
    → Emit planning-only report:
      "Planning pipeline complete. N Stories created in <PROJECT>.
       Subtask generation requires a codebase path.
       Resume with codebase:
         /imbas:imbas-pipeline <source> --codebase /path/to/repo
       Or run devplan individually:
         /imbas:imbas-devplan --run <run-id> --codebase /path/to/repo"
    → EXIT
  IF codebase is present → continue to Phase 3
```

---

## Phase 3 — DEVPLAN

Replicates `imbas:devplan` skill workflow (Steps 1-4) with auto-approval gate replacing Step 4 user review.

**Two entry paths:**
- FULL PIPELINE: arrives here after Phase 2.5 with stories-manifest populated
- Devplan pipeline (Story keys input): enters directly with Stories from Jira

```
Step 3.0 — DEVPLAN PIPELINE Mode Setup (only when input is Story keys)
  When Phase 0 detected DEVPLAN PIPELINE mode (story_keys[] from input):
  1. Call run_create(project_ref, source_file: "devplan-pipeline", supplements: [])
     (sentinel value — not a file path; run_create skips file copy when source_file does not point to an existing file)
     → Creates run directory + state.json
  2. Story details already loaded in Phase 0 Step 0.3 ([OP: get_issue] per key)
  3. Build stories-manifest.json from collected Stories:
     {
       stories: [
         { id: "S1", issue_ref: "PROJ-42", title: "...", status: "created", ... },
         { id: "S2", issue_ref: "PROJ-43", title: "...", status: "created", ... },
         ...
       ]
     }
     All Stories have status "created" with valid issue_ref (they already exist in Jira).
  4. Call manifest_save(type: "stories", manifest)
  5. Call run_transition: action "skip_phases", phases ["validate", "split"]
     → Sets both phases to status "completed", records in metadata.skipped_phases
  6. Proceed to Step 3.1

  Note: When multiple Stories are provided, imbas-engineer performs cross-Story
  duplicate detection (Step 3.2c) and Task extraction (Step 3.2d) across ALL Stories.
  This is where shared Tasks with "blocks" links are generated.

Step 3.1 — Start Phase
  1. Call run_transition: action "start_phase", phase "devplan"
  2. Call manifest_get(project_ref, run_id, type: "stories") to load stories-manifest

Step 3.2 — imbas-engineer Agent Spawn
  - Spawn agent: imbas-engineer
  - Model: config.defaults.llm_model.devplan (default: "opus")
  - Input:
    - stories-manifest.json (Story descriptions with issue_refs)
    - Codebase root path (resolved --codebase value from Phase 0)
    - config.json subtask_limits (max_lines: 200, max_files: 10, review_hours: 1)
  - Agent execution:
    a. Per-Story code exploration (domain keywords → entry points → related areas)
    b. Per-Story Subtask drafts (EARS format, 4 termination criteria)
    c. Cross-Story duplicate detection
    d. Task candidate extraction (shared work → Tasks with blocks links)
    e. devplan-manifest.json generation
  - Agent returns: devplan-manifest.json content

  AST FALLBACK:
  If ast_search or ast_analyze returns sgLoadError:
  - Note in pipeline report: "AST fallback mode — results approximate"
  - Agent handles fallback internally (meta-variable → regex → Grep → LLM filtering)

Step 3.3 — B→A Feedback Collection
  - Divergences between Story definitions and code reality → feedback_comments[]
  - "Problem space tree unchanged" principle: Stories are NOT modified
  - Call manifest_save to persist feedback_comments in devplan-manifest.json

Step 3.4 — Manifest Validation
  1. Call manifest_save(project_ref, run_id, type: "devplan", manifest)
  2. Call manifest_validate(project_ref, run_id, type: "devplan")

  IF agent returns devplan-blocked-report.md (all Stories blocked):
  - Save blocked report to run directory
  - Call run_transition(complete_phase, devplan, result: "BLOCKED")
  - STOP: emit blocked report with dependency resolution guidance

  IF agent returns partial output (some blocked, some unblocked):
  - Save blocked report + partial manifest to run directory
  - Continue gate evaluation with partial manifest only

>>> GATE 3: Devplan Quality (see auto-approval-gates.md)
  - All criteria pass → call run_transition(complete_phase, devplan, pending_review: false)
  - Validation errors or needs_review flags → STOP with blocker report
  - B→A feedback_comments → non-blocking, included in final report

>>> --stop-at devplan? → emit progress report, exit
```

---

## Phase 3.5 — MANIFEST DEVPLAN

Replicates `imbas:manifest` skill workflow for "devplan" type. Follows execution_order from manifest.

```
Step 3.5.1 — Dry-Run Check
  If --dry-run flag is set:
  - Call manifest_plan(project_ref, run_id) for execution plan preview
  - Display each step: Tasks, Task Subtasks, Links, Story Subtasks, Feedback Comments
  - Skip execution, proceed to final report

Step 3.5.2 — Batch Execution (follows execution_order)
  CRITICAL: After EACH item creation, immediately save manifest via manifest_save.

  Step 1 — create_tasks:
    For each task where status == "pending":
    - [OP: create_issue] project=<KEY>, type="Task", summary=<summary>, description=<description>
    - Update: status = "created", issue_ref = <key>
    - Save manifest

  Step 2 — create_task_subtasks:
    For each task's subtasks where status == "pending":
    - [OP: create_issue] project=<KEY>, type="Sub-task", summary=<summary>, description=<description>, parent=<task.issue_ref>
    - Update: status = "created", issue_ref = <key>
    - Save manifest

  Step 3 — create_links:
    For each task, for each blocked_story_id in task.blocks:
    - Resolve story_id to issue_ref from stories-manifest.json
    - [OP: create_link] type="Blocks", inward=<task.issue_ref>, outward=<story_issue_ref>
    - Save manifest

  Step 4 — create_story_subtasks:
    For each story_subtasks entry, for each subtask where status == "pending":
    - [OP: create_issue] project=<KEY>, type="Sub-task", summary=<summary>, description=<description>, parent=<story_key>
    - Update: status = "created", issue_ref = <key>
    - Save manifest

  Step 5 — add_feedback_comments:
    For each feedback_comment where status == "pending":
    - [OP: add_comment] issue_ref=<target_ref>, body=<comment>
    - Update: status = "created"
    - Save manifest

Step 3.5.3 — Execution Result
  >>> GATE 4: Execution Result (see auto-approval-gates.md)
  - Count: created, failed, skipped items
  - Any failures → note in final report (NON-BLOCKING — items already created are irreversible)
  - Suggest: "/imbas:imbas-manifest devplan --run <run-id>" to retry failed items
```

---

## Final Report

After all phases complete (or pipeline stops), emit a structured report.

```
If pipeline completed all phases:
  → Emit success report (see blocker-report.md "Complete" template)

If pipeline stopped at a gate:
  → Emit blocker report (see blocker-report.md "Stopped" template)

If --dry-run was active:
  → Emit dry-run report: phases completed, manifest previews shown, no Jira writes

Report always includes:
  - Run ID, project key, source document
  - Per-phase results (pass/fail/skipped)
  - Accumulated warnings from all phases
  - B→A feedback summary (if any)
  - AST mode indicator (native/fallback)
  - Resume commands (if stopped)
```
