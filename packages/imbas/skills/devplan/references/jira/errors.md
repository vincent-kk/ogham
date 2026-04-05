# Error Handling — Jira Provider

Provider-agnostic devplan errors are in `../errors.md`.

| Error | Action |
|-------|--------|
| Atlassian MCP not connected during optional Step 2 enrichment | Log warning; proceed with codebase-only exploration; do not block. |
| feedback_comment `target_ref` cannot be resolved to a Jira key | Skip the comment. Log warning. Continue. |
