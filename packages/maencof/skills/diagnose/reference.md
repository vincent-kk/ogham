# diagnose — Reference

Report format templates, verbose mode, and recommended action matrix.

## Report Format

### Healthy (stale < 10%)

```
maencof Index Status
━━━━━━━━━━━━━━━━━━━━━━━━━━
Nodes:         {N}
Edges:         {N}
Last built:    {time ago / YYYY-MM-DD HH:mm}
Stale ratio:   {N}% ({staleCount}) — OK
Freshness:     {freshnessPercent}%
━━━━━━━━━━━━━━━━━━━━━━━━━━
Status: OK
```

### Caution (stale 10-30%)

```
maencof Index Status
━━━━━━━━━━━━━━━━━━━━━━━━━━
Nodes:         {N}
Edges:         {N}
Last built:    {time ago / YYYY-MM-DD HH:mm}
Stale ratio:   {N}% ({staleCount}) — Caution
Freshness:     {freshnessPercent}%
━━━━━━━━━━━━━━━━━━━━━━━━━━
Status: Caution
Recommended: Run /maencof:rebuild.
```

### Critical (stale > 30% or no index)

```
maencof Index Status
━━━━━━━━━━━━━━━━━━━━━━━━━━
Index: missing / critically stale
━━━━━━━━━━━━━━━━━━━━━━━━━━
Recommended: Run /maencof:build --full or /maencof:doctor
```

## Recommended Action Matrix

| Status | Condition | Recommended Action |
|--------|-----------|-------------------|
| OK | stale < 10% | none |
| Caution | stale 10-30% | `/maencof:rebuild` |
| Critical | stale > 30% | `/maencof:build --full` |
| No index | index missing | `/maencof:build` |
| Structural issue | — | `/maencof:doctor` full diagnosis |

## Verbose Mode

When `--verbose` is specified, display additional information:

- List of stale node paths (up to 10)
- Number of files modified since last build
- Node distribution by Layer

## kg_status Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `nodeCount` | number | Total node count |
| `edgeCount` | number | Total edge count |
| `lastBuiltAt` | string | Last build timestamp |
| `staleNodeCount` | number | Stale node count |
| `freshnessPercent` | number | Index freshness (%) |
| `rebuildRecommended` | boolean | Whether full rebuild is recommended |

## Error Handling

- **kg_status failure**: "MCP server connection failed. Check your `.mcp.json` configuration."
- **No index**: report as unbuilt state and guide to `/maencof:build`
