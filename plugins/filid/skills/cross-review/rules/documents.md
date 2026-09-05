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

## Draft Sufficiency

- **DOC-6 — Boundary draft sufficiency** (`filid_module-documents §1`; `filid_module-documents §3`): Does a changed INTENT.md state a concrete ownership claim, module-specific conventions, and Always do / Ask first / Never do clauses that could only be true of this module — rather than headings filled by restating the directory name? Name the section and the evidence (entry point, consumers, tests) the draft should have used.
- **DOC-7 — INTENT budget and DETAIL split** (`filid_module-documents §3`; `filid_module-documents §5`): Does a changed INTENT.md stay within 50 lines by keeping only boundary content, with API contracts, acceptance criteria and history in DETAIL.md? When INTENT.md carries contract detail or exceeds the cap, the Recommended Action is to relocate that content into DETAIL.md through the Document content route.
- **DOC-8 — Derivable content** (`filid_module-documents §2`): Does a changed document list files, exports, dependencies or counts that a tool prints, without a reason beside each path it keeps?
