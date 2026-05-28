# CREATE Mode — Workflow

Full pipeline for scaffolding a new vault dashboard from scratch. Load when SKILL.md routes to CREATE mode.

```
Phase 1  Domain Priming         (inject interview hints)
Phase 2  Delegate to refine     (Socratic interview, 5–7 turns, hard cap 7)
Phase 3  Spec Transform         (refined draft → dashboard-spec.json)
Phase 4  Scaffold               (templates + spec-driven injections)
Phase 5  Build & Hand-off       (install, build, validate, print dev recipe)
```

---

## Phase 1 — Domain Priming

The priming file consolidates dashboard-specific hints + the user's raw request into a single document that the in-session interview (Phase 2) reads as authoritative context.

### Algorithm

```
1. Read ../../knowledge/interview-hints.md verbatim.
2. Compose <target>/.dashboard-priming.md with this structure:

     # Dashboard Interview Priming

     ## User Request

     <verbatim copy of the user's original request>

     ## Hints

     <full content of interview-hints.md>

3. The priming file is transient; Phase 3 deletes it after the spec is written.
```

Do not echo the priming file to the user as a chat-rendered code block. It is for the interview only.

---

## Phase 2 — Adopt refine's protocol in-session

**Slash-skill chaining is not supported inside an active skill.** Instead, this skill adopts `/maencof:refine`'s LLM-instruction protocol and runs it in the current session.

### Algorithm

```
1. Read `$CLAUDE_PLUGIN_ROOT/skills/refine/SKILL.md`.
   (Fallback: resolve relative to this skill's repo root if the env var is unset.
   Absolute paths are environment-specific and MUST NOT be hard-coded here.)
   The 5-phase contract is summarised in "Inlined refine contract" below.
2. Read <target>/.dashboard-priming.md as the interview input.
3. Execute refine's Phase 1 (Input Analysis) on the priming document:
   decompose into Goal, Context, Constraints, Immutable Objects.
4. Execute refine's Phase 2 + 2.5 (Inquiry Loop + Socratic Elenchus) directly
   with the user — one question at a time, total budget 5–7 turns (hard
   cap 7, matching `refine-protocol.md` and `interview-hints.md`).
   Probe order: skip any dimension the user's input already resolves, and
   address the remaining unresolved dimensions in whatever order matches the
   user's mental model. interview-hints.md's A → B → C → D sections are an
   advisory traversal, not a forced sequence.
5. Execute refine's Phase 3 (Final Generation). The refined prompt MUST use
   the section headings in interview-hints.md "Output Shape" (### Data /
   ### Dimensions / ### Insight Goal / ### Search / optional ### Annotations)
   so Phase 3 transform is deterministic.
6. Execute refine's Phase 4 (Document Auto-Update): write the refined prompt
   to <target>/.dashboard-spec.draft.md (NOT back to priming.md). The draft's
   format is:

     ## Refined Prompt

     ### Data
     ...

     ### Dimensions
     ...

     ### Insight Goal
     ...

     ### Search
     ...

     ## Logic & Strategy
     <brief explanation>

7. Verify <target>/.dashboard-spec.draft.md exists and is non-empty.
   If missing: stop and report; do not fabricate.
```

### Inlined refine contract (summary)

See `../../knowledge/refine-protocol.md` for the full shared summary (one
question per turn, 5–7 question budget for CREATE (hard cap 7),
immutable-object preservation, Phase 3 stop rule, token-budget safety).
Both CREATE and MUTATE workflows reference the same file — do not
duplicate the contract here.

---

## Phase 3 — Spec Transform

Read `<target>/.dashboard-spec.draft.md` and transform into `<target>/dashboard-spec.json`. Schema details: **../../knowledge/spec-schema.md**.

### Algorithm

```
1. Parse <target>/.dashboard-spec.draft.md
   - Extract "Refined Prompt" section
2. Run section-by-section extraction:
   a. "data" / "data domains" / "what to show" -> dataDomains[]
   b. "dimensions" / "axes" / "how to view"    -> panels[].kind via viz catalog
   c. "insight" / "goal"                       -> panels[].annotations
   d. "search" / "find" / "lookup"             -> search{}
3. Map to dashboard-spec.json schema (see ../../knowledge/spec-schema.md).
   Default-fill required fields when the refined prompt does not specify them:
   - `version`     -> "1.0"
   - `vaultIndex`  -> CLI flag value | "maencof"
   - `refresh`     -> "sse"
   - `search`      -> { modes: ["lexical", "tag"], fields: ["title", "tags"] }
   Surface defaulted fields in the diff preview so the user can override.
4. Write <target>/dashboard-spec.json
5. Show JSON diff (vs empty)
6. Ask: "Spec OK? [Y/n/edit]"
   - y    -> Phase 4 (default — also the headless auto-resolved choice)
   - n    -> abort, keep draft for re-run
   - edit -> open spec in $EDITOR, then re-validate ALL 3 passes (parseSpec
            + validateSpecRefs + the fromDomain DAG check) from
            ../../knowledge/spec-schema.md "Validation".
            On validation fail, print "validation error at {path}: {reason}"
            and prompt "[r] retry editor / [a] abort and keep draft":
              r -> re-open $EDITOR with the same file. Loop.
              a -> keep draft, abort the run; the user can re-invoke
                   `/maencof:craft-dashboard create <target>` later and
                   pick up from the draft.
            (interactive only; in headless mode the entire edit branch is
             unreachable — see SKILL.md Phase 0 headless detection.
             Headless runs auto-pick "y" and proceed; never spawn $EDITOR.)
7. Delete <target>/.dashboard-priming.md and <target>/.dashboard-spec.draft.md
```

