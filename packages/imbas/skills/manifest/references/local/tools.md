# Tools Used — Local Provider

Loaded when `config.provider === 'local'`. Provider-agnostic imbas MCP tools
(`run_get`, `manifest_get`, `manifest_save`, `manifest_plan`) are documented in
`../tools.md` and are used by all providers.

## Local-only tools (no MCP server)

| Tool | Usage |
|------|-------|
| `Glob` | Locate existing issue files, compute max N for ID allocation, resolve ID → path |
| `Read` | Parse existing issue frontmatter for drift check and link updates |
| `Write` | Create new issue files (stories/tasks/subtasks) with frontmatter + body |
| `Edit` | Append to existing file's `links[]` (bidirectional links) or `## Digest` section |

No MCP server is used. No network calls. All local provider I/O happens through
Claude Code's built-in file tools.
