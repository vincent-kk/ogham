---
rule_id: link-integrity
rule_name: Link Integrity Rules
severity: error
category: structure
auto_fix: false
version: 1.0.0
---

# Link Integrity Rules

## Purpose

Ensure the validity of links in the maencof knowledge graph.
Detect broken links, malformed link formats, and Layer directionality violations.

## Rule Definitions

### R1. Relative Paths Only

Markdown links must use relative paths exclusively.
Absolute paths and external URLs are recorded in the `source` Frontmatter field.

```markdown
<!-- Correct examples -->
[Related Skill](../02_Derived/skills/programming.md)
[Same Directory](./values-backup.md)

<!-- Violation examples -->
[Absolute Path](/Users/me/vault/01_Core/values.md)  <!-- ERROR -->
```

### R2. Link Target Must Exist

The target file of a `[text](path)` link must exist.
Links referencing non-existent files are recorded in `.maencof-meta/broken-links.json`.

### R3. Layer Directionality Compliance

Link direction must follow Layer policy (per 06-link-policy.md):

| Source Layer | Allowed Targets | Prohibited Targets |
|-------------|----------------|--------------------|
| Layer 1 | None (outbound links prohibited) | All Layers |
| Layer 2 | Layer 1, Layer 2 | Layer 4 |
| Layer 3 | Layer 1, Layer 2 | Layer 4 |
| Layer 4 | Layer 1, Layer 2, Layer 3 | — |

### R4. Circular Reference Warning

Cycles where two documents reference each other (A→B→A) cause DAGConverter to weaken edge weights (0.1),
but direct mutual references are reported as a warning.

### R5. Backlink Index Consistency

Entries in `.maencof-meta/backlink-index.json` must match the actual file system.
Inconsistencies are detected and recorded by the SessionStart Hook.

## Validation Logic

```typescript
function validateLinkIntegrity(
  node: KnowledgeNode,
  graph: KnowledgeGraph
): DiagnosticItem[] {
  const issues: DiagnosticItem[] = [];

  for (const edge of graph.edges) {
    if (edge.from !== node.id || edge.type !== 'LINK') continue;

    const target = graph.nodes.get(edge.to);

    // R2: Check link target exists
    if (!target) {
      issues.push({
        category: 'broken-link',
        severity: 'error',
        path: node.path,
        message: `Broken link: ${edge.to}`,
        autoFix: { fixable: false, description: 'Manually fix or remove the link' }
      });
    }

    // R3: Check Layer directionality
    if (target && isLayerViolation(node.layer, target.layer)) {
      issues.push({
        category: 'layer-mismatch',
        severity: 'error',
        path: node.path,
        message: `Layer ${node.layer} → Layer ${target.layer} link violation`,
        autoFix: { fixable: false, description: 'Remove the link or move the target document to a different Layer' }
      });
    }
  }

  return issues;
}
```

## Backlink Index Update Triggers

| Event | Action |
|-------|--------|
| `maencof_create` | Add new outbound links to the index |
| `maencof_update` | Re-analyze changed links and rebuild |
| `maencof_delete` | Remove entries where this document is the source |
| `maencof_move` | Update paths and rebuild the index |

## Auto-fix

All link integrity violations are **not auto-fixable**.
Manual review required:
- Broken links: remove the link or restore the target file
- Layer violations: remove the link or move the document

## Exceptions

- `http://` and `https://` URL links are exempt from R1-R4
- `#anchor` links are exempt from R2
- `![image](path)` image links are exempt from R3
