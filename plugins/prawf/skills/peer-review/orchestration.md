# prawf Orchestration

> Specifies how the nine personas defined in `../../agents/` are operated as a
> Claude Code native team: the **round flow, state machine, and deliverable
> contracts**.
>
> Execution environment: **inside a claude-code session**. Every round runs as a
> native Team (`TeamCreate`/`Task`/`SendMessage`); external LLM and search calls
> are delegated by personas only as capabilities. Field expertise is injected as
> data by the [field profiles](./field-profiles.md). This is a pure-markdown
> plugin with no dependence on external servers or hooks — all review behavior
> happens inside the session.

## 1. The prawf Review Model

| Aspect               | prawf                                                                                                                                                                      |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Persona relationship | **Vertical** attack (6) → defense (1) → adjudication (1), plus a separate significance assessment (1)                                                                      |
| Unit of consensus    | **Survival of each individual finding**                                                                                                                                    |
| Core mechanism       | finding state transitions + chair synthesis                                                                                                                                |
| Verdict input        | **Only UNRESOLVED findings on the 6 soundness axes at or above the gate (default `major`, see §4.5) drive the verdict; below-gate findings and significance are advisory** |
| Final verdict        | Accept / Minor / Major / Reject                                                                                                                                            |

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

0. **Resolve `WORKDIR`** per [`[OP: resolve_workdir]`](../_shared/operations/resolve_workdir.md): `--workdir` > `PRAWF_WORKDIR` > `./.prawf`. All deliverables go under `REVIEW_DIR = <WORKDIR>/review/<paper-slug>/`.
1. **Detect type & field** → load a [field profile](./field-profiles.md). Priority: `--profile` override (a built-in or a user-authored `<WORKDIR>/profiles/<name>.yaml` custom profile) > P0 auto-detection of a built-in (default) > universal fallback. A custom yaml is selected only by naming it with `--profile`; it is never auto-detected (see [field-profiles §5](./field-profiles.md)).
2. **Validate the profile**: confirm the loaded profile's minimum schema (required keys, axis-reference consistency, presence of `severity_examples`).
   **The mandatory soundness axes (argument, methodology, integrity) cannot be turned off via `disabled_axes`** — only statistics, causality, and bias may be conditionally disabled, and only when accompanied by an `absorb_map`. A profile that violates this is rejected and the universal fallback is used instead.
3. **Normalize input**: convert PDF/LaTeX/markdown input into **`paper-normalized.md`** (a normalized snapshot to which the chair assigns line numbers).
   Every Reviewer cites the **`§<section>¶<paragraph>` and line numbers of this snapshot**, not the original — this establishes a shared coordinate system.
4. **Record the gate**: parse `--gate <critical|major|minor>` (default **`major`**) — the lowest severity that can block acceptance (see §4.5) — and record it in `paper-profile.md`. ADJ and the solo `adjudicator` read it from there / from the spawn prompt.
5. Output: `paper-profile.md` (input source path, type, profile, convened panel, gate) + `paper-normalized.md`.

### Panel Convocation (elected from the nine)

| Scale      | soundness attack axes                           | significance     | Notes                   |
| ---------- | ----------------------------------------------- | ---------------- | ----------------------- |
| `LIGHT`    | argument + 1 core axis                          | impact(advisory) | abstract / single issue |
| `STANDARD` | 3~4 axes                                        | impact           | general paper           |
| `FULL`     | all 6 axes                                      | impact           | rigorous review (all 9) |
| `--solo`   | `adjudicator` consolidates 1~6 axes in one pass | —                | fast pre-screen         |

- `argument-analyst`, `chair`, and `rebuttal-strategist` are **always convened**, regardless of field.
- **Convened axes = the profile's `paper_types[type].axes`**. If the profile specifies `disabled_axes` (e.g. causality for mathematics), that axis is _not deleted_ but transferred to the absorber that the profile's `absorb_map` (e.g. `{ causality: argument }`) designates.
  **In P0 the chair injects the invariant questions of the disabled axis directly into the absorber persona's R1 prompt** — closing the coverage gap by behavior, not by declaration (the absorption must also be reflected in the absorber's profile menu).
- `integrity-auditor`, when convened, runs regardless of external-tool availability; on entire absence its capability-dependent checks degrade to `reasoning_gaps` (see §8) and the axis is never dropped for lack of tools.

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
- **Below-gate shortcut (gate, §4.5)**: a below-gate finding reclassified `CONTESTED` by the §4.3 downgrade check is finalized `UNRESOLVED` directly by the chair — no R3 is convened for it (§6 step 4); the chair records the reclassification in the review-report Deliberation Log.

