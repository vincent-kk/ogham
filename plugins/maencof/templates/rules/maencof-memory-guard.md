---
rule_id: memory-guard
rule_name: Knowledge Space Protection Rules
severity: warning
category: protection
auto_fix: false
version: 1.0.0
---

# Knowledge Space Protection Rules

## Purpose

Protect the integrity of the maencof knowledge space.
Prevent unauthorized modifications to Layer 1 (Core Identity) and validate required Frontmatter fields.

## Rule Definitions

### R1. Layer 1 Write Warning

Display a warning when attempting to modify documents in the `01_Core/` directory.
The Core Identity Hub must not be changed without explicit user intent.

```
# When a Write/Edit tool targets a path under 01_Core/:
⚠️ You are about to modify a Layer 1 (Core Identity) document.
   Target: {path}
   This document is a core identity Hub. Are you sure you want to modify it?
```

### R2. Frontmatter Required Field Validation

All knowledge space documents must include the following Frontmatter fields:

| Field | Required | Description |
|-------|----------|-------------|
| `title` | Yes | Document title |
| `layer` | Yes | Layer number (1-5) |
| `created` | Yes | Creation date (YYYY-MM-DD) |
| `updated` | Yes | Last modified date (YYYY-MM-DD) |
| `tags` | No | Tag array |
| `confidence` | No | Confidence score (0.0-1.0) |
| `schedule` | No | Review schedule |

```yaml
# Correct example
---
title: TypeScript Type System
layer: 2
created: 2025-01-15
updated: 2025-02-01
tags: [programming, typescript]
confidence: 0.8
---

# Violation example (layer missing)
---
title: TypeScript Type System
created: 2025-01-15
---
```

### R3. confidence Range Validation

If the `confidence` field is present, it must be between 0.0 and 1.0 inclusive.

### R4. Layer 4 Document TTL Warning

Documents in the `04_Action/` directory that have not been updated for 30 or more days are flagged as candidates for cleanup.
Action memory is volatile and requires periodic cleanup.

## Exceptions

- Files inside `.maencof/` and `.maencof-meta/` are excluded from this rule
- `README.md` and `index.md` files are excluded from Frontmatter validation
