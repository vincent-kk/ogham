# Pipeline Contract

## Requirements

- Generation validates explicit MCP reference opt-in before assembling any output for that plugin. An invalid plugin has an empty file plan and a stable error diagnostic.
- All writes remain in `applyFiles`; planning and `--check` never modify Claude inputs.

## API Contracts

- `planPluginAdapters` preserves existing hook warnings and returns MCP reference/matcher validation errors without misclassifying them as MCP variable errors.
- Both manifest copies and the complete generated skill tree use the same adapter predicates. Replanning the same canonical inputs yields identical paths and bytes.
- Invalid explicit hook-runtime directories produce `codex-hook-runtime` with no partial adapter files. Runtime bundles are supplied by the plugin build, not by this planner.

## Acceptance Criteria

Tests pin the behavioral criteria; the policy and ownership requirements remain above.

## Last Updated

Update this document when validation-before-emission, runtime ownership, or deterministic planning guarantees change.
