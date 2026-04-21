# Label Transitions

Reference for label state changes at pipeline phase boundaries.
Skills that call `run_transition` MUST apply the corresponding label
commands IMMEDIATELY AFTER in the same turn.

## Transition Table

| Event | Remove | Add | Jira Extra |
|-------|--------|-----|------------|
| Issue created | — | `config.labels.managed` | — |
| Phase 2.5 complete (stories-manifest done, `pending_review=true`) | — | `config.labels.review_pending` | — |
| Phase 2.5 complete (stories-manifest done, `pending_review=false`) | — | `config.labels.review_complete` | — |
| Review approved (`pending_review` → `false`) | `config.labels.review_pending` | `config.labels.review_complete` | — |
| Phase 3.5 complete (devplan-manifest done) | `config.labels.review_complete` | `config.labels.dev_waiting` | transition to `config.jira.phase_to_workflow.pipeline_exit` |
| (external) dev started | `config.labels.dev_waiting` | `config.labels.dev_in_progress` | — |
| (external) dev done | `config.labels.dev_in_progress` | `config.labels.dev_done` | — |

**Note:** imbas auto-applies rows 1–5 only. Rows 6–7 are define-only (external trigger).

## Provider Commands

### GitHub

- **Add label**: `gh issue edit <N> --repo <owner/repo> --add-label <label>`
- **Remove label**: `gh issue edit <N> --repo <owner/repo> --remove-label <label>`

### Jira

- **Add/Remove labels**: `[OP: edit_issue] issue_ref=<ref>`, update `labels` field.
  If `edit_issue` does full-replace, read existing labels first via `[OP: get_issue]`.
- **Transition status** (two-step — transition IDs must not be hardcoded, see
  `_shared/operations/transition_issue.md`):
  1. `[OP: get_transitions] issue_ref=<ref>` → find the transition id whose target
     matches `<status>`.
  2. `[OP: transition_issue] issue_ref=<ref>, transition.id=<matched_id>`.
  - On failure (HTTP 400/403/404): log warning, continue pipeline. Label is still applied.
  - Message: `"WARNING: Jira transition to '<status>' failed for <ref>: <error>. Label '<dev_waiting>' was applied. Transition may require manual action."`

## Idempotency

On re-run (resume scenario), check if label already exists before adding:
- GitHub: `gh issue view <N> --repo <owner/repo> --json labels` → check label present.
- Jira: `[OP: get_issue] issue_ref=<ref>` → check `labels` array.

Skip add/remove if target state already matches.

## Integration Points

Skills that execute label transitions:
1. `imbas-manifest` — rows 1 (issue creation), 2–3 (stories post-execution), 5 (devplan post-execution)
2. `imbas-pipeline` — row 4 (review approval label swap, after `run_transition(pending_review=false)`)
