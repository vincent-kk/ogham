# State Machine — Lead's Round Judgment Rules

This document defines the transition rules the **chairperson (team lead)**
applies during Phase D deliberation. Unlike the previous single-agent
roleplay model, personas are now real team workers emitting structured
opinion files. The chairperson parses opinion frontmatter (`state` field)
and decides the next round transition or final verdict.

Phase D runs at most **5 rounds** before forced conclusion.

## State Transition Overview

```
PROPOSAL  ──▶ DEBATE ──┬─▶ SYNTHESIS ──▶ CONCLUSION
                       ├─▶ VETO ───────▶ COMPROMISE ─▶ re-DEBATE
                       │                       │
                       │                       └─▶ CONCLUSION (FAIL)
                       └─▶ ABSTAIN ────▶ Quorum check
```

The chairperson is the only actor — each transition is a Lead decision
driven by the distribution of `state` values across opinion files in
`<REVIEW_DIR>/rounds/round-<N>-*.md`.

## Opinion State Inputs

Each persona writes one file per round with YAML frontmatter. The Lead
parses the `state` field:

- `SYNTHESIS` — agreement with the current proposal (possibly with
  `fix_items` listed for the resolve stage).
- `VETO` — hard rejection. Requires a veto reason in the body. Triggers the
  compromise branch.
- `ABSTAIN` — insufficient information or confidence. Excluded from the
  effective denominator in quorum calculations.

Committee=1 (solo deliberation) never enters this state machine. A single
opinion file maps directly to a verdict (see phase-d-deliberation.md →
Step D.2-solo).

## Transition Rules (Lead decisions)

Applied after the Lead has collected every Round N opinion file:

| Current round state                                  | Lead action                     | Next round state              |
| ---------------------------------------------------- | ------------------------------- | ----------------------------- |
| Round N = 1, all opinions written                    | Tally states                    | Apply quorum rules (below)    |
| Any opinion has `state: VETO`                        | Enter VETO branch               | COMPROMISE round              |
| `S / (M - A) >= 2/3`, no VETO                        | CONCLUSION                      | Verdict derivation            |
| `S / (M - A) < 2/3`, no VETO, `N < 5`                | Start re-DEBATE                 | Create Round N+1 tasks        |
| `V == 0`, `S / (M - A) < 2/3`, `N >= 5`              | Forced CONCLUSION               | Verdict = `INCONCLUSIVE`      |
| Compromise accepted by all vetoing personas          | CONCLUSION                      | Verdict = `REQUEST_CHANGES`   |
| Compromise rejected by any vetoing persona           | Forced CONCLUSION (FAIL)        | Verdict = `REQUEST_CHANGES`   |

Where:
- `M` = committee length
- `S` = count of SYNTHESIS opinions in the current round
- `V` = count of VETO opinions
- `A` = count of ABSTAIN opinions
- `effective_denominator` = `M - A`

## Quorum Rules

| Situation                                         | Lead decision                          | Notes                                   |
| ------------------------------------------------- | -------------------------------------- | --------------------------------------- |
| `V >= 1`                                          | Enter VETO branch                      | Single VETO overrides majority SYNTHESIS|
| `V == 0` and `S / (M - A) >= 2/3`                 | CONCLUSION                             | Abstainers excluded from denominator    |
| `V == 0` and `S / (M - A) < 2/3` and `N < 5`      | Re-DEBATE (create Round N+1 tasks)     | Write `lead-brief-round-<N+1>.md`       |
| `V == 0` and `S / (M - A) < 2/3` and `N >= 5`     | CONCLUSION (INCONCLUSIVE)              | Round limit exhausted                   |
| `effective_denominator == 0` (everyone abstained) | CONCLUSION (INCONCLUSIVE)              | No opinions to aggregate                |

### Worked quorum examples