### Key transformations

- `data domains` (text) → `dataDomains: [{ layer, subLayer, fields }]`
- `dimensions` (text) → `panels: [{ id, kind, dataDomain, layout }]` via **../../knowledge/visualization-catalog.md** mapping
- `search needs` (text) → `search: { modes, fields, fuzzy }` via **../../knowledge/search-design.md**
- `insight goals` (text) → `panels[].annotations` (thresholds, highlight rules)

### Schema validation

Phase 3 happens before Phase 4 authors `<target>/backend/src/spec-schema.ts`, so validate in-context against the TypeScript interfaces in `../../knowledge/spec-schema.md` (DashboardSpec, DataDomain, Panel, SearchConfig). Run all three passes from spec-schema.md "Validation": (1) structural (the interfaces here), (2) `validateSpecRefs` cross-field checks — panel→dataDomain FK and search modes/fields coherence are hard errors; surface kind/aggregate mismatches as warnings in the diff preview, (3) `validateFromDomainDag`. On any error, print the field path + reason and stop.

---

## Phase 4 — Scaffold

`templates/` carries only **boilerplate + entry shells**. Every `.ts` and `.tsx` under `src/` that the entry shells import — and every spec-driven component — is authored by the LLM at scaffold time. Strict file-level templates are intentionally avoided; the entry shells act as the contract anchor.

### Algorithm — multi-turn author plan

Phase 4 authors the backend/frontend infrastructure in **ordered turns**. Treat each turn as an isolated author scope — write only the files listed in that turn before moving to the next. After each turn, run the in-turn self-check before proceeding.

At the start of Phase 4 print one line to the user:

> `craft-dashboard: scaffold in progress (turns 1–8 + per-domain/per-panel). Do not run npm install / npm run build until 'Phase 5 — Build & Hand-off' starts.`

If a token-budget limit interrupts a turn, finish the partial file, leave a one-line status note in the chat (e.g. `paused after Turn 3; resuming Turn 4 in next message — workspace incomplete`), and continue the same turn in the next message. Do not skip turns or batch them.

