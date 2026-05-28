# dashboard-spec.json — Schema

The single source of truth for a generated dashboard. Generated at Phase 3 from refine's output. Read at Phase 4 to scaffold/patch. Lives at `<target>/dashboard-spec.json`.

---

## Two spec shapes

The skill works with two related types:

- **`DashboardSpec`** — the on-disk JSON shape persisted to `<target>/dashboard-spec.json`. All optional fields stay optional.
- **`RuntimeSpec`** — the in-memory shape after CLI flags are merged, env vars resolved, and required paths normalised. The backend (`server.ts`, `fastify-decorators.d.ts`) consumes `RuntimeSpec` via `app.spec`.

`config.ts::ensureSpec()` parses `dashboard-spec.json` with the Zod schema (producing `DashboardSpec`), then merges CLI/env defaults to return a `RuntimeSpec`.

## DashboardSpec

```typescript
interface DashboardSpec {
  version: '1.0';
  title: string;
  vaultPath?: string; // absolute path; defaults to parent of <target>
  vaultIndex: 'maencof' | 'independent'; // index source; default 'maencof'
  refresh: 'sse' | 'manual'; // default 'sse'
  //   'sse'    — backend mounts fastify-sse-v2, watcher runs, frontend
  //              starts an EventSource via startSse().
  //   'manual' — watcher and SSE plugin are not started; the frontend
  //              skips startSse() and falls back to "refresh" buttons /
  //              window-focus re-queries (TanStack Query default). See
  //              `methods/create/workflow.md` Phase 4 Turn 4 ("refresh
  //              wiring") for the gating points in server.ts and main.tsx.
  dataDomains: DataDomain[];
  panels: Panel[];
  search: SearchConfig;
  defaults?: Defaults;
  meta?: { createdAt: string; updatedAt: string; toolVersion: string };
}
```

## RuntimeSpec

```typescript
interface RuntimeSpec extends Omit<DashboardSpec, 'vaultPath'> {
  vaultPath: string; // resolved absolute path, non-optional
  port: number; // backend listen port; default 5174 from env PORT
}
```

Only `RuntimeSpec` may be decorated onto Fastify (`app.decorate('spec', spec)`). Producing `RuntimeSpec` is the sole responsibility of `config.ts::ensureSpec()`.

---

## DataDomain

Defines a logical slice of vault content that one or more panels consume.

```typescript
interface DataDomain {
  name: string; // kebab-case; becomes route file name
  layer?: 1 | 2 | 3 | 4 | 5 | 'all';
  subLayer?: 'relational' | 'structural' | 'topical' | 'buffer' | 'boundary';
  fromIndex?: 'graph' | 'files'; // "graph" = .maencof/nodes.json; "files" = direct walk
  fromDomain?: string; // reference another domain (chained transform)
  dateField?: ('created' | 'updated' | 'expires' | 'mtime')[];
  filterIntent?: string; // natural-language filter description
  //   used as authoring hint for the
  //   aggregator; not evaluated at runtime
  include?: string[]; // field projection applied to the aggregator's
  //   output items (NOT to the source KnowledgeNode list). When set, the
  //   authored aggregator MUST end with a `pick(items, include)` step
  //   that returns only those keys per item. Phase 4's Aggregator
  //   Pattern wires this in. Unset = no projection (return items as-is).
  aggregate?: AggregateKind;
  parser?: ParserKind;
  topN?: number;
  window?: { days: number; default?: number };
}

type AggregateKind =
  | 'count-by-day'
  | 'count-by-tag'
  | 'count-by-layer'
  | 'count-and-concept-presence'
  | 'sum'
  | 'none';

// Output item shape per aggregate kind. The Domain Route ALWAYS wraps the
// aggregator's return value under `{ items }` (see methods/create/workflow.md
// "Domain Route Pattern"); panels read `data.items` via
// api.domain<{ items: … }>(name). For array kinds `items` is the array; for
// `sum` `items` is the single object below.
//
//   count-by-day                : { date: 'YYYY-MM-DD'; count: number }[]
//                                  compatible panels: line, area, bar,
//                                  stacked-bar, calendar-heatmap, sparkline
//   count-by-tag                : { tag: string; count: number }[]
//                                  compatible panels: treemap, pie,
//                                  horizontal-bar, table
//   count-by-layer              : { layer: 1|2|3|4|5; count: number }[]
//                                  compatible panels: bar, pie
//                                  (NOT kpi-card — that needs a scalar; use sum)
//   count-and-concept-presence  : { tag: string; count: number;
//                                   hasConceptDoc: boolean;
//                                   conceptPath?: string }[]
//                                  compatible panels: table, treemap (with
//                                  colorRule on hasConceptDoc), horizontal-bar
//   sum                         : { value: number; delta?: number }
//                                  (single object, NOT an array; the route
//                                  wraps it as { items: { value, delta } })
//                                  compatible panels: kpi-card
//   none                        : KnowledgeNode[] (pass-through;
//                                   panel decides projection)

type ParserKind =
  | 'bull-bear-table'
  | 'tasklist'
  | 'frontmatter-only'
  | 'headings-outline'
  | 'none';
```

