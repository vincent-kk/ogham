# Shared — INTENT.md Template

The single definition of what an INTENT.md must contain. Skills reference this
file instead of restating it; when the contract changes, it changes here.

The authority behind it is `templates/rules/filid_module-documents.md` for the
rule and `src/core/rules/documentValidator/validators/validateIntentMd.ts` for
what is mechanically checked. Where this file and those disagree, they win and
this file is the defect.

## Skeleton

```markdown
# <node name> — <one-line role>

## Purpose

<what this fractal owns, and what it explicitly does not>

## Conventions

<module-specific decision rules a newcomer could not guess>

## Boundaries

### Always do

- <non-boilerplate obligation>

### Ask first

- <change that needs a human decision>

### Never do

- <prohibition this module actually enforces>
```

## Conditional sections

- `## Structure` — only to defuse what the tree cannot say: a name trap, a
  generated-vs-canonical split, a misleading conventional name. Never a file
  or directory inventory; `ls` already prints that.
- `## Dependencies` — only for a coupling the package manifest cannot show.
  Never a dependency roster.

## Rules

- At most **50 lines**. A file at exactly 50 counts as 51 when it ends with a
  trailing newline, so leave a line of slack when editing.
- Records only this fractal's own purpose, ownership and boundaries — never a
  copy of an ancestor's.
- Nothing a tool can derive: no file lists, no export lists, no dependency
  rosters, no counts of any of these. A path reference that must stay carries
  its reason beside it.
- An organ never has one.
- Headings stay in English; descriptive content follows `[filid:lang]`,
  defaulting to English. Identifiers, paths, and rule IDs keep their original
  form.

## Enforcement

Mechanically checked: the 50-line cap (`error`), the presence of all three
boundary tiers (`warning`), and three findings against derivable content —
three or more path tokens in one section (`derivable-content`), a path token
that resolves to nothing (`stale-path`), and a section naming half or more of
the node's own children (`derivable-structure`), all `warning`. The remaining
headings are contract expectations that no rule fails on.