```
0. Copy templates verbatim (recursive copies MUST include dotfiles):
   - templates/backend/        -> <target>/backend/   (incl. backend/.npmrc + *.d.ts shims)
   - templates/frontend/       -> <target>/frontend/  (incl. frontend/.npmrc)
   - templates/Makefile        -> <target>/Makefile
   - templates/package.json    -> <target>/package.json
   - templates/README.md       -> <target>/README.md
   - templates/.npmrc          -> <target>/.npmrc     (root supply-chain guard: min-release-age — consulted by the Phase 5 root `npm install`)
   - templates/.gitignore      -> <target>/.gitignore

--- Backend infrastructure (LLM-authored against ../../knowledge/interfaces.md) ---

Turn 1 — Type foundation
   - backend/src/types/graph.ts
     Local mirror of KnowledgeNode, KnowledgeEdge, NodeId, Layer, SubLayer,
     Person, EdgeType (all 7 — see ../../knowledge/interfaces.md
     "Shared types"). MUST be authored first; every other backend module
     imports its graph types from ./types/graph.js, never from @ogham/maencof.
   Self-check: file exists; exports the 7 symbols above; no @ogham/maencof
   import anywhere in the file.

Turn 2 — Spec + config
   - backend/src/spec-schema.ts -> {
       DashboardSpec, RuntimeSpec (re-exported in config.ts),
       DashboardSpecZ (Zod parser), parseSpec(unknown): DashboardSpec,
       validateSpecRefs(spec): { ok, errors, warnings },
       validateFromDomainDag(spec): { ok, reason?, authorOrder? }
     }
     Zod schema MUST mirror DashboardSpec from
     ../../knowledge/spec-schema.md including the required 'vaultIndex'
     field. validateSpecRefs implements the cross-field checks (panel
     dataDomain FK + search modes/fields coherence as errors, kind/aggregate
     mismatches as warnings) from ../../knowledge/spec-schema.md
     "validateSpecRefs — cross-field checks". The DAG validator follows the
     algorithm in ../../knowledge/spec-schema.md "Validation: fromDomain DAG".
   - backend/src/config.ts -> {
       CONFIG: { VAULT_ROOT, PORT, SPEC_PATH },
       ensureSpec(): Promise<RuntimeSpec>,
       RuntimeSpec (re-export from spec-schema.ts)
     }
     ensureSpec() MUST:
       a. Read SPEC_PATH (dashboard-spec.json)
       b. Parse with DashboardSpecZ -> DashboardSpec
       c. Resolve vaultPath: env VAULT_ROOT > spec.vaultPath
          > path.resolve(modDir, '../../..')
          where modDir = dirname(fileURLToPath(import.meta.url))
          — ESM-safe; __dirname is undefined under "type": "module".
          THREE levels up: modDir (dist|src) -> backend -> <target> -> its
          parent = the vault. Two levels ('../..') wrongly lands on <target>
          itself. See knowledge/interfaces.md "Vault path priority".
       d. Resolve vaultIndex: env VAULT_INDEX > spec.vaultIndex
          (knowledge/interfaces.md "Vault index priority"). This is the
          runtime knob README documents as VAULT_INDEX.
       e. Resolve port: env PORT > 5174
       f. Return RuntimeSpec (DashboardSpec + resolved fields)
   Self-check: parseSpec({}) throws; ensureSpec() resolves vaultPath via
   '../../..' (parent of <target>, NOT <target>); ensureSpec() honors env
   VAULT_INDEX over spec.vaultIndex; validateSpecRefs flags an unknown
   panel.dataDomain; validateFromDomainDag rejects A→B→A.

Turn 3 — Core storage
   - backend/src/graph-store.ts -> class GraphStore (see
     ../../knowledge/interfaces.md + ../../knowledge/vault-indexing.md).
     Static factory: GraphStore.fromVault(vaultRoot, vaultIndex) where
     vaultIndex is 'maencof' | 'independent'.
   - backend/src/body-cache.ts -> class BodyCache (LRU + gray-matter +
     markdown-it). See ../../knowledge/interfaces.md.
   Self-check: both files import graph types from ./types/graph.js (never
   redefine); GraphStore.fromVault is an async static factory.

Turn 4 — Services
   - backend/src/search-service.ts -> class SearchService.
     Constructor: new SearchService(graphStore, spec.search). See
     ../../knowledge/interfaces.md + ../../knowledge/search-design.md.
   - backend/src/services/broadcaster.ts -> class Broadcaster (SSE pub/sub).
   - backend/src/lib/sa-loader.ts -> loadSA / isSemanticAvailable. See
     ../../knowledge/search-design.md "Semantic via SA".
   - backend/src/watcher.ts -> class VaultWatcher (chokidar + debounce;
     500 ms for .maencof/*.json, 800 ms for **/*.md).
   Refresh wiring: the template `server.ts` ALREADY gates `fastify-sse-v2`
   registration, `watcher.start()`, and the onClose hook behind
   `const live = spec.refresh !== 'manual'` — verbatim-correct for BOTH
   modes, so Turn 4 does NOT patch server.ts and MUST NOT add an
   unconditional `app.register(sse)` / `watcher.start()`. When
   refresh === 'manual' the frontend also skips the EventSource (Turn 6)
   and clients fall back to TanStack Query refetch.
   Self-check: SearchService constructor matches interfaces.md; loadSA
   returns null when @ogham/maencof is absent (no throw, no top-level
   await); the shipped server.ts `live` gate is intact (no unconditional
   SSE/watcher start introduced).

Turn 5 — Routes
   - backend/src/routes/index.ts -> mountRoutes(app, spec: RuntimeSpec).
     MUST contain two AUTO-MANAGED sentinel blocks ("domain route imports",
     "domain route registrations") that MUTATE patches later. See
     "Sentinel placement (C1)" below for the exact shape.
   - backend/src/routes/search.ts -> /api/search?mode=&q=...
     Per-mode dispatch with response codes:
       - mode disabled in spec.search.modes -> 404
       - semantic mode but loadSA() returned null -> 501
       - unknown mode parameter -> 400
   - backend/src/routes/nodes.ts, doc.ts, events.ts, status.ts ->
     base API surface (see ../../knowledge/vault-indexing.md).
   - backend/src/routes/spec.ts -> GET /api/spec returning
     { search: spec.search, refresh: spec.refresh }. Implement with an
     **mtime cache** so MUTATE changes propagate without backend restart:

         import { stat } from 'node:fs/promises';
         import type { FastifyPluginAsync } from 'fastify';
         import { CONFIG, ensureSpec } from '../config.js';
         import type { RuntimeSpec } from '../spec-schema.js';

         let cached: { spec: RuntimeSpec; mtimeMs: number } | null = null;
         export const specRoute: FastifyPluginAsync = async (app) => {
           app.get('/api/spec', async () => {
             const s = await stat(CONFIG.SPEC_PATH);
             if (!cached || s.mtimeMs > cached.mtimeMs) {
               cached = { spec: await ensureSpec(), mtimeMs: s.mtimeMs };
             }
             return {
               search: cached.spec.search,
               refresh: cached.spec.refresh,
             };
           });
         };
   Self-check: routes/index.ts contains both AUTO-MANAGED-START markers;
   routes/spec.ts uses the mtime-cache pattern.

--- Frontend infrastructure (LLM-authored) ---

Turn 6 — Frontend infra
   - frontend/src/api/client.ts -> { api: { search, nodes, doc, status,
       domain<T>(name, params?), tags, spec } }
   - frontend/src/api/sse.ts -> startSse(qc, listener?): () => void.
     Topics: graph, vault, stale.
   - frontend/src/stores/uiStore.ts -> zustand store for SSE status (optional).
   - frontend/src/components/HeaderBar.tsx, StaleBanner.tsx -> see
     ../../knowledge/vault-indexing.md "Stale banner".
   - frontend/src/components/SearchBar.tsx -> self-config from /api/spec.
     Returns null when spec.search.modes is empty. SearchBar MUST be
     self-contained — useDebounce and SearchResults inline in the same
     file; no '../api/types', no 'hooks/useDebounce'. See
     ../../knowledge/search-design.md "Frontend SearchBar — self-configuring".
   Refresh wiring (frontend side): the template `main.tsx` ALREADY gates
   `startSse(qc)` on `api.spec().then(s => s.refresh !== 'manual')` (and
   defaults to live if /api/spec is unreachable). It imports `./api/client`
   and `./api/sse`, both authored in THIS turn — author them so main.tsx
   compiles; do NOT remove or un-gate the existing boot gate. For
   `refresh: 'manual'` the EventSource is never opened; clients rely on
   TanStack Query.
   Self-check: grep for "from '../api/types'" or "from '../hooks/useDebounce'"
   inside SearchBar.tsx returns 0 matches; main.tsx still gates `startSse(qc)`
   behind the `api.spec()` refresh check (shipped gate intact); SearchBar
   excludes `backlinks` from its text modes (see search-design.md).

--- Spec-driven (per dataDomain / panel) ---

7. For each spec.dataDomains[i], iterated in topological order from
   spec-schema.ts::validateFromDomainDag(spec).authorOrder when fromDomain
   chains exist (otherwise array order):
   - If `domain.fromDomain` is set, follow "Chained domain (fromDomain) handling"
     below — the route consumes the parent domain's aggregator output instead
     of querying `graphStore` directly.
   - Else, author backend/src/routes/<kebab>.ts        ("Domain Route Pattern")
            and  backend/src/services/aggregator-<kebab>.ts ("Aggregator Pattern").
   - Patch routes/index.ts AUTO-MANAGED regions:
     * import:    import { <camel>Route } from './<kebab>.js';
     * register:  app.register(<camel>Route);

8. For each spec.panels[i]:
   - Author frontend/src/components/<PascalName>.tsx
     (use the kind's pattern in ../../knowledge/visualization-catalog.md)
   - Patch frontend/src/pages/Dashboard.tsx AUTO-MANAGED regions:
     * import:    import { <PascalName> } from '../components/<PascalName>';
     * grid:      <div className="<layout>"><<PascalName> /></div>

8.5. Patch frontend/package.json dependencies for panel kinds that need
   libraries beyond Recharts:
     - kind === 'calendar-heatmap'  -> add 'react-calendar-heatmap' + '@types/react-calendar-heatmap'
     - kind in ('box','candlestick','sankey','force') OR --chart plotly
                                    -> add 'react-plotly.js', 'plotly.js', '@types/react-plotly.js'
     - kind === 'force' (when --chart NOT plotly)
                                    -> add 'react-force-graph'
   Each addition uses 'latest' unless --pin <version> rewrites it.
   This step runs before Phase 5 'npm install' so the first install
   resolves all required deps. Skip when the kind is already covered by
   an earlier panel in the same run (dedupe by package name).

9. SearchBar is zero-prop and self-configures from GET /api/spec, so no
   per-spec patching is needed. Confirm the SearchBar component file
   authored in Turn 6 follows the self-config pattern (returns null when
   spec.search.modes is empty).

10. Write <target>/dashboard-spec.json.
```

