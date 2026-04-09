# maencof Separation Analysis

## Question

Does `@ogham/maencof` need any refactoring to cleanly support imports from maencof-lens?

## Answer: No refactoring needed

The current maencof architecture already supports lens's requirements without modification.

---

## 1. Handler Purity Analysis

All 5 handlers that lens wraps are **pure functions** (take inputs, return outputs, no global state mutation):

| Handler | Signature | Side effects |
|---------|-----------|-------------|
| `handleKgSearch` | `(graph: KnowledgeGraph \| null, input: KgSearchInput) → Promise<KgSearchResult \| { error }>` | None |
| `handleKgContext` | `(graph: KnowledgeGraph \| null, input: KgContextInput, vaultRoot?: string) → Promise<KgContextResult \| { error }>` | Reads files (vaultRoot for full-text inclusion) |
| `handleKgNavigate` | `(graph: KnowledgeGraph \| null, input: KgNavigateInput) → Promise<KgNavigateResult \| { error }>` | None |
| `handleKgStatus` | `(vaultPath: string, graph: KnowledgeGraph \| null, _input: KgStatusInput) → Promise<KgStatusResult>` | Reads .maencof/ (stale detection) |
| `handleMaencofRead` | `(vaultPath: string, input: MaencofReadInput) → Promise<MaencofReadResult>` | Reads vault files |

**Key observations**:
- No handler mutates global state
- No handler calls `invalidateCache()` or `ensureFreshGraph()` (those are server.ts concerns)
- File reads are limited to vault content (not config or bridge files)
- All handlers are exported from `src/index.ts` barrel

## 2. Barrel Export Completeness

`packages/maencof/src/index.ts` already exports everything lens needs:

### Handlers (direct exports)
- `handleKgSearch` from `./mcp/tools/kg-search.js`
- `handleKgContext` from `./mcp/tools/kg-context.js`
- `handleKgNavigate` from `./mcp/tools/kg-navigate.js`
- `handleKgStatus` from `./mcp/tools/kg-status.js`
- `handleMaencofRead` from `./mcp/tools/maencof-read.js`

### Infrastructure (needed for graph loading)
- `MetadataStore` from `./index/metadata-store.js`
- `deserializeGraph`, `serializeGraph` from `./index/metadata-store.js`

### Types (all re-exported)
- `KnowledgeGraph`, `KnowledgeNode`, `KnowledgeEdge` from `./types/graph.js`
- `KgSearchInput`, `KgSearchResult`, `KgContextInput`, `KgContextResult` etc. from `./types/mcp.js`
- `ActivationResult` from `./types/activation.js` (or wherever defined)

### Utilities
- `toolResult`, `toolError` from `./mcp/shared.js`

## 3. Potential Friction Points (all resolved)

### 3.1 Graph Loading
- **Concern**: lens needs to load graphs from arbitrary vault paths
- **Resolution**: `MetadataStore` accepts `vaultPath` as constructor arg — works for any path
- **No change needed**

### 3.2 handleKgContext vaultRoot parameter
- **Concern**: `handleKgContext` takes optional `vaultRoot` for full-text inclusion
- **Resolution**: lens passes its own resolved vault path — no maencof changes needed
- **No change needed**

### 3.3 handleKgStatus vaultPath parameter
- **Concern**: `handleKgStatus(vaultPath, graph, input)` takes vaultPath first
- **Resolution**: lens passes the resolved vault path from its own router
- **No change needed**

### 3.4 Layer filter type casting
- **Concern**: `layer_filter` is typed as `number[]` in handlers but `(1|2|3|4|5)[]` in Zod schemas
- **Resolution**: lens applies its own Zod validation before calling handlers; cast is safe
- **No change needed**

### 3.5 Error message references to maencof
- **Concern**: Handlers return errors like `"Index not built. Please run /maencof:maencof-build first."`
- **Resolution**: lens can override error messages in its wrapper layer (e.g., change to "Vault index not available. Run kg_build in a maencof session.")
- **No change to maencof needed** — lens handles this post-hoc

## 4. Build System Compatibility

- maencof exports via `dist/index.js` (ESM) + `dist/index.d.ts` (types)
- lens bundles via esbuild with `bundle: true` — will inline maencof's code into `bridge/mcp-server.cjs`
- Since both are workspace siblings, TypeScript project references or `"@ogham/maencof": "workspace:*"` in package.json suffice
- No maencof build changes needed

## 5. One Exception: handleKgContext layer_filter (v1.1)

`handleKgContext` at `kg-context.ts:33-34` calls `query()` with hardcoded options:
```typescript
query(graph, queryTerms, { maxResults: 20, decay: 0.7, threshold: 0.05, maxHops: 5 })
```
No `layerFilter` is passed, despite `query()` supporting it via `QueryOptions.layerFilter`.

**Impact**: `context` can only post-filter assembled results. Token budget is consumed by
all-layer results before filtering, wasting budget on excluded-layer content.

**Recommended fix** (3 lines in maencof):
1. Add `layer_filter?: number[]` to `KgContextInput` type in `types/mcp.ts`
2. Pass `layerFilter: input.layer_filter` to `query()` in `kg-context.ts:33`
3. Re-export updated type from `index.ts` (already re-exported)

**Timing**: Can be a fast-follow after lens v1 or a Phase 0 prerequisite.

## 6. Recommendation

**Zero refactoring of maencof is required for lens v1 launch.**
One enhancement is recommended for v1.1: adding `layer_filter` passthrough to `handleKgContext`.

Additional note: handler error messages (e.g., "Please run /maencof:maencof-build first") should be
rewritten in lens wrappers to use lens-appropriate language (e.g., "Run kg_build in a maencof session").
