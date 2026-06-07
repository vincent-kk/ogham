# Visualization Catalog

Maps refine's dimensional output to a `PanelKind` from `spec-schema.md`, with the React component template each kind uses.

Recharts is the default. Plotly fallback noted where Recharts is awkward.

---

## Authoring Notes (read first)

The component snippets below contain Handlebars-style placeholders. **These are not template literals** — craft-dashboard ships no `.tmpl` files. The LLM authoring the component MUST replace every placeholder at scaffold time. Literal `{{ ... }}` MUST NOT remain in the output `.tsx`.

| Placeholder         | Replace with                                            | Example                                |
| ------------------- | ------------------------------------------------------- | -------------------------------------- |
| `{{ComponentName}}` | `spec.panels[i].id` → PascalCase                        | `tag-distribution` → `TagDistribution` |
| `{{dataDomain}}`    | `spec.panels[i].dataDomain` (kebab-case literal string) | `'activity-counts'`                    |
| `{{title}}`         | `spec.panels[i].title` (string literal in JSX)          | `Daily Notes`                          |
| `{{windowDays}}`    | `spec.panels[i].window?.default` or domain default      | `30`                                   |

**API call rule**: data fetching always goes through `api.domain('<dataDomain>')` — never `api.<dataDomain>()`. Domain names are kebab-case and cannot be valid JavaScript identifiers (e.g., `api.activity-counts()` is a syntax error). `api.domain` is typed as `<T = unknown>(name: string, params?) => Promise<T>` in `interfaces.md`.

**Response envelope + typing rule (MUST follow — both halves, or the panel breaks):**

1. **Read `data?.items`, nothing else.** Every Domain Route returns a fixed envelope `{ items, window?, durationMs }` (see `methods/create/workflow.md` "Domain Route Pattern"). `items` IS the aggregator's return value verbatim — an array for the `count-*` kinds, a single object for `sum`. There is **no** `points` / `groups` / `values` key and no top-level `value`/`delta` on the wire. A component that reads `data?.points` / `data?.groups` / `data?.values` / `data?.value` silently renders empty against a correct backend.
2. **Always pass a concrete `<T>`.** Call `api.domain<{ items: Row[] }>('<dataDomain>')` with the row type that matches the domain's `AggregateKind` output (see `spec-schema.md`). A bare `api.domain('x')` infers `T = unknown`, so `data?.items` is a compile error under the strict frontend tsconfig and `tsc --noEmit && vite build` fails.

**USER-EDIT zones**: each pattern below marks a small zone with `// USER-EDIT-START` / `// USER-EDIT-END` for user-tunable values (color, threshold, dataKey). Keep these zones tiny. Generated body lives outside.

**Standard imports** — every component pattern below assumes these two imports
have been authored at the top of the file. Patterns omit them for brevity but
they are mandatory in the generated `.tsx`:

```tsx
import { useQuery } from '@tanstack/react-query';

import { api } from '../api/client';
```

Chart-library imports (`recharts`, `react-plotly.js`, `react-calendar-heatmap`,
…) are shown explicitly per pattern. Other helpers (`useState`, `useMemo`,
local types) are added on demand. The LLM authoring the component MUST include
the standard imports verbatim; strict TS will fail otherwise.

---

## Dimension → PanelKind decision table

| User-described shape       | Time component | Magnitude type  | PanelKind                   | Default lib                                                        |
| -------------------------- | -------------- | --------------- | --------------------------- | ------------------------------------------------------------------ |
| "trend over days"          | yes            | continuous      | `line`                      | Recharts                                                           |
| "trend, want fill"         | yes            | continuous      | `area`                      | Recharts                                                           |
| "activity calendar"        | yes            | discrete bins   | `calendar-heatmap`          | Custom (no Recharts equiv; use Nivo if installed, else custom svg) |
| "stacked counts over time" | yes            | categorical     | `stacked-bar`               | Recharts                                                           |
| "snapshot ranking"         | no             | ordered         | `horizontal-bar` or `table` | Recharts / native                                                  |
| "proportion of total"      | no             | parts of whole  | `treemap` or `pie`          | Recharts                                                           |
| "two-axis correlation"     | no             | continuous      | `scatter`                   | Recharts                                                           |
| "min/max/median per group" | no             | range           | `box` or `candlestick`      | Plotly (Recharts lacks box)                                        |
| "graph relationships"      | no             | network         | `force` or `sankey`         | react-force-graph or Plotly sankey                                 |
| "single number focus"      | no             | scalar          | `kpi-card`                  | Custom                                                             |
| "todo / done list"         | no             | boolean per row | `checklist`                 | Custom                                                             |
| "markdown content viewer"  | no             | text            | `markdown-body`             | Custom                                                             |
| "tiny line in a card"      | yes            | continuous      | `sparkline`                 | Recharts mini                                                      |

