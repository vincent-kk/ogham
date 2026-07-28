---
paths:
  - 'INTENT.md'
  - 'DETAIL.md'
---

# Module Documents

> **Precedence**: repository instructions (CLAUDE.md, project rules) > repository conventions > this rule > filid defaults. On conflict, the higher source wins and this rule yields.

A fractal's contract is written down beside its code: INTENT records the boundary, DETAIL records the current contract. These rules define what those documents must contain to count as one. This rule rests on a property every FCA project has: a module's contract is written down in a file next to the code it governs.

**Tradeoff:** two documents per fractal to maintain, in exchange for a boundary a newcomer can read without running anything. **Applies when:** you are creating or editing an `INTENT.md` or a `DETAIL.md`.

## 1. INTENT records the boundary; DETAIL records the contract

**Two documents, two jobs — neither substitutes for the other.**

- The section headings `Purpose`, `Structure`, `Conventions`, `Boundaries`, `Always do`, `Ask first`, `Never do` and `Dependencies` in INTENT, and `Requirements`, `API Contracts`, `Acceptance Criteria` and `Last Updated` in DETAIL, stay in English. Descriptive content follows `[filid:lang]`, defaulting to English.
- INTENT records only this fractal's own purpose, ownership and boundaries — never a copy of an ancestor's. Update it only when the public boundary or contract changes.
- When a directory's conventional name misleads, say so in `Structure`.

Ask yourself: "Is this fact about the module's boundary, or about its current contract?"

## 2. INTENT is at most 50 lines and names its three boundaries

**A boundary document that needs scrolling is not a boundary document.**

- `INTENT.md` is at most 50 lines.
- It contains `Always do`, `Ask first` and `Never do` sections. A boundary with no "never" has not been decided yet.

Ask yourself: "Can a newcomer read this whole file before deciding what to touch?"

## 3. An organ has no INTENT

**Independent documentation is a claim to an independent contract.**

- An organ does not contain `INTENT.md`, and does not use INTENT as local documentation.
- If a directory genuinely needs its own boundary document, that is the signal to reclassify it as a fractal — with an entry point — not to add the file where it stands.

Ask yourself: "Does this directory want its own boundary, or does it belong inside its owner's?"

## 4. DETAIL is current state, not an append-only history

**A ledger that only grows stops describing anything.**

- Restructure the document to the currently intended behavior on every update. Do not append a changelog of what it used to say.
- Update DETAIL before the code it describes.
- Acceptance groups carry stable IDs, unique within that document.
- `DETAIL.md` is the sole acceptance-criteria ledger. A legacy `.filid/criteria.md` is reported as such — never auto-deleted, never silently migrated.

Ask yourself: "Does this document describe the code as it should be now, or as it has been?"

## 5. An exemption without a reason is a disabled rule in costume

**`Reason` is the load-bearing field.**

- `Boundary Exemptions` is conditional: present only when this fractal actually grants one. A fractal with no exemption never carries the section, and a fractal that needs one and has no `DETAIL.md` adds the document for this purpose. `## Organ Exemptions` is the same syntax under this section's former name and is still read.
- The target is an organ path or a path inside this fractal — a consumer that cannot route through the entry point needs the same escape hatch either way. A path names itself and everything under it.
- An entry uses the acceptance-group shape, so one parser reads both:

```md
## Boundary Exemptions

### <target path> — <short title>

- **Consumers**: <paths or globs, or `entry-point` when access is through the barrel>
- **Direct import**: allowed | not allowed
- **Reason**: <why the barrel cannot serve these consumers, or why the unit has not
  moved to its consumers' lowest common fractal>
```

- A missing or empty `Reason` is an unmet contract, not a granted exemption.

Ask yourself: "Would someone who has never seen this code understand why the exemption exists?"

---

**This rule is working if:** every fractal's boundary fits on one screen; DETAIL diffs read as contract changes rather than appended notes; every exemption in the tree is explained by reading its own entry. **This rule is wrong for you if:** the directory is an organ, or a part of the tree that has not adopted FCA — then it has no contract of its own to document, and adding one is the wrong move.
