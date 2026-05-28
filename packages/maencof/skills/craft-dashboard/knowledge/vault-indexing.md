# Vault Indexing — Option D (Hybrid Read-Only)

Confirmed strategy. The generated backend reads maencof's pre-built graph cache instead of re-walking the vault, and treats markdown bodies as lazy on-demand reads.

> **Interfaces**: This file describes data flow and behaviour. The TypeScript class shapes for `GraphStore`, `BodyCache`, `VaultWatcher`, and `Broadcaster` are defined in [`interfaces.md`](./interfaces.md). When authoring modules, use `interfaces.md` as the contract anchor.

---

## What the vault already has (when maencof is active)

```
<vault>/.maencof/
├── nodes.json            ~127 KB    title, tags, layer, sub-layer, path, mtime per node
├── edges.json            ~632 KB    wikilink + tag co-occurrence + cross-layer edges
├── snapshot.json         ~67 KB     fast lookup snapshot
├── graph-meta.json       ~89 B      schemaVersion, builtAt
└── stale-nodes.json      ~289 B     paths needing rebuild
```

Schema mirrors `KnowledgeNode` and `KnowledgeEdge` from `@ogham/maencof/src/types/graph.ts`. The generated backend imports these types as `type`-only — no runtime dependency on maencof unless semantic search is enabled.

---

## Boot sequence

Server boot wires the vault modules. Constructor and factory signatures are
authoritative in [`interfaces.md`](./interfaces.md) — see the actual
`templates/backend/src/server.ts` shell for the call site that this file
documents.

`GraphStore.fromVault(vaultRoot, vaultIndex)`:

1. Read `<vault>/.maencof/graph-meta.json`
2. Verify `schemaVersion` matches expected
3. Read `nodes.json` + `edges.json`
4. Build in-memory indices:
   - `nodes: Map<path, KnowledgeNode>`
   - `byLayer: Map<Layer, KnowledgeNode[]>`
   - `byTag: Map<string, KnowledgeNode[]>`
   - `byLink: { inbound: Map<string, string[]>, outbound: Map<string, string[]> }`
5. Return store handle

`vaultIndex === 'independent'` skips steps 1–3 and falls back to the file-walk
path (see "Independent fallback" below).

Fast: ~50 ms for a 1000-node graph. Acceptable boot time.

---

## Hot reload via chokidar

```typescript
chokidar
  .watch(
    [
      `${VAULT_ROOT}/.maencof/nodes.json`,
      `${VAULT_ROOT}/.maencof/edges.json`,
      `${VAULT_ROOT}/.maencof/stale-nodes.json`,
    ],
    { ignoreInitial: true },
  )
  .on(
    'change',
    debounce(500, async () => {
      await graphStore.reload();
      broadcaster.publish('graph', { reloadedAt: Date.now() });
    }),
  );

chokidar
  .watch(`${VAULT_ROOT}/**/*.md`, {
    ignored: ['**/.maencof/**', '**/.maencof-meta/**', '**/node_modules/**'],
    ignoreInitial: true,
  })
  .on(
    'all',
    debounce(800, (event, path) => {
      bodyCache.invalidate(path);
      broadcaster.publish('vault', { event, path });
    }),
  );
```

500 ms debounce for graph file changes; 800 ms for markdown (matches falias).

Frontend's `api/sse.ts` (`startSse`) invalidates TanStack Query caches per
topic. A `graph` reload changes every derived view (each domain-panel
aggregation, plus the search/tags/backlinks indices), so it MUST invalidate the
whole cache; the other topics are scoped:

```typescript
// inside startSse(qc, listener?)
es.addEventListener('graph', () => {
  // Whole-cache invalidate: domain panels + search + tags + nodes + backlinks.
  qc.invalidateQueries();
});
es.addEventListener('vault', () => {
  qc.invalidateQueries({ queryKey: ['doc'] }); // rendered markdown bodies
});
es.addEventListener('stale', () => {
  qc.invalidateQueries({ queryKey: ['status'] }); // StaleBanner GET /api/status
});
```

**Why `graph` invalidates everything**: panel components key their queries on
`['<dataDomain>']` (kebab-case, e.g. `['activity-counts']` — see
`visualization-catalog.md`). An allow-list like `[['nodes'], ['search'], …]`
shares no prefix with those keys, so the panels — the dashboard's primary
content — would never refetch after a vault rebuild. Invalidating the whole
cache on `graph` is the only mapping that actually refreshes the panels. `vault`
and `stale` stay narrow because only doc bodies / the stale banner depend on
them. (`['status']`, not `['stale']`, is the key `StaleBanner` uses for
`api.status()`.) The doc viewer (LLM-authored) keys its query on
`['doc', path]`, which the `['doc']` prefix invalidation matches.

### Connection status (HeaderBar)

`startSse(qc, listener?)` also reports the EventSource lifecycle so the
`HeaderBar` status dot reflects reality:

- `es.onopen` → status `'open'`; `es.onerror` → status `'closed'`.
- Write the status into the optional `uiStore` (zustand) — or surface it via the
  `listener` callback — and have `HeaderBar` read it and set
  `<div className="header-sse" data-status={status}>` (`globals.css` styles
  `data-status='open'|'closed'`).
