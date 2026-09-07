# setup — Classification Interpretation

> Reference for Phase 3 of `/filid:setup`.

Use the classifications returned by `fractal_inspect` action `scan`. Do not reclassify directories with an ad hoc name table or a second navigation workflow.

The canonical priority is:

1. Existing INTENT.md or DETAIL.md makes the directory a fractal.
2. A known organ name makes it an organ.
3. A double-underscore wrapped name makes it an organ.
4. A dot-prefixed name makes it an organ.
5. A **module index** reported by a registered adapter makes a non-organ directory a fractal. An executable or framework entry point does not, and neither does a path injected through the config `entryPointOverrides` — those feed the entry-point surface, never classification.
6. A leaf without fractal children is an organ.
7. A non-leaf directory proven stateless and side-effect-free is a pure-function node.
8. The remaining directories are organs. A directory that declares neither a document nor a module index has never claimed an independent contract.

`hybrid` is assigned only during deliberate migration. A fractal may occur below an organ directory; every returned node remains an independent classification target.

Do not turn uncertain adapter evidence into a confident classification. Preserve the tool status and diagnostics in the final proposal.
