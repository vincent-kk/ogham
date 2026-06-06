# prawf Deliverable Templates

> The **literal output formats** for the deliverables written by the chair and the strategist. This file defines the
> _body structure_ that pairs with the frontmatter contract in [`orchestration.md`](./orchestration.md) §5.
> Ported from the Korean SSoT in `.metadata/prawf/`.
>
> **Output language**: write deliverables in the user's language — match the language of the request (or the paper);
> default to English when unspecified. The examples below are in English. Axis ids, framework names, finding-ids, and
> verdict enums are kept verbatim. The chair reads this file before writing any deliverable.

## 1. `review-report.md` (chair) — main deliverable

```markdown
---
verdict: reject # enum: accept | minor-revision | major-revision | reject (orchestration §5.5)
soundness_tally: { critical: 1, major: 0, minor: 0 } # based on UNRESOLVED, after dedup
status_counts: { defended: 2, mitigated: 1, unresolved: 1, withdrawn: 0 }
impact: moderate
override: fatal-flaw # none | fatal-flaw
external_verification: complete # complete | unavailable | partial
panel: [argument, methodology, statistics, causality, bias, integrity, impact]
profile: empirical-science
---

# prawf Review Report — <paper title>

**Date**: <ISO 8601> **Profile**: <field profile> **Type**: <paper type>
**Verdict**: <ACCEPT | MINOR REVISION | MAJOR REVISION | REJECT>

## Verdict Summary

- **Verdict**: <verdict> — unresolved soundness critical <N> · major <N> · minor <N>
- **Override**: <none | fatal-flaw (which finding on which axis)>
- **External verification**: <complete | partial | unavailable>

## Panel & Profile

| Item              | Value                                                                 |
| ----------------- | --------------------------------------------------------------------- |
| Field profile     | <profile> (<injection path: --profile/auto/fallback/custom>)          |
| Paper type        | <type> → applied guideline <guideline>                                |
| Convened axes     | <argument, statistics, causality, bias, integrity (+impact advisory)> |
| Inactive/absorbed | <causality→argument (math profile)> / none                            |

## Findings by Axis

> All locations use `paper-normalized.md` coordinates (`§<section>¶<paragraph> + line`). Duplicates are listed once on
> the owning axis after dedup.

| finding-id | axis        | severity | location  | final status | one-line summary                                          |
| ---------- | ----------- | -------- | --------- | ------------ | --------------------------------------------------------- |
| CAUS-2     | causality   | critical | §4¶1 L88  | UNRESOLVED   | Cross-sectional design cannot rule out reverse causality  |
| STAT-1     | statistics  | major    | §3¶2 L45  | MITIGATED    | Unadjusted multiple comparisons → mitigated by reanalysis |
| METH-3     | methodology | minor    | §2¶4 L31  | DEFENDED     | Missing-data handling — confirmed described in text       |
| INTEG-1    | integrity   | minor    | §6¶1 L120 | DEFENDED     | Data availability — supplemented with OSF link            |

## Deliberation Log

### R1 — ATTACK

- Convened: [argument, methodology, statistics, causality, bias, integrity] + impact(advisory)
- Raised: CAUS-2(critical), STAT-1(major), METH-3(minor), INTEG-1(minor)

### R2 — DEFENSE

- DEFENDED: METH-3 (cited in text), INTEG-1 (OSF link — verified artifact)
- MITIGATED proposed: STAT-1 (Bonferroni reanalysis results attached — verified artifact → qualifies for downgrade)
- UNRESOLVED proposed: CAUS-2 (cannot defend without longitudinal data, solution: null)

### R3 — RE-REVIEW

- STAT-1: original Reviewer accepts → **MITIGATED** (major→minor effect)
- CAUS-2: original Reviewer rejects → **UNRESOLVED** (fatal-flaw: Temporality, cannot downgrade)

### Verdict

- soundness_tally: critical 1 (CAUS-2) → **REJECT**, override: fatal-flaw

## Significance & Scope _(advisory — independent of verdict)_

- **Impact**: <high | moderate | low | niche> — <rationale>
- **Scope**: <generalization / scope-of-application note>

## Verdict Rationale

<verdict-specific narrative — see variants below>
```

### 1.1 Accept (PASS) variant — Verdict Rationale

```markdown
## Verdict Rationale — ACCEPT (PASS)

**Zero unresolved critical/major** across the 6 soundness axes. The remaining <N> minor items (<finding-id…>) are
completeness defects that do not change the conclusion. Integrity is confirmed on an evidence basis, so we conclude
PASS. (Demonstrating integrity is itself part of verification.)
```

### 1.2 Provisional variant — `external_verification: unavailable`

