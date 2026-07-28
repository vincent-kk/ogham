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

<the public surface: symbols, shapes, and their guarantees>

## Acceptance Criteria

### <group-id> — <title>

- <checkable statement a verification file can bind to>

## Last Updated

<ISO date> — <what changed in this contract>
```

## Rules

- All four headings are **required**; a missing one is an `error`.
- The contract sections are current state, not an append-only ledger.
  Restructure them to the currently intended behavior on every update; a
  superseded clause is removed rather than left beside its replacement.
- History belongs in the conditional `## History` section below — never mixed
  into the contract sections, and never in `INTENT.md`.
- Acceptance groups use `### <group-id> — <title>`, and their IDs are unique
  within the document. These IDs are the oracle a spec-document binds to.
- No line cap.
- Headings stay in English; descriptive content follows `[filid:lang]`,
  defaulting to English. Identifiers, paths, and rule IDs keep their original
  form.

## Conditional section — History

Present only when a change is worth remembering. It is the one place a module's
documents record the past; `INTENT.md` and the code never do.

```markdown
## History

- <ISO date> — <what the contract decided or reversed, and why>
```

Newest entry first, below the contract sections and above `## Last Updated`.
`## Last Updated` names the most recent change; this section keeps the earlier
ones still worth carrying, and an entry that no longer informs a present
decision is dropped rather than archived deeper. An entry accompanies the
contract change that produced it — an edit that only appends one is the
append-only pattern the validator rejects.

## Conditional section — Boundary Exemptions

Present only when the fractal actually grants an exemption. A fractal with none
never carries the section.

```markdown
## Boundary Exemptions

### <target path> — <short title>

- **Consumers**: <paths or globs, or `entry-point` when access is through the barrel>
- **Direct import**: allowed | not allowed
- **Reason**: <why the barrel cannot serve these consumers, or why the unit has
  not moved to its consumers' lowest common fractal>
```

A missing or empty `Reason` is an unmet contract, not a granted exemption.
`## Organ Exemptions` is the same syntax under this section's former name and is
still read.
