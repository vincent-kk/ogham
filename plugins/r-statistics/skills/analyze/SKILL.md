---
name: analyze
user_invocable: true
description: '[r-statistics:analyze] Orchestrate a full statistical analysis from data + hypothesis to verified results and reproducible R: classify intent, select a method, gate assumptions, execute via R, validate, and report. Trigger: "analyze this data", "run a hypothesis test", "is this difference significant", "이 데이터 분석해줘", "가설검정 해줘"'
argument-hint: '[--auto] [--data PATH] [--question "..."]'
version: "1.0.0"
complexity: complex
plugin: r-statistics
---

> **EXECUTION MODEL (Tier-2a Anti-Yield)**: Run the pipeline as a SINGLE
> CONTINUOUS OPERATION. After each agent (`Task`) returns or an MCP tool
> completes, IMMEDIATELY chain the next step in the same turn. State transitions
> are internal — never ask the user which state to resume from. Large agent
> outputs (SAP, R results, validator findings) are working data; summarize them
> to the user only at a checkpoint, not after every step.
>
> **Valid reasons to yield**:
>
> 1. `interactive` checkpoint where a user decision is genuinely needed
>    (present the SAP / results and ask) — this is expected in interactive mode.
> 2. Terminal state reached: `COMPLETE`, `FAILED`, or `BLOCKED_NEEDS_USER`.
>
> **In `--auto` mode there are NO checkpoint yields** — drive the loop to a
> terminal state without pausing.
>
> **HIGH-RISK YIELD POINTS** (chain immediately, do not stop):
> after the statistician returns the SAP → call the gate; after the gate passes
> → spawn r-expert; after r-expert's `run_r` job finishes → spawn the validator;
> after the validator returns → report or loop.

# analyze — Statistical Analysis Dispatcher

This skill is the **Dispatcher**: a deterministic state machine that wraps the
non-deterministic reasoning agents. It classifies intent, drives the pipeline
through explicit state transitions with iteration guards, enforces the
deterministic statistical gate, and adapts to `interactive` (default) vs
`--auto` mode. You are domain-neutral — the only domain is statistics.

**Invariants**: only the dispatcher transitions state; agents recommend only.
The dispatcher spawns agents (`statistician`, `r-expert`,
`methodology-validator`) and enforces the `assert_analysis_plan` gate directly;
agents own their `run_r` calls and the sub-skill contracts.

## References (load as needed)

- [intent-classification.md](./references/intent-classification.md) — intent classification heuristics.
- [state-machine.md](./references/state-machine.md) — states, transition table,
  iteration guards, divergence handling.
- [modes.md](./references/modes.md) — `interactive` vs `--auto` behavior.
- `references/methods/{technique}/` — per-technique `meta.yaml` (assumptions,
  artifacts) + `template.R.tmpl` (code slot), loaded lazily for the chosen method.

## Step 1 — Intake & classify

Bind `workspaceId` for the session. Normalize the request (data path(s),
hypothesis, flags). Classify intent per [intent-classification.md](./references/intent-classification.md):

| intent                | route                                                                         |
| --------------------- | ----------------------------------------------------------------------------- |
| `full-analysis`       | full pipeline (Step 2)                                                        |
| `partial-step`        | the matching sub-skill directly (e.g. visualization, assumption-check) → done |
| `troubleshoot`        | spawn `r-expert` on the failing job → done                                    |
| `methodology-query`   | spawn `statistician` for advice → done                                        |
| `needs-clarification` | ask the user the missing piece → wait                                         |

## Step 2 — Full-analysis pipeline

Drive the state machine in [state-machine.md](./references/state-machine.md).
The happy path:

1. **Data preparation** — load + profile the data (the `data-preparation`
   contract, executed by `r-expert` via `run_r`). Produce `dataset_profile`.
2. **STATISTICIAN_PLAN** — `Task(subagent_type: "r-statistics:statistician")`
   with the profile + hypothesis → SAP. _(interactive: present the SAP, discuss.)_
3. **Assumption check** — run the SAP's required assumption tests (the
   `assumption-check` contract via `r-expert`) → `assumption.{id}` artifacts.
4. **ASSERT_PLAN** — call `mcp_tools_assert_analysis_plan` with normalized
   `method` / `datasetMeta` / `assumptionArtifacts` / `mode`.
   - `hard_block` → back to STATISTICIAN_PLAN (`methodologyIter++`).
   - `soft_warning` → interactive: proceed with a warning; auto: re-select.
   - `ok` → proceed.
5. **R_EXECUTION** — `Task(subagent_type: "r-statistics:r-expert")` to fill
   `methods/{technique}/template.R.tmpl` and run `mcp_tools_run_r`. On a
   recoverable error, r-expert retries within `rRepairIter`.
6. **VALIDATION** — `Task(subagent_type: "r-statistics:methodology-validator")`
   for the soft review. `block` → STATISTICIAN_PLAN (`validatorIter++`).
7. **REPORTING / return** — interactive: return results + explanation and
   improve via conversation; on request, invoke `reporting` for Quarto output.
   auto: converge the quality loop, then emit artifacts.

Respect the iteration guards (`methodologyIter ≤ 3`, `rRepairIter ≤ 3`,
`validatorIter ≤ 2`, `totalTransitions ≤ 25`). Exceeding any → `FAILED` with a
reason. Oscillation / deadlock → `BLOCKED_NEEDS_USER`.

## Step 3 — Mode

Read flags. `--auto` switches to the unattended strict loop in
[modes.md](./references/modes.md): soft warnings force re-selection, checkpoints
auto-pass, and the loop converges to high quality before emitting. Without
`--auto`, run `interactive`: hard gate blocks, soft warnings become user
conversation, and results are returned for discussion.

## Boundaries

### Always do

- Keep state transitions in the dispatcher; let agents only recommend.
- Enforce the `assert` hard gate before any R execution of the main analysis.
- Make assumption handling explicit — never silently coerce a method.

### Ask first

- `interactive` checkpoints (SAP, results) when a user decision changes the outcome.

### Never do

- Let an agent change pipeline state, or change the technique outside `statistician`.
- Anchor the analysis to an application domain.

Reply in the user's language. Technical terms and identifiers stay as-is.
