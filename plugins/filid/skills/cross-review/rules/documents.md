# Document Review Rules

Apply these rules to changed documentation, module contracts, and rule documents. Every finding uses category `documentation` unless the same defect is recorded under a more specific FCA rule.

## Contract Currency

- **DOC-1 — INTENT and DETAIL currency** (`filid_module-documents §1`; `filid_module-documents §5`): Do changed INTENT.md and DETAIL.md documents describe the current boundary and contract without preserving a superseded requirement as current state?
- **DOC-2 — Implemented behavior**: Does a changed document promise behavior, an option, an artifact, or a guarantee that the referenced code does not provide?

## Reference Integrity

- **DOC-3 — Section citations**: Does every changed `§N` citation resolve to the named rule document's actual numbered section and support the statement attached to it?
- **DOC-4 — Link targets**: Does every changed local path or Markdown link resolve to an existing intended target with the correct case and relative base?

## Executable Examples

- **DOC-5 — Command examples**: Does every changed command example use an existing script or executable and pass flags that the current interface accepts?

