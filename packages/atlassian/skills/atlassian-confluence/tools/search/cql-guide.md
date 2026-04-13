# CQL Quick Reference

## Basic Syntax

```
field operator value [AND|OR field operator value]
```

## Common Fields

| Field | Description | Example |
|---|---|---|
| `type` | Content type | `type = "page"` |
| `space` | Space key | `space = "DEV"` |
| `title` | Page title | `title ~ "meeting notes"` |
| `text` | Full text | `text ~ "API documentation"` |
| `creator` | Page creator | `creator = currentUser()` |
| `lastmodified` | Last modified | `lastmodified >= "2024-01-01"` |
| `label` | Page labels | `label = "architecture"` |
| `ancestor` | Parent page ID | `ancestor = 12345` |

## Operators

| Operator | Description |
|---|---|
| `=` | Exact match |
| `~` | Contains (full-text) |
| `>=`, `<=` | Date comparison |
| `IN` | Set membership |

## Example Queries

- Pages in space: `type = "page" AND space = "DEV"`
- Recent: `type = "page" AND lastmodified >= now("-7d")`
- By label: `type = "page" AND label = "api"`
