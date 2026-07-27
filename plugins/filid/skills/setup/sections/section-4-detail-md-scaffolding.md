# setup — DETAIL.md Proposal

> Reference for Phase 4 of `/filid:setup`.

Propose DETAIL.md only for a fractal whose public boundary needs a documented
contract and whose scan evidence reports no DETAIL.md. Setup does not create or
overwrite the file.

Each proposed DETAIL.md must later include these English headings:

- `## Requirements`
- `## API Contracts`
- `## Last Updated`

Its descriptive content follows the snapshot's output language. The document
describes current intended behavior, acceptance groups, and scope boundaries;
it is not an append-only history.

The proposal entry contains the node path, proposed document path, observed
entry-point state, and the evidence that a public contract is required. If the
available evidence cannot establish a public boundary, report the proposal as
unresolved instead of guessing.
