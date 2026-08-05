# Workflow — Part A: Decomposition (Steps 1–7)

Creation continues in [creation-workflow.md](./creation-workflow.md) (Steps 8–11) in the same continuous operation.

```
Step 1 — Load Run & Verify Preconditions
  1. If --run provided: call mcp__plugin_imbas_tools__run_get(project_ref, run_id).
     If not provided: call mcp__plugin_imbas_tools__run_get(project_ref) → returns most recent run.
  2. Verify refine.status == "completed" and refine.result in ["PASS", "PASS_WITH_WARNINGS"].
     - If PASS_WITH_WARNINGS: display warning list from validation-report.md.
     - If not met: error with guidance.
  3. Verify estimate.status in ["completed", "skipped"] — otherwise run the
     estimate-skip flow in preconditions.md (user decision point).
  4. Call mcp__plugin_imbas_tools__run_transition:
     - action: "start_phase", phase: "split"
     → Sets split.status = "in_progress", current_phase = "split"
  5. Input document: refined.md (canonical). supplements/* remain available as
     read-only context; source.md is the immutable original.
  6. If estimation.json exists, load it (Read) — it feeds planner context in Step 3.

Step 2 — Epic Decision Flow (jira/github; local skips to Step 3)
  - If --epic provided:
    1. [OP: get_issue] issue_ref=<epicKey> to verify existence.
    2. If found: store epic_ref in the manifest.
    3. If not found: error: "Epic <KEY> not found."
  - If --epic NOT provided:
    1. Ask user: "Create a new Epic for this split, or use an existing one?"
       Options:
       a) "Create new Epic" → Add Epic entry to stories-manifest.json
          (Epic will be created during the creation stage)
       b) "Use existing Epic" → User enters Epic key → verify with [OP: get_issue]
       c) "No Epic" → issues created without parent Epic

Step 3 — planner Agent Spawn (Issue Splitting)
  - Spawn agent via Task tool (subagent_type: "imbas:planner")
  - Model: config.defaults.llm_model.split (default: "sonnet")
  - Input provided to agent:
    - refined.md (full refined document)
    - supplements/*.md (all supplement files)
    - estimation.json (if present — units, WBS, per-unit expected man-days)
    - Epic information (key or "new Epic" marker)
    - Source Issue information (if state.source_issue_ref is present)
    - config.json (including available issue types via `config.jira.issue_types`)
  - Agent instructions:
    "Split the refined planning document into INVEST-compliant issues.
     For each issue:
     - Determine type: Select the most appropriate issue type based on the content
       (e.g., 'Story' for user-facing features, 'Task' for technical/chore work,
       'Bug' for defects). Do NOT blindly inherit the source issue type.
     - Title: concise summary (in config.language.issue_content language)
     - Description: User Story format + Acceptance Criteria (Given/When/Then or EARS)
     - Anchor link: explicit reference to a refined.md section/quote
     - estimate_manday: when estimation.json is provided, map the issue to the
       estimation unit(s) it realizes and set the summed expected man-days;
       set null when no unit maps. Never invent numbers without a unit.
     - Each issue must be Independent, Negotiable, Valuable, Estimable, Small, Testable
     Output: JSON array of Story objects."
  - Agent returns: issue list as JSON

Step 4 — 3→1→2 Verification (per Story)
  For each Story produced by `planner`:

  [3] Anchor Link Check
    - Verify the Story has an explicit reference to a refined.md section.
    - Missing anchor → set verification.anchor_link = false on this Story.
    - Present anchor → set verification.anchor_link = true, continue to [1].

  [1] Coherence Check (upper-context consistency, low-cost)
    - Verify the Story content aligns with the overall document goals and context.
    - Deviation detected → set verification.coherence = "FAIL" (or "REVIEW" if ambiguous).
    - Coherent → set verification.coherence = "PASS", continue to [2].

  [2] Reverse-Inference Verification — analyst spawn
    - Spawn agent via Task tool (subagent_type: "imbas:analyst")
    - Input: ALL split Stories reassembled as a whole
    - Instructions: "Compare the reassembled Stories against refined.md.
      Identify any requirements lost, distorted, or fabricated during splitting."
    - Mismatch detected → set verification.reverse_inference = "FAIL" (or "REVIEW") on affected Stories.
    - Match → set verification.reverse_inference = "PASS".

  Autonomous vs Review decision criteria:
    - Criterion A: Split result admits only one interpretation → autonomous pass
    - Criterion B: Content is a reorganization of explicit parent content → autonomous;
      if inference was involved → review escalation

Step 4.5 — Escape Condition Detection
  See escape-conditions.md for full details.

Step 5 — Size Check
  For each Story, verify 4 criteria:
  1. Appropriate scope — not too large for a single sprint
  2. Sufficient specification — AC are detailed enough for development
  3. Independence — minimal coupling with other Stories
  4. Single responsibility — addresses one coherent concern

  If any criterion fails, branch by cause:

  (a) Size exceeded → Horizontal Split
    1. Re-invoke `planner` for the oversized Story only.
    2. Original Story added to manifest.transitions array with reason "horizontal_split" + links:
       - Transition: { issue_ref: <original_story_id>, target_status: <config workflow Done state>, reason: "horizontal_split", status: "pending" }
         Note: issue_ref here is the manifest-internal Story ID; it will be resolved to the actual issue_ref during creation (Step 10).
       - "is split into" link from original to new Stories
       - "split from" link from new Stories to original
       - Umbrella stories (pattern b) are EXCLUDED from transitions — they stay open by design.
    3. New Stories undergo full 3→1→2 verification + size check (loop).

  (b) Conceptually needs sub-Stories → Umbrella Pattern
    1. Keep original Story as umbrella (do NOT delete or mark Done).
    2. Create child Stories under umbrella.
    3. Link children with "relates to" link to umbrella.

Step 6 — stories-manifest.json Generation
  1. Compile final Story list with:
     - Story id, title, description, type
     - status: "pending" (all new Stories)
     - verification results: anchor_link, coherence, reverse_inference
     - size_check result
     - split_from / split_into references
     - estimate_manday (from Step 3 mapping; null when absent)
     - Stories with any verification field not PASS (flagged for review)
  2. Compile links array:
     - Split links ("is split into", "split from")
     - Source split links: If state.source_issue_ref is present, add "split from" link from new issues to the source_issue_ref, and "split into" link from source_issue_ref to new issues.
     - Umbrella links ("relates to")
     - Dependency links:
       - Detect Story-to-Story execution dependencies (e.g., API before UI)
       - Add "blocks" links: { type: "blocks", from: <blocking-story-id>, to: [<blocked-story-ids>], status: "pending" }
       - No circular dependencies allowed
  2.5. Compile transitions array:
     - Horizontal split: For each Story horizontally split in Step 5(a),
       add { issue_ref: <original_story_id>, target_status: <config workflow Done state>, reason: "horizontal_split", status: "pending" }.
     - Source issue: If state.source_issue_ref is present,
       add { issue_ref: <source_issue_ref>, target_status: <config workflow Done state>, reason: "source_split", status: "pending" }.
     - Umbrella patterns: do NOT add transitions (umbrella Stories stay open by design).
  3. Call mcp__plugin_imbas_tools__manifest_save:
     - project_ref, run_id, type: "stories", manifest: <full manifest>
  4. Call mcp__plugin_imbas_tools__manifest_validate:
     - project_ref, run_id, type: "stories"
     - If validation errors: fix and re-save.

Step 7 — Decomposition Review
  1. Display manifest summary:
     - Total issue count (+ total estimate_manday when estimation is linked)
     - Stories requiring review (any verification field not PASS)
     - Split history (which Stories were horizontally split)
     - Umbrella patterns applied
     - Verification results overview
  2. Continue IMMEDIATELY to the approval gate — Step 8 in creation-workflow.md.
     (Modification requests loop back to Step 3 with targeted Stories only.)
```