- When `refresh === 'manual'` no EventSource is opened (see
  `methods/create/workflow.md` Turn 6), so `HeaderBar` MUST omit the
  `.header-sse` block (or render a neutral state) instead of a permanently
  `closed` dot.

---

## Body cache (lazy)

Bodies are read only when a panel or doc viewer asks for them. Class shape
(`get(relPath)`, `invalidate(absPath)`) is defined in
[`interfaces.md`](./interfaces.md).

Behaviour:

1. `get(relPath)` returns from LRU when warm; otherwise reads
   `<vault>/<relPath>`, parses frontmatter (`gray-matter`), renders HTML
   (`markdown-it` + `markdown-it-task-lists` with wikilink rewriting), caches
   the `RenderedDoc`, and evicts the oldest entry when the LRU exceeds
   `maxEntries` (default 256).
2. `invalidate(absPath)` removes a single entry; called by the watcher when a
   markdown file changes.

LRU bounded so a huge vault doesn't OOM the dashboard.

---

## Search service

`SearchService` exposes `lexical`, `tag`, `backlinks`, and `semantic` methods.
The class shape — including the required `(graph, config)` constructor — is
defined in [`interfaces.md`](./interfaces.md). Algorithmic detail (Fuse.js
options, tag prefix matching, backlinks shape, spreading-activation tuning) is
in [`search-design.md`](./search-design.md). Reload semantics: the service
subscribes to `graph.onReload()` and refreshes its Fuse index on every
change.

### Semantic SA — optional import

Loader pattern is **lazy** — see `loadSA()` in
[`search-design.md`](./search-design.md). Generated backend declares
`@ogham/maencof` as `optionalDependencies`; when absent, semantic mode is
hidden from the UI and `/api/search?mode=semantic` returns 501.

---

## Stale banner

```typescript
// backend/src/routes/status.ts
app.get('/api/status', async () => {
  const stale = await readStaleNodes();
  const ratio = stale.length / graphStore.totalCount();
  let level: 'ok' | 'warn' | 'critical' = 'ok';
  if (ratio > 0.3) level = 'critical';
  else if (ratio > 0.1) level = 'warn';
  return {
    staleRatio: ratio,
    staleCount: stale.length,
    level,
    schemaVersion: graphStore.schemaVersion,
    builtAt: graphStore.builtAt,
  };
});
```

Frontend `StaleBanner.tsx` polls `/api/status` every 60 s and renders:

- `warn`: yellow strip "Index is slightly stale ({n} nodes)"
- `critical`: red strip "Index is significantly stale. Run `/maencof:build` in Claude Code."

---

## Independent fallback (`--vault-index independent`)

When the vault has no `.maencof/` (maencof not used yet), `GraphStore` falls back to a fast-glob walk:

```typescript
async function buildIndependently(
  vaultRoot: string,
): Promise<{ nodes: KnowledgeNode[]; edges: KnowledgeEdge[] }> {
  const files = await glob('**/*.md', {
    cwd: vaultRoot,
    ignore: ['.maencof/**', '.maencof-meta/**', 'node_modules/**'],
  });
  const nodes = await Promise.all(
    files.map(async (rel) => {
      const raw = await readFile(join(vaultRoot, rel), 'utf8');
      const { data } = matter(raw);
      return {
        path: rel,
        title: data.title ?? basename(rel, '.md'),
        tags: data.tags ?? [],
        layer: inferLayerFromPath(rel),
        mtime: (await stat(join(vaultRoot, rel))).mtimeMs,
      } as KnowledgeNode;
    }),
  );
  const edges = extractWikilinks(nodes);
  return { nodes, edges };
}
```

Edges are limited to wikilinks (no PageRank, no cross-layer detection). Semantic mode is unavailable in independent mode.

---

## Contract safety

The generated backend **never writes** to the vault:

- `<vault>/**/*.md`
- `<vault>/.maencof/**`
- `<vault>/.maencof-meta/**`

Writes are confined to:

- `<target>/dashboard-spec.json`
- `<target>/.run/server.pid`
- `<target>/backend/app/static/**` (build output only)

This is enforced by convention — the generated routes are read-only and the
LLM authoring backend modules MUST NOT introduce write sites outside the list
above. There is no `safe-write.ts` runtime wrapper; instead, every PR or
MUTATE patch that adds an `fs.writeFile`/`fs.promises.writeFile` call inside
`<target>/backend/src/` MUST be reviewed against this list.

---

## Performance notes

| Operation                              | Expected                   | Budget   |
| -------------------------------------- | -------------------------- | -------- |
| Boot `GraphStore.fromVault` (1K nodes) | ~50 ms                     | < 500 ms |
| Boot (10K nodes)                       | ~400 ms                    | < 2 s    |
| `nodes.json` hot reload (10K nodes)    | ~300 ms (debounced 500 ms) | < 1 s    |
| Lexical search (1K nodes)              | ~5 ms                      | < 50 ms  |
| Semantic SA (1K nodes, hops=5)         | ~80 ms                     | < 500 ms |
| Body lazy read + render                | ~10 ms per doc             | < 100 ms |
| LRU evict                              | < 1 ms                     | —        |

If user reports slow boot, profile `GraphStore.fromVault` first; the typical culprit is JSON.parse of a >5 MB `edges.json`.