The turn order matters: Turn 1-6 must complete before steps 7-8, since the spec-driven files import the infrastructure symbols. Within a turn, the listed files may be authored in any order.

### End-of-Phase-4 verification (run before Phase 5)

- All Turn 1-6 self-checks pass.
- Every file imported by `server.ts`, `main.tsx`, `App.tsx`, and `pages/Dashboard.tsx` resolves.
- `routes/index.ts` AUTO-MANAGED blocks contain one import + one register line per `dataDomain`.
- `pages/Dashboard.tsx` AUTO-MANAGED blocks contain one import + one grid entry per `panel`.
- AUTO-MANAGED / USER-EDIT sentinel markers are intact (no stray placeholders, both ends present).
- Shipped refresh gates intact: `server.ts` wraps SSE/watcher in `spec.refresh !== 'manual'`; `routes/index.ts` registers `eventsRoute` only when `spec.refresh === 'sse'`; `main.tsx` gates `startSse` on `api.spec()` — none were un-gated during authoring.
- `backend/src/markdown-it-task-lists.d.ts` (ambient shim) is present so `tsc -p tsconfig.json` resolves the untyped plugin.
- Every panel component calls `api.domain<{ items: … }>(...)` with a concrete `<T>` and reads `data.items` (no `points`/`groups`/`values`/top-level `value`) — bare `api.domain('x')` or wrong keys fail strict `tsc --noEmit` or render empty.

### Injection Points

