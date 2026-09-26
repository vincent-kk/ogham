# setupVault.entry

## Purpose

Provide the standalone project vault connection command consumed by the package build.

## Boundaries

### Always do

- Parse CLI arguments before invoking the project connection API.
- Resolve the sibling MCP server from the distributed command bundle.

### Ask first

- Change the command's options, output shape, or exit status contract.

### Never do

- Print configuration contents or inherited environment variables.
- Write knowledge documents or user-scope settings.
