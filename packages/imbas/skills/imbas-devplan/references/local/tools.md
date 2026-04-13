# Tools Used — Local Provider

Loaded when `config.provider === 'local'`. Shared imbas MCP tools are in
`../tools.md`.

## Local-only tools

The `engineer` agent uses the same tool set regardless of provider:
`ast_search`, `ast_analyze`, `Read`, `Grep`, `Glob`. No provider-specific tool
is required in local mode.

For optional enrichment (reading existing Story context for pattern matching),
use the `imbas:read-issue` skill which internally routes to its local branch
and resolves IDs via `Glob .imbas/<KEY>/issues/stories/<ID>.md`.

No `atlassian` MCP server calls. No `gh` CLI calls. No network.
