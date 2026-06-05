# prawf Orchestration

> Specifies how the nine personas defined in `../../agents/` are operated as a
> Claude Code native team: the **round flow, state machine, and deliverable
> contracts**. Ported from the Korean SSoT in `.metadata/prawf/`.
>
> Execution environment: **inside a claude-code session**. Every round runs as a
> native Team (`TeamCreate`/`Task`/`SendMessage`); external LLM and search calls
> are delegated by personas only as capabilities. Field expertise is injected as
> data by the [field profiles](./field-profiles.md). This is a pure-markdown
> plugin with no dependence on external servers or hooks — all review behavior
> happens inside the session.

## 1. Structural Differences from filid

| Aspect              | filid review                              | prawf                                                                         |
| ------------------- | ----------------------------------------- | ----------------------------------------------------------------------------- |
| Persona relationship | Equal committee members in **horizontal consensus** | **Vertical** attack (6) → defense (1) → adjudication (1), plus a separate significance assessment (1) |
| Unit of consensus   | A vote per proposition                    | **Survival of each individual finding**                                       |
| Core mechanism      | 2/3 quorum, VETO/SYNTHESIS/ABSTAIN        | finding state transitions + chair synthesis                                   |
| Verdict input       | All committee members equal               | **Only the 6 soundness axes drive the verdict; significance is advisory**     |
| Final verdict       | APPROVED / REQUEST_CHANGES / INCONCLUSIVE | Accept / Minor / Major / Reject                                               |

prawf rounds simulate a journal's **review → rebuttal → re-review cycle**, not a vote.

## 2. Pipeline Stages

```
P0  PROFILE+NORMALIZE  chair      detect type & field → load profile → normalize input
                                  → paper-profile.md + paper-normalized.md
     │
R1  ATTACK    Reviewer ×N (+impact)  (parallel) deconstruct each axis + finding + anticipated question → findings/round-1-<axis>.md
     │  await all
R2  DEFENSE   strategist          defense, Q&A, and (when possible) solutions for every finding → rebuttal.md
     │
R3  RE-REVIEW Reviewer ×k         (conditional, parallel) accept/reject contested & withdrawn proposals → findings/round-3-<axis>.md
     │
ADJ ADJUDICATE chair              dedup → finalize finding status → verdict → review-report.md + qa-sheet.md
```

### P0 — Profile & Normalize (chair)

1. **Detect type & field** → load a [field profile](./field-profiles.md). Priority: `--profile` override > P0 auto-detection (default) > universal fallback > optional `.prawf/profiles/<name>.yaml` custom.
2. **Validate the profile**: confirm the loaded profile's minimum schema (required keys, axis-reference consistency, presence of `severity_examples`).
   **The mandatory soundness axes (argument, methodology, integrity) cannot be turned off via `disabled_axes`** — only statistics, causality, and bias may be conditionally disabled, and only when accompanied by an `absorb_map`. A profile that violates this is rejected and the universal fallback is used instead.
3. **Normalize input**: convert PDF/LaTeX/markdown input into **`paper-normalized.md`** (a normalized snapshot to which the chair assigns line numbers).
   Every Reviewer cites the **`§<section>¶<paragraph>` and line numbers of this snapshot**, not the original — this establishes a shared coordinate system.
4. Output: `paper-profile.md` (type, profile, convened panel) + `paper-normalized.md`.

### Panel Convocation (elected from the nine)

| Scale      | soundness attack axes              | significance     | Notes                  |
| ---------- | ---------------------------------- | ---------------- | ---------------------- |
| `LIGHT`    | argument + 1 core axis             | impact(advisory) | abstract / single issue |
| `STANDARD` | 3~4 axes                           | impact           | general paper          |
| `FULL`     | all 6 axes                         | impact           | rigorous review (all 9) |
| `--solo`   | `adjudicator` consolidates 1~6 axes in one pass | —                | fast pre-screen        |

