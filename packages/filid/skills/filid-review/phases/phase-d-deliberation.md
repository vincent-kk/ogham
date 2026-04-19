# Phase D — Political Consensus (Team Deliberation)

> **EXECUTION MODEL (Tier-2a Anti-Yield — inherits ../SKILL.md:11-36)**: The
> chairperson (main session) executes this phase directly as a SINGLE
> CONTINUOUS OPERATION. Every round transition MUST chain the next tool
> call in the same response — never yield the turn between round wait →
> opinion parse → next-round task creation. Large opinion files and team
> messages are internal working data; do NOT summarize them mid-round.
>
> **Valid reasons to yield in Phase D**:
> 1. Unrecoverable error requiring human intervention
> 2. Terminal stage marker emitted (only after Step D.6 completes AND
>    Step 4.5 content-hash is persisted in ../SKILL.md)
>
> **HIGH-RISK YIELD POINTS in Phase D**:
> 1. After Step D.0 verification.md merge → chain D.1 immediately.
> 2. After adjudicator Task returns (solo path) → chain D.6 write.
> 3. After TeamCreate + parallel Task spawns return → chain D.2.5 wait
>    without yielding.
> 4. After all Round N SendMessage deliveries arrive → chain D.3.1 (grep
>    state frontmatter) + D.3.2 quorum decision in the same response.
> 5. When creating Round N+1 tasks → chain lead-brief write + TaskCreate
>    + SendMessage for every worker without yielding between them.
> 6. After VETO compromise file is written → chain D.4.3 re-eval task
>    creation immediately.
> 7. After TeamDelete returns → chain ../SKILL.md Step 4.5 (content-hash)
>    in the same response.
>
> Phase D completes when `review-report.md` and `fix-requests.md` are
> written AND (team mode) the team is fully shut down via `TeamDelete`.

## Main Pull-Up Contract

Phase D runs **only in the main orchestrator**, never inside the A/B/C
subagent. The subagent MUST NOT call `TeamCreate`, `SendMessage`, or otherwise
attempt Phase D internally — nested team spawns from a subagent context are
unsupported and leak orphan workers. The subagent's sole Phase-D obligation
is to emit the Subagent Return Contract on exit (see
`packages/filid/skills/filid-review/DETAIL.md` → `## API Contracts`) with two
dispatch fields:

- `deliberation_mode ∈ {team, solo-adjudicator, chairperson-forbidden}`
- `failure_reason ∈ {none, phase-d-team-spawn-unavailable, team-incomplete,
  round5-exhaust, veto-deadlock}`

Main then dispatches on the pair `(deliberation_mode, failure_reason)`:

| Dispatch | Trigger                                                           | Main action                                                                                      |
| -------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| team     | `deliberation_mode == team` AND `committee.length >= 2`           | Step D.2-team — TeamCreate + round state machine, ALWAYS `TeamDelete` inside try/finally         |
| solo     | `deliberation_mode == solo-adjudicator`                           | Step D.2-solo — single standalone `Task` to `filid:adjudicator`                                  |
| fail     | `deliberation_mode` is `chairperson-forbidden` or `null`, OR `failure_reason != none`, OR TeamCreate error, OR VETO deadlock, OR round-5 exhaust | Step D.7 — write `rounds/failure.md` with `verdict: INCONCLUSIVE`; if a team was created, `TeamDelete` inside try/finally (orphan-log on failure) |

`chairperson-direct` Phase D synthesis — main writing a verdict without
running either the team branch or the solo-adjudicator branch — is a
**protocol violation**. Main MUST block the merge with `verdict: INCONCLUSIVE`
via the `verdict_gate` rule in DETAIL.md rather than emitting an ad-hoc
synthesis.

### Token counter baseline

Each Phase D dispatch MUST append one entry to `<REVIEW_DIR>/session.md`
under a `phase_d_token_usage:` block recording the main-context token
consumption for this phase. This establishes the measurement baseline for
the re-evaluation trigger (Phase D main tokens ≥ 40% of pipeline budget
across ≥ 3 PRs):

```
phase_d_token_usage:
  run_id: <review-run identifier>
  dispatch: team | solo | fail
  tokens_main: <integer>
  recorded_at: <ISO-8601 timestamp>
```

