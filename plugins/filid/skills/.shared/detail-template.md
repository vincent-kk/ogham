# Shared — DETAIL.md Template

The single definition of what a DETAIL.md must contain. Skills reference this
file instead of restating it; when the contract changes, it changes here.

The authority behind it is `templates/rules/filid_module-documents.md` for the
rule and
`src/core/rules/documentValidator/acceptanceGroups/validateDetailAcceptanceGroups.ts`
for what is mechanically checked. Where this file and those disagree, they win
and this file is the defect.

## Skeleton

```markdown
# <node name> contract

## Requirements

<what the module must do, as current intent>

## API Contracts

<the guarantees the public surface makes — invariants, failure modes, compatibility promises; the entry point already lists its symbols by name>

## Acceptance Criteria

### <group-id> — <title>

- <checkable statement a verification file can bind to>

## Last Updated

<what triggers an update of this document, for example "with every change to the acceptance criteria" — never a date>
```

## Rules

- All four headings are **required**; a missing one is an `error`.
- The contract sections are current state, not an append-only ledger.
  Restructure them to the currently intended behavior on every update; a
  superseded clause is removed rather than left beside its replacement.
- History lives in version control. Neither document carries a history section,
  dated note or "previously"; a decision and its reason are present facts in
  the contract sections.
- Acceptance groups use `### <group-id> — <title>`, and their IDs are unique
  within the document. These IDs are the oracle a spec-document binds to.
- No line cap.
- No file lists or directory structure, or restatements of what a maintainer
  derives from the source and tests: signatures, the steps a function takes,
  values a test already pins. Reasons and change permissions stay even when
  the behavior is visible in the code. A path token appears only where the
  contract needs it — an exemption target, an acceptance path — and the
  snapshot flags one that resolves to nothing.
- Headings stay in English; descriptive content follows `[filid:lang]`,
  defaulting to English. Identifiers, paths, and rule IDs keep their original
  form.

## Conditional section — Boundary Exemptions

Present only when the fractal actually grants an exemption. A fractal with none
never carries the section.

```markdown
## Boundary Exemptions

### `<target path>` — <short title>

- **Consumers**: <paths or globs, or `entry-point` when access is through the barrel>
- **Direct import**: `allowed` | `not allowed`
- **Reason**: <why the barrel cannot serve these consumers, or why the unit has
  not moved to its consumers' lowest common fractal>
```

The target path, each consumer and the direct-import verdict go inside a code
span. A markdown formatter reads a bare `__tests__` as emphasis and writes the
heading back as `**tests**`, which silently points the exemption at a path that
does not exist; the parser strips the span before comparing, so wrapping costs
nothing and a bare value is still read. `Reason` is prose and keeps its own
backticks.

A missing or empty `Reason` is an unmet contract, not a granted exemption.
`## Organ Exemptions` is the same syntax under this section's former name and is
still read.
