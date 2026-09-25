# mcp — Explicit state operations

## Purpose

Expose settings, task evidence, and validated workflow participation requests. Keep the tool surface small and leave code inspection to the host.

## Conventions

- Canonical source references use mcp__plugin_seiri_tools__<name>; plugin-compiler adapts opted-in instructions for other hosts.
- Resolve project and plugin roots through @ogham/cross-platform. Workflow requests require an explicit absolute project root.
- Reuse @ogham/http-kit for local-server token and Origin checks.
- Serialize compact JSON through wrapHandler; return readable errors without terminating the server.

## Boundaries

### Always do

- Check whether the host already supplies a capability before adding it.
- Require explicit confirmation before deploying rule files.
- Distinguish accepted workflow input from hook-confirmed participation.

### Ask first

- Add a tool or change its input/output contract.

### Never do

- Add code reading, searching, or analysis tools.
- Bind local settings services beyond 127.0.0.1.
- Call MCP tools from session hooks or guess native session identity.