## 4. Adjudication — dedup → verdict (chair)

### 4.1 Dedup & Ownership

When convened axes overlap and report the same defect twice, the verdict tally is inflated. The chair merges them:

- **Merge key**: `canonical-location + defect-class`. On collision, **merge into one, keep the highest severity, and record all contributing axes** (multi-axis agreement is a _signal_, not a weight).
- **Ownership table** (the primary owner holds it; the rest yield):

  | Defect class                                         | Owning axis                                     |
  | ---------------------------------------------------- | ----------------------------------------------- |
  | correlation ↔ causation confusion                    | `causal-reviewer` (argument yields)             |
  | sample size, power, multiple comparisons             | `statistical-auditor` (methodology, bias yield) |
  | publication bias, external validity, reproducibility | `bias-grader` (statistical, methodology yield)  |
  | plagiarism, data fabrication, conflict of interest   | `integrity-auditor`                             |

- **Absorbed owner**: when an owning axis is disabled and absorbed under the active profile (e.g. `causal-reviewer` or `bias-grader` under `math-theory`), its ownership passes to the absorbing axis named in the profile's `absorb_map` (causality→`argument-analyst`, bias→`methodologist`). If no absorber is convened, the highest-severity contributing axis present holds the merged finding.

### 4.2 Verdict Derivation

Tally **only the UNRESOLVED findings on the 6 soundness axes at or above the gate** (default gate: `major` — see §4.5; `impact-assessor` is excluded — see §4.4).

| Condition (UNRESOLVED, soundness axes, at/above gate)             | Verdict            |
| ----------------------------------------------------------------- | ------------------ |
| `critical` ≥ 1                                                    | **Reject**         |
| `major` ≥ 1 (when gate ≤ major)                                   | **Major Revision** |
| no UNRESOLVED at/above gate, but ≥ 1 MITIGATED at/above gate      | **Minor Revision** |
| `minor` UNRESOLVED ≥ 1 and gate = minor                           | **Minor Revision** |
| no UNRESOLVED at/above gate (below-gate advisory items may exist) | **Accept (PASS)**  |

- An Accept with a non-empty advisory list is presented as **Accept (with notes)** in the report header/body; the frontmatter and the terminal marker stay `accept` (see §4.5).
- **PASS justification**: even an Accept must state, on an evidence basis, that "the 6 soundness axes have **0 unresolved findings at or above the gate**; the residual advisory items are completeness/reporting notes that do not change the conclusion."
- Below-gate UNRESOLVED findings go to the **Advisory Notes** section of `review-report.md` (and remain in the Findings by Axis audit table and in `qa-sheet.md`).

### 4.3 Burden of Proof & Tie-break (mitigating false-Reject)

This reflects the skeptic note (the structural Accept-opposing gravity of 6 attackers vs 1 defender) and the user's "pass should be possible" requirement:

