## Purpose

Read-only Claude Code plugin providing access to maencof vault knowledge from development contexts.

## Structure

- `src/config/` — Config loader for .maencof-lens/config.json
- `src/vault/` — Multi-vault routing and graph caching
- `src/filter/` — Layer filtering logic
- `src/tools/` — 5 MCP tool wrappers (lens_search/context/navigate/read/status)
- `src/mcp/` — MCP server setup
- `src/hooks/` — SessionStart prompt injection

## Conventions

- All vault access is read-only; never write to vault filesystem
- Import handlers from @ogham/maencof; never duplicate logic
- Layer filtering: vault config ceiling intersected with per-call filter

## Boundaries

### Always do

- Validate vault path existence before graph loading
- Apply layer guard on every tool call
- Include stale index warnings in status responses

### Ask first

- Adding new MCP tools beyond the 5 read-only set
- Changing the layer filtering intersection logic

### Never do

- Write to vault filesystem (documents, index, metadata)
- Call kg_build or any mutation handler from maencof
- Bypass layer filtering for any tool
