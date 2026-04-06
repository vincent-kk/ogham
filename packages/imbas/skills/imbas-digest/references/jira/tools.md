# Tools Used — Jira Provider

Loaded when `config.provider === 'jira'`.

## Jira Operations

| Operation | Usage |
|-----------|-------|
| `[OP: add_comment]` | Post the formatted digest comment to Jira (Step 6 publish) |
| `[OP: get_issue]` | Used transitively by `imbas:read-issue` Jira branch to load the comment thread |

Media attachments (images, videos, GIFs) are handled by the `/imbas:imbas-fetch-media`
skill which also uses semantic operations.

The LLM resolves which tool to use at runtime based on the session's available tools.
