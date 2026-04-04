# Preconditions

## Preconditions

From state.json:
- `split.status == "completed"` AND `split.pending_review == false`
  OR `split.status == "escaped"` AND `split.escape_code == "E2-3"`

From stories-manifest.json:
- All Stories must have `status: "created"` with valid `issue_ref`
- If any Story has `status: "pending"` → block with message:
  "Run /imbas:manifest stories first to create Jira issues."
