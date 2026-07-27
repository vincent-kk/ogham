# setup — INTENT.md Proposal

> Reference for Phase 4 of `/filid:setup`.

From the `fractal_scan(detail: "paths")` result and document findings from
`structure_validate`, list fractal nodes that lack INTENT.md. Setup proposes
these files; it does not author or overwrite them.

Each proposed INTENT.md must later satisfy:

- no more than 50 lines
- English machine-readable headings
- `## Purpose`, `## Structure`, `## Conventions`, `## Boundaries`, and
  `## Dependencies`
- all three boundary headings: `### Always do`, `### Ask first`, and
  `### Never do`
- descriptive content in the snapshot's output language

Never propose INTENT.md for an organ. Existing documents are reported as
present and remain untouched.

The proposal entry contains the node path, proposed document path,
classification, and the corresponding validation finding.