- **Split the burden of proof in two directions**:
  - _The burden of downgrading (MITIGATED/DEFENDED) lies with the strategist._ A downgrade is granted only when the defense is accompanied by a **verifiable deliverable** (an actually performed re-analysis, an external citation, or direct textual grounding). A mere defense _argument_ — a tactic of `sidestep`, or a `justification` without external grounding — **does not qualify for a downgrade**: the finding is reclassified `CONTESTED` (and, when at/above the gate, proceeds to R3 — §6 step 4); the defense argument itself is recorded in the qa-sheet for oral-defense reference only.
  - _The burden of confirming an UNRESOLVED finding lies with the attacker (Reviewer)._ However, if a Reviewer does not actively accept a finding that remains `CONTESTED` in R3, it is **conservatively finalized as UNRESOLVED** (preventing a false PASS, given the attacker's asymmetric access to source data).
- **Exception — fatal-flaw axes are strict**: `causal-reviewer` Temporality violations, `statistical-auditor` p-hacking + pre-registration mismatch / data leakage, and `integrity-auditor` data fabrication **remain critical unless the defense is clearly verifiable with external grounding** → blocking Accept. They cannot be downgraded by forced defense. The fatal-flaw override is **gate-independent**: these classes stay `critical` (→ Reject) at ANY gate — raising the gate never unblocks a fatal flaw.

### 4.4 Significance Separation (advisory-only)

- `impact-assessor` produces an **impact rating** (`high|moderate|low|niche`), not a `severity`.
- **Low significance alone never triggers a Reject/Major and never raises the verdict to Minor or above** (a significance-only reject is unjust and dangerous — cf. ACL's Soundness/Excitement separation and PLOS ONE's soundness-only criterion).
- The result is reflected only in the _Significance & Scope_ section of `review-report.md` and in `qa-sheet.md`.

### 4.5 Gate & Advisory

The **gate** is the lowest severity that can block acceptance: `--gate <critical|major|minor>` on `/prawf:peer-review`, default **`major`**. It is parsed in P0 and recorded in `paper-profile.md`; ADJ and the solo `adjudicator` read it from there / from the spawn prompt.

- **Only UNRESOLVED soundness findings at or above the gate drive the verdict** (§4.2). UNRESOLVED findings **below the gate** are **advisory**: reported, never blocking.
- `--gate minor` restores the strict legacy behavior (minors block → Minor Revision). `--gate critical` is a screening mode (majors become advisory; the report must flag below-gate major/critical advisory items prominently at the top of Advisory Notes).
- **Advisory-ness is NOT a status** — no new status value is introduced; advisory-ness is a property computed at adjudication time: `severity < gate ∧ status = unresolved`. The one gate-induced transition change is the chair-direct below-gate §4.3 finalization documented in §3 and §6 step 4.
- **Accept (with notes)**: the combination `verdict: accept` + non-empty below-gate advisory items — following the existing provisional-accept pattern (`accept` + `external_verification: unavailable`, §8). The verdict enum gains no new value, and the terminal marker stays `prawf verdict: accept`.
- Below-gate UNRESOLVED findings go to the **Advisory Notes** section of `review-report.md` — a filtered view, not a replacement. The Findings by Axis table remains the complete deduped audit trail (all findings incl. advisory, with their real final statuses), which keeps `/prawf:auto-fix` and `/prawf:rebuttal` working unchanged. Advisory items also remain in `qa-sheet.md` (§9).
- **Fatal flaws are gate-independent** (§4.3): raising the gate never unblocks a fatal flaw.

## 5. Deliverable Contracts

All paths are relative to `REVIEW_DIR = <WORKDIR>/review/<paper-slug>/` (resolved in P0 via [`[OP: resolve_workdir]`](../_shared/operations/resolve_workdir.md)).

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
findings: # [] is VALID — see the null-result protocol below; at most 5 per axis (top-K by consequence)
  - id: <AXIS>-<n> # e.g. STAT-1, INTEG-2
    severity: critical | major | minor # anchored to the persona Severity rubric
    location: "§4¶2 L45-52" # paper-normalized.md coordinate (Evidence obligation)
    defect_class: <dedup key> # e.g. correlation-causation, sample-size
    claim: <what is the problem>
    evidence: <cited grounding; source when from external investigation>
    consequence: <which claim/conclusion breaks if this stands — REQUIRED; no concrete consequence → at most minor>
    anticipated_question: <anticipated question>
    status: raised
null_result: "no findings at or above gate" # only when findings is empty / below-gate only
overflow_note: "<N> additional below-gate candidates omitted: <defect-class list>" # optional, cap surplus
reasoning_gaps: [<items lacking grounding>]
---
```

**R1 discipline** (binding for every soundness Reviewer):

- **Null-result protocol** — A null result is a valid success state. If a rigorous sweep of your axis surfaces no evidence-grounded findings at or above the gate, say exactly that: write your deliverable with an empty findings list (`findings: []`) — or only below-gate advisory findings — plus `null_result: "no findings at or above gate"`. An empty findings file from a rigorous sweep is a SUCCESS, not a failure. NEVER manufacture, inflate, or pad findings to fill the file — a fabricated finding is itself an integrity defect. Finding count is not a measure of review quality; calibration is.
- **Per-axis cap** — Report at most **5 findings per axis**, ranked by consequence. `critical`/`major` candidates are NEVER displaced by the cap (in the rare case of more than 5, report them all). Fold surplus below-gate candidates into the single frontmatter field `overflow_note` (count + defect classes) — never into extra findings.

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
verdict: accept | minor-revision | major-revision | reject # enum unchanged — an Accept lacking external verification (=provisional) is the combination accept + external_verification:unavailable; "accept (with notes)" is the combination accept + non-empty below-gate advisory (§4.5)
gate: critical | major | minor # active blocking threshold (--gate; default major), recorded in paper-profile.md at P0
soundness_tally: { critical: 0, major: 1, minor: 2 } # UNRESOLVED, after dedup; only severities at/above gate drive the verdict — the rest are advisory
status_counts: { defended: 5, mitigated: 1, unresolved: 3, withdrawn: 1 }
impact: moderate # advisory — unrelated to verdict
override: none | fatal-flaw
external_verification: complete | unavailable | partial
panel: [<convened axes>]
profile: <field profile>
---
```

## 6. Team Operation (claude-code native)

chair = **main session = team lead** (the chair orchestrates the rounds; it is never spawned as a worker).

1. After P0, `TeamCreate prawf-<paper-slug>`.
2. **R1**: spawn the convened soundness Reviewers + impact-assessor as `Task(team worker)` **in parallel** → each produces its deliverable. `await all`.
3. **R2**: spawn one `rebuttal-strategist` (input: R1 soundness findings) → `rebuttal.md`.
4. **R3 (conditional)**: first apply the §4.3 downgrade check — a finding whose `proposed_status` is `defended`/`mitigated` but whose defense rests only on a `sidestep` or an unbacked `justification` is reclassified `contested`. Then re-spawn only the Reviewers of axes with a finding **at or above the gate** whose status is `unresolved|mitigated|withdrawn-proposed|contested`. Below-gate findings keep their R2 `proposed_status` as final — except one caught by the §4.3 downgrade check (a `sidestep` or an unbacked `justification`), which the chair finalizes as `unresolved` without convening R3 (recording the reclassification in the review-report Deliberation Log), so the audit trail never records an unverified `defended`. They cannot affect the verdict (they remain visible in the report and the qa-sheet).
   If every at/above-gate finding is a verifiably-backed `defended` (or none exists), skip R3 and go straight to consensus.
5. chair: dedup → verdict → `review-report.md` + `qa-sheet.md` → `TeamDelete`.

**chair invariants**:

- The chair **never directly calls external search or measurement tools**. It synthesizes only by citing the attack/defense deliverables.
- Every verdict is traceable to _which finding-id on which axis_ it originated from.
- No yielding between rounds: chain spawn→await→next round as one flow.
- `--solo` is performed not by the chair but by a **separate `adjudicator` Task** (preserving the chair invariants). The adjudicator reflects only the soundness 1~6 axes in the verdict, scores impact separately as advisory, and dedups its own internal duplicates by `defect_class`.

## 7. Convergence & Termination Rules

- Standard flow: R1 → R2 → (R3) → consensus. **A single R3 pass is the default.**
- **The sole condition for entering an extra cycle**: only when, in R3, an original Reviewer surfaces a _new_ MITIGATED residual risk (absent from R1) in `findings/round-3-<axis>.md` is **one extra defense (R2) + re-review (R3)** allowed (R3 at most twice total). No other repetition — to prevent endless debate.
- **Inconclusive**: only when a soundness axis that is load-bearing for the verdict **abstains entirely** (it ultimately fails to obtain grounding to verify the core claim). This is distinct from a no-finding Accept: Inconclusive means the verdict could not be established at all, not that the paper passed.

## 8. Degradation — Absence of External Capability

When search/investigation capability is **entirely absent**, the dependent axes are starved:

| Axis                  | Impact when absent                                          |
| --------------------- | ----------------------------------------------------------- |
| `causal-reviewer`     | prior work & reproduction consistency unverified            |
| `statistical-auditor` | pre-registration comparison impossible                      |
| `integrity-auditor`   | plagiarism / fabrication / COI comparison mostly impossible |
| `impact-assessor`     | trend & influence estimation weakened                       |

- The affected finding/item is marked as a `reasoning_gap` (not an abandonment of the whole opinion).
- The chair records `external_verification: unavailable` in the frontmatter, and if it issues an Accept, marks it as **`provisional-accept` (provisional pass — external verification not performed)**. It still operates without tools but honestly surfaces the reduced confidence.

## 9. qa-sheet.md — The User's Core Deliverable

Separately from the review report, output an independent sheet of **the anticipated questions the author will receive and (where possible) their solutions**.

| finding-id | Axis       | Anticipated question                         | Type | Defense/tactic | Solution                                  | Final status |
| ---------- | ---------- | -------------------------------------------- | ---- | -------------- | ----------------------------------------- | ------------ |
| STAT-1     | statistics | "What about multiple-comparison correction?" | good | justification  | Bonferroni re-analysis                    | mitigated    |
| CAUS-2     | causality  | "Is reverse causation ruled out?"            | good | deferral       | _(unresolved — longitudinal data needed)_ | unresolved   |
| INTEG-1    | integrity  | "What about data availability?"              | good | clarification  | Add OSF link                              | defended     |

Fill the Solution column **only when clear**; when unclear, leave it honestly empty as _unresolved / elevated to a Limitation_.
Below-gate advisory findings (§4.5) still appear in the qa-sheet with their real final statuses — being excluded from the verdict does not remove them from the author's question sheet.
Separately, append a _Significance & Scope_ note (impact rating + applicability range) at the end.
