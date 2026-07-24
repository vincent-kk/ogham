# filid Calibration — Seeded-Violation Manifest

> Answer key for `seeded-change.md` and `low-only-change.md`. **Never copy
> this file (or the sibling variants) into the scratch repo** — reviewers
> must not be able to glob it (see [calibration.md §2](./calibration.md)).
> Scoring rules (FP/FN, ± one severity step, exact VETO classes, inflation)
> are in [calibration.md §3](./calibration.md).

## Seeded Defects (`seeded-change.md`)

| id   | location hint                              | expected lens               | expected severity | VETO class             | description                                                                                                                                                                                                                                                                                                                   |
| ---- | ------------------------------------------ | --------------------------- | ----------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SV-1 | `src/slugify/slugify.ts` line 2            | stability (operations-sre)  | CRITICAL          | yes — hardcoded secret | A live-looking signing key committed to source. MUST surface as CRITICAL with `state: VETO`; the run MUST end `REQUEST_CHANGES` at any gate. The constant being unused does NOT downgrade it.                                                                                                                                 |
| SV-2 | `src/slugify/slugify.ts` `throw` statement | cognitive load (design-hci) | MEDIUM            | no                     | Generic error message ("Error occurred") on a developer-facing library path — the caller gets no actionable information (design-hci criterion 3: generic error messages → MEDIUM). HIGH is tolerated (one step up); CRITICAL or a VETO escalation counts as severity inflation per calibration.md §3; LOW or absent is an FN. |

## Golden-LOW Set (`low-only-change.md` and `seeded-change.md`)

Items that MUST stay LOW (advisory) or stay unreported — surfacing any of
them at MEDIUM or above is a severity-inflation regression:

| id   | location hint                           | expected lens                  | expected outcome | description                                                                    |
| ---- | --------------------------------------- | ------------------------------ | ---------------- | ------------------------------------------------------------------------------ |
| GL-1 | `src/slugify/slugify.ts` local variable | cognitive load (design-hci)    | LOW or absent    | `result_value` — snake_case local among camelCase siblings (naming convention) |
| GL-2 | `src/slugify/slugify.ts` comment        | cognitive load / documentation | LOW or absent    | Redundant comment narrating the obvious transformation                         |

## Notes

- Expected lens is a routing hint; a defect surfaced under an adjacent lens
  still counts as detected. Severity (and the VETO class for SV-1) is what
  is scored.
- SV-1 exercises the acceptance invariant that VETO classes are
  gate-independent: no severity-gate configuration may let the seeded run
  end in anything other than `REQUEST_CHANGES`.
- GL items exercise the anti-inflation hard rules (style/wording →
  mechanically LOW) and the advisory channel: on the low-only run they may
  appear ONLY in `review-report.md` → `## Advisory Notes` (never in
  `fix-requests.md`), and the verdict MUST remain `APPROVED`.
