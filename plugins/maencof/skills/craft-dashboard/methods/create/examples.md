# CREATE Mode — Examples

Three end-to-end walkthroughs from request → refine → spec → scaffold. Load on demand when you need a concrete pattern.

---

## Example 1 — Vault Activity Timeline

### User request

> "I want a dashboard that shows when I write notes — like a heatmap of activity per day."

### Phase 1 priming

Hint block prepended (full content from `../../knowledge/interview-hints.md`).

### Phase 2 refine excerpt

```
refine: Which layer's notes do you want to count — all five, or specific ones?
user:   All five, but I want to see L4 (Action) separately.

refine: Time granularity: daily, hourly, or both?
user:   Daily.

refine: Window: rolling 30 days, 90 days, or all-time?
user:   90 days with a 30-day default zoom.

refine: Which date field — frontmatter `created`, file mtime, or both?
user:   `created` with mtime fallback.

refine: Insight goal — what decision does this help with?
user:   See which periods I was active and where I went quiet, by layer.

refine: Search needed?
user:   Yes, basic title + tag.
```

### Phase 3 spec output

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
      "aggregate": "count-by-day",
      "dateField": ["created", "mtime"],
      "window": { "days": 90, "default": 30 }
    }
  ],
  "panels": [
    {
      "id": "activity-heatmap",
      "kind": "calendar-heatmap",
      "dataDomain": "activity-counts",
      "layout": "col-12",
      "annotations": { "highlightLayer": 4 }
    },
    {
      "id": "activity-by-layer",
      "kind": "stacked-bar",
      "dataDomain": "activity-counts",
      "layout": "col-12",
      "groupBy": "layer"
    }
  ],
  "search": { "modes": ["lexical", "tag"], "fields": ["title", "tags"] }
}
```

### Phase 4 generated files

```
<target>/
├── dashboard-spec.json
├── backend/src/routes/activity-counts.ts
├── backend/src/services/aggregator-activity-counts.ts
├── frontend/src/components/ActivityHeatmap.tsx
├── frontend/src/components/ActivityByLayer.tsx
└── frontend/src/pages/Dashboard.tsx  (grid: heatmap col-12, stacked-bar col-12)
```

---

## Example 2 — Tag Distribution + Concept Coverage

### User request

> "Show me which tags I use the most and which ones don't have concept documents yet."

### Refine excerpt (abbreviated)

```
refine: Top N tags or full distribution?
user:   Top 30.

refine: Threshold for "needs concept doc" — usage count?
user:   Tags used 3+ times.

refine: Visual — treemap, bar, or word cloud?
user:   Treemap, but show "no concept" tags in red.

refine: Insight goal?
user:   Find unloved popular topics — write concepts for them.
```

### Spec output

```json
{
  "version": "1.0",
  "title": "Tag Coverage",
  "vaultIndex": "maencof",
  "refresh": "sse",
  "dataDomains": [
    {
      "name": "tag-stats",
      "fromIndex": "graph",
      "aggregate": "count-and-concept-presence",
      "topN": 30
    }
  ],
  "panels": [
    {
      "id": "tag-treemap",
      "kind": "treemap",
      "dataDomain": "tag-stats",
      "layout": "col-12",
      "annotations": {
        "colorRule": "no-concept-doc -> red, has-concept-doc -> gray",
        "threshold": 3
      }
    },
    {
      "id": "uncovered-tags-list",
      "kind": "table",
      "dataDomain": "tag-stats",
      "layout": "col-6",
      "filterIntent": "only tags without a concept doc and used at least 3 times",
      "sortBy": "count desc"
    }
  ],
  "search": { "modes": ["tag", "lexical"], "fields": ["tags"] }
}
```

### Implementation note

The aggregator scans `graphStore.byTag` and checks for the presence of `03_External/topical/<tag>.md`. No vault writes; the result is computed in-memory.

---

## Example 3 — Expiring L4 Action Triggers

### User request

> "I want to see L4 action docs that are about to expire and the bull/bear triggers inside them."

### Refine excerpt

```
refine: Expiration window — days remaining?
user:   Within 7 days, but show all active L4.

refine: Trigger format — do you have a convention?
user:   Markdown tables with "Bull" and "Bear" headers.

refine: Should I parse the table cells?
user:   Yes, status from the last column (PENDING/DONE/SKIPPED).

refine: Insight goal?
user:   Daily checkable list of decisions, sorted by urgency.
```

### Spec output

```json
{
  "version": "1.0",
  "title": "Action Watch",
  "vaultIndex": "maencof",
  "refresh": "sse",
  "dataDomains": [
    {
      "name": "active-actions",
      "layer": 4,
      "filterIntent": "only nodes with a non-null expires date that is today or later (days_left >= 0)",
      "include": ["title", "tags", "expires", "days_left", "excerpt"]
    },
    {
      "name": "triggers",
      "fromDomain": "active-actions",
      "parser": "bull-bear-table"
    }
  ],
  "panels": [
    {
      "id": "expiring-actions",
      "kind": "table",
      "dataDomain": "active-actions",
      "layout": "col-6",
      "sortBy": "days_left asc",
      "annotations": { "highlightIntent": "rows where days_left <= 7" }
    },
    {
      "id": "trigger-checklist",
      "kind": "checklist",
      "dataDomain": "triggers",
      "layout": "col-6",
      "groupBy": "action.slug"
    }
  ],
  "search": { "modes": ["lexical", "tag"], "fields": ["title", "tags"] }
}
```

### Generated route excerpt

`expires` lives in the markdown frontmatter, not on `KnowledgeNode` directly,
so the aggregator joins it via `BodyCache.get(node.path).frontmatter.expires`.
`byLayer` is a `Map`, accessed via `.get(layer) ?? []`.

```typescript
// backend/src/routes/active-actions.ts
import type { FastifyPluginAsync } from 'fastify';

import { aggregateActiveActions } from '../services/aggregator-active-actions.js';

export const activeActionsRoute: FastifyPluginAsync = async (app) => {
  app.get('/api/active-actions', async () => {
    const nodes = app.graphStore.byLayer.get(4) ?? [];
    const items = await aggregateActiveActions(nodes, {
      bodyCache: app.bodyCache,
      today: new Date(),
    });
    return { items };
  });
};
```

```typescript
// backend/src/services/aggregator-active-actions.ts (excerpt)
const daysBetween = (a: Date, b: Date) =>
  Math.round((b.getTime() - a.getTime()) / 86_400_000);

export async function aggregateActiveActions(
  nodes: KnowledgeNode[],
  ctx: { bodyCache: BodyCache; today: Date },
) {
  const enriched = await Promise.all(
    nodes.map(async (n) => {
      const { frontmatter } = await ctx.bodyCache.get(n.path);
      const expires = frontmatter.expires
        ? new Date(String(frontmatter.expires))
        : null;
      return {
        ...n,
        expires,
        days_left: expires ? daysBetween(ctx.today, expires) : null,
      };
    }),
  );
  return enriched
    .filter((n) => n.days_left != null && n.days_left >= 0)
    .sort((a, b) => a.days_left! - b.days_left!);
}
```
