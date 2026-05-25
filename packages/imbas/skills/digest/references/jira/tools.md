# Tools Used — Jira Provider

Loaded when `config.provider === 'jira'`.

## Jira Operations

| Operation | Usage |
|-----------|-------|
| [`[OP: add_comment]`](../../../_shared/operations/add_comment.md) | Post the formatted digest comment to Jira (Step 6 publish) |
| [`[OP: get_issue]`](../../../_shared/operations/get_issue.md) | Used transitively by `imbas:read-issue` Jira branch to load the comment thread |

Media attachments (images, videos, GIFs) are handled by the `/atlassian:atlassian-media-analysis`
skill which also uses semantic operations.

The LLM resolves which tool to use at runtime. Read the linked operation files for REST fallback details.
