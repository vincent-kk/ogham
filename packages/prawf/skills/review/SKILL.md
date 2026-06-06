---
name: review
user_invocable: true
description: "[prawf:review] Run multi-agent academic peer review. The chair profiles and normalizes the paper, then convenes a native Claude Code team: six soundness reviewers attack across axes, the rebuttal-strategist defends, original reviewers re-review, and the chair adjudicates a verdict (Accept / Minor / Major / Reject) plus an anticipated-question sheet. Triggers: 동료평가, peer review, 논문 평가, paper review, soundness review."
argument-hint: "[--solo] [--profile <name>] [--scope abstract|full] [--workdir <dir>]"
version: "1.0.0"
complexity: complex
plugin: prawf
---

> **EXECUTION MODEL (Tier-2a Anti-Yield)**: Execute the whole pipeline as a
> SINGLE CONTINUOUS OPERATION. After each round completes, IMMEDIATELY chain
> the next tool call in the same response. NEVER yield the turn after team
> worker results return, after `Task` subagents return, or after team
> messages arrive. Round findings and rebuttal files are internal working
> data — do NOT summarize them to the user mid-pipeline.
>
> **Valid reasons to yield**:
>
> 1. A user decision is genuinely required (unrecoverable input error only —
>    e.g. no paper was provided).
> 2. Terminal marker emitted: `prawf verdict: <accept|minor-revision|major-revision|reject>`
>    — emitted only after `review-report.md` is written (plus `qa-sheet.md` in
>    team mode) and any review team has been deleted. The `--solo` path produces
>    only `review-report.md` and creates no team.
>
> **HIGH-RISK YIELD POINTS** (strengthen vigilance here):
>
> 1. After `TeamCreate` + R1 worker spawns return → chain R1 monitoring and
>    then R2 immediately; do not pause between spawn and await.
> 2. After R1 `await all` → chain R2 (`rebuttal-strategist`) without yielding.
> 3. After R2 returns → parse `rebuttal.md` `proposed_status` and decide R3 in
>    the same response.
> 4. Between rounds → never narrate progress and stop; spawn the next round.
> 5. After R3 `await all` (or the R3 skip when every finding is `defended`) →
>    chain ADJ as a direct chair operation: dedup → verdict → write reports →
>    `TeamDelete` → terminal marker, all in the same response.

# review — Multi-Agent Academic Peer Review

You are the **chair / handling editor** (see `../../agents/chair.md`). You run
the journal review → rebuttal → re-review cycle as the team lead: you convene
the panel, spawn the persona agents as team workers, and adjudicate the verdict
yourself. You NEVER call external-search or measurement tools directly — you
synthesize the attack and defense deliverables only.

> **References** (resolve via `${CLAUDE_PLUGIN_ROOT}/skills/review/<file>`, fallback `Glob`):
>
> - `orchestration.md` — pipeline, finding state machine, dedup + verdict rules, deliverable contracts
> - `field-profiles.md` — profile schema, injection priority, universal fallback
> - `profiles/<name>.yaml` — built-in field-profile data (empirical-science, cs-ml, math-theory, humanities-qualitative)
> - `templates.md` — `review-report.md` / `qa-sheet.md` / `rebuttal.md` output formats
> - `prompt-templates.md` — literal spawn-prompt templates per persona
> - `../_shared/operations/resolve_workdir.md` — WORKDIR / REVIEW_DIR resolution (shared by all skills)
> - `../../agents/<persona-id>.md` — the 10 persona agents

## When to Use

- Pre-submission self-review of an academic paper across soundness axes.
- Generating anticipated reviewer questions and (where clear) solutions.
- Producing a defensible Accept / Minor / Major / Reject verdict with traceable findings.

## Core Workflow

### Step 1 — P0: Profile & Normalize (chair, direct)