| Spec field     | File authored                                                                                                                   | Reference                                                                             |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| infrastructure | `backend/src/{graph-store,body-cache,search-service,watcher,config,spec-schema,services/broadcaster,lib/sa-loader,routes/*}.ts` | step 2 in Algorithm + `../../knowledge/{vault-indexing,search-design,spec-schema}.md` |
| infrastructure | `frontend/src/{api/client,api/sse,components/{HeaderBar,StaleBanner,SearchBar},stores/uiStore}.{ts,tsx}`                        | step 3 in Algorithm + `../../knowledge/{search-design,vault-indexing}.md`             |
| dataDomains[i] | `backend/src/routes/<kebab>.ts`                                                                                                 | "Domain Route Pattern" below                                                          |
| dataDomains[i] | `backend/src/services/aggregator-<kebab>.ts`                                                                                    | "Aggregator Pattern" below                                                            |
| dataDomains[i] | `backend/src/routes/index.ts` mountRoutes()                                                                                     | step 7 (import + register)                                                            |
| panels[i]      | `frontend/src/components/<PascalName>.tsx`                                                                                      | `../../knowledge/visualization-catalog.md` per kind                                   |
| panels[i]      | `frontend/src/pages/Dashboard.tsx` grid                                                                                         | patch USER-EDIT (import + grid entry)                                                 |
| search.modes   | (no per-spec patching — SearchBar self-configures via `/api/spec`)                                                              | `../../knowledge/search-design.md` "Frontend SearchBar — self-configuring"            |

### Sentinel placement (C1 — required for MUTATE compatibility)

`routes/index.ts` and `Dashboard.tsx` MUST contain skill-managed sentinel blocks at the spots MUTATE expects to patch. Author them during CREATE Phase 4 Turn 5 (backend) and Turn 6 (frontend) — not later. When MUTATE encounters a file with the expected sentinel missing, it follows the staged recovery in `../mutate/workflow.md` "Sentinel-missing protocol" (heuristic placement + single-confirm) rather than aborting.

Required `backend/src/routes/index.ts` shape:

```typescript
import type { FastifyInstance } from 'fastify';

import type { RuntimeSpec } from '../config.js';

import { docRoute } from './doc.js';
import { eventsRoute } from './events.js';
import { nodesRoute } from './nodes.js';
import { searchRoute } from './search.js';
import { specRoute } from './spec.js';
import { statusRoute } from './status.js';

// AUTO-MANAGED-START: domain route imports (managed by craft-dashboard; do not hand-edit)
// AUTO-MANAGED-END

export function mountRoutes(app: FastifyInstance, spec: RuntimeSpec) {
  app.register(searchRoute);
  app.register(nodesRoute);
  app.register(docRoute);
  // events.ts uses the fastify-sse-v2 `reply.sse` decorator, which server.ts
  // registers only when refresh === 'sse'. Gate the route to match so a
  // refresh: 'manual' backend never exposes an SSE endpoint with no plugin.
  if (spec.refresh === 'sse') {
    app.register(eventsRoute);
  }
  app.register(statusRoute);
  app.register(specRoute);

  // AUTO-MANAGED-START: domain route registrations (managed by craft-dashboard; do not hand-edit)
  // AUTO-MANAGED-END
}
```

`templates/frontend/src/pages/Dashboard.tsx` already ships with `AUTO-MANAGED-START/END` blocks for `panel imports` and `panel grid`. CREATE and MUTATE both author/patch lines **inside** those blocks for added/removed panels; the AUTO-MANAGED blocks ship empty (no placeholder div) so the first panel insertion produces a clean grid.

### Spec-driven file naming

Panel `id` becomes the React component file name in PascalCase:

```
spec.panels[0].id = "tag-distribution"
   -> frontend/src/components/TagDistribution.tsx
   -> imported as <TagDistribution /> in Dashboard.tsx
```

Data domain `name` becomes the route file in kebab-case:

```
spec.dataDomains[0].name = "session-timeline"
   -> backend/src/routes/session-timeline.ts
   -> mounted at GET /api/session-timeline
```

These conventions are enforced by Algorithm steps 7-8 — the LLM derives `<PascalName>` and `<kebab>` directly from spec ids at author time.

### Sentinel kinds — split-responsibility rule

Two sentinel kinds split responsibility cleanly:

| Marker pair               | Owner           | MUTATE behaviour                       | Use for                                         |
| ------------------------- | --------------- | -------------------------------------- | ----------------------------------------------- |
| `AUTO-MANAGED-START/END`  | craft-dashboard | Re-author the contents freely on patch | spec-derived enumerations the skill maintains   |
| `USER-EDIT-START/END`     | user            | Preserve contents verbatim across runs | small tweak zones the user tunes after scaffold |
| Code outside any sentinel | LLM-authored    | Re-author freely (overwrites)          | the rest of the generated body                  |

```typescript
// AUTO-MANAGED-START: <reason> (managed by craft-dashboard; do not hand-edit)
// AUTO-MANAGED-END

// USER-EDIT-START: <reason>
// USER-EDIT-END
```

**AUTO-MANAGED zones** — owned by the skill. Never preserve user edits inside:

- Panel imports + panel grid entries inside `Dashboard.tsx`.
- Domain route imports + registrations inside `mountRoutes()` of
  `routes/index.ts`.

**USER-EDIT zones** — owned by the user. Preserve verbatim:

- `dataKey` props, color mappings, chart axis labels in panel components.
- `layerFilter` literal in domain routes (single literal, not the whole node
  selection block).
- `post-aggregate transform` block at the END of an aggregator (small chain
  applied after the LLM-generated bucket logic).

Forbidden uses (both markers):

- Wrapping an entire function body. The function body is generated code and
  MUTATE must be able to regenerate it.
- Marking the only copy of business logic. Generated logic is always
  re-derivable from the spec; user logic that diverges goes into the
  post-aggregate transform USER-EDIT zone.

### Vault path resolution

