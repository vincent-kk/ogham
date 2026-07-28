# guide — Current Structure and Placement Reference

## Section 1 — Read the Current Tree

Call:

```text
mcp__plugin_filid_tools__fractal_scan({
  path: "<target-path>",
  detail: "paths"
})
```

Use the summary for project root, snapshot hash, adapters, depth, node counts,
certainty, and diagnostics. Use path detail for the current node table,
document presence, entry-point count, and classification.

If detailed data is persisted as an artifact, read only the path projection
needed for the guide. Do not load the full snapshot.

## Section 2 — Read Current FCA Findings

Call:

```text
mcp__plugin_filid_tools__structure_validate({
  path: "<target-path>",
  mode: "project",
  scopes: [
    "documents",
    "nodes",
    "entry-points",
    "boundaries",
    "dag",
    "verification"
  ]
})
```

All six scopes at once is the largest payload this skill requests; when it
exceeds the inline envelope budget the findings are persisted instead. Use the
returned result or its artifact as the authority — an absent inline `data` is
not an empty finding set.

The configured validation result is the authority for current findings. There
is no separate rule-list query. Present rules by the canonical FCA scopes
above, and cite returned rule IDs only when the validator produced evidence.

Do not describe a non-OK or non-exact result as healthy merely because no
finding was returned.

## Section 3 — Explain Classification

Summarize the path projection by node type:

| Type          | Meaning                                                     |
| ------------- | ----------------------------------------------------------- |
| fractal       | Independent module with documented boundary and entry point |
| organ         | Leaf compartment; INTENT.md is prohibited                   |
| pure-function | Stateless, isolated computation                             |
| hybrid        | Explicit transitional classification with an entry point    |

Classification follows the repository policy priority. A fractal below an
organ remains an independent node and is not hidden from the guide.

## Section 4 — Explain Placement

Guide placement from the observed owner graph and these FCA rules:

- place shared code at the nearest common ancestor of all consumers
- a new independent module needs INTENT.md and a named-export entry point
- an organ remains flat and contains no INTENT.md
- external consumers import a fractal through its entry point
- siblings import the target sibling entry point, never an internal file or
  the shared parent barrel
- preserve a dependency DAG

When the evidence does not identify all consumers or a public contract, label
the placement `unresolved`. Do not fabricate a target path. A requested
source-to-target move belongs to `/filid:restructure`, which creates and
validates a plan without moving files itself.

## Section 5 — Guide Format

```text
## Filid FCA Guide — <project root>

Snapshot: <hash>
Adapters: <ids>
Certainty: <certainty>

### Current Structure
| Path | Type | Documents | Entry points |
| ---- | ---- | --------- | ------------ |

### Current Findings
| Rule | Severity | Evidence | Message |
| ---- | -------- | -------- | ------- |

### Placement Rules
<concise rules from Section 4>

### New Module Checklist
- [ ] owner and consumers are identified
- [ ] shared code is at the consumer LCA
- [ ] the node type matches its contract
- [ ] fractal documents and entry point are present
- [ ] imports preserve boundaries and the DAG

Diagnostics: <none or stable codes/messages>
```

The guide is descriptive and read-only. It does not apply structural changes
or claim that validation can move files.
