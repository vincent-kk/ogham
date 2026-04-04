# Error Handling

| Error | Action |
|-------|--------|
| Manifest not found | Display: "No <type>-manifest.json found for run <run-id>. Complete the preceding phase first." |
| No pending items | Display: "All items already created. Nothing to execute." |
| createJiraIssue fails | Log error on the item (status remains "pending"), continue with next item. Report at end. |
| createIssueLink fails | Log error, continue. Common cause: target issue not found (check issue_ref resolution). |
| ID resolution fails (no issue_ref for referenced ID) | Skip link/subtask, log: "Cannot resolve <ID> — parent not yet created." |
| Atlassian MCP not connected | Display: "Atlassian MCP server is not available. Connect it first." |
| Partial failure mid-batch | Manifest is saved after each item. Re-run is safe — skips created items. |
| Remote issue deleted (drift) | WARN: "Issue <ref> deleted externally." Offer to reset status to pending for re-creation, or skip. |
| Remote issue in unexpected state (drift) | WARN: "Issue <ref> in '<state>' — expected '<expected>'." Offer to skip or proceed. |
| Drift check API failure | NON-BLOCKING: Log warning "Could not verify <ref> — proceeding with manifest state." Continue execution. |
