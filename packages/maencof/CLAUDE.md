# CLAUDE.md — @ogham/maencof

Personal knowledge space management plugin. Provides markdown-based Knowledge Graph, Spreading Activation search, and memory lifecycle management.

## Commands

```bash
yarn build          # clean → version:sync → tsc → esbuild
yarn build:plugin   # esbuild bundle only
yarn test:run       # single run (CI)
yarn format && yarn lint
```

## Architecture

**5-Layer Model**: `01_Core/` (identity, read-only) | `02_Derived/` (internalized knowledge) | `03_External/` (references) | `04_Action/` (volatile task memory) | `05_Context/` (metadata)

**MCP Tools (16)**: `maencof_create/read/update/delete/move`, `maencof_capture_insight`, `kg_build/search/navigate/context/status/suggest_links`, `claudemd_merge/read/remove`, `dailynote_read`

**Agents (4)**: `memory-organizer`, `identity-guardian`, `doctor`, `configurator`

**Skills (27)**: `setup`, `configure`, `remember`, `recall`, `organize`, `reflect`, `build`, `explore`, `suggest`, `doctor`, `rebuild`, `ingest`, `diagnose`, `connect`, `bridge`, `craft-skill`, `craft-agent`, `instruct`, `rule`, `lifecycle`, `mcp-setup`, `manage`, `cleanup`, `dailynote`, `think`, `refine`, `insight`

> Detailed docs: `../../.metadata/maencof/` (5-Layer spec, MCP contracts, agent/skill definitions, hook event mappings)

## Auto-invocation

Auto-invoke without user request when detected: ambiguous/multi-interpretable requirement → `think` (ToT evaluation); vague/incomplete input → `refine` (interview loop); skill create/modify → `craft-skill`; agent create/modify → `craft-agent`. `refine` and `think` can chain sequentially.

## Always do

- Read vault path from plugin config; never hardcode it
- Follow 5-Layer model rules when creating/modifying documents
- Validate markdown frontmatter (required fields: `id`, `layer`, `created`)
- After hook changes, rebuild with `yarn build:plugin`; change versions via `yarn version:sync` only

## Ask first

- Before deleting any L1_Core document
- Before running full graph rebuild (`kg_build --full`)
- Before bulk cross-layer document moves

## Never do

- Directly modify `.maencof-index/` directory
- Bypass layer validation checks
- Hardcode vault paths in source code
