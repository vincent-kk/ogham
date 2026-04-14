# imbas-validate — Error Handling

## Error Handling

| Error | Action |
|-------|--------|
| No project key available | Display: "No project key configured. Run /imbas:imbas-setup first or pass --project KEY." |
| Source file not found | Display: "Source file not found: <path>. Check the path and try again." |
| Confluence URL invalid / page not found | Display: "Could not fetch Confluence page. Verify the URL and your permissions." |
| mcp_tools_run_create fails | Display error from tool. Common: "Run directory already exists" → suggest new run or specify different source. |
| `analyst` agent fails | Set validate.result = "BLOCKED" with note: "Agent error during validation. Check source document format." |
| mcp_tools_run_transition precondition fail | Display: "Cannot transition: <error message from tool>." |
