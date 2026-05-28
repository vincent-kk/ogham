# Module Interfaces — Single Source of Truth

Every backend module that craft-dashboard authors during CREATE Phase 4 (Turns 1-5) implements one of the contracts in this file. Other knowledge files (`vault-indexing.md`, `search-design.md`, `spec-schema.md`) describe behaviour and data flow; they MUST NOT redefine these interfaces.

When authoring or patching a module, treat the matching signature here as the contract anchor. Spec validation also references these (e.g., `parseSpec(unknown): DashboardSpec`).

---

## Shared types — local mirror in `backend/src/types/graph.ts`

The dashboard reads `.maencof/nodes.json` and `.maencof/edges.json` which
serialise the maencof graph. The generated backend declares its own copy of
the node/edge type definitions at `backend/src/types/graph.ts` and imports
from that local path. This avoids depending on `@ogham/maencof` being
resolvable on disk — the package is `optionalDependencies` for the spreading
activation algorithm, not a guaranteed npm-published type provider.

```typescript
// backend/src/types/graph.ts (authored during Phase 4 Turn 1)
export type NodeId = string;
export type Layer = 1 | 2 | 3 | 4 | 5;
export type SubLayer =
  | 'relational'
  | 'structural'
  | 'topical'
  | 'buffer'
  | 'boundary';

export interface KnowledgeNode {
  /* fields below */
}
export interface KnowledgeEdge {
  /* fields below */
}
```

```typescript
// backend/src/graph-store.ts (excerpt)
import type {
  KnowledgeEdge,
  KnowledgeNode,
  Layer,
  NodeId,
  SubLayer,
} from './types/graph.js';

export type { KnowledgeNode, KnowledgeEdge, NodeId, Layer, SubLayer };
```

Inside the ogham monorepo the mirror MAY be kept in sync with
`@ogham/maencof/src/types/graph.ts`; in other environments it stands alone.

Authoritative shapes:

```typescript
interface KnowledgeNode {
  id: NodeId;
  path: string; // vault-root-relative
  title: string;
  layer: Layer;
  tags: string[];
  created: string; // YYYY-MM-DD
  updated: string; // YYYY-MM-DD
  mtime: number; // unix ms
  accessed_count: number;
  pagerank?: number;
  cf?: number;
  subLayer?: SubLayer;
  connectedLayers?: number[];
  boundaryType?: string;
  person?: Person;
  domain?: string;
  mentioned_persons?: string[];
  outboundLinks?: string[];
}

interface KnowledgeEdge {
  from: NodeId;
  to: NodeId;
  type: EdgeType;
  weight: number;
}

interface Person {
  name: string;
  ref?: string; // optional canonical ref (e.g., person ID)
}

type EdgeType = 'wikilink' | 'tag-cooccurrence' | 'cross-layer' | 'mention';
```

`KnowledgeNode` is the only node shape used across the backend. Earlier drafts of this skill referred to `NodeMeta`; treat any remaining `NodeMeta` mention as a synonym for `KnowledgeNode` and fix the reference. The local mirror in `backend/src/types/graph.ts` (authored during Phase 4 Turn 1) MUST export all seven symbols: `NodeId`, `Layer`, `SubLayer`, `KnowledgeNode`, `KnowledgeEdge`, `Person`, `EdgeType`.

---

## GraphStore

```typescript
export class GraphStore {
  readonly schemaVersion: string;
  readonly builtAt: number;

  // Lookup indices built at boot (and rebuilt on reload).
  readonly nodes: Map<string, KnowledgeNode>; // vault-relative path -> node
  readonly byLayer: Map<Layer, KnowledgeNode[]>;
  readonly byTag: Map<string, KnowledgeNode[]>;
  readonly byLink: {
    inbound: Map<string, string[]>; // path -> paths linking TO it
    outbound: Map<string, string[]>; // path -> paths it links to
  };

  static fromVault(
    vaultRoot: string,
    vaultIndex: 'maencof' | 'independent',
  ): Promise<GraphStore>;

  allNodes(): KnowledgeNode[];
  totalCount(): number;
  reload(): Promise<void>;
  onReload(cb: () => void): void;

  // Serialise to the shape semantic search expects.
  serialize(): SerializedGraph;
}

interface SerializedGraph {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  adjacency: Map<NodeId, Array<{ to: NodeId; weight: number }>>;
}
```

`fromVault` reads `<vault>/.maencof/{nodes,edges}.json` when `vaultIndex === 'maencof'`; otherwise it falls back to the file-walk path (see `vault-indexing.md` "Independent fallback").

---

## BodyCache

```typescript
export interface RenderedDoc {
  frontmatter: Record<string, unknown>;
  body: string; // raw markdown
  html: string; // rendered html (markdown-it)
  excerpt: string;
}

export class BodyCache {
  constructor(vaultRoot: string, options: { maxEntries: number });

  get(relPath: string): Promise<RenderedDoc>;
  invalidate(absOrRelPath: string): void;
}
```

The LRU eviction policy lives inside the implementation; consumers do not see it.

---

## SearchService

```typescript
import type { SearchConfig } from './spec-schema.js';

export type SearchMode = 'lexical' | 'tag' | 'backlinks' | 'semantic';

export interface SearchHit {
  path: string;
  title: string;
  tags: string[];
  layer: number | null;
  score?: number;
  matches?: FuseMatch[];
}

export interface FuseMatch {
  key: string;
  indices: Array<[number, number]>;
}

export class SearchService {
  constructor(graph: GraphStore, config: SearchConfig);

  lexical(q: string): SearchHit[];
  tag(tag: string, opts?: { prefix?: boolean }): KnowledgeNode[];
  backlinks(path: string): {
    inbound: string[];
    outbound: string[];
    crossLayer: KnowledgeEdge[];
  };
  semantic(
    seed: string,
    opts?: { hops?: number; layer?: number },
  ): Promise<SearchHit[]>;
}
```