- `argument-analyst`, `chair`, and `rebuttal-strategist` are **always convened**, regardless of field.
- **Convened axes = the profile's `paper_types[type].axes`**. If the profile specifies `disabled_axes` (e.g. causality for mathematics), that axis is _not deleted_ but transferred to the absorber that the profile's `absorb_map` (e.g. `{ causality: argument }`) designates.
  **In P0 the chair injects the invariant questions of the disabled axis directly into the absorber persona's R1 prompt** — closing the coverage gap by behavior, not by declaration (the absorption must also be reflected in the absorber's profile menu).
- `integrity-auditor` is convened when external tools are available; when they are entirely absent, see §8 degradation.

## 3. Finding State Machine

Each finding holds a single status, and the chair decides transitions by grep-parsing the frontmatter `status`.

```
              R1                R2 defense              R3 re-review
  (Reviewer) ─────▶ RAISED ─────────────▶ CONTESTED ──┬─[Reviewer accepts]─▶ DEFENDED   (fully resolved)
                      │                                ├─[partial accept]───▶ MITIGATED  (mitigated, residual risk)
                      │                                └─[Reviewer rejects]─▶ UNRESOLVED (defense failed)
                      └─[strategist cannot defend]────────────────────────────▶ UNRESOLVED
                      └─[strategist claims factual error]──▶ WITHDRAWN-PROPOSED ──┬─[original Reviewer confirms in R3]─▶ WITHDRAWN
                                                                                  └─[unconfirmed / rejected]──────────▶ UNRESOLVED
```

- **DEFENDED**: defense is clear and verifiable. No effect on the verdict.
- **MITIGATED**: partially mitigated. Severity is downgraded one step (major→minor effect).
- **UNRESOLVED**: defense failed, no clear remedy. **Mark honestly as unresolved** (no forced defense).
- **WITHDRAWN**: requires the strategist to prove the attack's factual error **and the original attacker to confirm it in R3** (prevents a false PASS). The strategist alone cannot delete a finding.

## 4. Adjudication — dedup → verdict (chair)

### 4.1 Dedup & Ownership

When convened axes overlap and report the same defect twice, the verdict tally is inflated. The chair merges them:

- **Merge key**: `canonical-location + defect-class`. On collision, **merge into one, keep the highest severity, and record all contributing axes** (multi-axis agreement is a *signal*, not a weight).
- **Ownership table** (the primary owner holds it; the rest yield):

  | Defect class                          | Owning axis                                   |
  | ------------------------------------- | --------------------------------------------- |
  | correlation ↔ causation confusion     | `causal-reviewer` (argument yields)           |
  | sample size, power, multiple comparisons | `statistical-auditor` (methodology, bias yield) |
  | publication bias, external validity, reproducibility | `bias-grader` (statistical, methodology yield) |
  | plagiarism, data fabrication, conflict of interest | `integrity-auditor`                           |

### 4.2 Verdict Derivation

Tally **only the UNRESOLVED findings on the 6 soundness axes** (`impact-assessor` is excluded — see §4.4).

| Condition (UNRESOLVED, soundness axes)                          | Verdict            |
| --------------------------------------------------------------- | ------------------ |
| `critical` ≥ 1                                                  | **Reject**         |
| `major` ≥ 1                                                     | **Major Revision** |
| all `major` are MITIGATED, no critical/major UNRESOLVED         | **Minor Revision** |
| only `minor` UNRESOLVED exist                                   | **Minor Revision** |
| no UNRESOLVED (all DEFENDED/WITHDRAWN, or 0 findings)           | **Accept (PASS)**  |

- **PASS justification**: even an Accept must state, on an evidence basis, that "the 6 soundness axes have 0 critical/major and the residual minor findings do not change the conclusion."

### 4.3 Burden of Proof & Tie-break (mitigating false-Reject)

This reflects the skeptic note (the structural Accept-opposing gravity of 6 attackers vs 1 defender) and the user's "pass should be possible" requirement:

