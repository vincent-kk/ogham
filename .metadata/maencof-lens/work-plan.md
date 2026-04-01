# maencof-lens Work Plan

## Overview

Ordered implementation plan for maencof-lens — a read-only Claude Code plugin for accessing maencof vault knowledge from development contexts.

**Estimated scope**: ~15 source files, ~1200 lines of TypeScript + build scripts + config files
**Package**: `packages/maencof-lens/` in ogham monorepo

---

## Task Dependency Graph

```
Phase 1 ──► Phase 2 ──► Phase 3 ──► Phase 4
                                 ├──► Phase 5
                                 └──► Phase 6
```

Phase 4, 5, 6 can run in parallel after Phase 3 is complete.

---

## Phase 1: Package Scaffolding + Config System

**Depends on**: nothing
**Spec**: `phase-specs.md` Phase 1

| # | Task | Files | Acceptance |
|---|------|-------|------------|
| 1.1 | Create package directory structure | `package.json`, `tsconfig.json`, `tsconfig.build.json` | `yarn typecheck` passes |
| 1.2 | Implement config schema (Zod) | `src/config/config-schema.ts`, `src/config/defaults.ts` | Schema validates correct configs, rejects invalid |
| 1.3 | Implement config loader | `src/config/config-loader.ts` | `loadConfig` returns null for missing/invalid, valid config for correct JSON |
| 1.4 | Create barrel export | `src/index.ts` | Exports config types and loader |
| 1.5 | Write tests | `src/__tests__/unit/config/config-loader.test.ts` | 3 basic + up to 12 edge cases |

**DETAIL.md update**: Define config schema contract (LensConfig interface, VaultConfig interface).

---

## Phase 2: MCP Server + Vault Router + Graph Cache

**Depends on**: Phase 1
**Spec**: `phase-specs.md` Phase 2

| # | Task | Files | Acceptance |
|---|------|-------|------------|
| 2.1 | Implement VaultRouter | `src/vault/vault-router.ts` | Resolves by name, returns default, throws on unknown |
| 2.2 | Implement GraphCache | `src/vault/graph-cache.ts` | Lazy loads, caches, invalidates correctly |
| 2.3 | Implement StaleDetector | `src/vault/stale-detector.ts` | Detects stale via mtime comparison |
| 2.4 | Implement MCP server skeleton | `src/mcp/server.ts`, `src/mcp/shared.ts` | Server starts, responds to initialize |
| 2.5 | Implement server entry point | `src/mcp/server-entry.ts` | Loads config, creates server, connects stdio |
| 2.6 | Write tests | `src/__tests__/unit/vault/*.test.ts` | VaultRouter + GraphCache coverage |

**DETAIL.md update**: Add VaultRouter API, GraphCache API, server lifecycle.

---

## Phase 3: Tool Wrappers with Layer Filtering

**Depends on**: Phase 2
**Spec**: `phase-specs.md` Phase 3

| # | Task | Files | Acceptance |
|---|------|-------|------------|
| 3.1 | Implement layer guard | `src/filter/layer-guard.ts` | Correct intersection, empty-intersection fallback |
| 3.2 | Implement lens_search | `src/tools/lens-search.ts` | Delegates to handleKgSearch with effective layers |
| 3.3 | Implement lens_context | `src/tools/lens-context.ts` | Delegates to handleKgContext, post-filters items |
| 3.4 | Implement lens_navigate | `src/tools/lens-navigate.ts` | Delegates to handleKgNavigate, filters neighbors |
| 3.5 | Implement lens_read | `src/tools/lens-read.ts` | Delegates to handleMaencofRead, checks layer access |
| 3.6 | Implement lens_status | `src/tools/lens-status.ts` | Delegates to handleKgStatus, adds stale warning |
| 3.7 | Register all tools in server.ts | `src/mcp/server.ts` | All 5 tools available via MCP |
| 3.8 | Write tests | `src/__tests__/unit/tools/*.test.ts`, `src/__tests__/unit/filter/*.test.ts` | Layer guard + each tool wrapper |

**DETAIL.md update**: Add 5 tool API contracts (input schemas, output shapes, error cases).

---

