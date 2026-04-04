---
name: imbas-split
user_invocable: true
description: >
  Phase 2 of the imbas pipeline. Splits a validated document into INVEST-compliant
  Jira Stories. Applies 3→1→2 verification, size checks, and horizontal splitting.
  Trigger: "split stories", "story 분할", "Phase 2", "imbas split"
version: "1.0.0"
complexity: complex
plugin: imbas
---

# imbas-split — Phase 2 Story Splitting

Splits a validated planning document into INVEST-compliant Jira Stories with
3→1→2 verification, size checks, and horizontal splitting when needed.

## When to Use This Skill

- After Phase 1 (validate) completes with PASS or PASS_WITH_WARNINGS
- To re-split stories after user feedback on a previous split
- To continue a split that was escaped (E2-3 allows direct Phase 3 entry)

## Arguments

```
/imbas:split [--run <run-id>] [--epic <EPIC-KEY>]

--run    : Existing run ID (if omitted, uses most recent PASS/PASS_WITH_WARNINGS run)
--epic   : Epic Jira key (if omitted, prompts for Epic creation or selection)
```

## Preconditions

From state.json:
- `validate.status == "completed"`
- `validate.result` in `["PASS", "PASS_WITH_WARNINGS"]`

If not met → error: "Phase 1 (validate) must complete with PASS before splitting. Run /imbas:validate first."

## Workflow

```
Step 1 — Load Run & Verify Preconditions
  1. If --run provided: call imbas_run_get(project_key, run_id).
     If not provided: call imbas_run_get(project_key) → returns most recent run.
  2. Verify validate.status == "completed" and validate.result in ["PASS", "PASS_WITH_WARNINGS"].
     - If PASS_WITH_WARNINGS: display warning list from validation-report.md.
     - If not met: error with guidance.
  3. Call imbas_run_transition:
     - action: "start_phase", phase: "split"
     → Sets split.status = "in_progress", current_phase = "split"

Step 2 — Epic Decision Flow
  - If --epic provided:
    1. Call Atlassian MCP: getJiraIssue(epicKey) to verify existence.
    2. If found: store epic_key in state.json via imbas_run_transition context.
    3. If not found: error: "Epic <KEY> not found in Jira."
  - If --epic NOT provided:
    1. Ask user: "Create a new Epic for this split, or use an existing one?"
       Options:
       a) "Create new Epic" → Add Epic entry to stories-manifest.json
          (Epic will be created when manifest is executed)
       b) "Use existing Epic" → User enters Epic key → verify with getJiraIssue
       c) "No Epic" → Stories created without parent Epic

Step 3 — imbas-planner Agent Spawn (Story Splitting)
  - Spawn agent: imbas-planner
  - Model: config.defaults.llm_model.split (default: "sonnet")
  - Input provided to agent:
    - source.md (full planning document)
    - supplements/*.md (all supplement files)
    - Epic information (key or "new Epic" marker)
    - config.json language settings (for Story title/description language)
  - Agent instructions:
    "Split the planning document into INVEST-compliant Jira Stories.
     For each Story:
     - Title: concise summary (in config.language.jira_content language)
     - Description: User Story format + Acceptance Criteria (Given/When/Then or EARS)
     - Anchor link: explicit reference to source document section/quote
     - Each Story must be Independent, Negotiable, Valuable, Estimable, Small, Testable
     Output: JSON array of Story objects."
  - Agent returns: Story list as JSON

Step 4 — 3→1→2 Verification (per Story)
  For each Story produced by imbas-planner:

  [3] Anchor Link Check
    - Verify the Story has an explicit reference to a source document section.
    - Missing anchor → set review_escalation flag on this Story.
    - Present anchor → continue to [1].

  [1] Coherence Check (upper-context consistency, low-cost)
    - Verify the Story content aligns with the overall document goals and context.
    - Deviation detected → set review_escalation flag.
    - Coherent → continue to [2].

  [2] Reverse-Inference Verification — imbas-analyst spawn
    - Spawn agent: imbas-analyst
    - Input: ALL split Stories reassembled as a whole
    - Instructions: "Compare the reassembled Stories against the original source.md.
      Identify any requirements lost, distorted, or fabricated during splitting."
    - Mismatch detected → set review_escalation flag on affected Stories.
    - Match → autonomous pass.

  Autonomous vs Review decision criteria:
    - Criterion A: Split result admits only one interpretation → autonomous pass
    - Criterion B: Content is a reorganization of explicit parent ticket content → autonomous;
      if inference was involved → review escalation

Step 4.5 — Escape Condition Detection
  During the splitting process, if any of these conditions are detected, IMMEDIATELY
  escape with a structured report ("escape is a report" principle):

  | Code | Situation | Action |
  |------|-----------|--------|
  | E2-1 | Needs elaboration — insufficient information | List missing information items + request human supplementation |
  | E2-2 | Contradiction/conflict discovered | Specify conflict points + request human decision |
  | E2-3 | Split unnecessary — already appropriate size | Direct entry to Phase 3 allowed |
  | EC-1 | Cannot comprehend — uninterpretable | Freeze scope + structure queries for clarification |
  | EC-2 | Source defect discovered | Generate defect report (recommend Phase 1 re-validation) |

  On escape:
  1. Call imbas_run_transition:
     - action: "escape_phase", phase: "split", escape_code: "<code>"
     → Sets split.status = "escaped", split.escape_code = "<code>"
  2. Display structured escape report to user.
  3. For E2-3: inform user that /imbas:devplan can proceed directly.
  4. For E2-1, E2-2, EC-1, EC-2: inform user that human intervention is required
     before pipeline can continue.

Step 5 — Size Check
  For each Story, verify 4 criteria:
  1. Appropriate scope — not too large for a single sprint
  2. Sufficient specification — AC are detailed enough for development
  3. Independence — minimal coupling with other Stories
  4. Single responsibility — addresses one coherent concern

  If any criterion fails, branch by cause:

  (a) Size exceeded → Horizontal Split
    1. Re-invoke imbas-planner for the oversized Story only.
    2. Original Story marked for "Done" processing + links:
       - "is split into" link from original to new Stories
       - "split from" link from new Stories to original
    3. New Stories undergo full 3→1→2 verification + size check (loop).

  (b) Conceptually needs sub-Stories → Umbrella Pattern
    1. Keep original Story as umbrella (do NOT delete or mark Done).
    2. Create child Stories under umbrella.
    3. Link children with "relates to" link to umbrella.
    4. Subtasks are created only on child Stories, NOT on umbrella.

Step 6 — stories-manifest.json Generation
  1. Compile final Story list with:
     - Story id, title, description, type
     - status: "pending" (all new Stories)
     - verification results: anchor_link, coherence, reverse_inference
     - size_check result
     - split_from / split_into references
     - review_escalation flags
  2. Compile links array:
     - Split links ("is split into", "split from")
     - Umbrella links ("relates to")
  3. Call imbas_manifest_save:
     - project_key, run_id, type: "stories", manifest: <full manifest>
  4. Call imbas_manifest_validate:
     - project_key, run_id, type: "stories"
     - If validation errors: fix and re-save.

Step 7 — User Review Flow
  1. Display manifest summary:
     - Total Story count
     - Stories requiring review (review_escalation flagged)
     - Split history (which Stories were horizontally split)
     - Umbrella patterns applied
     - Verification results overview
  2. Wait for user decision:

  Option A — Approve:
    1. Call imbas_run_transition:
       - action: "complete_phase", phase: "split"
       - pending_review: false
       - stories_created: <count>
       → Sets split.status = "completed", split.pending_review = false
    2. Display: "Phase 2 complete. Next: /imbas:manifest stories to create Jira issues,
       then /imbas:devplan for Phase 3."

  Option B — Request modifications:
    1. User specifies which Stories need changes and what changes.
    2. Re-enter Step 3 with targeted Stories only.
    3. Re-run verification (Step 4) on modified Stories.
    4. Return to Step 7 for re-review.
```