Generated `<target>/backend/src/config.ts` reads `VAULT_ROOT` from env or falls back to `path.resolve(modDir, '../../..')` where `modDir = dirname(fileURLToPath(import.meta.url))` (ESM-safe; `__dirname` is undefined under `"type": "module"`). The resolved value is stored on `RuntimeSpec.vaultPath` — see `knowledge/interfaces.md` for the canonical helper. User can set `VAULT_ROOT=/path/to/vault` in `.env`.

### Domain Route Pattern

**Response envelope (contract):** every Domain Route returns
`{ items, window?, durationMs }` where `items` IS the aggregator's return value
verbatim (array for `count-*`, single object for `sum`). Frontend panels read
`data.items` and call `api.domain<{ items: … }>(...)`; never emit
`points`/`groups`/`values` keys. See ../../knowledge/visualization-catalog.md
"Response envelope + typing rule".

```typescript
// backend/src/routes/<kebab>.ts
import type { FastifyPluginAsync } from 'fastify';

import { <camelAgg> } from '../services/aggregator-<kebab>.js';

export const <camel>Route: FastifyPluginAsync = async (app) => {
  app.get('/api/<kebab>', async (req) => {
    const t0 = Date.now();
    const window = Number(
      (req.query as { days?: string })?.days ??
        app.spec.defaults?.windowDays ??
        30,
    );
    // USER-EDIT-START: <kebab> node selection
    const layerFilter: number | null = <null | 1..5>;
    const nodes =
      layerFilter == null
        ? app.graphStore.allNodes()
        : (app.graphStore.byLayer.get(layerFilter) ?? []);
    // USER-EDIT-END
    const items = await <camelAgg>(nodes, { window, today: new Date() });
    return { items, window, durationMs: Date.now() - t0 };
  });
};
```

Substitution rules:

- `<kebab>` = `spec.dataDomains[i].name` verbatim (already kebab-case)
- `<camel>` = camelCase(name) — e.g. `tag-stats` → `tagStats`
- `<camelAgg>` = `aggregate` + PascalCase(name) — e.g. `aggregateTagStats`
- `layerFilter` literal = `null` when layer is `"all"` or absent, integer for 1-5

### Aggregator Pattern

```typescript
// backend/src/services/aggregator-<kebab>.ts
import type { KnowledgeNode } from '../types/graph.js';

interface AggCtx { window: number; today: Date }

export async function <camelAgg>(
  nodes: KnowledgeNode[],
  ctx: AggCtx,
): Promise<unknown[]> {
  // Generated body — owned by craft-dashboard. MUTATE re-authors freely.
  //
  // Author concrete logic based on spec.dataDomains[i].aggregate:
  //   - count-by-day                : group by ISO date(node[dateField])
  //   - count-by-tag                : group by node.tags[]
  //   - count-by-layer              : group by node.layer
  //   - count-and-concept-presence  : group by tag + lookup concept doc
  //                                   presence (returns shape from
  //                                   ../../knowledge/spec-schema.md
  //                                   AggregateKind contract)
  //   - sum                         : sum a numeric field over nodes
  //   - none                        : pass nodes through unchanged
  // Output shape MUST match the AggregateKind contract in
  // ../../knowledge/spec-schema.md AND the consuming panel's expected
  // dataKey (see ../../knowledge/visualization-catalog.md).

  // USER-EDIT-START: pre-aggregate filter
  //   Optional manual override of node selection / filterIntent.
  //   Reassign `pool` before aggregation runs. Default is the input
  //   `nodes` argument; MUTATE preserves whatever the user puts here.
  let pool: KnowledgeNode[] = nodes;
  // USER-EDIT-END

  // If spec.dataDomains[i].filterIntent is set, translate it into a real
  // .filter(...) chain HERE (outside USER-EDIT — MUTATE regenerates this).
  // Example:
  //   "expires within 14 days, status != 'done'"
  //   ->  pool = pool.filter(n => n.expires != null
  //         && daysBetween(ctx.today, n.expires) <= 14
  //         && n.status !== 'done')
  let result: unknown[] = pool;
  // ... LLM fills concrete aggregation here ...

  // Apply spec.dataDomains[i].include projection when set. AUTO-MANAGED;
  // MUTATE rewrites this block from `include` on every patch. Skip when
  // include is unset or empty.
  // if (<include != null && include.length > 0>) {
  //   const keys = <include literal>; // e.g. ['tag','count']
  //   result = (result as Record<string, unknown>[]).map((row) =>
  //     Object.fromEntries(keys.map((k) => [k, row[k]])),
  //   );
  // }

  // USER-EDIT-START: post-aggregate transform
  //   Optional small chain the user can add (filter, map, sort, slice).
  //   Receives `result` and may reassign it before returning.
  // USER-EDIT-END

  return result;
}
```

The bucket logic and projection live outside USER-EDIT so MUTATE can
regenerate them when `spec.dataDomains[i].aggregate`, `.filterIntent`, or
`.include` change. The two USER-EDIT blocks (pre-aggregate filter and
post-aggregate transform) are the only zones preserved verbatim across
MUTATE patches.

### Chained domain (`fromDomain`) handling

