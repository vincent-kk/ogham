# digest — Error Handling

| Error | Action |
|-------|--------|
| Issue not found | Display: "Issue {key} not found. Verify the issue key." |
| No comments on issue | Display: "Issue {key} has no comments. Digest requires comment history." Proceed with description-only digest. |
| Atlassian MCP not connected | Display: "Atlassian MCP server is not available. Connect it first." |
| Comment post failure | Display error details. Offer to save digest as local file instead. |
| Media fetch failure | Log warning, continue digest without media context. |
