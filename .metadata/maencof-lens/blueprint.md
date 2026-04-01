# maencof-lens Architecture Blueprint

## 1. Overview

maencof-lens is a **read-only** Claude Code plugin that provides access to maencof vault knowledge from any development context. It wraps 5 of maencof's 18 MCP tools as thin read-only proxies, adding multi-vault routing, layer filtering, and session-scoped graph caching.

**Core identity**: A lens — magnifies knowledge without touching it.

---

## 2. Package Structure

```
packages/maencof-lens/
├── .claude-plugin/
│   └── plugin.json              # Plugin manifest
├── .mcp.json                    # MCP server registration
├── hooks/
│   └── hooks.json               # Hook event mappings (SessionStart only)
├── skills/
│   └── setup-lens/
│       └── SKILL.md             # /maencof-lens:setup-lens skill
├── bridge/                      # esbuild output (generated)
│   ├── mcp-server.cjs           # Bundled MCP server
│   └── session-start.mjs        # Bundled SessionStart hook
├── libs/
│   └── find-node.sh             # Node.js resolver (copy from maencof)
├── scripts/
│   ├── build-mcp-server.mjs     # esbuild: server-entry.ts → bridge/mcp-server.cjs
│   ├── build-hooks.mjs          # esbuild: hooks entries → bridge/*.mjs
│   └── inject-version.mjs       # Version sync: package.json → src/version.ts
├── src/
│   ├── index.ts                 # Barrel export (public API)
│   ├── version.ts               # Auto-generated version constant
│   ├── config/
│   │   ├── config-loader.ts     # Load/validate .maencof-lens/config.json
│   │   ├── config-schema.ts     # Zod schema + TypeScript interface
│   │   └── defaults.ts          # Default config factory
│   ├── mcp/
│   │   ├── server.ts            # MCP server setup + 5 tool registrations
│   │   ├── server-entry.ts      # Standalone entry point (stdio transport)
│   │   └── shared.ts            # toolResult/toolError helpers
│   ├── vault/
│   │   ├── vault-router.ts      # Multi-vault name→path resolution
│   │   ├── graph-cache.ts       # Per-vault KnowledgeGraph memory cache
│   │   └── stale-detector.ts    # index.json mtime comparison
│   ├── filter/
│   │   └── layer-guard.ts       # Layer intersection (vault config ∩ tool param)
│   ├── tools/
│   │   ├── lens-search.ts       # Wraps handleKgSearch + layer guard
│   │   ├── lens-context.ts      # Wraps handleKgContext + layer guard
│   │   ├── lens-navigate.ts     # Wraps handleKgNavigate + layer guard
│   │   ├── lens-read.ts         # Wraps handleMaencofRead + layer guard
│   │   └── lens-status.ts       # Wraps handleKgStatus + stale warning
│   ├── hooks/
│   │   ├── session-start.ts     # Config detection + prompt injection
│   │   └── entries/
│   │       └── session-start.entry.ts  # esbuild entry point
│   └── types/
│       └── index.ts             # Lens-specific type definitions
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── CLAUDE.md
├── INTENT.md
└── DETAIL.md
```

---

## 3. Module Dependency Graph

```
                    ┌──────────────────────┐
                    │   @ogham/maencof     │
                    │   (workspace dep)     │
                    └──────────┬───────────┘
                               │ imports
                    ┌──────────▼───────────┐
                    │   maencof-lens       │
                    │                       │
                    │  ┌─────────────────┐ │
                    │  │  config/         │ │
                    │  │  config-loader   │ │    .maencof-lens/config.json
                    │  │  config-schema   │──────── reads ────────────────►
                    │  │  defaults        │ │
                    │  └────────┬─────────┘ │
                    │           │            │
                    │  ┌────────▼─────────┐ │
                    │  │  vault/          │ │
                    │  │  vault-router    │ │    Vault filesystem
                    │  │  graph-cache     │──────── reads ────────────────►
                    │  │  stale-detector  │ │    (.maencof/index.json)
                    │  └────────┬─────────┘ │
                    │           │            │
                    │  ┌────────▼─────────┐ │
                    │  │  filter/         │ │
                    │  │  layer-guard     │ │
                    │  └────────┬─────────┘ │
                    │           │            │
                    │  ┌────────▼─────────┐ │
                    │  │  tools/          │ │
                    │  │  lens-search     │ │    @ogham/maencof handlers
                    │  │  lens-context    │──────── calls ────────────────►
                    │  │  lens-navigate   │ │    (handleKgSearch, etc.)
                    │  │  lens-read       │ │
                    │  │  lens-status     │ │
                    │  └────────┬─────────┘ │
                    │           │            │
                    │  ┌────────▼─────────┐ │
                    │  │  mcp/            │ │    Claude Code
                    │  │  server.ts       │◄──── MCP stdio ──────────────
                    │  └──────────────────┘ │
                    └──────────────────────┘
```

