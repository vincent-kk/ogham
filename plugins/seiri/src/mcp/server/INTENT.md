# server — MCP assembly

## Purpose

Register the bounded tool surface and expose it over stdio. Tool schemas consume host context, so each contract needs a distinct responsibility.

## Conventions

- Tool names come from constants/toolNames.ts.
- Descriptions state both useful and inappropriate invocation scopes.
- Describe non-obvious field semantics.
- wrapHandler converts thrown errors to compact tool results.

## Boundaries

### Always do

- Check host capabilities before proposing another tool.
- Update consuming skills when tool contracts change.
- Preserve accepted-versus-acknowledged workflow semantics.

### Ask first

- Add tools or change response serialization.

### Never do

- Register code search or analysis tools.
- Guess host session identity or directly activate workflow participation in a handler.