When `spec.dataDomains[i].fromDomain` is set, the child domain consumes the
parent domain's pre-aggregated items instead of `graphStore.allNodes()`.
Chains can be N levels deep, so calling the parent aggregator directly with
`graphStore.byLayer.get(parentLayer)` is **only correct for the
root** — a parent that is itself chained expects its own parent's output,
not raw nodes.

To make any chain depth safe, Phase 4 Turn 7 authors a uniform service
function per domain:

```typescript
// backend/src/services/domain-<kebab>.ts (NEW — one per dataDomain)
import type { KnowledgeNode } from '../types/graph.js';
import { <camelAgg> } from './aggregator-<kebab>.js';

// resolveDomain may be authored once in services/resolve-domain.ts when
// any spec has fromDomain chains; it dispatches by name to each
// get<Domain>Items.
import { resolveDomain } from './resolve-domain.js';

export async function get<Pascal>Items(app: FastifyInstance) {
  const ctx = {
    window: app.spec.defaults?.windowDays ?? 30,
    today: new Date(),
    bodyCache: app.bodyCache,
  };
  const source = <fromDomain>
    ? await resolveDomain(app, '<fromDomain>')
    : (<layerFilter> == null
        ? app.graphStore.allNodes()
        : app.graphStore.byLayer.get(<layerFilter>) ?? []);
  return <camelAgg>(source, ctx);
}
```

The route then becomes a thin wrapper:

```typescript
// backend/src/routes/<kebab>.ts (chained AND non-chained variant — uniform)
import type { FastifyPluginAsync } from 'fastify';

import { get<Pascal>Items } from '../services/domain-<kebab>.js';

export const <camel>Route: FastifyPluginAsync = async (app) => {
  app.get('/api/<kebab>', async () => {
    const t0 = Date.now();
    // USER-EDIT-START: <kebab> node selection
    //   (Override layerFilter or pre-source nodes here. For chained
    //    domains the source comes from resolveDomain — this block is
    //    a no-op unless you replace the source.)
    // USER-EDIT-END
    const items = await get<Pascal>Items(app);
    return { items, durationMs: Date.now() - t0 };
  });
};
```

And the dispatcher (authored once when any fromDomain chain exists):

```typescript
// backend/src/services/resolve-domain.ts
import type { FastifyInstance } from 'fastify';

// AUTO-MANAGED-START: domain item imports (managed by craft-dashboard; do not hand-edit)
// AUTO-MANAGED-END

export async function resolveDomain(
  app: FastifyInstance,
  name: string,
): Promise<unknown[]> {
  switch (name) {
    // AUTO-MANAGED-START: domain dispatch (managed by craft-dashboard; do not hand-edit)
    // AUTO-MANAGED-END
    default:
      throw new Error(`unknown dataDomain: ${name}`);
  }
}
```

Phase 4 Turn 7 iterates dataDomains in `authorOrder` and patches both
AUTO-MANAGED blocks (`import { get<Pascal>Items } from './domain-<kebab>.js';`
plus `case '<kebab>': return get<Pascal>Items(app);`). MUTATE updates these
the same way.

The child aggregator's signature still accepts the parent's output type
(typically `unknown[]` or a domain-specific shape). Cycles in `fromDomain`
remain a spec error — Phase 3 schema validation MUST detect them before
scaffold.

---

## Phase 5 — Build & Hand-off

### Algorithm

```
1. cd <target> && npm install      (background job, stream output)
2. cd <target> && npm run build    (background job)
3. Validation checks (see "Validation Checklist" below)
4. Print hand-off recipe
5. Do NOT start a long-running server.
```

### Hand-off message

```
Dashboard ready at <target>.

Dev mode:   cd <target> && make dev-backend  (terminal 1, Fastify on 5174)
            cd <target> && make dev-frontend (terminal 2, Vite on 5173)
            Open: http://127.0.0.1:5173  (Vite proxies /api to 5174)

Prod mode:  cd <target> && make serve
            Open: http://127.0.0.1:5174
```

### Failure handling

- `npm install` fails: surface npm error, suggest `--registry` flag, do not retry blindly.
- `npm run build` fails: print TypeScript errors, ask the user to inspect.
  Re-entry options once the user has investigated:
  - Spec is wrong → `/maencof:craft-dashboard mutate <target>` to revise the spec.
  - Generated code only → `cd <target> && npm run build` after manual fix.
    Partial output stays under `<target>/` so the user can read what was authored.
- Validation fails: keep partial output (do not delete) for inspection; report
  the failing field path and which Phase 4 sub-step produced it.

---

## Stack (Confirmed)

| Layer          | Choice                                                           | Default version pin                                                                            |
| -------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Backend        | Fastify + `fastify-sse-v2` + `@fastify/static` + `@fastify/cors` | Fastify `^4`; plugins co-pinned: `fastify-sse-v2 ^4`, `@fastify/static ^7`, `@fastify/cors ^8` |
| Watcher        | `chokidar`                                                       | `latest`                                                                                       |
| Markdown       | `gray-matter` + `markdown-it` + `markdown-it-task-lists`         | `latest`                                                                                       |
| Validation     | `zod`                                                            | `^3`                                                                                           |
| Lexical search | `fuse.js`                                                        | `latest`                                                                                       |
| Frontend       | React 19 + Vite 6 + TanStack Query v5 + Zustand + dayjs          | `^19` / `^6` / `^5`                                                                            |
| Charts         | Recharts (default) — Plotly/visx optional                        | `latest`                                                                                       |
| Runtime        | Node ≥ 20 + ESM + TypeScript `^5`                                | —                                                                                              |