```markdown
> ⚠ **Provisional Accept** — owing to the absence of external-verification capability, the following axes are
> unverified: <causal (prior work), statistical (pre-registration), integrity (plagiarism)>. Plagiarism, fabrication,
> and prior-work consistency have not been confirmed. This PASS is **provisional** and re-confirmation after external
> verification is recommended.
```

### 1.3 Inconclusive variant

```markdown
**Verdict**: INCONCLUSIVE — the load-bearing axis <axis> ultimately failed to secure evidence to verify the core
claim, so a verdict cannot be rendered (see `reasoning_gaps`). This condition differs from a quorum-failure.
```

## 2. `qa-sheet.md` (chair, strategist synthesis) — key user deliverable

```markdown
# prawf Anticipated Questions & Solutions — <paper title>

> Author-facing sheet. **Independent of the evaluation verdict** — it provides anticipated attacks and responses
> regardless of whether the paper passes. Fill in a solution _only when a clear resolution exists_. If unclear, leave
> it blank as _unresolved / sublimated into a Limitation_.

## Q&A by Finding

| finding-id  | axis        | anticipated question                                             | type | defense tactic | solution                                  | status     |
| ----------- | ----------- | ---------------------------------------------------------------- | ---- | -------------- | ----------------------------------------- | ---------- |
| STAT-1      | statistics  | "Did you adjust for multiple comparisons?"                       | good | justification  | Bonferroni reanalysis attached            | mitigated  |
| CAUS-2      | causality   | "It's cross-sectional — how did you rule out reverse causality?" | good | deferral       | _(unresolved — longitudinal data needed)_ | unresolved |
| METH-3      | methodology | "How was missing data handled?"                                  | good | clarification  | Multiple imputation stated in §2          | defended   |
| —(advisory) | —           | "Does this result apply beyond its field?"                       | bad  | —              | sidestep (not verification) — qa only     | —          |

> `bad`/`cringy` type and `sidestep` tactic items are **not grounds for verdict downgrade** — they are for oral-defense
> reference only.

## Rebuttal Letter Draft (point-by-point)

> Reviewer response letter. Tag each item as Revision / Justification / Clarification. Maintain a composed, receptive
> tone.

**[STAT-1 · Justification]** Thank you for the comment. Regarding the multiple-comparison concern, we re-ran the
Bonferroni correction (results in Appendix Table S3); the main results remain significant after correction (p<.01). We
revised §3 L45 in the text.

**[CAUS-2 · Clarification (sublimated as a limitation)]** Reverse causality is a limitation of this cross-sectional
design. Because it cannot be ruled out with the current data, we humbly accept this by stating it in the Limitations
section and proposing longitudinal follow-up research.

## Significance & Scope Note

- **Impact**: <rating> — <rationale>. _(This assessment is for impact reference, not a recommendation to publish.)_
```

## 3. `rebuttal.md` (strategist) — defense-round output

```markdown
---
round: 2
persona: rebuttal-strategist
defenses:
  - finding_id: STAT-1
    question_type: good
    tactic: justification
    proposed_status: mitigated
  - finding_id: CAUS-2
    question_type: good
    tactic: deferral
    proposed_status: unresolved
external_refs: ["Bonferroni 1936", "OSF/abc123"]
---

# Rebuttal — <paper title>

## Defense by Finding

### STAT-1 (statistics · major) — proposed: MITIGATED

- **Anticipated question** (good): "Did you adjust for multiple comparisons?"
- **Tactic**: justification
- **Defense**: Re-ran the Bonferroni correction (α=.01) across the 5 dependent variables; main effect holds.
- **Solution**: Reanalysis table attached (verified artifact → qualifies for downgrade).

### CAUS-2 (causality · critical) — proposed: UNRESOLVED

- **Anticipated question** (good): "Reverse causality of the cross-sectional design?"
- **Tactic**: deferral
- **Defense**: Acknowledge that reverse causality cannot be ruled out with the current data.
- **Solution**: _null — longitudinal data needed. Sublimated into a Limitation._
- **Note**: fatal-flaw (Temporality) axis → no forced defense, keep UNRESOLVED.
```

> A `tactic: sidestep`, or a `justification` without external evidence, **cannot have a `proposed_status` of
> mitigated/defended** (no verified artifact) — the chair treats it as `CONTESTED` (orchestration §4.3).

## 4. Intermediate deliverables (summary format)

| File                         | Key body                                                                                                   |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `paper-profile.md`           | input source path · type · profile · convened panel · injection path + applied `absorb_map` details        |
| `paper-normalized.md`        | `§<section>¶<paragraph>` headers + chair-assigned line numbers. Shared coordinate system for all citations |
| `findings/round-1-<axis>.md` | frontmatter (§5.1) + per-axis finding narrative (claim · evidence · anticipated_question)                  |
| `findings/round-3-<axis>.md` | frontmatter (§5.4) + defense accept/reject rationale                                                       |
