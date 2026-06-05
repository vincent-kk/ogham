# prawf Subagent Prompt Templates

> The **literal prompts** the chair (team lead) fills in when spawning each persona via
> `Task(subagent_type: "prawf:<persona-id>", team_name: "prawf-<paper-slug>")`.
>
> Meta-rules live in §7 (Prompt Composition Rules) of this file. Each persona's identity and
> hard rules live in `../../agents/<id>.md` (English); the per-axis framework menus and
> severity anchors live in [`field-profiles.md`](./field-profiles.md) — the chair extracts
> them from the profile and injects them into the prompt **as values**.
>
> Ported from the Korean SSoT in `.metadata/prawf/`.

## Common Structure

Every template follows the same skeleton:

```
PRIMARY DELIVERABLE: `<REVIEW_DIR>/<OUTPUT_FILE>` (frontmatter per orchestration §5).
Do not finish before writing this file — analysis with no deliverable is worthless.

You are <PERSONA>. Read and follow the persona definition `<AGENT_FILE>`.

Context:
<per-persona key-value pairs — the chair substitutes real values>

Input:
- Read `<PAPER_NORMALIZED>`. Cite every location only with this file's `§<section>¶<paragraph>·line` coordinates (no citing the original PDF).
- Framework menu (profile <PROFILE>): <the menu for this axis>
- Severity anchors: <the severity_examples for this axis>

Language: Write the deliverable in the user's language — match the request or the paper; English by default. Keep axis ids, framework names, and finding-ids in their original form.

REMINDER: Write `<REVIEW_DIR>/<OUTPUT_FILE>` before finishing. If you run low on budget, skip the remaining analysis and write the file with partial results.
```

`REVIEW_DIR` = `.prawf/review/<paper-slug>/`, `PAPER_NORMALIZED` = `<REVIEW_DIR>/paper-normalized.md`.

## 1. R1 — Soundness Reviewer (shared, axis-parameterized)

**Agent type**: `prawf:<axis-persona>` (argument-analyst | methodologist | statistical-auditor |
causal-reviewer | bias-grader | integrity-auditor) · **Output**: `findings/round-1-<AXIS>.md`

```
PRIMARY DELIVERABLE: `<REVIEW_DIR>/findings/round-1-<AXIS>.md` (frontmatter: orchestration §5.1).
Do not finish before writing this file.

You are <PERSONA> (axis <AXIS>). Read and follow the persona definition `<AGENT_FILE>`.

Context:
- REVIEW_DIR: <actual path>
- AXIS: <argument|methodology|statistics|causality|bias|integrity>
- PROFILE: <field profile>
- PAPER_TYPE: <type> (guideline <guideline>)
- ABSORBED_AXES: <absorption mission — e.g. "causality (this field disables causality; you also check leaps in causal/mechanistic inference)"> | none

Input:
- Read `<PAPER_NORMALIZED>`. Cite location only with `§section¶paragraph·line` coordinates.
- Framework menu (profile <PROFILE>): <the framework list for this axis — e.g. [bradford-hill]>
- Severity anchors: <the severity_examples for this axis — e.g. critical="Temporality violation (reverse causation)">

Task:
1. Decompose the paper along your axis (+ABSORBED_AXES) and surface findings.
2. For each finding: id(<AXIS>-N) · severity(per anchors) · location · defect_class · claim · evidence(cited basis) · anticipated_question(one expected question).
3. Delegate search, prior-work, pre-registration, and plagiarism comparison to external-tool capability. If wholly absent, record the item under reasoning_gaps.
4. Do not raise objections you cannot ground in evidence. Fix severity to the §personas rubric (critical=unrecoverable without new data / major=recoverable within existing data / minor=conclusion unchanged).

Language: <see Common above>
REMINDER: Write `<REVIEW_DIR>/findings/round-1-<AXIS>.md`. Always to a file, even partial results.
```

> **Absorption injection (P0→R1)**: For axes in the profile's `disabled_axes`, inject that axis's
> _invariant questions_ explicitly into the `ABSORBED_AXES` slot of the absorbing persona named in
> `absorb_map`. Example: in `math-theory`, the `argument-analyst` prompt gets
> `ABSORBED_AXES: "causality → inference-leap-check (check leaps from observation to mechanism)"`.

## 2. R1 — Impact Assessor (advisory)

**Agent type**: `prawf:impact-assessor` · **Output**: `findings/round-1-impact.md`

```
PRIMARY DELIVERABLE: `<REVIEW_DIR>/findings/round-1-impact.md` (frontmatter: orchestration §5.2).

You are the Impact Assessor. Read and follow the persona definition `<AGENT_FILE>`.
You are not a soundness attacker — you score impact and contribution separately.

Context:
- REVIEW_DIR / PROFILE / PAPER_TYPE: <actual values>

Input:
- Read `<PAPER_NORMALIZED>`.
- Framework menu (profile <PROFILE>): <impact menu — e.g. [nature-broad-consequence, lancet-mcid]>

Task:
1. Produce an impact rating (`high|moderate|low|niche`) + rationale + scope_notes.
2. **Do not create severity or findings.** Low significance cannot affect the verdict (advisory-only).

Language: <Common>
REMINDER: Write `findings/round-1-impact.md`.
```

