# Error Handling

| Error | Action |
|-------|--------|
| Manifest not found | Display: "No <type>-manifest.json found for run <run-id>. Complete the preceding phase first." |
| No pending items | Display: "All items already created. Nothing to execute." |
| createJiraIssue fails | Log error on the item (status remains "pending"), continue with next item. Report at end. |
| createIssueLink fails | Log error, continue. Common cause: target issue not found (check jira_key resolution). |
| ID resolution fails (no jira_key for referenced ID) | Skip link/subtask, log: "Cannot resolve <ID> — parent not yet created." |
| Atlassian MCP not connected | Display: "Atlassian MCP server is not available. Connect it first." |
| Partial failure mid-batch | Manifest is saved after each item. Re-run is safe — skips created items. |