---

Phase D produces the final review verdict through a **real multi-agent
deliberation** using Claude Code's native team tools. Committee members
elected by `mcp_t_review_manage(elect-committee)` are spawned as team workers,
each in their own context, emitting structured opinion files per round.
The chairperson (Lead) orchestrates rounds and applies the state machine
defined in `../state-machine.md`.

## Execution Context (read by chairperson before starting)

- `<REVIEW_DIR>` — `.filid/review/<normalized>/`
- `<REVIEW_DIR>/session.md` — committee list, complexity, changed files
- `<REVIEW_DIR>/verification.md` — merged C1 + C2 output
- `<REVIEW_DIR>/verification-metrics.md` — Phase C1 raw
- `<REVIEW_DIR>/verification-structure.md` — Phase C2 raw
- `<REVIEW_DIR>/structure-check.md` — Phase A output (if present)

## Step D.0 — Merge C1 + C2 into verification.md

Before spawning any workers, the chairperson merges the two Phase C outputs
into a single `verification.md` file that committee members will read:

1. Read `<REVIEW_DIR>/verification-metrics.md` and
   `<REVIEW_DIR>/verification-structure.md`.
2. Concatenate with a unified frontmatter that combines both scopes. The
   merged frontmatter MUST preserve `debt_bias_level` and
   `critical_failures` fields exactly.
3. Write `<REVIEW_DIR>/verification.md` with sections:
   - `## Code Metrics Results` (from C1 body)
   - `## Structure & Dependency Verification` (from C2 body)
   - `## Debt Status` (from C2 body)

**→ After verification.md is written, immediately proceed to Step D.1. Do NOT yield.**

## Step D.1 — Dispatch Branch (team / solo / fail)

Parse `committee`, `deliberation_mode`, and `failure_reason` from the
subagent return payload. Cross-check `committee` against
`<REVIEW_DIR>/session.md` frontmatter, then dispatch in this priority order —
first match wins:

```
deliberation_mode in {"chairperson-forbidden", null}
  OR failure_reason != "none"                           →  fail (Step D.7)
deliberation_mode == "solo-adjudicator"                 →  solo (Step D.2-solo)
deliberation_mode == "team" AND committee.length >= 2   →  team (Step D.2-team)
```

The TRIVIAL auto-tier and the `--solo` manual flag both produce
`committee: ['adjudicator']` with `deliberation_mode == "solo-adjudicator"`.
Both paths converge on Step D.2-solo. The specialist personas
(`engineering-architect`, `knowledge-manager`, etc.) are never elected as a
single-member committee — they only appear in LOW / MEDIUM / HIGH committees
of size >= 2 under `deliberation_mode == "team"`.

---

## Step D.2-solo — Solo Deliberation (committee == ['adjudicator'])

Used for `TRIVIAL` complexity (auto-selected small diff) or `--solo` flag
(manual fast-path override). In both cases `session.md` committee is
exactly `['adjudicator']`. The state machine is skipped — a single
consolidated opinion maps directly to the verdict.

### Spawn the adjudicator as a standalone Task

```
Task(
  subagent_type: "filid:adjudicator",
  name: "adjudicator",
  prompt: <solo-worker-preamble>
)
```

Do **not** call `TeamCreate`. The adjudicator is a standalone integrated
reviewer, not a team worker. It covers all six committee perspectives
(structure, documentation, stability, velocity, user-value, cognitive
load) in a single context.

Solo worker preamble template:

```
You are the adjudicator — the integrated fast-path reviewer that
internalizes all six committee perspectives in one pass. This is a SOLO
deliberation; no other committee members exist and there will be no
round 2+.

== INPUTS ==
- <REVIEW_DIR>/session.md
- <REVIEW_DIR>/verification.md
- <REVIEW_DIR>/verification-metrics.md
- <REVIEW_DIR>/verification-structure.md
- <REVIEW_DIR>/structure-check.md (optional)

You MAY also Read/Grep changed source files directly for supplementary
context when the verification artifacts leave a gap.

== OUTPUT ==
Write exactly one file: <REVIEW_DIR>/rounds/round-1-adjudicator.md
beginning with the Round Output Contract frontmatter defined in your
agent instructions. Set round: 1. state MUST be SYNTHESIS or VETO —
ABSTAIN is not permitted in solo mode. Include the Perspective Sweep
section with six H3 subsections (one per committee lens) so the final
review report can still surface per-perspective coverage.

== REMINDER ==
Write the output file before finishing. Do NOT call Task, TeamCreate,
SendMessage, TaskList, or any orchestration tool. You are a standalone
Task, not a team worker. Return a brief completion summary.

Language: <from [filid:lang] tag, default English>
```

