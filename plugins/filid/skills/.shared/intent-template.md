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

## Structure

<children, organs, and entry points — real names only>

## Conventions

<module-specific decision rules a newcomer could not guess>

## Boundaries

### Always do

- <non-boilerplate obligation>

### Ask first

- <change that needs a human decision>

### Never do

- <prohibition this module actually enforces>

## Dependencies

<concrete upstream and downstream boundaries>
```

## Rules

- At most **50 lines**. A file at exactly 50 counts as 51 when it ends with a
  trailing newline, so leave a line of slack when editing.
- Records only this fractal's own purpose, ownership and boundaries — never a
  copy of an ancestor's.
- An organ never has one.
- When a directory's conventional name misleads, say so under `Structure`.
- Headings stay in English; descriptive content follows `[filid:lang]`,
  defaulting to English. Identifiers, paths, and rule IDs keep their original
  form.

## Enforcement

Mechanically checked: the 50-line cap (`error`) and the presence of all three
boundary tiers (`warning`). The remaining headings are contract expectations that
no rule fails on — a document missing `Conventions` or `Dependencies` passes
validation while still being incomplete.
