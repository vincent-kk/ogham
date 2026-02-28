---
rule_id: frontmatter-required
rule_name: Frontmatter Required Field Rules
severity: error
category: documentation
auto_fix: partial
version: 1.0.0
---

# Frontmatter Required Field Rules

## Purpose

Enforce that all coffaen markdown documents include valid Frontmatter.
Apply validation based on FrontmatterSchema (Zod).

## Required Fields

| Field | Type | Format | Auto-fix |
|-------|------|--------|---------|
| `created` | string | YYYY-MM-DD | Available (mtime-based) |
| `updated` | string | YYYY-MM-DD | Available (current date) |
| `tags` | string[] | Minimum 1 | Available (filename-based) |
| `layer` | number | 1-5 | Available (path-based) |

## Optional Fields (by Layer)

| Field | Layer | Description |
|-------|-------|-------------|
| `title` | All | Document title |
| `source` | 3 | External source URL |
| `expires` | 4 | Expiry date YYYY-MM-DD |
| `confidence` | 2,3 | Internalization confidence 0.0~1.0 |
| `accessed_count` | All | Reference count per session |

## Rule Definitions

### R1. Frontmatter Must Be Present

All `.md` files (excluding index files) must include YAML frontmatter (`---`).

### R2. Date Format Compliance

The `created`, `updated`, and `expires` fields must follow the `YYYY-MM-DD` format.

```yaml
# Correct example
created: 2026-02-28

# Violation examples
created: 28/02/2026  # ERROR
created: "2026-2-8"  # ERROR
```

### R3. At Least One Tag Required

The `tags` array must not be empty.

### R4. created Is Immutable

The `created` field must not be changed after initial creation.
MCP tools auto-update only the `updated` field.

### R5. Layer 4 Expiry Date Recommended

Files in `04_Action/` are recommended to include an `expires` field (warning).

## Validation Logic

```typescript
import { FrontmatterSchema } from '../types/frontmatter.js';

function validateFrontmatter(raw: string, path: string): DiagnosticItem[] {
  const result = FrontmatterSchema.safeParse(parsedYaml(raw));
  if (!result.success) {
    return result.error.issues.map(issue => ({
      category: 'invalid-frontmatter',
      severity: 'error',
      path,
      message: `${issue.path.join('.')}: ${issue.message}`,
      autoFix: getAutoFix(issue, path)
    }));
  }
  return [];
}
```

## Auto-fix

| Violation | Auto-fix Method |
|-----------|----------------|
| `created` missing | Extract YYYY-MM-DD from file mtime |
| `updated` missing | Set to current date |
| `tags` missing | Use filename (without extension) as tag |
| `layer` missing | Extract Layer number from path |
| Date format error | Auto-fix not available (manual correction required) |

## Exceptions

- Files inside `.coffaen/` and `.coffaen-meta/` are excluded
- `README.md` is excluded
- Files without Frontmatter are reported as R1 violations
