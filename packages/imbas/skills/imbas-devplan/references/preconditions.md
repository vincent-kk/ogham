# Preconditions

## Preconditions

From state.json:
- `split.status == "completed"` AND `split.pending_review == false`
  OR `split.status == "escaped"` AND `split.escape_code == "E2-3"`

From stories-manifest.json:
- All Stories must have `status: "created"` with valid `issue_ref`
- If any Story has `status: "pending"` → block with message:
  "Run /imbas:imbas-manifest stories first to create Jira issues."

### Exception — E2-3 escape upstream

When `split.escape_code == "E2-3"`, the upstream skill (`imbas-split` when run
standalone, or `imbas-pipeline` in pipeline mode) generates a single-Story
`stories-manifest.json` representing the source document as-is (no issues created).
In this specific case, devplan accepts the pending Story as a valid input state —
the document itself is passed as context to `engineer`, bypassing the
normal issue-creation prerequisite.
