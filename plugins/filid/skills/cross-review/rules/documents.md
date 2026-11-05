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
- **DOC-7 — INTENT budget and DETAIL split** (`filid_module-documents §1`; `filid_module-documents §3`; `filid_module-documents §5`; `filid_module-documents §6`): Does a changed INTENT.md stay within 50 lines by keeping only boundary content, with API contracts and acceptance criteria in DETAIL.md, decisions and their reasons as present facts, and history in version control? When INTENT.md carries contract detail or exceeds the cap, the Recommended Action is to relocate that content into DETAIL.md through the Document content route.
- **DOC-8 — Derivable content** (`filid_module-documents §2`): Does a changed document restate what its reader derives directly from the source and tests, drop a reason, a change permission or anything that reader would not establish unambiguously, or keep a path without its reason beside it?
- **DOC-9 — History in documents** (`filid_module-documents §5`; `filid_module-documents §6`): The mechanical `history-section` and `last-updated-trigger` checks are both `error`: they reject a level-2 History section outside fences and an empty or dated `## Last Updated` body. DOC-9 still judges dated notes and "previously" elsewhere in changed INTENT.md or DETAIL.md documents. The Recommended Action is to move the decision and its reason into the contract sections as present facts, delete the history, and state the update trigger under `## Last Updated`.
