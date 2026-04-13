## Purpose

MCP server and 6 generic HTTP/utility tools. Zero domain knowledge — executes (method, path, params, body) tuples.

## Structure

| Directory | Role |
|---|---|
| `server/` | MCP server creation and tool registration |
| `server-entry/` | esbuild CJS bundle entry point |
| `shared/` | toolResult, toolError, wrapHandler helpers |
| `tools/` | 6 tool handlers (get, post, put, delete, convert, setup) |

## Boundaries

### Always do

- Register tools via server.registerTool() with Zod schemas
- Return standard McpResponse envelope from HTTP tools

### Ask first

- Add new MCP tool

### Never do

- Add domain knowledge (Jira/Confluence) to MCP layer
- Expose auth tokens in tool responses
