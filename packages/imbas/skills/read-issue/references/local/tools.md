# Tools Used — Local Provider

Loaded when `config.provider === 'local'`.

## Local-only tools

| Tool | Usage |
|------|-------|
| `Glob` | Verify file existence at the ID-derived path |
| `Read` | Read the issue file (frontmatter + body) |

No MCP server. No network. Everything runs through Claude Code's built-in file
tools.