### Why `filterIntent` instead of executable `filter`

Earlier drafts of this schema described `filter` as a "JS expression evaluated server-side in a vm2-like sandbox." That contract is removed because:

- No safe sandbox is shipped with the scaffold (vm2 is deprecated; `vm` alone is not a security boundary).
- Authoring a sandbox for a single optional field is out of scope for craft-dashboard.

Instead, `filterIntent` carries the user's natural-language intent (e.g. `"expires within 14 days, status != 'done'"`). The LLM that authors `services/aggregator-<kebab>.ts` translates the intent into concrete TypeScript at scaffold time — outside the USER-EDIT sentinel, so MUTATE can re-author it cleanly. No string is ever `eval`-ed at runtime.

---

## Panel

A single visual block on the dashboard.

```typescript
interface Panel {
  id: string; // kebab-case; becomes PascalCase component
  kind: PanelKind;
  dataDomain: string; // FK to DataDomain.name
  layout: LayoutSize;
  title?: string;
  sortBy?: string; // "field asc" | "field desc"
  groupBy?: string;
  topN?: number;
  annotations?: PanelAnnotations;
  filterIntent?: string; // natural-language client-side filter intent.
  // The LLM authoring <PascalName>.tsx translates
  // it into a `.filter(...)` chain at scaffold
  // time. Not evaluated at runtime.
}

type PanelKind =
  | 'line'
  | 'area'
  | 'bar'
  | 'stacked-bar'
  | 'horizontal-bar'
  | 'calendar-heatmap'
  | 'treemap'
  | 'pie'
  | 'scatter'
  | 'table'
  | 'checklist'
  | 'force'
  | 'sankey'
  | 'candlestick'
  | 'box'
  | 'kpi-card'
  | 'sparkline'
  | 'markdown-body';

type LayoutSize = 'col-3' | 'col-4' | 'col-6' | 'col-8' | 'col-9' | 'col-12';

interface PanelAnnotations {
  highlightIntent?: string; // natural-language predicate for highlighting
  // a row/data point (e.g., "days_left <= 7").
  // Authored into the component as a TS predicate;
  // not evaluated at runtime from this string.
  colorRule?: string; // human-readable; generator picks default mapping
  threshold?: number;
  highlightLayer?: number;
  emptyMessage?: string;
}
```

---

## SearchConfig

```typescript
interface SearchConfig {
  modes: ('lexical' | 'tag' | 'backlinks' | 'semantic')[];
  fields: ('title' | 'tags' | 'path' | 'body')[];
  fuzzy?: {
    threshold: number; // 0..1, lower = stricter; default 0.3
    keys: { name: string; weight: number }[];
  };
  semanticHops?: number; // default 5
}
```

---

## Defaults

```typescript
interface Defaults {
  windowDays?: number; // default 30
  topN?: number; // default 20
  emptyMessage?: string;
  panelGap?: string; // default "var(--space-4)"
}
```

---

## Example (full)

