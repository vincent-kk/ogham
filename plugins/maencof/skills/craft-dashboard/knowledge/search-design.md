# Search Design

How the generated backend implements `lexical`, `tag`, `backlinks`, and `semantic` search modes. Backed by `GraphStore` from **vault-indexing.md**.

> **Interfaces**: The TypeScript class shape for `SearchService` is defined in [`interfaces.md`](./interfaces.md). This file describes algorithmic behaviour and frontend wiring.

---

## Mode matrix

| Mode        | Index source                  | Algorithm                     | Latency    | UI affordance          |
| ----------- | ----------------------------- | ----------------------------- | ---------- | ---------------------- |
| `lexical`   | `graphStore.allNodes()`       | Fuse.js fuzzy on title + tags | ~5 ms      | search box (default)   |
| `tag`       | `graphStore.byTag`            | exact / prefix lookup         | <1 ms      | tag chips              |
| `backlinks` | `graphStore.byLink.inbound`   | map lookup                    | <1 ms      | "backlinks of X" panel |
| `semantic`  | `graphStore.serialize()` → SA | spreading activation          | ~80-200 ms | toggle "related"       |

---

## Fuse.js configuration

```typescript
// inside SearchService constructor(graph: GraphStore, config: SearchConfig)
const fuse = new Fuse(graph.allNodes(), {
  keys: config.fuzzy?.keys ?? [
    { name: 'title', weight: 0.7 },
    { name: 'tags', weight: 0.3 },
  ],
  threshold: config.fuzzy?.threshold ?? 0.3, // 0 = exact, 1 = anything
  ignoreLocation: true,
  includeScore: true,
  includeMatches: true,
  minMatchCharLength: 2,
});
```

Fuse options pull from `spec.search.fuzzy` when present so the user can tune ranking without touching backend code.

### Threshold tuning

- `0.0 – 0.2`: prefix-style, strict (Obsidian default feel)
- `0.3`: default, allows 1-2 typos
- `0.4 – 0.6`: very permissive

Exposed in `dashboard-spec.json::search.fuzzy.threshold` so user can adjust.

### Live reindex

```typescript
graphStore.onReload(() => fuse.setCollection(graphStore.allNodes()));
```

No manual rebuild required after `.maencof/nodes.json` hot reload.

---

## Tag index

```typescript
// GraphStore builds this at boot
byTag: Map<string, KnowledgeNode[]>;

// Project KnowledgeNode → SearchHit so the wire shape matches the
// SearchResponse contract (items: SearchHit[]).
function toHit(n: KnowledgeNode): SearchHit {
  return {
    path: n.path,
    title: n.title,
    tags: n.tags,
    layer: n.layer ?? null,
  };
}

// API — `items` is ALWAYS SearchHit[], never raw KnowledgeNode[].
GET /api/search?mode=tag&q=ai
  -> { items: (byTag.get('ai') ?? []).map(toHit), mode: 'tag' }

GET /api/search?mode=tag&q=ai&prefix=true
  -> {
       items: Array.from(byTag.entries())
                    .filter(([t]) => t.startsWith('ai'))
                    .flatMap(([_, nodes]) => nodes)
                    .map(toHit),
       mode: 'tag',
     }
```

Both exact and prefix matching exposed. The same `toHit` projection is
applied to lexical and backlinks responses so every `SearchResponse.items`
member is a `SearchHit` regardless of mode.

---

## Backlinks

Backlinks is **path-keyed, not a free-text mode**. The request is
`GET /api/search?mode=backlinks&path=<vault-rel-path>` and the response shape
differs from text search, so the frontend consumes it via `api.backlinks(path)`
(see `interfaces.md`) from a dedicated "backlinks of X" panel — NOT from the
global `SearchBar`, which offers only the text-query modes (`lexical` / `tag` /
`semantic`). Never wire `backlinks` into the SearchBar toggle row, and never
call `api.search('backlinks', …)` — the unified `search()` signature does not
include it.

Backlinks does not flow through `SearchResponse.items` because its
payload shape is fundamentally different: inbound/outbound path arrays
plus optional cross-layer edges. The handler resolves each path to its
`KnowledgeNode` via `graphStore.nodes` and projects to `SearchHit`:

```typescript
function hitsForPaths(paths: string[]): SearchHit[] {
  return paths.flatMap((p) => {
    const n = graphStore.nodes.get(p);
    return n ? [toHit(n)] : []; // skip dangling links
  });
}

GET /api/search?mode=backlinks&path=02_Derived/foo.md
  -> {
       inbound: hitsForPaths(byLink.inbound.get(path) ?? []),
       outbound: hitsForPaths(byLink.outbound.get(path) ?? []),
       crossLayer: edges.crossLayer.filter(
         (e) => e.from === path || e.to === path,
       ),
       mode: 'backlinks',
     }
```