**Dependency direction**: `config → vault → filter → tools → mcp/server`. Strictly top-down, no cycles.

---

## 4. Data Flow

### 4.1 Request Flow (tool call)

```
Claude Code session
    │
    ▼
MCP stdio → server.ts
    │
    ├─ 1. Parse tool input (Zod validation)
    │     Extracts: tool name, vault (optional), layer_filter (optional), ...params
    │
    ├─ 2. Vault resolution (vault-router.ts)
    │     vault name → vault config object → absolute vault path
    │     If vault omitted → use default vault
    │
    ├─ 3. Graph loading (graph-cache.ts)
    │     Check in-memory cache[vaultPath]
    │     Cache miss → MetadataStore.loadGraph(vaultPath) → deserializeGraph
    │     Cache hit → return cached KnowledgeGraph
    │
    ├─ 4. Layer guard (layer-guard.ts)
    │     effectiveLayers = intersection(vaultConfig.layers, toolParam.layer_filter)
    │     If empty intersection → return all vault-allowed layers
    │
    ├─ 5. Handler dispatch (tools/lens-*.ts)
    │     Import pure handler from @ogham/maencof
    │     Call handler(graph, input) with layer_filter = effectiveLayers
    │
    ├─ 6. Result post-filter (layer-guard.ts)
    │     For handlers that don't accept layerFilter natively:
    │     Filter result nodes where node.layer NOT IN effectiveLayers
    │
    └─ 7. Return MCP response
          toolResult(filteredResult)
```

### 4.2 Session Start Flow

```
Claude Code session start
    │
    ▼
SessionStart hook → session-start.mjs
    │
    ├─ 1. Detect .maencof-lens/config.json in CWD
    │     Not found → exit silently (not a lens-enabled project)
    │
    ├─ 2. Load + validate config
    │     Parse JSON, validate with Zod schema
    │     Invalid → warn + exit
    │
    ├─ 3. Per-vault status check
    │     For each vault in config:
    │       ├─ Check path exists
    │       ├─ Check .maencof/index.json exists
    │       └─ Compare index.json mtime vs vault file mtimes → stale?
    │
    └─ 4. Inject prompt
          Output system-reminder with:
            - [maencof:lens] header
            - Available tools list
            - Registered vault names + status
            - Stale warnings (if any)
```

---

## 5. Multi-Vault Routing Architecture

### 5.1 Config Schema

```jsonc
// .maencof-lens/config.json
{
  "vaults": [
    {
      "name": "fionn",                          // Vault alias (identifier)
      "path": "/Users/Vincent/Soulstream/tirnanog",  // Absolute path
      "layers": [2, 3, 4, 5],                   // Layer ceiling (default: [2,3,4,5])
      "default": true                            // Default vault flag
    },
    {
      "name": "work",
      "path": "/Users/Vincent/Soulstream/work-vault",
      "layers": [3, 4]
    }
  ]
}
```

### 5.2 Vault Router Logic

```
resolve(vaultName?: string) → VaultConfig

1. If vaultName provided:
   - Find vault where config.name === vaultName
   - Not found → error: "Unknown vault: {name}. Available: {names}"

2. If vaultName omitted:
   - Find vault where config.default === true
   - Not found → use first vault in array

3. Validate:
   - vault.path exists on filesystem
   - .maencof/index.json exists (warn if missing, don't block)
```

### 5.3 Graph Cache Manager

```
Map<vaultPath, { graph: KnowledgeGraph, loadedAt: number }>

- getGraph(vaultPath): KnowledgeGraph | null
  - Cache hit → return graph
  - Cache miss → MetadataStore(vaultPath).loadGraph() → cache + return

- invalidate(vaultPath): void
  - Remove entry from cache map

- invalidateAll(): void
  - Clear entire cache map

- No TTL-based expiry (session-scoped)
- No auto-rebuild (read-only principle)
```

---

## 6. Layer Filtering Architecture

### 6.1 Two-tier filtering

```
Tier 1: Vault config ceiling     layers: [2, 3, 4, 5]
Tier 2: Per-call tool parameter  layer_filter: [3]
Result: intersection             effective: [3]
```

### 6.2 Application points

