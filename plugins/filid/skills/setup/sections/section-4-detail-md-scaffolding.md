# setup — DETAIL.md Proposal

> Reference for Phase 4 of `/filid:setup`.

Propose DETAIL.md only for a fractal with contract content that requires it under the module-document rule. A missing DETAIL.md is not a finding and is not drafted by default. Draft one only when the user asks for that fractal or a finding requires it: `spec-contract-link` for an owner with several spec-documents, or a boundary exemption that must be declared. Setup does not create or overwrite the file.

Each proposed DETAIL.md must later satisfy [`../../.shared/detail-template.md`](../../.shared/detail-template.md) — its required heading set, the acceptance-group shape, and the language rule. Do not restate that template here.

The proposal entry contains the node path, proposed document path, observed entry-point state, and the evidence that an explicit request, contract content, or another rule requires this document. If the available evidence cannot establish that an explicit request, contract content, or another rule requires this document, report the proposal as unresolved instead of guessing.