### Verdict mapping (solo)

After the Task returns:

1. Read `<REVIEW_DIR>/rounds/round-1-adjudicator.md`.
2. Parse the frontmatter `state` field.

| Opinion state | Final verdict    |
| ------------- | ---------------- |
| SYNTHESIS (no fix_items) | APPROVED |
| SYNTHESIS (with fix_items) | REQUEST_CHANGES |
| VETO          | REQUEST_CHANGES  |

3. Skip directly to Step D.6 (write review-report.md + fix-requests.md).
   Because adjudicator emits fix_items with a `perspective` tag on
   each item, Step D.6 can still populate a per-perspective summary
   table in `review-report.md`.

**→ After solo verdict is determined, immediately proceed to Step D.6. Do NOT yield.**

---

## Step D.2-team — Team Deliberation (committee.length >= 2)

### D.2.1 — TeamCreate

```
TeamCreate({
  team_name: "review-<normalized-branch>",
  description: "Filid multi-persona code review — <N> members"
})
```

The chairperson becomes `team-lead@review-<normalized-branch>`.

### D.2.2 — Ensure rounds directory exists

```bash
mkdir -p <REVIEW_DIR>/rounds
```

### D.2.3 — Create Round 1 tasks (one per committee member)

For each `persona-id` in committee:

```
TaskCreate({
  subject: "Round 1 opinion: <persona-id>",
  description: "<worker-preamble + Round 1 context>",
  activeForm: "Drafting round 1 opinion"
})
```

Then pre-assign owners BEFORE spawning (no atomic claiming guarantee):

```
TaskUpdate({ taskId: <id>, owner: "<persona-id>" })
```

### D.2.4 — Spawn all committee members in parallel

Spawn every committee member in the same response (parallel tool calls):

```
Task(
  subagent_type: "filid:<persona-id>",
  team_name: "review-<normalized-branch>",
  name: "<persona-id>",
  prompt: <team-worker-preamble>
)
```

Team worker preamble template:

```
You are the <persona-id> review persona working as a TEAM WORKER in team
"review-<normalized-branch>". Your name is "<persona-id>". You report to
"team-lead".

== INPUTS (read these before anything else) ==
- <REVIEW_DIR>/session.md
- <REVIEW_DIR>/verification.md
- <REVIEW_DIR>/verification-metrics.md
- <REVIEW_DIR>/verification-structure.md
- <REVIEW_DIR>/structure-check.md (optional)

== ROUND 1 WORK PROTOCOL ==
1. TaskList → pick the task owned by "<persona-id>" with status "pending".
2. TaskUpdate({ taskId, status: "in_progress" }).
3. Read the input files.
4. Write <REVIEW_DIR>/rounds/round-1-<persona-id>.md beginning with the
   Round Output Contract frontmatter defined in your agent instructions.
5. TaskUpdate({ taskId, status: "completed" }).
6. SendMessage({ type: "message", recipient: "team-lead",
   content: "round 1 <persona-id> done: <state>",
   summary: "round 1 done" }).
7. Wait for the next round task or a shutdown_request.

== SUBSEQUENT ROUNDS ==
The chairperson will create additional tasks for rounds 2-5 if the state
machine does not converge. Each new task description will point to the
previous round's opinions and a lead-brief-round-<N>.md file summarizing
adversarial targets. Repeat the protocol above with round: <N> in the
opinion frontmatter.

== SHUTDOWN ==
When you receive shutdown_request, respond with
shutdown_response({ request_id, approve: true }) and terminate.

Language: <from [filid:lang] tag, default English>
```

### D.2.5 — Wait for Round 1 completion

The chairperson waits for `SendMessage` deliveries from every worker. If a
worker takes > 120 seconds without sending a message, trigger the Recovery
Plan (Step D.5).

