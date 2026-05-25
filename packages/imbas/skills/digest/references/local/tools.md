# Tools Used — Local Provider

Loaded when `config.provider === 'local'`.

## Local-only tools

| Tool | Usage |
|------|-------|
| `Glob` | Resolve ID to file path via type prefix |
| `Read` | Read existing file including `## Digest` section |
| `Edit` | Append a new timestamped entry to the `## Digest` section |

No MCP server. No network. `imbas:read-issue` local branch handles the initial
file read; this skill only edits the `## Digest` section at publish time.

Media attachments are not supported for local issues in v1 (local files are
plain markdown; embedded image references can be manual, but
`/atlassian:atlassian-media-analysis` auto-invocation is Jira-only).