---

## Component patterns by PanelKind

The skill ships no `.tmpl` files. The scaffolder authors `<PascalName>.tsx` into `<target>/frontend/src/components/` using the patterns below as references. Each pattern imports React, TanStack Query, and the chart lib, and calls `api.domain<{ items: … }>('<dataDomain>')` (defined in `frontend/src/api/client.ts`), reading rows from `data?.items` per the "Response envelope + typing rule" above.

For PanelKinds not shown explicitly below (`bar`, `horizontal-bar`, `pie`, `scatter`, `sparkline`, `markdown-body`, `force`, `sankey`, `candlestick`), follow the same shape: `useQuery({ queryKey: ['<dataDomain>'], queryFn: () => api.domain<{ items: Row[] }>('<dataDomain>') })`, read the rows from `data?.items`, then render with the lib named in the decision table above. Always supply the concrete `<{ items: … }>` type argument and read `data?.items` (never `data?.points` / `.groups` / `.values` / `.value`) — see the "Response envelope + typing rule" above. Wrap any user-tunable values (`dataKey`, color, threshold) in `// USER-EDIT-START / END` so MUTATE preserves them.

### line / area

```tsx
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

type Point = { date: string; count: number };

export function {{ComponentName}}() {
  const { data } = useQuery({
    queryKey: ['{{dataDomain}}'],
    queryFn: () => api.domain<{ items: Point[] }>('{{dataDomain}}'),
  });
  return (
    <div className="panel">
      <div className="panel-title">{{title}}</div>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data?.items ?? []}>
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="count" stroke="var(--accent, #888)" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

### stacked-bar (per layer)

```tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

type LayerRow = { date: string } & Partial<Record<'L1' | 'L2' | 'L3' | 'L4' | 'L5', number>>;

