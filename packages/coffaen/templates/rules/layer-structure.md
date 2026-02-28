---
rule_id: layer-structure
rule_name: Layer Structure Rules
severity: error
category: structure
auto_fix: partial
version: 1.0.0
---

# Layer Structure Rules

## Purpose

Enforce directory structure compliance with the coffaen 5-Layer knowledge model.
Ensure consistency between file paths and the Frontmatter `layer` field.

## Rule Definitions

### R1. Directory-to-Layer Mapping

| Directory Prefix | Layer | Description |
|-----------------|-------|-------------|
| `01_Core/` | 1 | Core Identity Hub |
| `02_Derived/` | 2 | Internalized knowledge |
| `03_External/` | 3 | External references |
| `04_Action/` | 4 | Action memory |
| `05_Context/` | 5 | Contextual metadata (persons, domains) |

### R2. Frontmatter layer Field Must Match

The Layer inferred from the file path must match the Frontmatter `layer` field.

```yaml
# Correct example (02_Derived/skills/programming.md)
layer: 2

# Violation example (02_Derived/skills/programming.md)
layer: 3  # ERROR: path implies Layer 2 but Frontmatter says Layer 3
```

### R3. Layer 1 Outbound Links Prohibited

Documents in `01_Core/` may not contain outbound links to other documents.
Hub nodes are only referenced by others; they do not reference outward.

```markdown
<!-- Violation: inside 01_Core/values.md -->
[Related Skill](../02_Derived/skills/programming.md)  <!-- ERROR -->
```

### R4. Upper Layer → Layer 4 Links Prohibited

Documents in Layer 1/2/3 may not reference Layer 4 (`04_Action/`) documents.
Volatile action memory must not be referenced by persistent knowledge.

## Validation Logic

```typescript
function validateLayerStructure(node: KnowledgeNode): DiagnosticItem[] {
  const issues: DiagnosticItem[] = [];
  const pathLayer = inferLayerFromPath(node.path);

  // R2: Frontmatter layer consistency check
  if (pathLayer !== node.layer) {
    issues.push({
      category: 'layer-mismatch',
      severity: 'error',
      path: node.path,
      message: `Path-inferred Layer ${pathLayer}, Frontmatter layer: ${node.layer}`,
      autoFix: { fixable: true, description: 'Update Frontmatter layer to match path' }
    });
  }

  return issues;
}
```

## Auto-fix

- **R2 violations**: Automatically update Frontmatter `layer` field to the path-inferred value (`coffaen_update`)
- **R1/R3/R4 violations**: Auto-fix not available; manual link removal required

## Exceptions

- Files inside `.coffaen/` and `.coffaen-meta/` are excluded from this rule
- `README.md` and `index.md` files are not subject to Layer enforcement
