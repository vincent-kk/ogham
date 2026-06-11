# prawf Calibration — Seeded-Defect Manifest

> Answer key for `mutated-paper.md`. **Never copy this file (or the twin paper) into the review scratch workdir** —
> reviewers must not be able to glob it (see [calibration.md §2](./calibration.md)). Scoring rules (FP/FN, ± one
> severity step, exact fatal-flaw classes) are in [calibration.md §3](./calibration.md).

`mutated-paper.md` is `clean-paper.md` with exactly five defects injected. Everything not listed below is unchanged
in substance and should NOT produce at-or-above-gate findings.

## Manifest

| defect id | location hint                       | expected axis | expected severity | fatal-flaw                                 | description                                                                                                                                                                                                                                   |
| --------- | ----------------------------------- | ------------- | ----------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SD-1      | Title · Abstract · §4 Discussion    | causality     | critical          | yes — Temporality                          | Causal claims ("improves", "produced", "causes", policy recommendation) from cross-sectional data; the NTSI is measured AFTER the exam (§2.4); reverse causality dismissed by assertion; the causal-inference limitation paragraph is removed |
| SD-2      | §2.1 vs §3 Results                  | statistics    | critical          | yes — p-hacking + preregistration mismatch | The preregistered primary outcome (overall exam score — non-significant, p = .21) is demoted; nine uncorrected subscale × subgroup tests are run; the best one (p = .041) is reported as "the primary finding"                                |
| SD-3      | §2.2 Participants · Abstract        | statistics    | major             | no                                         | N = 38 convenience sample against a preregistered N = 463; no a priori power analysis (a post-hoc power analysis is offered instead); a "large, robust" effect is overclaimed from a subgroup of n = 14                                       |
| SD-4      | §2.3 Measures · §4 Discussion       | causality     | major             | no                                         | Obvious confounders (prior GPA, weekly study hours) are not collected and adjustment is dismissed by assertion ("confounding is improbable"; "removes the need for statistical adjustment")                                                   |
| SD-5      | §2.2 Participants (no §2.5 section) | methodology   | minor             | no                                         | Missing-data handling is absent: the clean paper's §2.5 is deleted, the 45 → 38 participant flow is unexplained, and no imputation or exclusion rules are reported                                                                            |

## Notes

- Expected axis is the dedup-ownership hint (orchestration §4.1); a seeded defect surfaced on an adjacent convened
  axis still counts as detected. Severity is what is scored.
- SD-1 and SD-2 must surface as `critical` with their exact fatal-flaw classes — the mutation run must end
  `prawf verdict: reject` at any gate (the fatal-flaw override is gate-independent, orchestration §4.3 / §4.5).
- SD-5 sits below the default gate (`major`): a calibrated review surfaces it as a below-gate advisory finding
  (Advisory Notes + the Findings by Axis audit table) without letting it block the verdict.
