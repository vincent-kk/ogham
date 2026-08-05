# Label Transitions

Reference for label state changes at pipeline phase boundaries. Skills that call `run_transition` MUST apply the corresponding label commands IMMEDIATELY AFTER in the same turn.

## Transition Table

| Event                                                     | Remove                          | Add                             | Jira Extra                                                  |
| --------------------------------------------------------- | ------------------------------- | ------------------------------- | ----------------------------------------------------------- |
| Issue created                                             | —                               | `config.labels.managed`         | —                                                           |
| Split decomposition saved (`pending_review=true`)         | —                               | `config.labels.review_pending`  | —                                                           |
| Split decomposition saved (`pending_review=false`)        | —                               | `config.labels.review_complete` | —                                                           |
| Review approved (`pending_review` → `false`)              | `config.labels.review_pending`  | `config.labels.review_complete` | —                                                           |
| Issue creation complete (stories created on the provider) | `config.labels.review_complete` | `config.labels.dev_waiting`     | transition to `config.jira.phase_to_workflow.pipeline_exit` |
| (external) dev started                                    | `config.labels.dev_waiting`     | `config.labels.dev_in_progress` | —                                                           |
| (external) dev done                                       | `config.labels.dev_in_progress` | `config.labels.dev_done`        | —                                                           |

**Note:** imbas auto-applies rows 1–5 only. Rows 6–7 are define-only (external trigger).

## Provider Commands

### Local

The local provider has no label surface: issue files carry their lifecycle in the frontmatter `status` field only, and `config.labels.*` does not apply. Skip every row of the transition table when `config.provider === 'local'`.

### GitHub

- **Add label**: `gh issue edit <N> --repo <owner/repo> --add-label <label>`
- **Remove label**: `gh issue edit <N> --repo <owner/repo> --remove-label <label>`

### Jira

- **Add/Remove labels**: `[OP: edit_issue] issue_ref=<ref>`, update `labels` field. If `edit_issue` does full-replace, read existing labels first via `[OP: get_issue]`.
- **Transition status** (two-step — transition IDs must not be hardcoded, see `.shared/operations/transition_issue.md`):
  1. `[OP: get_transitions] issue_ref=<ref>` → find the transition id whose target matches `<status>`.
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

1. `split` — rows 1 (issue creation), 2–3 (post-decomposition), 5 (post-creation)
2. `pipeline` — row 4 (review approval label swap, after `run_transition(pending_review=false)`)