First, **resolve `WORKDIR`** per [`[OP: resolve_workdir]`](../_shared/operations/resolve_workdir.md)
(`--workdir` > `PRAWF_WORKDIR` > `./.prawf`); every deliverable below lands under
`REVIEW_DIR = <WORKDIR>/review/<paper-slug>/`.

1. Read the paper (PDF / LaTeX / markdown). If no paper is provided, this is the
   one valid place to ask the user.
2. **Detect type & field** and load the field profile. Priority:
   `--profile` override (a built-in or a custom `<WORKDIR>/profiles/<name>.yaml`) >
   **P0 auto-detection of a built-in (default)** > universal fallback. A custom yaml is
   reached only via `--profile`, never auto-detected. Read `field-profiles.md` for the
   schema and the four built-ins under `profiles/`.
3. **Validate the profile**: required keys, axis-ref integrity, `severity_examples`
   present. `argument`, `methodology`, `integrity` can NEVER be disabled; only
   `statistics`/`causality`/`bias` may be disabled when an `absorb_map` is supplied.
   Reject a non-conforming profile and fall back to the universal menu. When unsure
   of the field, prefer the universal fallback over a wrong specialization.
4. **Normalize** the input into `paper-normalized.md` — a chair-numbered snapshot
   with `§<section>¶<paragraph>` + line coordinates. Every persona cites THIS file,
   never the original PDF. Write `paper-profile.md` (input source path, type,
   profile, convened panel, `absorb_map` applied).
5. **Convene the panel** from the profile's `paper_types` axes:
   - `LIGHT` (abstract / single issue) → `argument` + one core axis + impact.
   - `STANDARD` (typical paper) → 3-4 axes + impact.
   - `FULL` (rigorous, all nine) → all six soundness axes + impact.
   - `--solo` → skip the team; go to the Solo branch in Step 2.
     `argument-analyst`, `chair`, `rebuttal-strategist` are always convened. For any
     disabled axis, inject its invariant question into the absorbing persona's R1
     prompt (`ABSORBED_AXES`).

**→ Immediately proceed to Step 2.**

### Step 2 — R1: Attack (team, parallel)

**Solo branch (`--solo`, or an auto-detected TRIVIAL paper)**: spawn `adjudicator`
as a standalone `Task` (NO team) with the prompt from `prompt-templates.md` §5. It
writes `review-report.md` directly — the chair's ADJ block (dedup, `qa-sheet.md`,
`TeamDelete`) is skipped, and `--solo` produces no `qa-sheet.md`. Emit the terminal
marker `prawf verdict: <verdict>` once `review-report.md` exists, then stop.

**Team branch**: `TeamCreate prawf-<paper-slug>`. Spawn every convened soundness
reviewer plus `impact-assessor` as **parallel** team workers
(`Task(subagent_type: "prawf:<persona-id>", team_name: ...)`), using the literal
templates in `prompt-templates.md` §1-2. Substitute concrete values for every
`<placeholder>` — extract each axis's framework menu and `severity_examples` from
the profile and inject them as values. **Await all** R1 workers. Each writes
`findings/round-1-<axis>.md` (impact writes `findings/round-1-impact.md`).

**→ After R1 `await all`, immediately proceed to Step 3.**

### Step 3 — R2: Defense (strategist)

Spawn `rebuttal-strategist` (one worker) with the convened soundness
`findings/round-1-<axis>.md` files as input (NOT the impact file), per
`prompt-templates.md` §3. It writes `rebuttal.md` with per-finding `tactic`,
`question_type`, and `proposed_status`. A downgrade (`mitigated`/`defended`) is only
proposed when backed by a verifiable artifact.

**→ After `rebuttal.md` is written, parse `proposed_status` and proceed to Step 4.**

### Step 4 — R3: Re-review (conditional, parallel)

