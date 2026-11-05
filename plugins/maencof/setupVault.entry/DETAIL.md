# Project Vault Connection Command

## Requirements

The package build loads this command entry point to produce a standalone executable. The command accepts an explicit host and absolute vault root, with preview as the default. It only translates CLI input and connection outcomes; the project connection module owns configuration changes.

## API Contracts

It calls the project connection module through its public entry point, passing the bundle location so the sibling MCP server can be found independent of CWD. It writes a redacted JSON result and sets a nonzero process status on failure.

## Acceptance Criteria

### AC-standalone-command — Standalone project connection

- Invalid arguments fail before project settings writes.
- Preview and apply preserve the project connection module's ownership and conflict behavior.
- The executable locates the sibling MCP server from its own bundle path and exposes no configuration or inherited environment variables.

## Last Updated

Update when command ownership, redaction, or distributed-server resolution changes.
