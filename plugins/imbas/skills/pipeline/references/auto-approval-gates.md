# Auto-Approval Gates

Pipeline replaces manual user-review steps with automated quality gates. Each gate evaluates specific fields and either auto-approves or stops the pipeline.

---

## GATE 1: Refine Result

Evaluates the refine phase output from `analyst`.

```
AUTO-PROCEED when:
  refine.result == "PASS"
  refine.result == "PASS_WITH_WARNINGS"
    → Accumulate warnings for final report. Display inline: "Proceeding with N warnings."

STOP when:
  refine.result == "BLOCKED"
    → blocking_issues > 0
    → Emit blocker report listing all BLOCKING issues from validation-report.md
```

This gate matches the state machine's own rule — refine PASS/PASS_WITH_WARNINGS is what allows estimate/split entry.

---

## GATE 2: Estimation Integrity

Evaluated after the `estimator` output is saved. Estimation is informational — the gate checks integrity, not the numbers.

```
AUTO-PROCEED when:
  mcp__plugin_imbas_tools__manifest_validate(project_ref, run_id, type: "estimation")
    returns 0 errors
  → Warnings (milestone beyond horizon, unknown risk unit) are accumulated
    for the final report, not blocking.

STOP when:
  Validation errors exist (duplicate unit IDs, unknown deps, double-scheduled
  units, inverted confidence interval)
  → Emit blocker report with the error list. Resume: re-run /imbas:estimate --run <run-id>.
```

Skipped entirely with `--skip-estimate` (estimate.status = "skipped").

---

## GATE 3: Split Quality

Replaces the `imbas:split` skill's interactive approval gate (creation-workflow Step 8).

### Auto-Approve Criteria

ALL conditions must be true for auto-approval:

```
[ ] No escape conditions triggered
    - E2-1, E2-2, EC-1, EC-2 must NOT have been detected during splitting
    - E2-3 is handled separately (see Special Case below)

[ ] Manifest validation passes
    - mcp__plugin_imbas_tools__manifest_validate(project_ref, run_id, type: "stories") returns 0 errors

[ ] Every Story passes ALL verification checks:
    [ ] verification.anchor_link == true
        → Story has explicit reference to a refined.md section
    [ ] verification.coherence == "PASS"
        → Story content aligns with overall document goals
    [ ] verification.reverse_inference == "PASS"
        → Reassembled Stories match refined.md (no loss/mutation/addition)
    [ ] size_check == "PASS"
        → Story scope is appropriate (single domain, independent)
```

When all criteria pass: proceed to creation (Steps 9–11) IN THE SAME TURN.

### Special Case: E2-3 (Split Unnecessary)

When `planner` determines the document is already at appropriate Story size:

- A single-Story stories-manifest.json is saved (escape-conditions.md rule)
- run_transition(escape_phase, split, escape_code: "E2-3")
- Proceed to creation with the single-Story manifest

### Stop Conditions

ANY of the following triggers pipeline halt:

```
Escape conditions (except E2-3):
  E2-1 (needs elaboration)   → list missing information; resume: supplement the document, re-run
  E2-2 (contradiction found) → list conflict points; resume: resolve conflicts, re-run
  EC-1 (cannot comprehend)   → frozen scope + structured queries; resume: answer, update, re-run
  EC-2 (source defect)       → defect report; resume: fix document, /imbas:refine, re-run

Verification field failures:
  Any Story with anchor_link == false / coherence != "PASS" /
  reverse_inference != "PASS" / size_check != "PASS"
  → List affected Story IDs with the failing field and value

Manifest validation errors:
  → List all errors from mcp__plugin_imbas_tools__manifest_validate
```

### Why This Gate is Safe

The auto-approval criteria are strictly more conservative than what a human reviewer checks: every Story traces to the refined document, no semantic drift, no content lost or invented, no oversized Stories, and the manifest is structurally valid. The pipeline automates exactly that judgment.

---

## GATE 4: Execution Result

Evaluated after provider batch execution.

```
SUCCESS:
  All items have status "created" with valid issue_ref
  → run_transition complete_phase(split, pending_review: false, stories_created: N)
  → FINAL completion report

PARTIAL / FAILURE:
  Some items have status "failed"
  → STOP with partial-failure report
  → List failed items with error details
  → Resume: "/imbas:split --run <run-id>" — idempotent, retries only missing items
```

Issue writes are irreversible — already-created items are never rolled back; the manifest ledger keeps them and the retry skips them.