```json
{
  "version": "1.0",
  "title": "Vault Activity",
  "vaultIndex": "maencof",
  "refresh": "sse",
  "dataDomains": [
    {
      "name": "activity-counts",
      "layer": "all",
      "fromIndex": "graph",
      "dateField": ["created", "mtime"],
      "aggregate": "count-by-day",
      "window": { "days": 90, "default": 30 }
    },
    {
      "name": "tag-stats",
      "fromIndex": "graph",
      "aggregate": "count-by-tag",
      "topN": 30
    }
  ],
  "panels": [
    {
      "id": "activity-heatmap",
      "kind": "calendar-heatmap",
      "dataDomain": "activity-counts",
      "layout": "col-12",
      "title": "Daily Notes",
      "annotations": { "highlightLayer": 4 }
    },
    {
      "id": "tag-treemap",
      "kind": "treemap",
      "dataDomain": "tag-stats",
      "layout": "col-6",
      "title": "Tags by Usage",
      "topN": 20,
      "annotations": { "colorRule": "no-concept-doc -> warning" }
    }
  ],
  "search": {
    "modes": ["lexical", "tag"],
    "fields": ["title", "tags"],
    "fuzzy": {
      "threshold": 0.3,
      "keys": [
        { "name": "title", "weight": 0.7 },
        { "name": "tags", "weight": 0.3 }
      ]
    }
  },
  "defaults": { "windowDays": 30, "topN": 20 },
  "meta": {
    "createdAt": "2026-05-28T00:00:00Z",
    "updatedAt": "2026-05-28T00:00:00Z",
    "toolVersion": "0.1.0"
  }
}
```

---

## Validation

The LLM authors `<target>/backend/src/spec-schema.ts` during CREATE Phase 4 (Turn 2). It exports **three** validation passes, run in this order on every spec change (Phase 3 validates pre-author against the interfaces here; MUTATE validates against the authored `spec-schema.ts` in `<target>`):

1. `DashboardSpecZ` / `parseSpec(unknown)` — Zod structural validation (shapes, enums, required fields including `vaultIndex`).
2. `validateSpecRefs(spec)` — cross-field reference checks Zod cannot express (below).
3. `validateFromDomainDag(spec)` — `fromDomain` DAG + topological order ("Validation: fromDomain DAG").

A spec is accepted only when all three pass with no errors. On any error, print `validation error at {path}: {reason}` and abort before writing `dashboard-spec.json`.

### `validateSpecRefs` — cross-field checks

```typescript
export interface SpecRefCheck {
  ok: boolean;
  errors: string[]; // empty when ok === true (blocks the write)
  warnings: string[]; // advisory, non-blocking (surface in the diff preview)
}

export function validateSpecRefs(spec: DashboardSpec): SpecRefCheck;
```

**Hard errors** (block the write):

| Error                                                     | Cause                                          | Fix                                |
| --------------------------------------------------------- | ---------------------------------------------- | ---------------------------------- |
| `panels[i].dataDomain references unknown domain '<name>'` | `panel.dataDomain` not in `dataDomains[].name` | add the domain or correct the name |
| `search.modes is empty but search.fields is set`          | half-configured search                         | set a mode or clear fields         |
| `unknown parent <name> referenced by domain <name>`       | `fromDomain` points to a missing domain        | fix the name or add the parent     |
| `cycle detected: <a> -> <b> -> <a>`                       | `fromDomain` forms a cycle                     | break the chain                    |

(The last two are emitted by `validateFromDomainDag`, listed here for completeness.)

**Advisory warnings** (shown, not blocking):

| Warning                                                    | Cause                                                            |
| ---------------------------------------------------------- | ---------------------------------------------------------------- |
| `panels[i].kind '<kind>' is unusual for aggregate '<agg>'` | `kind` is not in that aggregate's "compatible panels" list above |

Algorithm:

