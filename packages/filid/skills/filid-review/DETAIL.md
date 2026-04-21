# filid-review — Public Contract Specification

## Requirements

- Phase sequence (A → B → C1/C2 → D) MUST match `SKILL.md`. Phase A/B/C run inside an isolated subagent (~100k token budget); Phase D runs in the pipeline main orchestrator.
- The A/B/C subagent MUST emit the Subagent Return Contract (defined below) to the main orchestrator on exit. Omission produces a `null` payload, which the gate treats identically to `chairperson-forbidden`.
- The main orchestrator MUST apply the `verdict_gate` rule to that return value before dispatching Phase D (team / solo-adjudicator / fail).
- `chairperson-direct` Phase D synthesis is a protocol violation; `verdict_gate` blocks the merge with an `INCONCLUSIVE` verdict and records the reason in `session.md`.
- Output artifacts remain under `.filid/review/<normalized-branch>/` with the filenames catalogued in `INTENT.md`.

## API Contracts

### Subagent Return Contract

The A/B/C subagent returns this handoff payload to its caller (the pipeline main) on exit:

```yaml
SubagentReturn:
  committee: list<PersonaId>              # elected by mcp_t_review_manage(elect-committee)
  deliberation_mode: DeliberationMode     # see enum below
  failure_reason: FailureReason           # see enum below; "none" when healthy
  paths_to_artifacts:
    structure_check: string | null        # .filid/review/<branch>/structure-check.md
    session: string                       # .filid/review/<branch>/session.md
    verification_metrics: string          # .filid/review/<branch>/verification-metrics.md
    verification_structure: string        # .filid/review/<branch>/verification-structure.md
```

Every field is mandatory. The main orchestrator cross-checks `committee` against `session.md`, then branches on the pair `(deliberation_mode, failure_reason)` via the gate below.

### deliberation_mode enum

```yaml
deliberation_mode:
  type: enum
  values: ["team", "solo-adjudicator", "chairperson-forbidden"]
  semantics:
    team: committee.length >= 2; main MUST perform TeamCreate(review-<branch>) and spawn one Task per persona.
    solo-adjudicator: committee == ["adjudicator"]; main MUST dispatch a single standalone Task (no TeamCreate).
    chairperson-forbidden: subagent detected or attempted a Phase D protocol violation; main MUST NOT synthesize a verdict and MUST block the merge.
```

### failure_reason enum

```yaml
failure_reason:
  type: enum
  values: ["none", "phase-d-team-spawn-unavailable", "team-incomplete", "round5-exhaust"]
  semantics:
    none: healthy handoff; verdict derived from Phase D quorum result.
    phase-d-team-spawn-unavailable: TeamCreate errored or the runtime refused the spawn call.
    team-incomplete: workers spawned but quorum was unreachable (crashes, timeouts, or forced-ABSTAIN past the recovery budget).
    round5-exhaust: deliberation hit the 5-round cap without reaching SYNTHESIS.
```

### verdict_gate rule

The main orchestrator MUST evaluate the gate in order — first match wins:

```yaml
verdict_gate:
  if deliberation_mode in {"chairperson-forbidden", null}:
    verdict: INCONCLUSIVE
    rationale: "Phase D deliberation integrity not established; block merge."
  elif failure_reason != "none":
    verdict: INCONCLUSIVE
    rationale: ${failure_reason}
  else:
    verdict: derived from Phase D quorum result (APPROVED | REQUEST_CHANGES | INCONCLUSIVE)
```

A missing or `null` `deliberation_mode` is handled identically to `chairperson-forbidden` — the subagent failed to emit the handoff and the merge MUST be blocked.

## Last Updated

- 2026-04-20 — initial authoring. Codifies the A/B/C subagent ↔ main handoff required by PR-2 (emit in `phases/phase-d-deliberation.md`) and PR-3 (consume in `filid-pipeline/SKILL.md`), and blocks `chairperson-direct` Phase D synthesis via `verdict_gate`.