## Phase 4: Hooks (SessionStart + Prompt Injection)

**Depends on**: Phase 3
**Spec**: `phase-specs.md` Phase 4

| # | Task | Files | Acceptance |
|---|------|-------|------------|
| 4.1 | Implement session-start hook | `src/hooks/session-start.ts` | Detects config, injects prompt, handles missing/invalid |
| 4.2 | Create hook entry point | `src/hooks/entries/session-start.entry.ts` | Callable by esbuild bundle |
| 4.3 | Create hooks.json | `hooks/hooks.json` | Valid hook registration for SessionStart |
| 4.4 | Write tests | `src/__tests__/unit/hooks/session-start.test.ts` | Silent when no config, injects when valid |

**INTENT.md update**: Not needed (hook is internal behavior, not a boundary change).

---

## Phase 5: Skills

**Depends on**: Phase 3 (config system must be stable)
**Spec**: `phase-specs.md` Phase 5

| # | Task | Files | Acceptance |
|---|------|-------|------------|
| 5.1 | Create setup-lens SKILL.md | `skills/setup-lens/SKILL.md` | Complete skill definition with subcommands |
| 5.2 | (Optional) Create reference.md | `skills/setup-lens/reference.md` | Detailed reference for complex operations |

No code implementation needed for skills (they are LLM-interpreted SKILL.md files).

---

## Phase 6: Build System + Plugin Manifest

**Depends on**: Phase 3 (all source files must exist)
**Spec**: `phase-specs.md` Phase 6

| # | Task | Files | Acceptance |
|---|------|-------|------------|
| 6.1 | Create build-mcp-server.mjs | `scripts/build-mcp-server.mjs` | Produces `bridge/mcp-server.cjs` |
| 6.2 | Create build-hooks.mjs | `scripts/build-hooks.mjs` | Produces `bridge/session-start.mjs` |
| 6.3 | Create inject-version.mjs | `scripts/inject-version.mjs` | Syncs version to version.ts + plugin.json |
| 6.4 | Create plugin.json | `.claude-plugin/plugin.json` | Valid plugin manifest |
| 6.5 | Create .mcp.json | `.mcp.json` | Valid MCP server registration |
| 6.6 | Copy libs/find-node.sh | `libs/find-node.sh` | Node.js resolver available |
| 6.7 | Create FCA docs | `INTENT.md`, `DETAIL.md`, `CLAUDE.md` | INTENT.md < 50 lines, 3-tier boundaries |
| 6.8 | Monorepo integration | Root `package.json` | `yarn maencof-lens build` works |
| 6.9 | End-to-end build verification | — | `yarn build` produces all artifacts |

---

## Execution Order (recommended)

```
1. Phase 1 (scaffolding)        — foundation
2. Phase 6.1-6.6 (build infra)  — need build to verify subsequent phases
3. Phase 2 (server + vault)     — core infrastructure
4. Phase 3 (tools)              — primary functionality
5. Phase 4 (hooks)              — session integration
6. Phase 5 (skills)             — user-facing config management
7. Phase 6.7-6.9 (docs + verify) — finalization
```

**Rationale**: Build scripts (6.1-6.6) are needed early to verify that esbuild bundling works with `@ogham/maencof` workspace dependency. Discovering bundling issues late would cause rework.

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| esbuild fails to bundle maencof workspace dep | High | Test bundling in Phase 6.1 before writing all tools |
| maencof handler signatures change | Medium | Both packages in same repo; CI catches breakage |
| StaleDetector false positives | Low | Conservative detection; warn but don't block |
| Graph deserialization from external vault path | Medium | Test with real vault early; MetadataStore accepts any path |
| lens_context token budget waste from post-only layer filtering | Medium | Document as v1 limitation; plan handleKgContext enhancement in v1.1 |

---

## Prerequisite: maencof Enhancement (v1.1)

`handleKgContext` in `@ogham/maencof` needs an optional `layer_filter` parameter passed to its internal `query()` call.
This is a 3-line change in `packages/maencof/src/mcp/tools/kg-context.ts`:
1. Add `layer_filter?: number[]` to function params
2. Pass `layerFilter: input.layer_filter` to the `query()` options
3. Export updated type from `KgContextInput`