Semantic mode returns a rejected Promise (`error: 'semantic search disabled'`) when `@ogham/maencof` is not installed; the route layer maps that to HTTP 501.

---

## VaultWatcher

```typescript
export interface VaultWatcherDeps {
  graphStore: GraphStore;
  bodyCache: BodyCache;
  broadcaster: Broadcaster;
}

export class VaultWatcher {
  constructor(vaultRoot: string, deps: VaultWatcherDeps);

  start(): Promise<void>;
  stop(): Promise<void>;
}
```

Internally uses `chokidar` to watch `.maencof/{nodes,edges,stale-nodes}.json` (debounced 500 ms) and `**/*.md` (debounced 800 ms).

---

## Broadcaster

```typescript
export type SseTopic = 'graph' | 'vault' | 'stale';

export class Broadcaster {
  subscribe(reply: import('fastify').FastifyReply): void;
  publish(topic: SseTopic, payload: unknown): void;
}
```

Used by routes/events.ts to attach an SSE connection (`fastify-sse-v2`) and by the watcher to push topic-keyed updates.

---

## config.ts + spec-schema.ts

```typescript
// config.ts
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { RuntimeSpec } from './spec-schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export type { RuntimeSpec };

export const CONFIG: {
  VAULT_ROOT: string; // default only — see priority below
  PORT: number; // default 5174
  SPEC_PATH: string; // <target>/dashboard-spec.json
};

export function ensureSpec(): Promise<RuntimeSpec>;
```

The generated `config.ts` MUST use ESM-safe `import.meta.url` resolution (above)
— `__dirname` is undefined under `"type": "module"`.

**Vault path priority** inside `ensureSpec()`:

1. `process.env.VAULT_ROOT` (explicit override)
2. `dashboardSpec.vaultPath` (persisted absolute path from spec)
3. `resolve(__dirname, '../../..')` (parent of dashboard target — three levels:
   `dist|src` → `backend` → `<target>` → its parent, the vault)

The resolved value becomes `RuntimeSpec.vaultPath` and is the **single source of
truth** consumed by `server.ts`, `GraphStore.fromVault`, `BodyCache`,
`VaultWatcher`. `CONFIG.VAULT_ROOT` is exposed only as a debug fallback; runtime
code MUST read `spec.vaultPath`, not `CONFIG.VAULT_ROOT`.

**Vault index priority** inside `ensureSpec()`:

1. `process.env.VAULT_INDEX` (when set to `maencof` | `independent`)
2. `dashboardSpec.vaultIndex` (persisted from `--vault-index` at create time)

The resolved value becomes `RuntimeSpec.vaultIndex`, consumed by
`GraphStore.fromVault(vaultPath, vaultIndex)`. This is the runtime knob the
generated `README.md` documents as `VAULT_INDEX`.

```typescript
// spec-schema.ts
import { z } from 'zod';

export interface DashboardSpec {
  /* see ../../knowledge/spec-schema.md */
}
export interface RuntimeSpec extends Omit<DashboardSpec, 'vaultPath'> {
  vaultPath: string;
  port: number;
}

export const DashboardSpecZ: z.ZodType<DashboardSpec>;
export function parseSpec(input: unknown): DashboardSpec;
```

`DashboardSpec` and `RuntimeSpec` definitions live in `../../knowledge/spec-schema.md` and are authoritative there; this file re-exports them.

---

## Frontend interfaces

```typescript
// frontend/src/api/client.ts
export interface ApiClient {
  // Text-query modes only. backlinks is path-keyed with a different response
  // shape — call backlinks() below, never search('backlinks', …).
  search(
    mode: 'lexical' | 'tag' | 'semantic',
    q: string,
  ): Promise<{ items: SearchHit[]; mode: 'lexical' | 'tag' | 'semantic' }>;
  backlinks(path: string): Promise<{
    inbound: SearchHit[];
    outbound: SearchHit[];
    crossLayer: KnowledgeEdge[];
  }>;
  nodes(): Promise<KnowledgeNode[]>;
  doc(path: string): Promise<RenderedDoc>;
  status(): Promise<{ staleRatio: number; level: 'ok' | 'warn' | 'critical'; ... }>;
  spec(): Promise<{ search: SearchConfig; refresh: 'sse' | 'manual' }>;
  //   drives SearchBar self-config AND main.tsx startSse gating.
  tags(): Promise<Array<{ tag: string; count: number }>>;
  domain<T = unknown>(name: string, params?: Record<string, string | number>): Promise<T>;
}

export const api: ApiClient;
```

```typescript
// frontend/src/api/sse.ts
export function startSse(
  qc: import('@tanstack/react-query').QueryClient,
  listener?: (topic: SseTopic, payload: unknown) => void,
): () => void;
```

The returned disposer stops the EventSource. Topic → cache invalidation mapping
lives inside `startSse` (see `vault-indexing.md` "Hot reload via chokidar"; a
`graph` event invalidates the whole cache so domain panels refetch). `startSse`
also wires `EventSource.onopen`/`onerror` to a connection-status sink (the
optional `uiStore`, or via `listener`) so `HeaderBar` can set its `data-status`
dot — see `vault-indexing.md` "Connection status (HeaderBar)".