- 4 members: 3 SYNTHESIS + 1 ABSTAIN → `S/(M-A) = 3/3 = 100%` → CONCLUSION.
- 6 members: 3 SYNTHESIS + 2 ABSTAIN + 1 VETO → VETO present → COMPROMISE.
- 4 members: 1 SYNTHESIS + 3 ABSTAIN → `S/(M-A) = 1/1 = 100%` → CONCLUSION
  (append a "majority-abstain warning" to review-report.md Deliberation
  Log).
- 6 members: 3 SYNTHESIS + 3 ABSTAIN → `S/(M-A) = 3/3 = 100%` → CONCLUSION.
- 4 members: 2 SYNTHESIS + 2 DEBATE (no consensus) → `S/(M-A) = 2/4 = 50%`
  below 2/3 → Re-DEBATE Round N+1.

## VETO Branch (COMPROMISE) Rules

When `V >= 1`:

1. The Lead identifies vetoing personas and creates a compromise task
   owned by `business-driver` (if Business Driver is in the committee).
2. Business Driver writes
   `<REVIEW_DIR>/rounds/round-<N>-business-driver-compromise.md` with
   concrete debt proposal (owner, timeline, acceptance criteria).
3. In Round N+1, vetoing personas re-evaluate. Acceptance produces a
   SYNTHESIS opinion (with `compromise_accepted: true`); rejection
   produces another VETO.
4. If every vetoing persona in Round N+1 returns SYNTHESIS → the VETO
   branch exits and quorum rules apply as usual.
5. If any vetoing persona rejects the compromise OR Business Driver is not
   in the committee → Forced CONCLUSION with verdict `REQUEST_CHANGES`.

## Round Limit

- Maximum rounds: **5**
- If consensus not reached within 5 rounds: CONCLUSION with verdict
  `INCONCLUSIVE`.
- The 5-round cap prevents infinite loops and conserves LLM context across
  the team workers.

## Final Verdict Derivation

| Terminal outcome                                   | Verdict           |
| -------------------------------------------------- | ----------------- |
| CONCLUSION via SYNTHESIS, no fix items aggregated  | `APPROVED`        |
| CONCLUSION via SYNTHESIS, fix items present        | `REQUEST_CHANGES` |
| Forced CONCLUSION via irreconcilable VETO          | `REQUEST_CHANGES` |
| Forced CONCLUSION via round-limit or zero quorum   | `INCONCLUSIVE`    |

## Deliberation Log Format

Every round transition MUST be recorded in `review-report.md` under the
`## Deliberation Log` section by the Lead:

```markdown
### Round N — <STATE>

- **Tally**: M=<N> S=<N> V=<N> A=<N>
- **Per-persona states**:
  - engineering-architect: <state>
  - knowledge-manager: <state>
  - ...
- **Key fix_items raised this round**: <list>
- **Chairperson mediation**: <compromise attempt / lead-brief summary>
- **Transition**: <CURRENT> → <NEXT>
```

## Special Cases

### Solo deliberation (committee.length == 1)

Skip this state machine entirely. `phase-d-deliberation.md` Step D.2-solo
maps the single opinion directly:

- Opinion `state: SYNTHESIS` + no fix_items → `APPROVED`
- Opinion `state: SYNTHESIS` + fix_items → `REQUEST_CHANGES`
- Opinion `state: VETO` → `REQUEST_CHANGES`

`ABSTAIN` is not permitted in solo mode — the solo agent prompt enforces
SYNTHESIS or VETO only.

### Forced ABSTAIN from recovery

When the Lead force-writes an ABSTAIN opinion on behalf of a dead worker
(see phase-d-deliberation.md → Step D.5.4), that persona is counted as
ABSTAIN in quorum math. The Deliberation Log entry MUST note
`recovery: forced-abstain` for that persona so reviewers understand the
reduced denominator.

### Critical security findings

Any fix_item with `severity: CRITICAL` AND `source: structure` AND a
security-related rule (`hardcoded-secret`, `injection`, `auth-bypass`)
automatically forces the verdict to `REQUEST_CHANGES` regardless of
quorum. The Lead MUST set this verdict even if the committee reaches
SYNTHESIS, and the Deliberation Log MUST record
`critical_security_override: true`.
