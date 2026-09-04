# setup — INTENT.md Proposal

> Reference for Phase 4 of `/filid:setup`.

From the `fractal_inspect` `scan` result with `detail: "paths"` and document findings from its `validate` action, list fractal nodes that lack INTENT.md. Setup proposes these files; it does not author or overwrite them.

Each proposed INTENT.md must later satisfy [`../../.shared/intent-template.md`](../../.shared/intent-template.md) — its heading set, the 50-line cap, and the language rule. Do not restate that template here; setup proposes the file, and the template is defined once.

Never propose INTENT.md for an organ. Existing documents are reported as present and remain untouched.

The proposal entry contains the node path, proposed document path, classification, and the corresponding validation finding.