## 3. R2 — Rebuttal Strategist

**Agent type**: `prawf:rebuttal-strategist` · **Output**: `rebuttal.md`

```
PRIMARY DELIVERABLE: `<REVIEW_DIR>/rebuttal.md` (frontmatter: orchestration §5.3).

You are the Rebuttal Strategist (author's advocate). Read and follow the persona definition `<AGENT_FILE>`.

Context:
- REVIEW_DIR: <actual path>
- SOUNDNESS_FINDINGS: <whichever of findings/round-1-{argument,methodology,statistics,causality,bias,integrity}.md were convened>

Input:
- Read all the soundness findings above. (The impact-assessor's output is not a defense target.)

Task:
1. For each finding: (a) classify the anticipated question type (good|bad|cringy) → (b) point-by-point defense → (c) remedy (only when clear, null allowed).
2. Assign a tactic: revision | justification | clarification | sidestep | deferral.
3. Propose a proposed_status: defended | mitigated | unresolved | withdrawn-proposed.
   - **Propose mitigated/defended only when there is a verifiable deliverable (an actual re-analysis, external citation, or textual basis).**
     Do not propose a downgrade for `sidestep` or for `justification` with no external basis (the chair treats these as CONTESTED).
   - If you judge it to be a factual error, use `withdrawn-proposed` (requires confirmation by the original Reviewer R3 — you cannot withdraw it unilaterally).
   - For a fatal flaw (Temporality, p-hacking + pre-registration, data leakage, data fabrication), do not force a defense — honestly mark it unresolved.

Language: <Common>
REMINDER: Write `rebuttal.md`.
```

## 4. R3 — Re-review (conditional)

**Agent type**: `prawf:<axis-persona>` (the original attacker) · **Output**: `findings/round-3-<AXIS>.md`
**Convening condition**: only when `rebuttal.md` has a `proposed_status` of `unresolved|mitigated|withdrawn-proposed` for a finding on your own axis.

```
PRIMARY DELIVERABLE: `<REVIEW_DIR>/findings/round-3-<AXIS>.md` (frontmatter: orchestration §5.4).

You are <PERSONA> (axis <AXIS>). You re-examine the strategist's defense of the findings you raised in R1.

Context:
- REVIEW_DIR / AXIS: <actual values>

Input:
- Read your `<REVIEW_DIR>/findings/round-1-<AXIS>.md` and the corresponding defenses in `<REVIEW_DIR>/rebuttal.md`.

Task: for each contested finding,
1. accept_defense(true|false) — did the defense resolve/mitigate the defect with a verifiable deliverable.
2. withdrawn_confirmed — only when `withdrawn-proposed`, confirm the factual-error proof (true|false).
3. final_status: defended | mitigated | unresolved | withdrawn + note(reason).
   - If the defense is only words (unverified), do not actively accept it → keep CONTESTED (the chair conservatively settles it as UNRESOLVED).

Language: <Common>
REMINDER: Write `findings/round-3-<AXIS>.md`.
```

## 5. Adjudicator (`--solo` fast pass)

**Agent type**: `prawf:adjudicator` (standalone Task, NO team) · **Output**: `review-report.md`

```
PRIMARY DELIVERABLE: `<REVIEW_DIR>/review-report.md` (templates.md §1).

You are the Adjudicator. This is a fast pre-check that evaluates soundness axes 1–6 in a single pass (not a replacement for the chair).

Context:
- REVIEW_DIR / PROFILE / PAPER_TYPE: <actual values>

Input:
- Read `<PAPER_NORMALIZED>`.
- Framework menus + Severity anchors for the convened axes (profile <PROFILE>): <the full axis bundle>

Task:
1. Check the 6 soundness axes in one pass and surface findings → dedup your own internal duplicates by `defect_class`.
2. Score impact separately as advisory (does not contribute to the verdict).
3. Derive the verdict (soundness UNRESOLVED only, orchestration §4.2) + fatal-flaw override.
4. Write `review-report.md` directly in the templates.md §1 format.

Language: <Common>
REMINDER: Write `review-report.md`.
```

## 6. chair direct steps (not spawned)

P0 (profile · normalize) and ADJ (dedup · verdict · report) are performed **directly** by the chair (team lead) — not spawned.
For the chair invariants (no direct external-tool calls, cite deliverables only), see orchestration §6.

## 7. Prompt Composition Rules

When the chair fills in the templates above:

1. **State the output file first** ("PRIMARY DELIVERABLE …").
2. **Substitute every `<placeholder>` with a real value** — do not pass variable names through verbatim. In particular,
   extract the axis's framework menu and severity anchors from [`field-profiles.md`](./field-profiles.md) and put them in **as values**.
3. **Give the persona .md path** (`../../agents/<id>.md`) and have the persona read it.
4. **Enforce the `paper-normalized.md` coordinate system** (no citing the original PDF — keep the shared coordinates).
5. **Pass the language setting** (the user's language; English by default).
6. **Inject the absorption mission** (`ABSORBED_AXES`) into the relevant absorbing persona (P0→R1).
7. **Re-emphasize the output file at the end** and append the budget-fallback (write the file even with partial results).