**→ Once all Round 1 opinions are written, immediately proceed to Step D.3. Do NOT yield.**

---

## Step D.3 — Round Evaluation (state machine)

For round `N` (starting at 1):

### D.3.1 — Collect opinion frontmatter

For each committee member, read
`<REVIEW_DIR>/rounds/round-<N>-<persona-id>.md` and extract the YAML
frontmatter `state` field: `SYNTHESIS | VETO | ABSTAIN`.

Use `Grep` with pattern `^state:` and the file glob
`<REVIEW_DIR>/rounds/round-<N>-*.md` to fetch all states in one call.

### D.3.2 — Apply quorum rules (from ../state-machine.md)

Let `M` = committee length.
Let `S` = count of SYNTHESIS.
Let `V` = count of VETO.
Let `A` = count of ABSTAIN.
Let `effective_denominator` = `M - A`.

Evaluate rules in order — first match wins:

| Condition                                             | Action                          |
| ----------------------------------------------------- | ------------------------------- |
| `effective_denominator == 0` (everyone abstained)     | CONCLUSION (INCONCLUSIVE) → D.6 |
| `V >= 1`                                              | Enter VETO branch (Step D.4)    |
| `effective_denominator > 0 && S / effective_denominator >= 2/3` | CONCLUSION → Step D.6 |
| `S / effective_denominator < 2/3 && V == 0 && N < 5`  | Next round → Step D.3.3         |
| `N >= 5` (round limit)                                | CONCLUSION (INCONCLUSIVE) → D.6 |

### D.3.3 — Start Round N+1 (re-DEBATE)

Before creating the next round's tasks, write a lead brief that gives each
persona the adversarial context they need:

1. Write `<REVIEW_DIR>/lead-brief-round-<N+1>.md` with:
   - Summary of each persona's Round N state + key fix_items
   - Per-persona `rebuttal_targets` list (which other opinions they should
     respond to)
2. Create Round N+1 tasks (one per committee member) pre-assigned to owners.
3. SendMessage to each worker:
   ```
   {
     type: "message",
     recipient: "<persona-id>",
     content: "Round <N+1> start. Read lead-brief-round-<N+1>.md and previous opinions in <REVIEW_DIR>/rounds/round-<N>-*.md. Claim your new task and write round-<N+1>-<persona-id>.md.",
     summary: "round <N+1> start"
   }
   ```
4. Wait for all workers to report `round <N+1> done`.
5. Return to Step D.3.1 with `N = N+1`.

---

## Step D.4 — VETO Branch (Compromise Round)

Triggered when any worker returns `state: VETO` in Round N.

### D.4.1 — Identify the vetoing persona(s)

List all workers whose Round N opinion has `state: VETO`.

### D.4.2 — Dispatch a compromise task to Business Driver (if elected)

> **Guard**: If `business-driver` is NOT in the committee (e.g., LOW tier
> committees of `['engineering-architect', 'operations-sre']`), SKIP Steps
> D.4.2 and D.4.3 entirely and proceed directly to Step D.4.4
> (Irreconcilable VETO → `REQUEST_CHANGES`). The compromise round requires
> Business Driver as its sole author — without that persona there is no
> one to write `round-<N>-business-driver-compromise.md`, and D.4.3 would
> deadlock waiting for a file that will never appear.

```
TaskCreate({
  subject: "Round <N> VETO compromise",
  description: "VETO compromise: <veto persona list> vetoed. Read their
    opinions and propose a concrete debt compromise (owner, timeline,
    acceptance criteria). Write
    <REVIEW_DIR>/rounds/round-<N>-business-driver-compromise.md.",
  activeForm: "Drafting VETO compromise"
})
TaskUpdate({ taskId, owner: "business-driver" })
SendMessage({
  recipient: "business-driver",
  type: "message",
  content: "VETO compromise needed for round <N>. Inspect the new task and
    write the compromise file.",
  summary: "VETO compromise"
})
```

### D.4.3 — Share compromise with vetoing personas

Once `round-<N>-business-driver-compromise.md` exists:

