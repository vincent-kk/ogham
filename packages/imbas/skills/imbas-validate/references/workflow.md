# imbas-validate — Workflow

```
Step 1 — Run Initialization
  1. Load config.json via config_get.
  2. Determine project key: --project argument > config.defaults.project_ref.
     If neither available → error: "No project key. Run /imbas:imbas-setup or pass --project."
  3. Call run_create with:
     - project_ref: <determined key>
     - source_file: <source path>
     - supplements: <supplement paths array> (if provided)
     → Returns: run_id, run_dir, initial state
  4. Side effects of run_create:
     - Creates .imbas/<KEY>/runs/<YYYYMMDD-NNN>/ directory
     - Copies source document → source.md (immutable copy principle)
     - Copies supplements → supplements/ directory
     - Initializes state.json (current_phase: "validate", all phases: "pending")
  5. Call run_transition with:
     - project_ref, run_id, action: "start_phase", phase: "validate"
     → Sets validate.status = "in_progress", validate.started_at = now()

Step 2 — Document Source Resolution
  - Local file (*.md, *.txt):
    - Already copied to source.md by run_create. Read directly.
  - Confluence URL:
    - Call Atlassian MCP: getConfluencePage(pageId extracted from URL)
    - Convert response to markdown and save as source.md in run directory.
    - If page contains embedded media (images, videos):
      → Display: "Media attachments detected. Run /imbas:imbas-fetch-media to include visual context."
      → Do NOT auto-invoke fetch-media.
  - If source contains references to other Confluence pages:
    - Call Atlassian MCP: searchConfluenceUsingCql to resolve references.
    - Save referenced content as supplements.

Step 3 — imbas-analyst Agent Spawn
  - Spawn agent: imbas-analyst
  - Model: config.defaults.llm_model.validate (default: "sonnet")
  - Input provided to agent:
    - source.md (full content)
    - supplements/*.md (all supplement files)
    - config.json language settings
  - Agent instructions:
    "Perform 5-type validation on the provided planning document:
     1. Contradictions (모순): statements that conflict with each other
     2. Divergences (이격): requirements that drift from stated goals
     3. Omissions (누락): missing requirements implied but not stated
     4. Logical infeasibilities (논리적 불능): technically impossible requirements
     5. Testability (테스트 가능성): requirements lacking measurable acceptance criteria

     For each issue found, classify as BLOCKING or WARNING:
     - BLOCKING: prevents meaningful story splitting (must be resolved first)
     - WARNING: can proceed but should be addressed

     Output: validation-report.md in the run directory."
  - Agent returns: validation-report.md content. Skill saves to run directory.

Step 4 — Result Evaluation Gate
  Parse validation-report.md and determine result:

  - BLOCKING issues exist (count > 0):
    → result = "BLOCKED"
    → Display blocking issues list to user
    → Message: "Validation BLOCKED. Resolve the above issues in the source document, then re-run /imbas:imbas-validate."

  - No BLOCKING, but WARNING issues exist:
    → result = "PASS_WITH_WARNINGS"
    → Display warning issues list to user
    → Message: "Validation PASSED with warnings. Review the warnings above. You may proceed to Phase 2 (/imbas:imbas-split)."

  - No issues found:
    → result = "PASS"
    → Message: "Validation PASSED. Proceed to Phase 2: /imbas:imbas-split [--run <run-id>]"

Step 5 — State Update
  Call run_transition with:
  - project_ref, run_id
  - action: "complete_phase"
  - phase: "validate"
  - result: "PASS" | "PASS_WITH_WARNINGS" | "BLOCKED"
  - blocking_issues: <count>
  - warning_issues: <count>

  → Sets validate.status = "completed", validate.completed_at = now()
  → Advances current_phase based on result

  Display run summary:
  - Run ID: <run-id>
  - Project: <KEY>
  - Result: <result>
  - Blocking: <count>, Warnings: <count>
  - Next step guidance based on result
```
