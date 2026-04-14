# JQL Quick Reference

## Basic Syntax

```
field operator value [AND|OR field operator value]
```

## Common Operators

| Operator | Example |
|---|---|
| = | `project = "PROJ"` |
| != | `status != "Done"` |
| IN | `status IN ("Open", "In Progress")` |
| NOT IN | `assignee NOT IN (currentUser())` |
| ~ | `summary ~ "login bug"` (contains) |
| IS EMPTY | `description IS EMPTY` |
| IS NOT EMPTY | `assignee IS NOT EMPTY` |

## Date Functions

| Function | Description |
|---|---|
| `now()` | Current datetime |
| `startOfDay()` | Start of today |
| `endOfWeek()` | End of current week |
| `-7d` | 7 days ago (relative) |

## Common Queries

- Open issues: `project = PROJ AND status != Done ORDER BY priority DESC`
- My issues: `assignee = currentUser() AND resolution = Unresolved`
- Recent: `project = PROJ AND updated >= -7d`
- Sprint: `sprint IN openSprints() AND project = PROJ`