The response shape is `{ mode: 'backlinks'; inbound: SearchHit[];
outbound: SearchHit[]; crossLayer: KnowledgeEdge[] }` — frontend
consumers MUST handle this branch separately from the unified
`SearchResponse`. Cross-layer edges (via L5-Boundary) returned
separately so UI can highlight them.

---

## Semantic via SA

Loads `@ogham/maencof/dist/core/spreading-activation` lazily:

```typescript
// backend/src/lib/sa-loader.ts
let _sa:
  | ((g: SerializedGraph, seed: string, opts: SAOptions) => ActivationResult[])
  | null = null;

export async function loadSA() {
  if (_sa) return _sa;
  try {
    const mod = await import('@ogham/maencof/dist/core/spreading-activation');
    _sa = mod.spreadingActivation;
    return _sa;
  } catch {
    return null;
  }
}

export async function isSemanticAvailable() {
  return (await loadSA()) !== null;
}
```

Route:

```typescript
const KNOWN_MODES = new Set<SearchMode>([
  'lexical',
  'tag',
  'backlinks',
  'semantic',
]);

app.get('/api/search', async (req, reply) => {
  const raw = req.query as Record<string, string | undefined>;
  const modeStr = raw.mode ?? '';

  // 1) Validate against the SearchMode union first → 400 for unknown.
  if (!KNOWN_MODES.has(modeStr as SearchMode)) {
    return reply.code(400).send({ error: `unknown search mode '${modeStr}'` });
  }
  const mode = modeStr as SearchMode;

  // 2) Check spec enablement → 404 when disabled.
  if (!app.spec.search.modes.includes(mode)) {
    return reply.code(404).send({ error: `search mode '${mode}' disabled` });
  }

  // 3) For semantic, check optional dep → 501 when missing.
  if (mode === 'semantic') {
    const sa = await loadSA();
    if (!sa) {
      return reply
        .code(501)
        .send({ error: 'semantic search disabled (install @ogham/maencof)' });
    }
    const results = sa(app.graphStore.serialize(), raw.q ?? '', {
      maxHops: raw.hops ? Number(raw.hops) : 5,
      decay: 0.7,
      threshold: 0.1,
      layerFilter: raw.layer ? [Number(raw.layer)] : undefined,
    });
    return { items: results, mode: 'semantic' };
  }
  // ... other modes
});
```

### Response codes

| Situation                                               | HTTP code |
| ------------------------------------------------------- | --------- |
| Unknown `mode` parameter (not in `SearchMode` union)    | 400       |
| `spec.search.modes` does NOT include the requested mode | 404       |
| `@ogham/maencof` not installed AND mode === 'semantic'  | 501       |
| Valid request                                           | 200       |

**Precedence is fixed**: 400 (union) → 404 (spec) → 501 (loadSA). Each
check runs only after the previous one passes. Never cast `req.query`
straight to `SearchQuery` — validate `mode` against `KNOWN_MODES` first
so unknown values never reach the `spec.search.modes.includes(...)`
test (which would misclassify them as "disabled" instead of "unknown").

### Why not call maencof MCP

MCP uses stdio with 1:1 client pairing. The Claude Code session already owns one connection. Standing up a second from the dashboard backend means:

- Spawning a separate `maencof` server process for the dashboard
- Lifecycle management (start/stop/restart on schema change)
- Locking concerns on the cache files

Importing the algorithm directly avoids all of that. The cost is a peer dependency on `@ogham/maencof`. Graceful fallback when absent.

---

## Combined search response shape

```typescript
interface SearchResponse {
  mode: 'lexical' | 'tag' | 'backlinks' | 'semantic';
  q: string;
  items: SearchHit[];
  total: number;
  truncated: boolean;
  durationMs: number;
}

interface SearchHit {
  path: string;
  title: string;
  tags: string[];
  layer: number | null;
  score?: number; // lexical / semantic only
  matches?: FuseMatch[]; // lexical only — for highlight rendering
}
```

Frontend uses `score` to sort and `matches` to render highlights inside the title.

---

## Frontend SearchBar — self-configuring

`SearchBar` is always rendered with **zero props**. It reads its enabled modes from `GET /api/spec` (which returns `{ search: SearchConfig }`). This keeps `Dashboard.tsx` unchanged regardless of which modes are configured.

When `spec.search.modes` has no text-query mode, `SearchBar` returns `null` — no DOM, no toggle, no input. When only one text mode is configured, the toggle row is omitted but the input remains. `backlinks` is excluded from the SearchBar's modes (it is path-keyed — see "Backlinks"); a spec whose `search.modes` is only `['backlinks']` renders the SearchBar as `null`, and backlinks is shown by a dedicated panel instead.

SearchBar is **self-contained** — no external `useDebounce` hook, no
`SearchResults` import, no `../api/types` module. The pattern below is the
only file the LLM authors for the search UI:

