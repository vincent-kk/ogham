# Facts Contract

## Requirements

- Read canonical plugin inputs without writes or host transformations.
- Compiler-only declarations are inert JSON; hosts do not consume or execute them.

## API Contracts

- `readPluginFacts` reads an optional `plugin-compiler.json` and exposes its optional `codexHookRuntime` directory. When absent, the property is omitted so existing facts retain their shape.
- Adapters own validation and transformation of the runtime directory. Malformed JSON follows the existing source-read error contract.

## Acceptance Criteria

### AC-facts-hook-runtime — Optional compiler-only input

- Missing configuration leaves existing facts unchanged.
- Declared runtime directories are read without interpreting hook commands or writing any file.

## Last Updated

2026-09-26
