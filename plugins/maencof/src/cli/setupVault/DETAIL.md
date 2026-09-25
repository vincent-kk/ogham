# Project Vault Connection

## Requirements

Setup uses a canonical absolute vault root captured from the user's invocation directory. This command only manages its project connection; the skill verifies the live server before writing knowledge.

## API Contracts

`runSetupVault({host, vaultRoot, bundlePath, apply?})` returns a redacted connection summary. Only Claude and Codex are supported. Preview is the default. Apply uses the shared manager's unchanged plan with `replaceDrift:false`. The bundle's sibling MCP entry must exist. Errors leave knowledge and unrelated connections untouched.

The executable is loaded by the `build:setup` esbuild entry. It accepts `--host`, `--vault-root` and optional `--apply`; its location determines the distributed MCP server path, independent of CWD.

## Acceptance Criteria

### AC-project-connection

- Both hosts preview without writing, apply to project scope, preserve unrelated settings, and rerun without drift.
- Foreign server names and edited owned entries produce conflicts without replacement.
- Relative roots, unsupported hosts, missing bundles and invalid arguments fail before settings writes.
- Returned data contains no server environment except the explicitly chosen vault path.

## Last Updated

2026-09-26