1. For each vetoing persona, create a new task:
   ```
   TaskCreate({
     subject: "Round <N+1> VETO re-eval: <persona-id>",
     description: "Read business-driver-compromise.md. Decide whether to
       accept the compromise (→ SYNTHESIS with compromise_accepted: true),
       reject it (→ VETO again), or abstain. Write
       round-<N+1>-<persona-id>.md.",
     activeForm: "Re-evaluating after compromise"
   })
   TaskUpdate({ taskId, owner: "<persona-id>" })
   SendMessage({ recipient: "<persona-id>", ... })
   ```
2. Other (non-vetoing) personas also write round N+1 opinions as usual.
3. Wait for all Round N+1 opinions and return to Step D.3.1.

### D.4.4 — Irreconcilable VETO

If Business Driver is not in the committee OR the compromise is rejected by
every vetoing persona in Round N+1, transition directly to CONCLUSION with
verdict `REQUEST_CHANGES` (Step D.6).

---

## Step D.5 — Recovery Plan (dead worker detection)

Executed in parallel with round waits. Do NOT treat this as a blocking
serial step — it runs alongside D.2.5 / D.3 whenever a worker stalls.

### D.5.1 — Detection

A worker is considered **stuck** when:

- Its round task has `status: in_progress` AND
- No `SendMessage` has arrived from the worker for > 120 seconds

### D.5.2 — Probe

```
SendMessage({
  recipient: "<persona-id>",
  type: "message",
  content: "ping: are you still working on round <N>? reply with current progress",
  summary: "probe"
})
```

Wait 30 seconds for a response.

### D.5.3 — Respawn (max 2 attempts per persona)

If no response, the worker is declared dead:

1. Release the task:
   ```
   TaskUpdate({ taskId, status: "pending", owner: "" })
   ```
2. If `respawn_count[persona] < 2`, respawn with identical name:
   ```
   Task(
     subagent_type: "filid:<persona-id>",
     team_name: "review-<normalized-branch>",
     name: "<persona-id>",
     prompt: <recovery-preamble>
   )
   ```
3. The recovery preamble MUST include a list of prior round opinion file
   paths so the new worker can reconstruct context:
   ```
   RECOVERY CONTEXT: You are resuming after a crash. Read these files to
   rebuild your perspective:
   - <REVIEW_DIR>/rounds/round-1-<persona-id>.md (your round 1 opinion)
   - <REVIEW_DIR>/rounds/round-<N-1>-<persona-id>.md (your previous opinion)
   Then pick up the current task normally.
   ```
4. Increment `respawn_count[persona]`.

### D.5.4 — Force ABSTAIN (after 2 respawn failures)

If `respawn_count[persona] >= 2`, the chairperson writes the missing opinion
file directly:

```
<REVIEW_DIR>/rounds/round-<N>-<persona-id>.md
---
round: <N>
persona: <persona-id>
state: ABSTAIN
confidence: 0
rebuttal_targets: []
fix_items: []
reasoning_gaps:
  - "worker unrecoverable after 2 respawn attempts"
---

## Verdict Summary

Forced ABSTAIN by chairperson: the worker failed to respond after probe and
two respawn attempts. Recalculating quorum with this member excluded from
the effective denominator.
```

Then mark the task completed and continue quorum calculation with this
persona excluded from `effective_denominator`.

---

## Step D.6 — CONCLUSION (write final outputs)

This step runs for both solo and team deliberation paths.

### D.6.1 — Determine verdict

From the final state machine outcome OR the solo opinion state:

| Outcome                                 | Verdict          |
| --------------------------------------- | ---------------- |
| SYNTHESIS with no fix_items             | `APPROVED`       |
| SYNTHESIS with fix_items                | `REQUEST_CHANGES`|
| Irreconcilable VETO                     | `REQUEST_CHANGES`|
| Quorum not met / 5-round limit exceeded | `INCONCLUSIVE`   |

### D.6.2 — Collect all fix_items

Aggregate fix_items from all `<REVIEW_DIR>/rounds/round-<final>-*.md`
opinion files. Deduplicate by `path + rule`. Assign sequential `FIX-001`,
`FIX-002`, ... IDs. Also ingest CRITICAL/HIGH findings from
`<REVIEW_DIR>/structure-check.md` (Phase A) and assign them `Raised by:
Phase A`.

### D.6.3 — Write review-report.md

