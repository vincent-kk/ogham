# Auto-Approval Gates

Pipeline replaces manual user-review steps with automated quality gates.
Each gate evaluates specific fields and either auto-approves or stops the pipeline.

---

## GATE 1: Validate Result

Evaluates the validation-report.md output from imbas-analyst.

```
AUTO-PROCEED when:
  validate.result == "PASS"
  validate.result == "PASS_WITH_WARNINGS"
    → Accumulate warnings for final report. Display inline: "Proceeding with N warnings."

STOP when:
  validate.result == "BLOCKED"
    → blocking_issues > 0
    → Emit blocker report listing all BLOCKING issues from validation-report.md
```

This gate matches the existing validate → split transition rule in state-manager.ts.
No behavioral change from the individual skill — validate PASS/PASS_WITH_WARNINGS always allowed split entry.

---

## GATE 2: Split Quality

Replaces split skill Step 7 (interactive user review). This is the key pipeline innovation.

### Auto-Approve Criteria

ALL conditions must be true for auto-approval:

```
[ ] No escape conditions triggered
    - E2-1, E2-2, EC-1, EC-2 must NOT have been detected during splitting
    - E2-3 is handled separately (see Special Case below)

[ ] Manifest validation passes
    - imbas_manifest_validate(project_key, run_id, type: "stories") returns 0 errors

[ ] Every Story passes ALL verification checks:
    [ ] verification.anchor_link == true
        → Story has explicit reference to source document section
    [ ] verification.coherence == "PASS"
        → Story content aligns with overall document goals
    [ ] verification.reverse_inference == "PASS"
        → Reassembled Stories match original document (no loss/mutation/addition)
    [ ] size_check == "PASS"
        → Story scope is appropriate (3-8 expected Subtasks, single domain, independent)
```

When all criteria pass:
- Call imbas_run_transition(complete_phase, split, pending_review: false, stories_created: N)
- Proceed to Phase 2.5 (manifest-stories)

### Special Case: E2-3 (Split Unnecessary)

When imbas-planner determines the document is already at appropriate Story size:
- Call imbas_run_transition(escape_phase, split, escape_code: "E2-3")
- SKIP Phase 2.5 (manifest-stories) entirely
- Proceed directly to Phase 3 (devplan)
- This is permitted by existing state transition rules (split escaped with E2-3 allows devplan entry)

### Stop Conditions

ANY of the following triggers pipeline halt:

```
Escape conditions (except E2-3):
  E2-1 (needs elaboration)
    → Blocker details: list of missing information items
    → Resume: supplement the document, then re-run pipeline

  E2-2 (contradiction found)
    → Blocker details: list of conflict points with quotes
    → Resume: resolve conflicts in source, then re-run pipeline

  EC-1 (cannot comprehend)
    → Blocker details: frozen scope + structured queries for clarification
    → Resume: answer queries, update document, then re-run pipeline

  EC-2 (source defect)
    → Blocker details: defect report
    → Resume: fix document, re-validate (/imbas:validate), then re-run pipeline

Verification field failures:
  Any Story with verification.anchor_link == false
    → List affected Story IDs: "S-001 missing anchor link"

  Any Story with verification.coherence != "PASS"
    → List affected Story IDs with coherence value: "S-003 coherence=FAIL"

  Any Story with verification.reverse_inference != "PASS"
    → List affected Story IDs: "S-002 reverse_inference=REVIEW"

  Any Story with size_check != "PASS"
    → List affected Story IDs: "S-004 size_check=FAIL (too large)"

Manifest validation errors:
  → List all validation errors from imbas_manifest_validate
```

### Why This Gate is Safe

The auto-approval criteria are strictly more conservative than what a human reviewer checks:
- Anchor links verified → every Story traces to source
- Coherence verified → no semantic drift
- Reverse-inference verified → no content lost or invented
- Size check verified → no oversized Stories
- Manifest validated → structural integrity confirmed

A human reviewer would typically approve when all these fields are PASS. The pipeline automates exactly this judgment.

---

## GATE 3: Devplan Quality

Replaces devplan skill Step 4 (interactive user review).

### Auto-Approve Criteria

ALL conditions must be true:

```
[ ] Manifest validation passes
    - imbas_manifest_validate(project_key, run_id, type: "devplan") returns 0 errors

[ ] No items flagged for review
    - Every Task: needs_review is absent or false
    - Every Subtask (in tasks[].subtasks and story_subtasks[].subtasks): needs_review is absent or false
```

When all criteria pass:
- Call imbas_run_transition(complete_phase, devplan, pending_review: false)
- Proceed to Phase 3.5 (manifest-devplan)

### Non-Blocking Notes

These are recorded but do NOT stop the pipeline:

```
feedback_comments[] present
  → B→A feedback items exist (Story definition != code reality)
  → Included in final pipeline report
  → Will be posted as Jira comments during manifest execution
  → Non-blocking per "problem space tree unchanged" principle

AST fallback mode activated
  → @ast-grep/napi not available, using LLM-based analysis
  → Note in final report: "AST fallback mode — results may be approximate"
  → Non-blocking: approximate analysis is still useful
```

### Stop Conditions

```
Manifest validation errors:
  → List all validation errors (ID conflicts, broken references, schema issues)

needs_review flagged items:
  → List each flagged item with reason:
    "T1 needs_review=true: Subtask cannot satisfy all 4 termination criteria"
    "S1-ST3 needs_review=true: cross-layer concern (API + DB in one Subtask)"
```

---

## GATE 4: Execution Result

Evaluated after manifest execution (Phase 2.5 and Phase 3.5). This gate does NOT stop the pipeline
because Jira writes are irreversible — already-created items cannot be undone.

```
SUCCESS:
  All items have status "created" with valid jira_key
  → Include in final success report

PARTIAL:
  Some items have status "failed"
  → List failed items with error details
  → Suggest: "/imbas:manifest <type> --run <run-id>" to retry (idempotent — skips created items)

EXCEPTION — Phase 2.5 (manifest-stories) failure:
  If ANY Story fails to create in Phase 2.5, this IS a pipeline stop.
  Reason: Phase 3 (devplan) requires all Stories to have valid jira_keys.
  → STOP with blocker report
  → Resume: "/imbas:manifest stories --run <run-id>" then manual devplan
```
