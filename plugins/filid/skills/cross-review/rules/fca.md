# FCA Review Rules

Apply these rules when an assigned file has an owning fractal. Use `structure-check.md` and `verification.md` rows as primary evidence and cite the exact canonical row before source interpretation. Map `documents` and `entry-points` evidence to `contract`, `nodes`, `boundaries`, and `dag` evidence to `structure`, and verification evidence to `verification`. Read project documents directly only for current-contract questions that the tools cannot measure.

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

## Verification

- **FCA-9 — Verification role** (`filid_verification-records §1`): Does every changed verification file retain the adapter-reported spec-document or test-record role implied by its content?
- **FCA-10 — Per-file case cap** (`filid_verification-records §2`; `filid_verification-records §4`): Does each changed spec-document stay at or below 15 cases and each changed test-record stay at or below 32 cases without deleting needed coverage?
- **FCA-11 — Count certainty** (`filid_verification-records §3`): Does canonical evidence count cases under their reported roles and keep dynamic, unknown, or ambiguous counts indeterminate rather than passing?
- **FCA-12 — DETAIL group binding** (`filid_verification-records §5`): When multiple spec-documents exist for one fractal, does each changed document name a distinct existing DETAIL acceptance group with the recognized contract marker?
