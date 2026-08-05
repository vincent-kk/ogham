# Workflow — Part B: Creation (Steps 8–11)

Runs immediately after Step 7 (decomposition review) in the same continuous operation. Provider-specific execution (Step 9 drift check and Step 10 batch execution) lives in `jira/workflow.md`, `github/workflow.md`, or `local/workflow.md`, selected by `config.provider`. In those files, "Step 2.5" is this Step 9 and "Step 4 / Phases 4a–4d" is this Step 10.

## Step 8 — Approval Gate (user decision point)

Display the execution summary:

- Project: `<KEY>` · Run: `<run-id>` · Provider: `config.provider`
- Items to create: `<pending count>` (items with `status == "pending"` and no `issue_ref`)
- Items to skip (already created): `<skip count>` — idempotent resume
- Links and transitions to apply

Then branch:

- `--dry-run` → display the full planned actions (Epic creation, issues by id/title/type, links from → to, transitions) and STOP with terminal marker: "Split complete (dry-run): manifest saved, nothing created."
- Otherwise ask: **"Proceed with issue creation? (y/n)"**
  - `n` → complete the phase without creating: `mcp__plugin_imbas_tools__run_transition(action: "complete_phase", phase: "split", pending_review: true, stories_created: 0)` and stop with: "Manifest saved for later. Re-run /imbas:split --run <run-id> to create."
  - Modification request → return to Step 3 (decomposition) with the targeted Stories only, then re-verify and re-review.
  - `y` → proceed to Step 9 IN THE SAME TURN.

## Step 9 — Drift Check (State Reconciliation) — provider-specific

Skip entirely for fresh runs (no `issue_ref` anywhere in the manifest). Otherwise route by provider (`jira`/`github`/`local` workflow file, drift section). The provider branch must return one of:

- MATCH: remote state consistent → proceed.
- DRIFT_DELETED: entity missing on the provider → offer reset to `pending` or skip.
- DRIFT_STATE (jira only): entity in unexpected status → offer skip or proceed.

If any DRIFT was detected: display the drift summary table and save the reconciled manifest via `mcp__plugin_imbas_tools__manifest_save` before Step 10.

## Step 10 — Batch Execution — provider-specific

Route by provider workflow file. Both branches must honor:

- **Per-item save**: after EACH item, immediately `mcp__plugin_imbas_tools__manifest_save` so re-runs resume cleanly.
- **Idempotency**: check `status` and `issue_ref` before acting; skip if `issue_ref` already set.
- **Estimation note**: when a Story carries `estimate_manday`, append a line to the issue description: `Estimated: <n> man-days (imbas)`.
- **Labels**: apply lifecycle labels per [label-transitions.md](./label-transitions.md).

### Partial Failure Handling (1:N Links)

When a link has multiple targets (`to` is an array) and some targets fail:

```
1. Track per-target status: each target in the to array is processed independently
2. Successfully created links are NOT rolled back
3. Failed targets are marked "failed" with error details
4. Link item status:
   - "created"  — all targets succeeded
   - "partial"  — some targets succeeded, some failed
   - "failed"   — all targets failed
5. On re-run, only retry targets without issue_ref confirmation
```

## Step 10.5 — Digest Suggestion (after Done transitions)

For each source issue successfully transitioned to Done in Step 10 (any provider):

```
1. From the issue data already fetched during the transition (or one
   [OP: get_issue] if not at hand), read comment_count and distinct authors.
2. IF comment_count >= 3 AND distinct authors >= 2:
   → Append to the result report:
     "This issue has discussion history. Summarize it with `/imbas:digest <issue-ref>`?"
3. NEVER auto-invoke digest — suggestion only.
```

## Step 11 — Result Report & Phase Completion

1. Call `mcp__plugin_imbas_tools__run_transition`:
   - action: "complete_phase", phase: "split"
   - pending_review: false
   - stories_created: `<created count>`

2. Display execution results:
   - Total items processed / created / skipped / failed
   - Transitions: succeeded / failed / skipped
   - Total estimated man-days on created issues (when estimation is linked)

3. Terminal markers:
   - Failures exist → "Split partial failure: <created> created, <failed> failed. Re-run `/imbas:split --run <run-id>` to retry failed items." (list failed items with error details)
   - All succeeded → "Split complete: <N> issues created. Next: /imbas:scaffold-pr <issue-ref> to scaffold a draft PR, or /imbas:status for the run overview."

```

```