Path: `<REVIEW_DIR>/review-report.md`
Format: see `../templates.md` → "Review Report Format"

Required sections:

- Frontmatter: date, scope, base, verdict
- `## Committee Composition` — final position per persona (from last round)
- `## Structure Compliance (Phase A)` — if structure-check.md exists
- `## Technical Verification Results` — copied from verification.md tables
- `## Deliberation Log` — one entry per round (state, persona positions,
  chairperson mediation, transition)
- `## Final Verdict` — verdict + fix item count

### D.6.4 — Write fix-requests.md

Path: `<REVIEW_DIR>/fix-requests.md`
Format: see `../templates.md` → "Fix Requests Format"

One section per fix item, each with: Severity, Source, Type, Path, Rule,
Current, Raised by, Recommended Action, Code Patch (if applicable).

### D.6.5 — Team shutdown (team deliberation only)

Skip for solo deliberation — no team exists.

For team deliberation, wrap the shutdown in a **try/finally** so
`TeamDelete` ALWAYS runs — even when `shutdown_request` throws, times out, or
an earlier step in this block raises:

1. Verify all tasks completed via `TaskList`.
2. Send `shutdown_request` to every committee member in parallel:
   ```
   SendMessage({
     recipient: "<persona-id>",
     type: "shutdown_request",
     content: "All rounds complete, shutting down team"
   })
   ```
3. Wait up to 30 seconds per member for `shutdown_response`. Track
   confirmed and timed-out members.
4. `TeamDelete({ team_name: "review-<normalized-branch>" })` — placed in the
   `finally` arm. Any exception from steps 1–3 MUST still allow this call to
   execute. On `TeamDelete` failure, append an `orphan_workers:` entry to
   `<REVIEW_DIR>/session.md` listing the team name and surviving workers so
   the next run can reap them.

**→ After TeamDelete returns (or solo path completes), immediately proceed to Step 4.5 in ../SKILL.md (persist content hash). Do NOT yield.**

---

## Step D.7 — Failure Branch (fail dispatch)

Entered when Step D.1 selects the fail dispatch — `deliberation_mode` is
`chairperson-forbidden` or `null`, OR `failure_reason != "none"` — OR when an
in-flight team dispatch raises a TeamCreate error, VETO deadlock, or
round-5 exhaust after the team was spawned.

1. **Team teardown (if applicable)**: if a team was already created before
   the failure surfaced, run `TeamDelete({ team_name: "review-<normalized-branch>" })`
   inside a try/finally block. On `TeamDelete` exception, append an
   `orphan_workers:` entry to `<REVIEW_DIR>/session.md` (team name +
   surviving worker list) so the next run can reap them.
2. **Write failure record**: emit `<REVIEW_DIR>/rounds/failure.md` with
   frontmatter capturing the dispatch and reason:
   ```
   ---
   verdict: INCONCLUSIVE
   dispatch: fail
   failure_reason: <from subagent return | "phase-d-team-spawn-unavailable" | "veto-deadlock" | "round5-exhaust" | "team-incomplete">
   rationale: <one-line rationale>
   ---
   ```
3. **Skip Step D.6 aggregation**: the verdict is already `INCONCLUSIVE`.
   `chairperson-direct` synthesis in this branch — main writing a SYNTHESIS
   verdict without a live team or adjudicator Task — is a protocol violation
   and MUST NOT occur.
4. **Token counter**: append the Phase D token counter entry to
   `session.md` with `dispatch: fail` so the trigger baseline remains
   consistent across team / solo / fail dispatches.
5. Proceed to Step 4.5 in `../SKILL.md` (persist content hash) carrying the
   `INCONCLUSIVE` verdict.

---

## Constraints Summary

- Phase D makes NO direct MCP measurement calls. All metrics come from
  `verification.md` / `verification-metrics.md` / `verification-structure.md` /
  `structure-check.md`.
- The chairperson writes `verification.md`, `review-report.md`,
  `fix-requests.md`, and (optionally) `lead-brief-round-<N>.md`. Personas
  write only their own `round-<N>-<persona-id>.md` files.
- Maximum 5 deliberation rounds.
- Maximum 2 respawn attempts per dead worker.
- Solo path always writes exactly one round opinion; team path may write
  up to 5 × committee_size opinion files.