First, apply the `orchestration.md` §4.3 downgrade check: a `defended`/`mitigated`
proposal whose defense rests only on a `sidestep` or an unbacked `justification` is
reclassified `contested`. Then re-spawn ONLY the original reviewers whose axis has a
finding with status in `{unresolved, mitigated, withdrawn-proposed, contested}`, per
`prompt-templates.md` §4. They write `findings/round-3-<axis>.md` with
`accept_defense`, `withdrawn_confirmed`, and `final_status`. If every finding is a
verifiably-backed `defended`, **skip R3**. A finding left `contested` and not actively
accepted in R3 is conservatively confirmed `unresolved`. R3 is a single pass; allow at
most one extra defense+re-review cycle only when an original reviewer surfaces a
genuinely new MITIGATED residual risk in `findings/round-3-<axis>.md` (see
`orchestration.md` §7).

**→ After R3 (or skip), immediately proceed to Step 5.**

### Step 5 — ADJ: Adjudicate (chair, direct)

1. **Dedup** findings by `canonical-location + defect-class` (merge into one, keep
   the highest severity, record all contributing axes; use the ownership table in
   `orchestration.md` §4.1).
2. **Derive the verdict** from UNRESOLVED **soundness** findings only (impact is
   excluded): `critical ≥ 1` → reject; `major ≥ 1` → major-revision; all majors
   MITIGATED and no critical/major UNRESOLVED → minor-revision; only minor
   UNRESOLVED → minor-revision; none UNRESOLVED → accept (PASS). Apply the
   fatal-flaw override (Temporality, p-hacking + preregistration mismatch, data
   leakage, data fabrication stay critical unless verifiably defended).
3. Record `external_verification`; when `unavailable`, label an Accept a
   **provisional-accept**.
4. Read `templates.md`, then write `review-report.md` (verdict + Significance &
   Scope) and `qa-sheet.md` (anticipated questions + solutions). `TeamDelete` the
   review team.
5. Emit the terminal marker `prawf verdict: <verdict>`.

**After `review-report.md` + `qa-sheet.md` exist and the team is deleted,
execution is COMPLETE.**

## Options

> Options are LLM-interpreted hints, not strict flags. Natural language works too
> ("review just the abstract", "treat this as a CS/ML paper").

| Option             | Default    | Description                                                                                        |
| ------------------ | ---------- | -------------------------------------------------------------------------------------------------- |
| `--solo`           | off        | Single-pass `adjudicator` (6 soundness axes, one Task, no team)                                    |
| `--profile <name>` | auto       | Override field profile (`empirical-science`/`cs-ml`/`math-theory`/`humanities-qualitative`/custom) |
| `--scope`          | `full`     | `abstract` → LIGHT panel; `full` → STANDARD/FULL per profile                                       |
| `--workdir <dir>`  | `./.prawf` | Output root (or `PRAWF_WORKDIR` env); `REVIEW_DIR = <WORKDIR>/review/<paper-slug>/`                |

## Quick Reference

```
/prawf:review                              # auto-detect profile, full team review
/prawf:review --solo                       # fast single-pass adjudicator
/prawf:review --profile cs-ml              # force the CS/ML profile
/prawf:review --scope abstract             # LIGHT panel (abstract / single issue)
/prawf:review --workdir ~/reviews/.prawf   # fix the output root (or set PRAWF_WORKDIR)

Pipeline:  P0 (profile+normalize) → R1 (attack, parallel) → R2 (defense)
           → R3 (re-review, conditional) → ADJ (dedup+verdict)
Panel:     LIGHT / STANDARD / FULL (9 personas) or --solo (adjudicator)
Outputs:   under REVIEW_DIR = <WORKDIR>/review/<paper-slug>/ —
           paper-profile.md, paper-normalized.md, findings/round-1-<axis>.md,
           rebuttal.md, findings/round-3-<axis>.md, review-report.md, qa-sheet.md
           (qa-sheet.md in team mode only; --solo writes review-report.md alone)
Verdict:   accept | minor-revision | major-revision | reject (soundness-only;
           impact is advisory and never raises the verdict above minor-revision)
```
