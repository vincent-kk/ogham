# cross-review — Public Contract Specification

## Requirements

- Phase sequence (A → B → C1/C2 → D) MUST match `SKILL.md`. Phase A/B/C run inside an isolated subagent (~100k token budget); Phase D runs in the pipeline main orchestrator.
- The A/B/C subagent MUST emit the Subagent Return Contract (defined below) to the main orchestrator on exit. Omission produces a `null` payload, which the gate treats identically to `chairperson-forbidden`.
- The main orchestrator MUST apply the `verdict_gate` rule to that return value before dispatching Phase D (team / solo-adjudicator / fail).
- `chairperson-direct` Phase D synthesis is a protocol violation; `verdict_gate` blocks the merge with an `INCONCLUSIVE` verdict and records the reason in `session.md`.
- Verdict derivation MUST apply the severity gate (see `### Severity Gate & Advisory Channel`): only blocking fix items (severity >= MEDIUM) can produce `REQUEST_CHANGES`; LOW fix items route to the advisory channel and never block. VETO classes and the critical-security override are gate-independent.
- Every fix_item MUST carry a `consequence` field naming what concretely breaks if left unaddressed; a fix_item with no concrete consequence is at most LOW (see `contracts.md` → "Severity Gate & Finding Discipline").
- A null result (`fix_items: []` with SYNTHESIS) is a valid success state for every persona and the adjudicator; it MUST cite the checked surface in the opinion body.
- When `.filid/criteria.md` holds `active` claims whose `scope` intersects the diff, Phase D MUST judge every such claim (PASS / FAIL / INSUFFICIENT-EVIDENCE, worst-wins across personas) and fold non-PASS aggregates into the blocking set (FAIL → HIGH `code-fix`; INSUFFICIENT-EVIDENCE → MEDIUM `harvest-required`). `APPROVED` therefore implies all in-scope active claims are PASS in addition to a MEDIUM-free blocking set (see `contracts.md` → "Acceptance Claims (criteria ledger)").
- Reviews targeting a `spike/*` branch without a current harvest manifest (`.filid/harvest/<normalized>/manifest.json`, `head_sha` == HEAD) MUST skip Phases A–D and emit the Harvest-Required Variant (`templates.md`) — `verdict: REQUEST_CHANGES` with one `Type: harvest-required` fix item routing to `/filid:harvest`.
- Any change to verdict derivation, severity anchoring, or finding discipline under `skills/cross-review/**` or `agents/*.md` MUST be followed by a calibration pass (`skills/cross-review/calibration/calibration.md`): clean fixture → APPROVED, low-only fixture → APPROVED with Advisory Notes, seeded fixture → REQUEST_CHANGES, claim fixture → REQUEST_CHANGES with one PASS and one FAIL claim verdict.
- Output artifacts remain under `.filid/review/<normalized-branch>/` with the filenames catalogued in `INTENT.md`. The cross-review advisory ledger lives at `.filid/review/advisory-ledger.md` (outside per-branch cleanup scope).

## API Contracts

### Subagent Return Contract

The A/B/C subagent returns this handoff payload to its caller (the pipeline main) on exit:

```yaml
SubagentReturn:
  committee: list<PersonaId> # elected by mcp__plugin_filid_t__review_manage(elect-committee)
  deliberation_mode: DeliberationMode # see enum below
  failure_reason: FailureReason # see enum below; "none" when healthy
  paths_to_artifacts:
    structure_check: string | null # .filid/review/<branch>/structure-check.md
    session: string # .filid/review/<branch>/session.md
    verification_metrics: string # .filid/review/<branch>/verification-metrics.md
    verification_structure: string # .filid/review/<branch>/verification-structure.md
```

Every field is mandatory. The main orchestrator cross-checks `committee` against `session.md`, then branches on the pair `(deliberation_mode, failure_reason)` via the gate below.

### deliberation_mode enum

```yaml
deliberation_mode:
  type: enum
  values: ['team', 'solo-adjudicator', 'chairperson-forbidden']
  semantics:
    team: committee.length >= 2; main MUST spawn one named worker Agent per persona (implicit team; no create call).
    solo-adjudicator: committee == ["adjudicator"]; main MUST dispatch a single standalone Agent (no other teammates).
    chairperson-forbidden: subagent detected or attempted a Phase D protocol violation; main MUST NOT synthesize a verdict and MUST block the merge.
```

### failure_reason enum

```yaml
failure_reason:
  type: enum
  values:
    [
      'none',
      'phase-d-team-spawn-unavailable',
      'team-incomplete',
      'round5-exhaust',
    ]
  semantics:
    none: healthy handoff; verdict derived from Phase D quorum result.
    phase-d-team-spawn-unavailable: a worker Agent spawn errored or the runtime refused the spawn call.
    team-incomplete: workers spawned but quorum was unreachable (crashes, timeouts, or forced-ABSTAIN past the recovery budget).
    round5-exhaust: deliberation hit the 5-round cap without reaching SYNTHESIS.
```

