---
name: imbas-validate
user_invocable: true
description: >
  Phase 1 of the imbas pipeline. Validates a planning document for contradictions,
  divergences, omissions, and logical infeasibilities. Produces a markdown validation report.
  Trigger: "validate spec", "check document", "정합성 검증", "문서 검증"
version: "1.0.0"
complexity: moderate
plugin: imbas
---

# imbas-validate — Phase 1 Document Validation

Validates a planning document for internal consistency, producing a structured
validation report that gates entry to Phase 2 (split).

## When to Use This Skill

- Starting a new imbas pipeline run with a planning document
- Re-validating a document after corrections
- Checking a Confluence page for consistency before story splitting

## Arguments

```
/imbas:validate <source> [--project <KEY>] [--supplements <path,...>]

<source>       : Planning document path (local md/txt) or Confluence URL
--project      : Jira project key (overrides config.defaults.project_key)
--supplements  : Supplementary material paths (comma-separated)
```

## Workflow

```
Step 1 — Run Initialization
  1. Load config.json via imbas_config_get.
  2. Determine project key: --project argument > config.defaults.project_key.
     If neither available → error: "No project key. Run /imbas:setup or pass --project."
  3. Call imbas_run_create with:
     - project_key: <determined key>
     - source_file: <source path>
     - supplements: <supplement paths array> (if provided)
     → Returns: run_id, run_dir, initial state
  4. Side effects of imbas_run_create:
     - Creates .imbas/<KEY>/runs/<YYYYMMDD-NNN>/ directory
     - Copies source document → source.md (immutable copy principle)
     - Copies supplements → supplements/ directory
     - Initializes state.json (current_phase: "validate", all phases: "pending")
  5. Call imbas_run_transition with:
     - project_key, run_id, action: "start_phase", phase: "validate"
     → Sets validate.status = "in_progress", validate.started_at = now()

Step 2 — Document Source Resolution
  - Local file (*.md, *.txt):
    - Already copied to source.md by imbas_run_create. Read directly.
  - Confluence URL:
    - Call Atlassian MCP: getConfluencePage(pageId extracted from URL)
    - Convert response to markdown and save as source.md in run directory.
    - If page contains embedded media (images, videos):
      → Display: "Media attachments detected. Run /imbas:fetch-media to include visual context."
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
    "Perform 4-type validation on the provided planning document:
     1. Contradictions (모순): statements that conflict with each other
     2. Divergences (이격): requirements that drift from stated goals
     3. Omissions (누락): missing requirements implied but not stated
     4. Logical infeasibilities (논리적 불능): technically impossible requirements

     For each issue found, classify as BLOCKING or WARNING:
     - BLOCKING: prevents meaningful story splitting (must be resolved first)
     - WARNING: can proceed but should be addressed

     Output: validation-report.md in the run directory."
  - Agent writes: validation-report.md to the run directory

Step 4 — Result Evaluation Gate
  Parse validation-report.md and determine result:

  - BLOCKING issues exist (count > 0):
    → result = "BLOCKED"
    → Display blocking issues list to user
    → Message: "Validation BLOCKED. Resolve the above issues in the source document, then re-run /imbas:validate."

  - No BLOCKING, but WARNING issues exist:
    → result = "PASS_WITH_WARNINGS"
    → Display warning issues list to user
    → Message: "Validation PASSED with warnings. Review the warnings above. You may proceed to Phase 2 (/imbas:split)."

  - No issues found:
    → result = "PASS"
    → Message: "Validation PASSED. Proceed to Phase 2: /imbas:split [--run <run-id>]"

Step 5 — State Update
  Call imbas_run_transition with:
  - project_key, run_id
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

## Output

`validation-report.md` saved in the run directory at:
`.imbas/<KEY>/runs/<run-id>/validation-report.md`

Report format is defined by the imbas-analyst agent (see SPEC-agents.md §2.2).

## Tools Used

### imbas MCP Tools

| Tool | Usage |
|------|-------|
| `imbas_run_create` | Create run directory, copy source, initialize state.json |
| `imbas_run_get` | Read current run state (for precondition checks) |
| `imbas_run_transition` | start_phase (validate) → complete_phase (validate) with result |

### Atlassian MCP Tools

| Tool | Usage |
|------|-------|
| `getConfluencePage` | Fetch Confluence page content when source is a URL |
| `searchConfluenceUsingCql` | Resolve references to other Confluence pages |

## Agent Spawn

| Agent | Model | Purpose |
|-------|-------|---------|
| `imbas-analyst` | config.defaults.llm_model.validate | Perform 4-type validation (contradictions, divergences, omissions, infeasibilities) |

Spawn instructions:
- Provide source.md + all supplements as input context
- Set language for report output per config.language.reports
- Agent writes validation-report.md directly to the run directory
- Agent does NOT have access to pipeline/manifest tools — skill handles all state updates

## Error Handling

| Error | Action |
|-------|--------|
| No project key available | Display: "No project key configured. Run /imbas:setup first or pass --project KEY." |
| Source file not found | Display: "Source file not found: <path>. Check the path and try again." |
| Confluence URL invalid / page not found | Display: "Could not fetch Confluence page. Verify the URL and your permissions." |
| imbas_run_create fails | Display error from tool. Common: "Run directory already exists" → suggest new run or specify different source. |
| imbas-analyst agent fails | Set validate.result = "BLOCKED" with note: "Agent error during validation. Check source document format." |
| imbas_run_transition precondition fail | Display: "Cannot transition: <error message from tool>." |

## State Transitions

```
Entry state:
  validate.status = "pending"

During execution:
  start_phase("validate") → validate.status = "in_progress"

Exit states:
  complete_phase("validate", result="PASS")
    → validate.status = "completed", validate.result = "PASS"
    → split phase entry ALLOWED

  complete_phase("validate", result="PASS_WITH_WARNINGS")
    → validate.status = "completed", validate.result = "PASS_WITH_WARNINGS"
    → split phase entry ALLOWED (warnings displayed)

  complete_phase("validate", result="BLOCKED")
    → validate.status = "completed", validate.result = "BLOCKED"
    → split phase entry DENIED until re-validation passes
```