| Tool | Pre-filter (input mutation) | Post-filter (result filter) |
|------|---------------------------|----------------------------|
| `lens_search` | Set `input.layer_filter = effectiveLayers` | None (handler respects layerFilter) |
| `lens_context` | None (handler lacks layerFilter param) | Filter assembled items by layer ⚠️ |
| `lens_navigate` | None | Filter inbound/outbound/children by layer |
| `lens_read` | None (handler takes vaultPath, not graph) | Check result node.layer ∈ effectiveLayers |
| `lens_status` | None | None (status is metadata, not content) |

### 6.3 Edge case: Empty intersection

When `intersection(vault.layers, tool.layer_filter) = []`:
- Behavior: Fall back to vault.layers (ignore invalid tool parameter)
- Rationale: Better to return vault-allowed results than nothing
- Log warning so users notice their filter was ignored

### 6.4 Known Limitation: lens_context token budget accuracy

`handleKgContext` internally calls `query()` with hardcoded options and **no `layerFilter` support**.
This means `lens_context` can only post-filter assembled results, not pre-filter the SA query.

**Impact**: Token budget is consumed by ALL-layer results before filtering. For vaults with many
excluded-layer documents, effective token utilization drops proportionally.

**v1 Decision**: Accept as known limitation. Document in tool description.
**v1.1 Plan**: Add optional `layer_filter` parameter to `handleKgContext` in `@ogham/maencof`
(3-line change: add param, pass to internal `query()` call). This is the only maencof
modification needed and is tracked as a prerequisite enhancement.

---

## 7. Key Design Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | Workspace dependency on `@ogham/maencof` | Monorepo sibling; zero code duplication |
| D2 | Import handlers directly (no adapter layer) | Handlers are pure functions; adapter adds unnecessary indirection |
| D3 | Per-vault graph cache in server memory | Each vault is independent; session-scoped lifetime |
| D4 | No auto-rebuild on stale index | Read-only principle; rebuild is maencof's responsibility |
| D5 | Layer filtering as intersection | Vault config is security ceiling; tool param is convenience filter |
| D6 | SessionStart hook for prompt injection | Matches maencof's pattern; lightweight detection |
| D7 | Single skill (`setup-lens`) | Minimal footprint; config management only |
| D8 | `.maencof-lens/` config dir in dev context | Separate from vault; project-specific lens settings |
| D9 | lens_context post-filter only (v1) | handleKgContext lacks layerFilter; accept token waste; fix in v1.1 |
| D10 | Graph cache stale-on-hit check | Compare index.json mtime vs loadedAt; reload (not rebuild) if stale |

---

## 8. RALPLAN-DR Summary

### Principles
1. **Read-Only Safety** — lens never writes to vault filesystem
2. **Zero Code Duplication** — import from @ogham/maencof, never copy
3. **Minimal Footprint** — only lens-specific code (config, routing, layer guard, server)
4. **Convention Following** — follow filid/maencof plugin patterns for config, hooks, skills, build

### Decision Drivers
1. maencof handlers are pure functions → direct import possible
2. Multi-vault requires its own graph cache management
3. Layer filtering is a lens-specific concern (vault config x tool param intersection)

### Viable Options

**Option A: Thin wrapper approach** (CHOSEN)
- Import maencof handlers directly
- Own server.ts with multi-vault graph cache
- Own config-loader, vault-router, layer-guard
- Pros: Minimal code (~15 source files), fast to implement, easy to maintain
- Cons: Coupled to maencof's handler signatures (acceptable in monorepo)

**Option B: Adapter layer approach**
- Create an adapter that abstracts maencof internals
- Pros: Loose coupling, version-resilient
- Cons: More code, unnecessary complexity for monorepo siblings
- **Not chosen**: The coupling risk is minimal since both packages are in the same repo and versioned together

**Option C: Fork/copy approach** — INVALIDATED
- Copy maencof search/core code into lens
- Violates the "Zero Code Duplication" principle
- No valid reason in a monorepo with workspace dependencies

### ADR

- **Decision**: Thin wrapper (Option A) with direct handler imports
- **Drivers**: Pure function handlers, monorepo sibling packages, minimal footprint goal
- **Alternatives considered**: Adapter layer (B), Fork/copy (C — invalidated)
- **Why chosen**: Least code, fastest delivery, acceptable coupling in monorepo context
- **Consequences**: Handler signature changes in maencof require lens updates; mitigated by shared CI
- **Follow-ups**: If maencof is ever extracted to a separate repo, evaluate adapter layer
