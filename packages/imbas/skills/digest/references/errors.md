# digest — Error Handling

| Error | Action |
|-------|--------|
| Issue not found | Display: "Issue {key} not found. Verify the issue key." |
| No comments on issue | Display warning: "Issue {key} has no comments — decision/open-question extraction is not possible. Generating description-only summary." Proceed with description-only digest (Decisions and Open Questions sections will be empty). |
| Atlassian MCP not connected | Display: "Atlassian MCP server is not available. Connect it first." |
| Comment post failure | Display error details. Offer to save digest as local file instead. |
| Media fetch failure | Log warning, continue digest without media context. |