export function {{ComponentName}}() {
  const { data } = useQuery({ queryKey: ['{{dataDomain}}'], queryFn: () => api.domain<{ items: LayerRow[] }>('{{dataDomain}}') });
  const layers = ['L1', 'L2', 'L3', 'L4', 'L5'];
  return (
    <div className="panel">
      <div className="panel-title">{{title}}</div>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data?.items ?? []}>
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          {layers.map((l, i) => (
            <Bar key={l} dataKey={l} stackId="a" fill={`var(--layer-${i+1}, hsl(${i*72}, 50%, 50%))`} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

### treemap

```tsx
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';

type TagRow = { tag: string; count: number };

export function {{ComponentName}}() {
  const { data } = useQuery({ queryKey: ['{{dataDomain}}'], queryFn: () => api.domain<{ items: TagRow[] }>('{{dataDomain}}') });
  return (
    <div className="panel">
      <div className="panel-title">{{title}}</div>
      <ResponsiveContainer width="100%" height={320}>
        <Treemap data={data?.items ?? []} dataKey="count" nameKey="tag" stroke="var(--bg, #000)">
          <Tooltip />
        </Treemap>
      </ResponsiveContainer>
    </div>
  );
}
```

### table

```tsx
type Row = Record<string, unknown> & { path: string };

export function {{ComponentName}}() {
  const { data } = useQuery({ queryKey: ['{{dataDomain}}'], queryFn: () => api.domain<{ items: Row[] }>('{{dataDomain}}') });
  return (
    <div className="panel">
      <div className="panel-title">{{title}}</div>
      <table className="vault-table">
        <thead><tr>{{columnHeaders}}</tr></thead>
        <tbody>
          {(data?.items ?? []).map(row => (
            <tr key={row.path}>{{cells}}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### checklist

```tsx
type ChecklistGroup = {
  slug: string;
  title: string;
  items: { status: string; label: string }[];
};

export function {{ComponentName}}() {
  const { data } = useQuery({ queryKey: ['{{dataDomain}}'], queryFn: () => api.domain<{ items: ChecklistGroup[] }>('{{dataDomain}}') });
  return (
    <div className="panel">
      <div className="panel-title">{{title}}</div>
      {(data?.items ?? []).map(g => (
        <details key={g.slug} open>
          <summary>{g.title}</summary>
          <ul>
            {g.items.map((item, idx) => (
              <li key={idx} data-status={item.status}>{item.label}</li>
            ))}
          </ul>
        </details>
      ))}
    </div>
  );
}
```

### kpi-card

```tsx
type Kpi = { value: number; delta?: number };

export function {{ComponentName}}() {
  // `sum` returns a single object, so `items` is that object (not an array).
  const { data } = useQuery({ queryKey: ['{{dataDomain}}'], queryFn: () => api.domain<{ items: Kpi }>('{{dataDomain}}') });
  const kpi = data?.items;
  return (
    <div className="panel kpi-card">
      <div className="kpi-label">{{title}}</div>
      <div className="kpi-value">{kpi?.value ?? '—'}</div>
      {kpi?.delta != null && <div className={`kpi-delta ${kpi.delta >= 0 ? 'up' : 'down'}`}>{kpi.delta}</div>}
    </div>
  );
}
```

### calendar-heatmap (no Recharts equivalent)

If `react-calendar-heatmap` is installed (added when this kind is used):

```tsx
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';

type HeatPoint = { date: string; count: number };

export function {{ComponentName}}() {
  const { data } = useQuery({ queryKey: ['{{dataDomain}}'], queryFn: () => api.domain<{ items: HeatPoint[] }>('{{dataDomain}}') });
  const end = new Date();
  const start = new Date(); start.setDate(start.getDate() - {{windowDays}});
  return (
    <div className="panel">
      <div className="panel-title">{{title}}</div>
      <CalendarHeatmap
        startDate={start}
        endDate={end}
        values={data?.items ?? []}
        classForValue={(v) => v?.count > 5 ? 'lvl-4' : v?.count > 0 ? 'lvl-1' : 'lvl-0'}
      />
    </div>
  );
}
```

When the scaffolder generates a `calendar-heatmap` panel, add `react-calendar-heatmap` to `frontend/package.json`.

---

## Plotly fallback registration

If user opts into Plotly via `--chart plotly`, the scaffolder substitutes Plotly templates for charts where Recharts is awkward (`box`, `candlestick`, `sankey`, `force`). Other kinds remain Recharts.

Plotly box variant — author into `<target>/frontend/src/components/<PascalName>.tsx`:

```tsx
import Plot from 'react-plotly.js';

export function {{ComponentName}}() {
  const { data } = useQuery({ queryKey: ['{{dataDomain}}'], queryFn: () => api.domain<{ items: number[] }>('{{dataDomain}}') });
  return (
    <div className="panel">
      <div className="panel-title">{{title}}</div>
      <Plot
        data={[{ type: 'box', y: data?.items ?? [], boxpoints: 'outliers' }]}
        layout={{ autosize: true, margin: { l: 30, r: 10, t: 10, b: 30 } }}
        useResizeHandler
        style={{ width: '100%', height: 280 }}
      />
    </div>
  );
}
```

---

## Layout grid

`Dashboard.tsx` uses CSS grid via `.grid.bento` from `styles/globals.css`. Each panel sets its column span via `data-col` or the `col-N` class:

```tsx
<section className="grid bento">
  <div className="col-6">
    <ActivityHeatmap />
  </div>
  <div className="col-6">
    <TagTreemap />
  </div>
  <div className="col-12">
    <AnalystScatter />
  </div>
</section>
```

Spec's `panel.layout` value maps 1:1 to the class name.

---

## Default chart colors

The catalog never hardcodes colors. Component templates reference CSS variables:

- `--accent`, `--accent-up`, `--accent-down` for series
- `--layer-1` … `--layer-5` for layer-coded charts
- `--bg`, `--fg`, `--muted` for surfaces

These variables default to `unset` and fall through to Recharts' built-in palette. The user provides a `tokens.css` separately (via their own UI/design system skill).