```tsx
// <target>/frontend/src/components/SearchBar.tsx (authored during Phase 4)
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { api } from '../api/client';

type SearchMode = 'lexical' | 'tag' | 'backlinks' | 'semantic';
// backlinks is path-keyed with a different response shape, so it is not a
// text-box mode. The SearchBar drives only these query modes:
type QueryMode = Exclude<SearchMode, 'backlinks'>;

interface SearchHit {
  path: string;
  title: string;
  tags: string[];
  layer: number | null;
  score?: number;
}

function useDebounced<T>(value: T, delay: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}

function SearchResults({ hits }: { hits: SearchHit[] }) {
  if (hits.length === 0) return <div className="search-empty">No matches</div>;
  return (
    <ul className="search-results">
      {hits.map((h) => (
        <li key={h.path}>
          <a href={`#/doc/${encodeURIComponent(h.path)}`}>{h.title}</a>
          {h.tags.length > 0 && (
            <span className="tag-chips">
              {h.tags.map((t) => (
                <span key={t} className="tag">
                  {t}
                </span>
              ))}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

export function SearchBar() {
  const { data: specData } = useQuery({
    queryKey: ['spec'],
    queryFn: () => api.spec(),
    staleTime: Infinity,
  });
  // Exclude backlinks — it is path-keyed (api.backlinks(path)) and surfaced by
  // a dedicated panel, not this text box. See "Backlinks" below.
  const modes = (specData?.search.modes ?? []).filter(
    (m): m is QueryMode => m !== 'backlinks',
  );

  const [mode, setMode] = useState<QueryMode | null>(null);
  const [q, setQ] = useState('');
  const debounced = useDebounced(q, 200);
  const activeMode = mode ?? modes[0];

  const { data: hits, isFetching } = useQuery({
    queryKey: ['search', activeMode, debounced],
    queryFn: () =>
      debounced && activeMode ? api.search(activeMode, debounced) : null,
    enabled: !!debounced && !!activeMode,
  });

  if (modes.length === 0) return null;

  return (
    <div className="search-bar">
      {modes.length > 1 && (
        <div className="search-modes">
          {modes.map((m) => (
            <button
              key={m}
              aria-pressed={activeMode === m}
              onClick={() => setMode(m)}
            >
              {m}
            </button>
          ))}
        </div>
      )}
      <input
        type="search"
        placeholder={activeMode === 'tag' ? '#ai' : 'title or tag…'}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {isFetching && <div className="search-loading">…</div>}
      {hits && <SearchResults hits={hits.items} />}
    </div>
  );
}
```

The backend exposes `/api/spec` via `routes/spec.ts` (authored in CREATE Phase 4 Turn 5) returning `{ search: spec.search, refresh: spec.refresh }` — never the full spec, to keep the surface minimal. The route uses an mtime cache so MUTATE-driven `dashboard-spec.json` rewrites propagate without restarting the backend (full pattern in `methods/create/workflow.md` Phase 4 Turn 5). `refresh` is included so the frontend can decide whether to start `startSse()` at boot without hardcoding the mode.

**MUTATE never touches `SearchBar.tsx`.** Because the component self-configures at runtime, search.modes changes propagate automatically via the rewritten `dashboard-spec.json`. There is no `ENABLED_MODES` sentinel anywhere in the generated frontend.

---

## Highlight rendering

Fuse.js returns `matches` with `[start, end]` index pairs. The frontend renders highlighted spans:

```tsx
function HighlightedTitle({
  title,
  matches,
}: {
  title: string;
  matches?: FuseMatch[];
}) {
  if (!matches) return <>{title}</>;
  const indices = matches.find((m) => m.key === 'title')?.indices ?? [];
  return <>{splitWithHighlight(title, indices)}</>;
}
```

`splitWithHighlight` is a 10-line helper, embedded in the same component file (no separate util).

---

## Performance budget

For a 10K-node vault:

| Mode               | p50    | p99    |
| ------------------ | ------ | ------ |
| lexical (10 chars) | 8 ms   | 40 ms  |
| tag exact          | <1 ms  | 2 ms   |
| backlinks          | <1 ms  | 2 ms   |
| semantic (hops=5)  | 120 ms | 400 ms |

If lexical p99 exceeds 100 ms, switch to `lazyOptions` in Fuse or precompute a trigram index.

---

## Disabling modes

Spec's `search.modes` controls both backend route enablement and frontend UI at runtime:

- `modes: ['lexical']` → only lexical mode active; tag/backlinks/semantic routes return 404
- `modes: ['lexical', 'tag']` → tag chips visible; backlinks/semantic hidden
- `modes: []` → SearchBar renders `null` (no DOM, no toggle, no input)

`backlinks`, even when enabled in `search.modes`, never appears as a SearchBar
text toggle — it is path-keyed and surfaced by a dedicated panel via
`api.backlinks(path)` (see "Backlinks").

The SearchBar component file is always authored at scaffold time and always imported by `Dashboard.tsx`. Runtime gating happens inside the component via `/api/spec`. `fuse.js` lives **only in the backend** — frontend never imports it. When the user later enables search there is no frontend dependency change required.
