# FCA Review Rules

Apply these rules when an assigned file has an owning fractal. Use `evidence.md` rows as primary evidence and cite the exact canonical row before source interpretation. Map `documents` and `entry-points` evidence to `contract`, `nodes`, `boundaries`, and `dag` evidence to `structure`, and verification evidence to `verification`. Read project documents directly only for current-contract questions that the tools cannot measure. FCA-14 through FCA-18 have no canonical rows: judge them from the tree and the changed imports, and report what cannot be confirmed as `indeterminate`.

## Contract

- **FCA-1 — Current module contract** (`filid_module-documents §1`; `filid_module-documents §5`): Do the owning INTENT.md boundaries and DETAIL.md requirements reflect the changed behavior and current contract?
- **FCA-2 — Declared public surface** (`filid_fractal-boundaries §3`; `filid_module-documents §1`): Does the changed entry point expose exactly the public surface promised by the owning module documents?
- **FCA-3 — Boundary instructions** (`filid_module-documents §1`; `filid_module-documents §3`): Does the change remain within every applicable Always do, Ask first, and Never do boundary in the owning INTENT.md?

## Structure

- **FCA-4 — Node classification** (`filid_fractal-boundaries §1`): Does each changed node's observed classification follow the canonical file-based classification order?
- **FCA-5 — Entry-point crossing** (`filid_fractal-boundaries §3`): Do external consumers cross the owning fractal through its declared entry point while internal files import concrete peers directly?
- **FCA-6 — Organ access** (`filid_fractal-boundaries §5`): Is each changed direct organ import permitted by the consumer's location or by a reasoned boundary exemption?
- **FCA-7 — Fractal root contents** (`filid_fractal-boundaries §4`): Does each changed fractal root contain only documents, reported entry points, the allowed eponymous implementation, confirmed framework peers, or scoped allowed peers?
- **FCA-8 — Dependency graph** (`filid_fractal-boundaries §6`): Do the changed dependency edges preserve an acyclic graph without converting indeterminate or unsupported evidence into a pass?
- **FCA-14 — Implementation ownership** (`filid_fractal-boundaries §2`; `filid_code-placement §1`): Does each changed fractal own the implementation of its contract, and does each changed unit sit in the fractal whose contract it implements — wiring not counted as a consumer — rather than in an ancestor?
- **FCA-15 — Published address** (`filid_fractal-boundaries §3`): Where a changed entry point is also a published subpath, was a surface conflict resolved by separating the facade rather than by lifting the implementation out of the fractal?
- **FCA-16 — Level legibility** (`filid_fractal-boundaries §4`): At each changed fractal level, can child fractals be told from compartments by name alone, with every topic-named organ inside a conventionally named compartment?
- **FCA-17 — Reach by position** (`filid_fractal-boundaries §5`): Do consumers reach only the units at an organ's top, leaving its nested directories to the units they serve?

## Verification

- **FCA-9 — Verification role** (`filid_verification-records §1`): Does every changed verification file retain the adapter-reported spec-document or test-record role implied by its content?
- **FCA-10 — Per-file case cap** (`filid_verification-records §2`; `filid_verification-records §4`): Does each changed spec-document stay at or below 15 cases and each changed test-record stay at or below 32 cases without deleting needed coverage?
- **FCA-11 — Count certainty** (`filid_verification-records §3`): Does canonical evidence count cases under their reported roles and keep dynamic, unknown, or ambiguous counts indeterminate rather than passing?
- **FCA-12 — DETAIL group binding** (`filid_verification-records §5`): When multiple spec-documents exist for one fractal, does each changed document name a distinct existing DETAIL acceptance group with the recognized contract marker?
- **FCA-18 — Verification placement** (`filid_verification-records §6`; `filid_fractal-boundaries §5`): Does each changed verification file sit in the test directory of the nearest directory enclosing what it exercises, without reaching into another fractal's internals?

## Handoff

- **FCA-13 — Handoff claims**: When the brief carries a `## FCA Handoff` section, each row is an untrusted claim that Stage 1 of `pull-request` could not repair — never a finding by itself. An invalid machine block is reported as an `indeterminate` diagnostic. When the brief's section reports `truncated > 0`, record the missing claims as an evidence gap; do not recover them from the human Change Context table. Confirm a row against the `evidence.md` rows or the tree before raising it; a confirmed row becomes a finding under the category its rule maps to (`documents`/`entry-points` → `contract`, `nodes`/`boundaries`/`dag` → `structure`, verification rules → `verification`, `document-sync` and `needs-rework` rows → `documentation`), citing the confirming evidence. A row the evidence refutes is dropped without a finding. An `indeterminate` row stays indeterminate: report the gap, never a pass. A `needs-rework` or `document-sync` row is `documentation` even when its rule would otherwise map to `contract`; the handoff class decides.