## Output

`stories-manifest.json` saved in the run directory at:
`.imbas/<KEY>/runs/<run-id>/stories-manifest.json`

Schema defined in SPEC-state.md §6.

## Tools Used

### imbas MCP Tools

| Tool | Usage |
|------|-------|
| `imbas_run_get` | Load run state, verify preconditions |
| `imbas_run_transition` | start_phase(split), complete_phase(split), escape_phase(split) |
| `imbas_manifest_save` | Save stories-manifest.json |
| `imbas_manifest_validate` | Validate manifest structural integrity |

### Atlassian MCP Tools

| Tool | Usage |
|------|-------|
| `getJiraIssue` | Verify Epic existence when --epic provided |
| `searchJiraIssuesUsingJql` | Search for existing related Stories/Epics |

## Agent Spawn

| Agent | Model | Purpose |
|-------|-------|---------|
| `imbas-planner` | config.defaults.llm_model.split | INVEST-compliant Story splitting from source document |
| `imbas-analyst` | config.defaults.llm_model.split | Reverse-inference verification (Step 4 [2]) |

### imbas-planner Spawn Instructions

- Provide source.md + supplements + Epic info as input context
- Set output language per config.language.jira_content
- Agent returns JSON Story array — skill handles manifest creation
- Agent does NOT have pipeline/manifest tool access

### imbas-analyst Spawn Instructions (Reverse-Inference)

- Provide ALL split Stories reassembled as a single document
- Provide original source.md for comparison
- Agent returns mismatch report — skill interprets results and sets flags
- Agent does NOT modify Stories directly

## Error Handling

| Error | Action |
|-------|--------|
| Precondition not met (validate incomplete) | Display: "Phase 1 must complete first. Run /imbas:validate <source>." |
| PASS_WITH_WARNINGS and user declines | Display warnings and ask: "Proceed despite warnings, or re-validate?" |
| Epic key not found | Display: "Epic <KEY> not found. Check the key or choose 'Create new Epic'." |
| imbas-planner produces no Stories | Trigger escape E2-3 if document is already atomic; otherwise E2-1. |
| Manifest validation fails | Log errors, attempt auto-fix (ID dedup, link resolution), re-validate. |
| imbas_run_transition fails | Display precondition error from tool. |

## State Transitions

```
Entry state:
  validate.status = "completed", validate.result in ["PASS", "PASS_WITH_WARNINGS"]
  split.status = "pending"

During execution:
  start_phase("split") → split.status = "in_progress"

Exit states:
  complete_phase("split", pending_review=false):
    → split.status = "completed", split.pending_review = false
    → devplan phase entry ALLOWED

  complete_phase("split", pending_review=true):
    → split.status = "completed", split.pending_review = true
    → devplan phase entry DENIED until review approved

  escape_phase("split", escape_code="E2-1"):
    → split.status = "escaped" — needs human elaboration
    → devplan phase entry DENIED

  escape_phase("split", escape_code="E2-2"):
    → split.status = "escaped" — needs human decision on conflicts
    → devplan phase entry DENIED

  escape_phase("split", escape_code="E2-3"):
    → split.status = "escaped" — split unnecessary, already appropriate size
    → devplan phase entry ALLOWED

  escape_phase("split", escape_code="EC-1"):
    → split.status = "escaped" — uninterpretable, scope frozen
    → devplan phase entry DENIED

  escape_phase("split", escape_code="EC-2"):
    → split.status = "escaped" — source defect, re-validate recommended
    → devplan phase entry DENIED
```