```
errors = []; warnings = []
names = new Set(spec.dataDomains.map(d => d.name))
byName = Map(spec.dataDomains.map(d => [d.name, d]))
for (i, panel) of spec.panels.entries():
  if !names.has(panel.dataDomain):
    errors.push(`panels[${i}].dataDomain references unknown domain '${panel.dataDomain}'`)
  else:
    agg = byName.get(panel.dataDomain).aggregate ?? 'none'
    if panel.kind not in COMPATIBLE_PANELS[agg]:   // the "compatible panels" lists above
      warnings.push(`panels[${i}].kind '${panel.kind}' is unusual for aggregate '${agg}'`)
if spec.search.modes.length === 0 && spec.search.fields.length > 0:
  errors.push('search.modes is empty but search.fields is set')
return { ok: errors.length === 0, errors, warnings }
```

`COMPATIBLE_PANELS` is a literal map the author derives from the per-`AggregateKind` "compatible panels" lists in the AggregateKind comment above — e.g. `{ 'count-by-day': ['line','area','bar','stacked-bar','calendar-heatmap','sparkline'], 'count-by-tag': ['treemap','pie','horizontal-bar','table'], 'count-by-layer': ['bar','pie'], 'count-and-concept-presence': ['table','treemap','horizontal-bar'], sum: ['kpi-card'], none: <any kind> }`.

Row layout is **not** validated: the `.grid.bento` CSS grid auto-flows, so column spans that sum past 12 simply wrap to the next row — not an error.

---

## Validation: fromDomain DAG

Zod alone cannot express cross-field constraints. After Zod parsing, run a second pass that treats `dataDomains[*].fromDomain` as edges in a directed graph and rejects any spec that is not a DAG. The pass also produces the topological order that Phase 4 Turn 7 (data-domain author loop) uses to author chained domains.

Algorithm (implement in `backend/src/spec-schema.ts::validateFromDomainDag(spec)`):

```
1. unknown parent:
   for each domain D where D.fromDomain != null:
     require D.fromDomain ∈ { d.name for d in spec.dataDomains }
   On miss -> { ok: false, reason: `unknown parent ${D.fromDomain}
                referenced by domain ${D.name}` }

2. cycle detection (DFS coloring):
   color: Map<name, 'WHITE' | 'GRAY' | 'BLACK'>  // init all WHITE
   visit(name, stack):
     c = color[name]
     if c == 'GRAY'  -> cycle along [...stack, name]
     if c == 'BLACK' -> return ok
     color[name] = 'GRAY'
     parent = byName[name].fromDomain
     if parent: recurse visit(parent, [...stack, name])
     color[name] = 'BLACK'
     order.push(name)   // post-order
   for each d in spec.dataDomains: visit(d.name, [])
   On cycle -> { ok: false, reason: `cycle detected: ${path.join(' -> ')}` }

3. topological order:
   The post-order traversal above yields parents before children.
   Return { ok: true, authorOrder: order }.
```

Signature:

```typescript
export interface FromDomainCheck {
  ok: boolean;
  reason?: string; // populated when ok === false
  authorOrder?: string[]; // populated when ok === true; topological order
  //   (parents before children). TRANSIENT return value — NOT a field on
  //   DashboardSpec and NOT persisted to dashboard-spec.json. MUTATE recomputes
  //   it by calling validateFromDomainDag(newSpec).authorOrder.
}

export function validateFromDomainDag(spec: DashboardSpec): FromDomainCheck;
```

Phase 3 schema validation runs all three passes — `parseSpec()`, then `validateSpecRefs()`, then `validateFromDomainDag()` (see "Validation" above). On any failure, print the reason and abort before writing `dashboard-spec.json`. Phase 4 Turn 7 iterates dataDomains using `authorOrder` so chained parents are authored before their children.

---

## Migration (schema version bumps)

When craft-dashboard bumps `version`, the LLM authors `<target>/backend/src/spec-migrate.ts` during CREATE Phase 4 alongside the other infrastructure modules:

```typescript
export function migrate(spec: unknown): DashboardSpec {
  const v = (spec as any).version;
  if (v === '0.9') return migrate_0_9_to_1_0(spec);
  if (v === '1.0') return spec as DashboardSpec;
  throw new Error(`unknown spec version: ${v}`);
}
```

MUTATE mode runs the migrator before diffing.
