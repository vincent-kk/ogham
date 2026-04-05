# Error Handling — Jira Provider

Provider-agnostic errors are in `../errors.md`. This file lists Jira-specific
error cases triggered inside `workflow.md` (this directory).

| Error | Action |
|-------|--------|
| `createJiraIssue` fails | Log error on the item (status remains `pending`), continue with next item. Report at end. |
| `createIssueLink` fails | Log error, continue. Common cause: target issue not found (check `issue_ref` resolution). |
| Atlassian MCP not connected | Display: "Atlassian MCP server is not available. Connect it first." |
| Remote issue deleted (drift) | WARN: "Issue `<ref>` deleted externally." Offer to reset status to pending for re-creation, or skip. |
| Remote issue in unexpected state (drift) | WARN: "Issue `<ref>` in '`<state>`' — expected '`<expected>`'." Offer to skip or proceed. |
| Drift check API failure | NON-BLOCKING: log "Could not verify `<ref>` — proceeding with manifest state." Continue execution. |
