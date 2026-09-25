# Pipeline Contract

## Requirements

- Generation validates explicit MCP reference opt-in before assembling any output for that plugin. An invalid plugin has an empty file plan and a stable error diagnostic.
- All writes remain in `applyFiles`; planning and `--check` never modify Claude inputs.

## API Contracts

- `planPluginAdapters` preserves existing hook warnings and returns MCP reference/matcher validation errors without misclassifying them as MCP variable errors.
- Both manifest copies and the complete generated skill tree use the same adapter predicates. Replanning the same canonical inputs yields identical paths and bytes.
- Invalid explicit hook-runtime directories produce `codex-hook-runtime` with no partial adapter files. Runtime bundles are supplied by the plugin build, not by this planner.

## Acceptance Criteria

### AC-pipeline-mcp-references — Validation before emission

- Invalid marked skill references produce `codex-mcp-tool-reference` and no files.
- Invalid owned hook expressions produce `codex-mcp-hook-matcher` and no files.
- Valid marked sources produce matching manifests, hooks and a complete skill tree without changing any canonical file.

## Last Updated

2026-09-26
