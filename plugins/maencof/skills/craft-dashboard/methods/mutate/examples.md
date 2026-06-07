# MUTATE Mode — Examples

End-to-end MUTATE walkthroughs. Load on demand when you need a concrete delta pattern.

---

## Example — Add Tag Treemap to Existing Vault Activity Dashboard

### Scenario

User has a dashboard previously scaffolded by CREATE (see `../create/examples.md` Example 1 — Vault Activity Timeline). The current spec contains a calendar heatmap and a stacked-bar by layer. The user now wants to add a tag treemap beside the heatmap.

### User request

> "Add a tag treemap next to the heatmap."

### Phase 0 mode detection

`<target>/dashboard-spec.json` exists → MUTATE mode confirmed.

### Phase 1 priming

Hint block from `../../knowledge/interview-hints.md` + the current spec is written to `<target>/.dashboard-priming.md`. refine sees both.

### Phase 2 refine excerpt

```
refine: Same time window as the existing heatmap (90 days)?
user:   Yes.

refine: Top N or all tags?
user:   Top 20.

refine: Layout — replace the stacked-bar row or add a new row?
user:   Add a new row, treemap next to the heatmap (col-6 each).
```

Only 3 questions because refine already knew the layout, search, and date fields from the embedded spec.

### Phase 3 diff preview

The diff below shows the changed slices only. Required top-level fields
(`version`, `vaultIndex`, `refresh`, `title`) stay unchanged from the existing
spec — MUTATE never silently drops them.

```diff
{
  "panels": [
-   { "id": "activity-heatmap", "kind": "calendar-heatmap", "layout": "col-12" },
+   { "id": "activity-heatmap", "kind": "calendar-heatmap", "layout": "col-6" },
+   { "id": "tag-treemap", "kind": "treemap", "dataDomain": "tag-stats",
+     "layout": "col-6", "topN": 20 },
    { "id": "activity-by-layer", "kind": "stacked-bar", "layout": "col-12" }
  ],
  "dataDomains": [
    { "name": "activity-counts", "layer": "all", "window": {...} },
+   { "name": "tag-stats", "fromIndex": "graph", "topN": 20 }
  ]
}
```

User confirms with `y`.

### Phase 4 file changes

```
+  <target>/backend/src/routes/tag-stats.ts                      (new)
+  <target>/backend/src/services/aggregator-tag-stats.ts         (new)
+  <target>/frontend/src/components/TagTreemap.tsx               (new)
~  <target>/frontend/src/pages/Dashboard.tsx                     (insert <TagTreemap /> after <ActivityHeatmap />, update heatmap to col-6)
~  <target>/dashboard-spec.json                                  (panels[] + dataDomains[])
+  <target>/dashboard-spec.json.bak                              (rollback anchor)
```

### Phase 5 rebuild

```bash
cd <target>/backend && npm run build
cd <target>/frontend && npm run build
```

Existing panels untouched. User edits inside `// USER-EDIT-START` sentinels preserved (e.g., a custom `dataKey` on the stacked-bar). Validation checklist passes.

### Hand-off message

```
Dashboard updated at <target>.

Changes applied:
  + 1 panel added (TagTreemap)
  ~ 1 panel modified (ActivityHeatmap — layout col-12 → col-6)
  + 1 dataDomain added (tag-stats)

Dev mode:   cd <target> && make dev-backend  (terminal 1 — Fastify, free port from 5174)
            cd <target> && make dev-frontend (terminal 2 — Vite opens the browser)

Prod mode:  cd <target> && make serve   (binds a free port + opens the browser;
            URL in <target>/.dashboard-runtime.json)

Backup of previous spec: <target>/dashboard-spec.json.bak
```

---

## Anti-pattern — When MUTATE should NOT be used

### Scenario

User has the same Vault Activity dashboard and says:

> "Replace Recharts with Plotly and convert all panels to dark mode."

This is too large for MUTATE:

- Stack-level change (Recharts → Plotly) affects every component file
- Theme change affects template-level CSS, not panel internals
- refine would likely need 6+ questions to scope the migration

### Correct response

Surface to the user:

> The requested change affects the underlying stack and global styling, which is outside MUTATE's surgical scope. Recommend:
>
> 1. Commit the current `<target>/` to git.
> 2. Re-run `/maencof:craft-dashboard create <new-target> --chart plotly` for a fresh scaffold.
> 3. Port over any USER-EDIT regions manually.

Do NOT attempt to bulk-rewrite every component file under MUTATE.