Stack-defining majors are caret-pinned (`^N`) in the templates so the API surface stays compatible across `npm install`. **Fastify plugins are NOT leaf libraries**: `@fastify/static` (`^7`), `@fastify/cors` (`^8`), and `fastify-sse-v2` (`^4`) are co-pinned to the Fastify-4-compatible majors, because each plugin enforces its accepted Fastify range at `app.register()` time — leaving them `"latest"` pulls Fastify-5-only majors and the backend crashes at boot with `FST_ERR_PLUGIN_VERSION_MISMATCH` (install + `tsc` still pass, so the failure only shows when the server runs). Leaf libraries (chokidar, gray-matter, markdown-it, recharts, zustand, dayjs, fuse.js, fast-glob) ship as `"latest"` and the user's `npm install` writes a fresh lockfile. `--pin <version>` rewrites the `"latest"` entries to the given concrete version; it MAY also override the caret-pinned majors when the user opts in explicitly.

---

## Vault Indexing — Option D (Hybrid Read-Only)

Confirmed approach: read `.maencof/nodes.json` and `.maencof/edges.json` from the vault read-only at boot, hot-reload them via chokidar when maencof updates them, and lazy-render markdown bodies on demand. See **../../knowledge/vault-indexing.md** for the full data flow, contract safety, and SA fallback strategy.

CLI flag `--vault-index`:

- `maencof` (default): Option D. Requires `.maencof/` present in the vault.
- `independent`: Full file-walk fallback (chokidar + gray-matter) for vaults without maencof.

---

## Search Modes

Backend exposes `GET /api/search?q=&mode=&...`:

| mode        | Backed by                          | Latency | Use case                    |
| ----------- | ---------------------------------- | ------- | --------------------------- |
| `lexical`   | Fuse.js over `{title, tags, path}` | ~ms     | Obsidian-style prefix/fuzzy |
| `tag`       | `byTag` index in GraphStore        | <1ms    | Exact tag match             |
| `backlinks` | `edges.inbound` lookup             | <1ms    | "Who links to this?"        |
| `semantic`  | Local SA over GraphStore           | ~100ms  | "Conceptually related"      |

Disable any mode with `--search fuse` (lexical only), `--search kg` (semantic only), or `--search off`. Default: `both`.

---

## Validation Checklist (used by Phase 5)

```
[ ] dashboard-spec.json parses as JSON
[ ] dashboard-spec.json validates against all 3 passes: parseSpec +
    validateSpecRefs (errors empty) + validateFromDomainDag
    (../../knowledge/spec-schema.md "Validation")
[ ] validateFromDomainDag(spec).ok === true
    (no cycles, no unknown parents; authorOrder populated)
[ ] validateSpecRefs(spec).ok === true (every panels[i].dataDomain exists in
    dataDomains[].name; search.modes/fields coherent)
[ ] All panels[i] component files exist at frontend/src/components/<PascalName>.tsx
[ ] All dataDomains[i] route files exist at backend/src/routes/<kebab>.ts
    AND matching aggregator at backend/src/services/aggregator-<kebab>.ts
[ ] routes/index.ts AUTO-MANAGED blocks contain one import + one register
    line per dataDomain (no orphans, no duplicates)
[ ] Dashboard.tsx AUTO-MANAGED blocks contain one import + one grid entry
    per panel (no orphans, no duplicates)
[ ] routes/spec.ts exists and serves GET /api/spec (SearchBar self-config
    dependency)
[ ] AUTO-MANAGED / USER-EDIT sentinel markers are intact in every authored
    file (both START and END present, none mangled)
[ ] backend/package.json and frontend/package.json have matching dependency
    versions for shared types
[ ] No <target>/.dashboard-*.md leftover (priming + draft cleaned up)
[ ] backend/src/config.ts vaultPath resolution follows env > spec > default
    priority (smoke test: log resolved value matches expected target)
[ ] frontend build output present in backend/app/static/
```

Fail loudly. Do not mark complete on partial success.

---

## Rollback (CREATE)

If any phase fails after writes have begun:

- Phase 1-3: delete `<target>/.dashboard-priming.md`, `<target>/.dashboard-spec.draft.md`. No other state.
- Phase 4: if user requests rollback, prompt before `rm -rf <target>` — destructive.
- Phase 5: keep partial output for inspection; do not auto-clean.

---

## Watching during dev

The generated backend uses chokidar to watch:

- `<vault>/**/*.md` → triggers SSE topic `vault`
- `<vault>/.maencof/nodes.json` → reloads GraphStore, triggers SSE topic `graph`
- `<vault>/.maencof/edges.json` → reloads GraphStore, triggers SSE topic `graph`
- `<vault>/.maencof/stale-nodes.json` → triggers SSE topic `stale`

Frontend uses TanStack Query and invalidates by topic (see `frontend/src/api/sse.ts` in the template).

---

## Examples

End-to-end CREATE walkthroughs (request → refine → spec → scaffold) live in **examples.md** in this directory. Load when you need a concrete pattern for the current request.
