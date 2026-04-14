## Purpose

Atlassian plugin source root. 3 MCP tools (fetch + convert + setup), core infrastructure, and format converter.

## Structure

| Directory | Role |
|---|---|
| `types/` | Zod schemas and type definitions |
| `constants/` | Paths, defaults, config constants |
| `core/` | Config, auth, environment, HTTP client |
| `converter/` | ADF/Storage Format ↔ Markdown |
| `mcp/` | MCP server and 3 tool handlers |
| `setup-ui/` | Local web server for auth setup |
| `lib/` | Logger, file I/O |
| `utils/` | URL helpers |

## Boundaries

### Always do

- Export new modules through barrel index.ts
- Use Zod schemas from types/ for validation

### Ask first

- Add new fractal directory
- Add external dependency

### Never do

- Define Zod schemas outside types/
- Use global mutable state
- Expose credentials in MCP tool responses