**Impact**: Without this, `lens_context` token budget accuracy degrades proportionally to excluded-layer content.
**When**: Can be done as a fast-follow after lens v1, or as Phase 0 before lens implementation.

---

## Integration Test Plan

Unit tests per phase are defined in phase-specs. Additionally, the following end-to-end tests are required:

| # | Test | Description | Phase |
|---|------|-------------|-------|
| E2E-1 | MCP server startup | Start server with real config → verify `initialize` response | After Phase 2 |
| E2E-2 | lens_search with real vault | Call lens_search against a real vault with built index → verify results respect layer filter | After Phase 3 |
| E2E-3 | Multi-vault routing | Config with 2 vaults → call tools targeting each → verify correct vault used | After Phase 3 |
| E2E-4 | Stale index warning | Point to vault with outdated index → verify stale warning in lens_status | After Phase 3 |
| E2E-5 | SessionStart prompt injection | Start with valid config → verify system prompt contains vault list | After Phase 4 |
| E2E-6 | Full build + plugin load | `yarn build` → verify bridge/ artifacts → validate plugin.json | After Phase 6 |

---

## Config Versioning Strategy

Add a `version` field to `.maencof-lens/config.json`:
```jsonc
{
  "version": "1.0",
  "vaults": [...]
}
```

- v1: Config schema is simple (vaults array only). Version field reserved for future migration.
- On load: if `version` is missing, treat as `"1.0"` (backward compatible).
- On schema change: bump version, add migration logic in `config-loader.ts`.

---

## Phase 7: Skills + Agent + Prompt Injection 변경

**Depends on**: Phase 5, Phase 6 (plugin manifest must be stable)
**Spec**: `phase-specs.md` Phase 7

| # | Task | Files | Acceptance |
|---|------|-------|------------|
| 7.1 | Create lookup SKILL.md | `skills/lookup/SKILL.md` | Complete skill definition with workflow, options, output format |
| 7.2 | Create context SKILL.md | `skills/context/SKILL.md` | Complete skill definition with workflow, options, output format |
| 7.3 | Create researcher AGENT.md | `agents/researcher.md` | 5 MCP tools referenced, trigger phrases, exploration strategy |
| 7.4 | Update session-start prompt | `src/hooks/session-start.ts` | Skill usage shown instead of tool list |
| 7.5 | Update plugin.json | `.claude-plugin/plugin.json` | `agents` field added |
| 7.6 | Update CLAUDE.md | `CLAUDE.md` | Skills (3) + Agents (1) reflected |
| 7.7 | Update INTENT.md | `INTENT.md` | Structure updated, still under 50 lines |
| 7.8 | Rebuild hooks | `bridge/session-start.mjs` | `yarn build` produces updated bundle |

**INTENT.md update**: Structure section updated with skills/ and agents/ directories.

---

## Execution Order (updated)

```
1. Phase 1 (scaffolding)        — foundation
2. Phase 6.1-6.6 (build infra)  — need build to verify subsequent phases
3. Phase 2 (server + vault)     — core infrastructure
4. Phase 3 (tools)              — primary functionality
5. Phase 4 (hooks)              — session integration
6. Phase 5 (skills: setup-lens) — user-facing config management
7. Phase 6.7-6.9 (docs + verify) — finalization
8. Phase 7 (skills + agent + prompt) — extended interface layer
```

**Rationale**: Phase 7 builds on the stable Phase 5/6 foundation. Skills and agents are SKILL.md/AGENT.md files (no TypeScript), except for session-start.ts prompt change which requires a rebuild.

---

## Updated Task Dependency Graph

```
Phase 1 ──► Phase 2 ──► Phase 3 ──► Phase 4
                                 ├──► Phase 5 ──┐
                                 └──► Phase 6 ──┤
                                                └──► Phase 7
```

Phase 7 depends on Phase 5 (skills dir established) and Phase 6 (plugin.json finalized).

---

## Out of Scope (v2+)

- Cross-vault unified search
- Remote vault support (SSH/HTTP)
- Real-time file watching
- Sub-layer filtering (L3 relational/structural/topical)
- dailynote_read opt-in
- Read-based insight suggestions