- **Split the burden of proof in two directions**:
  - _The burden of downgrading (MITIGATED/DEFENDED) lies with the strategist._ A downgrade is granted only when the defense is accompanied by a **verifiable deliverable** (an actually performed re-analysis, an external citation, or direct textual grounding). A mere defense _argument_ — a tactic of `sidestep`, or a `justification` without external grounding — **does not qualify for a downgrade**: it stays `CONTESTED` and is recorded as advisory in the qa-sheet only.
  - _The burden of confirming an UNRESOLVED finding lies with the attacker (Reviewer)._ However, if a Reviewer does not actively accept a finding that remains `CONTESTED` in R3, it is **conservatively finalized as UNRESOLVED** (preventing a false PASS, given the attacker's asymmetric access to source data).
- **Exception — fatal-flaw axes are strict**: `causal-reviewer` Temporality violations, `statistical-auditor` p-hacking + pre-registration mismatch / data leakage, and `integrity-auditor` data fabrication **remain critical unless the defense is clearly verifiable with external grounding** → blocking Accept. They cannot be downgraded by forced defense.

### 4.4 Significance Separation (advisory-only)

- `impact-assessor` produces an **impact rating** (`high|moderate|low|niche`), not a `severity`.
- **Low significance alone never triggers a Reject/Major and never raises the verdict to Minor or above** (a significance-only reject is unjust and dangerous — cf. ACL's Soundness/Excitement separation and PLOS ONE's soundness-only criterion).
- The result is reflected only in the _Significance & Scope_ section of `review-report.md` and in `qa-sheet.md`.

## 5. Deliverable Contracts

| File                         | Author                                   |
| ---------------------------- | ---------------------------------------- |
| `paper-profile.md`           | chair (P0)                               |
| `paper-normalized.md`        | chair (P0)                               |
| `findings/round-1-<axis>.md` | Reviewer / impact-assessor               |
| `rebuttal.md`                | rebuttal-strategist                      |
| `findings/round-3-<axis>.md` | Reviewer (re-review)                     |
| `review-report.md`           | chair (verdict + _Significance & Scope_) |
| `qa-sheet.md`                | chair (strategist synthesis)             |

### 5.1 Finding frontmatter (soundness Reviewer R1)

```yaml
---
round: 1
axis: argument | methodology | statistics | causality | bias | integrity
persona: <persona-id>
profile: <field profile>
findings:
  - id: <AXIS>-<n> # e.g. STAT-1, INTEG-2
    severity: critical | major | minor # anchored to the persona Severity rubric
    location: "§4¶2 L45-52" # paper-normalized.md coordinate (Evidence obligation)
    defect_class: <dedup key> # e.g. correlation-causation, sample-size
    claim: <what is the problem>
    evidence: <cited grounding; source when from external investigation>
    anticipated_question: <anticipated question>
    status: raised
reasoning_gaps: [<items lacking grounding>]
---
```

### 5.2 Impact assessment frontmatter (impact-assessor R1)

```yaml
---
round: 1
persona: impact-assessor
impact: high | moderate | low | niche # not severity — does not contribute to verdict
rationale: <grounding for influence & contribution>
scope_notes: [<generalization & applicability range>]
---
```

### 5.3 Rebuttal frontmatter (strategist R2)

```yaml
---
round: 2
persona: rebuttal-strategist
defenses:
  - finding_id: STAT-1
    question_type: good | bad | cringy
    tactic: revision | justification | clarification | sidestep | deferral
    defense: <point-by-point defense>
    solution: <example solution> | null # only when clear
    proposed_status: defended | mitigated | unresolved | withdrawn-proposed
external_refs: [<citations reinforcing the defense>]
---
```

### 5.4 Re-review frontmatter (Reviewer R3)

```yaml
---
round: 3
axis: <axis>
verdicts:
  - finding_id: STAT-1
    accept_defense: true | false
    withdrawn_confirmed: true | false | null # only when WITHDRAWN-PROPOSED
    final_status: defended | mitigated | unresolved | withdrawn
    note: <reason>
---
```

### 5.5 chair verdict frontmatter (review-report.md)

```yaml
---
verdict: accept | minor-revision | major-revision | reject # an Accept lacking external verification (=provisional) is the combination accept + external_verification:unavailable
soundness_tally: { critical: 0, major: 1, minor: 2 } # UNRESOLVED, after dedup
status_counts: { defended: 5, mitigated: 1, unresolved: 3, withdrawn: 1 }
impact: moderate # advisory — unrelated to verdict
override: none | fatal-flaw
external_verification: complete | unavailable | partial
panel: [<convened axes>]
profile: <field profile>
---
```

## 6. Team Operation (claude-code native)

chair = **main session = team lead** (the filid Phase D chair pattern).

1. After P0, `TeamCreate prawf-<paper-slug>`.
2. **R1**: spawn the convened soundness Reviewers + impact-assessor as `Task(team worker)` **in parallel** → each produces its deliverable. `await all`.
3. **R2**: spawn one `rebuttal-strategist` (input: R1 soundness findings) → `rebuttal.md`.
4. **R3 (conditional)**: re-spawn only the Reviewers of axes whose `proposed_status` is `unresolved|mitigated|withdrawn-proposed`.
   If all are `defended`, skip R3 and go straight to consensus.
5. chair: dedup → verdict → `review-report.md` + `qa-sheet.md` → `TeamDelete`.

**chair invariants**:

- The chair **never directly calls external search or measurement tools**. It synthesizes only by citing the attack/defense deliverables.
- Every verdict is traceable to _which finding-id on which axis_ it originated from.
- No yielding between rounds: chain spawn→await→next round as one flow.
- `--solo` is performed not by the chair but by a **separate `adjudicator` Task** (preserving the chair invariants). The adjudicator reflects only the soundness 1~6 axes in the verdict, scores impact separately as advisory, and dedups its own internal duplicates by `defect_class`.

## 7. Convergence & Termination Rules

- Standard flow: R1 → R2 → (R3) → consensus. **A single R3 pass is the default.**
- **The sole condition for entering an extra cycle**: only when, in R3, an original Reviewer surfaces a _new_ MITIGATED residual risk (absent from R1) in `findings/round-3-<axis>.md` is **one extra defense (R2) + re-review (R3)** allowed (R3 at most twice total). No other repetition — to prevent endless debate.
- **Inconclusive**: only when a soundness axis that is load-bearing for the verdict **abstains entirely** (it ultimately fails to obtain grounding to verify the core claim). This differs in _condition_ from filid's quorum-failure INCONCLUSIVE — do not confuse them.

## 8. Degradation — Absence of External Capability

When search/investigation capability is **entirely absent**, the dependent axes are starved:

| Axis                  | Impact when absent                              |
| --------------------- | ----------------------------------------------- |
| `causal-reviewer`     | prior work & reproduction consistency unverified |
| `statistical-auditor` | pre-registration comparison impossible          |
| `integrity-auditor`   | plagiarism / fabrication / COI comparison mostly impossible |
| `impact-assessor`     | trend & influence estimation weakened           |

- The affected finding/item is marked as a `reasoning_gap` (not an abandonment of the whole opinion).
- The chair records `external_verification: unavailable` in the frontmatter, and if it issues an Accept, marks it as **`provisional-accept` (provisional pass — external verification not performed)**. It still operates without tools but honestly surfaces the reduced confidence.

## 9. qa-sheet.md — The User's Core Deliverable

Separately from the review report, output an independent sheet of **the anticipated questions the author will receive and (where possible) their solutions**.

| finding-id | Axis         | Anticipated question     | Type | Defense/tactic | Solution                              | Final status |
| ---------- | ------------ | ------------------------ | ---- | -------------- | ------------------------------------- | ------------ |
| STAT-1     | statistics   | "What about multiple-comparison correction?" | good | justification  | Bonferroni re-analysis                | mitigated    |
| CAUS-2     | causality    | "Is reverse causation ruled out?" | good | deferral       | _(unresolved — longitudinal data needed)_ | unresolved   |
| INTEG-1    | integrity    | "What about data availability?" | good | clarification  | Add OSF link                          | defended     |

Fill the Solution column **only when clear**; when unclear, leave it honestly empty as _unresolved / elevated to a Limitation_.
Separately, append a _Significance & Scope_ note (impact rating + applicability range) at the end.