### verdict_gate rule

The main orchestrator MUST evaluate the gate in order — first match wins:

```yaml
verdict_gate:
  if deliberation_mode in {"chairperson-forbidden", null}:
    verdict: INCONCLUSIVE
    rationale: 'Phase D deliberation integrity not established; block merge.'
  elif failure_reason != "none":
    verdict: INCONCLUSIVE
    rationale: ${failure_reason}
  elif deliberation_mode == "team" and committee.length < 2:
    verdict: INCONCLUSIVE
    rationale: 'team mode elected but committee too small to form a quorum; block merge.'
  else:
    verdict: derived from Phase D quorum result under the severity gate (APPROVED | REQUEST_CHANGES | INCONCLUSIVE)
```

A missing or `null` `deliberation_mode` is handled identically to `chairperson-forbidden` — the subagent failed to emit the handoff and the merge MUST be blocked.

### Severity Gate & Advisory Channel

The severity gate partitions the final aggregated fix_item set (committee
fix_items + Phase A CRITICAL/HIGH ingestion + acceptance-claim folding)
before verdict derivation:

| Partition    | Severity                     | Destination                                        | Verdict effect                      |
| ------------ | ---------------------------- | -------------------------------------------------- | ----------------------------------- |
| **blocking** | `CRITICAL \| HIGH \| MEDIUM` | `fix-requests.md` (`FIX-XXX`)                      | non-empty → `REQUEST_CHANGES`       |
| **advisory** | `LOW`                        | `review-report.md` `## Advisory Notes` (`ADV-XXX`) | never blocks — `APPROVED` reachable |

- SYNTHESIS with an empty blocking set → `APPROVED`. When the advisory
  set is non-empty, the report header/body present it as
  **APPROVED (with notes)** — presentation only. The frontmatter
  `verdict`, the verdict enum, and the terminal marker stay `APPROVED`;
  the enum gains no new value.
- The gate applies to SYNTHESIS fix_items ONLY. VETO classes (circular
  dependency, hardcoded secrets, security-critical bugs, irreversible
  destructive operations) and the critical-security override
  (`state-machine.md`) are gate-independent: a VETO maps to
  `REQUEST_CHANGES` regardless of the gate.
- `INCONCLUSIVE` paths (quorum failure, round-5 exhaust, fail dispatch)
  are unaffected by the gate.

### Advisory Ledger Contract

`.filid/review/advisory-ledger.md` tracks advisory recurrence across
reviews (all branches). The chairperson updates it in Step D.6 when
writing Advisory Notes:

The authoritative column set (including formatting) is `templates.md` →
"Advisory Ledger Format"; the fields are:

| Field              | Meaning                                                                                                  |
| ------------------ | -------------------------------------------------------------------------------------------------------- |
| `key`              | `<path> + <rule>` — same dedup key as fix_items                                                          |
| `path`             | file path (denormalized from `key` for readability)                                                      |
| `rule`             | violated rule id (denormalized from `key`)                                                               |
| `count`            | number of distinct review runs that raised this advisory item                                            |
| `first_seen`       | ISO-8601 date of first appearance                                                                        |
| `last_seen_branch` | normalized branch of the most recent appearance                                                          |
| `last_run_id`      | review-run identifier of the most recent count — rows matching the current run id are not re-incremented |
| `status`           | `open \| promoted`                                                                                       |
| `debt_id`          | debt record id once promoted, else `—`                                                                   |

Promotion rule: when `count` reaches **3** and `status` is `open`, the
chairperson calls `mcp__plugin_filid_t__debt_manage(action: "create", projectRoot,
debtItem: …)` with `severity: LOW`, sets `status: promoted`, and records
the returned `debt_id`. Promoted keys are skipped on future appearances
(no re-counting) — the advisory appendix never becomes an unbounded
backlog. This is a bookkeeping call, not a measurement call; it does not
violate the Phase D no-measurement constraint.

### review-report.md frontmatter (mandatory)

| Field               | Type                                                | Required    | Consumer                              |
| ------------------- | --------------------------------------------------- | ----------- | ------------------------------------- |
| `verdict`           | `APPROVED \| REQUEST_CHANGES \| INCONCLUSIVE`       | yes         | pipeline cached-verdict short-circuit |
| `branch`            | string                                              | yes         | revalidate                            |
| `base_ref`          | string                                              | yes         | revalidate                            |
| `content_hash`      | string                                              | conditional | cache lookup on next review           |
| `committee`         | `PersonaId[]`                                       | yes         | audit trail                           |
| `deliberation_mode` | `team \| solo-adjudicator \| chairperson-forbidden` | yes         | replayability                         |
| `generated_at`      | ISO-8601 string                                     | yes         | freshness check                       |

Writers MUST emit all required fields. Readers (pipeline main, revalidate) grep-parse these fields; missing required fields trigger an `INCONCLUSIVE` fallback.
