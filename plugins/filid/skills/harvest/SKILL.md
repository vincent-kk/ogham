---
name: harvest
user_invocable: true
description: '[filid:harvest] Harvest a spike branch: extract the decisions the exploratory code implied, run a human keep/discard/defer interview, record kept decisions as acceptance claims in .filid/criteria.md plus module INTENT.md deltas, dispose of the spike, and write the verifiable harvest manifest that unlocks the merge track.'
argument-hint: '[--base REF]'
version: '1.0.0'
complexity: medium
plugin: filid
---

> **EXECUTION MODEL (Tier-2b interactive-aware)**: Execute all steps as a
> SINGLE CONTINUOUS OPERATION EXCEPT at steps explicitly marked
> `<!-- [INTERACTIVE] -->` or invoking `AskUserQuestion`. At THOSE EXACT
> steps, yielding is REQUIRED. At all other steps, NEVER yield.
>
> **No autonomous harvest**: every keep/discard/defer confirmation MUST
> come from a human `AskUserQuestion` answer. If the interactive tool is
> unavailable (automation context), ABORT — an agent MUST NOT harvest
> acceptance criteria for its own implementation (it would harvest only
> the claims it can pass). There is no `--auto` mode by design.
>
> **Valid reasons to yield**:
>
> 1. Current step is `[INTERACTIVE]` (interview / disposal questions)
> 2. Terminal stage marker emitted: `Harvest complete — N claims recorded`
>    or `Harvest aborted`
>
> **HIGH-RISK YIELD POINTS**:
>
> - After the interview's last answer — chain ledger write + INTENT deltas
>   + harvest commit + manifest write in the same turn (primary stall point)
> - After the harvest commit — the manifest MUST be written in the same
>   turn, or the gate stays closed despite a finished harvest

# harvest — Spike Harvest Interview

Convert an exploratory spike into durable intent: the spike's diff is
compared against the INTENT tree, each implicit decision is surfaced,
and a human decides keep / discard / defer per decision. Kept decisions
become PASS/FAIL-judgeable acceptance claims in `.filid/criteria.md`
(the oracle ledger that `/filid:review` judges) plus INTENT.md deltas
in the affected modules. Completion is recorded as a verifiable
manifest — the ONLY artifact that lifts the pipeline/review spike gate.

> **References**: `reference.md` (criteria ledger template, manifest
> schema, decision-extraction heuristics, disposal mechanics).

## When to Use

- A `spike/*` branch has finished probing and its findings must be
  captured before any merge-track work
- The pipeline Signal 0 guard or the review Step 1 guard routed here
- New commits landed after a previous harvest (stale manifest →
  incremental re-harvest)

## Core Workflow

### Step 1 — Preconditions

1. `git branch --show-current` → `<branch>`. ABORT unless it matches
   `spike/*`: "harvest runs on the spike branch itself — check it out
   first." Emit `Harvest aborted` and END.
2. `git status --porcelain` non-empty → ABORT: "commit your probe work
   first — harvest snapshots committed state only." (Doc-hygiene denies
   are suspended on this branch; committing is cheap.)
3. Normalize: `mcp_t_review_manage(action: "normalize-branch",
projectRoot, branchName: <branch>)` → `<normalized>`.
4. Resolve `<base_sha>`: `git merge-base HEAD <--base REF, default
main>` (fallback `master` when `main` is absent).
5. If `.filid/harvest/<normalized>/manifest.json` exists AND its
   `head_sha` == `git rev-parse HEAD`: the spike is already harvested —
   skip to Step 5 (disposal).

**→ Immediately proceed to Step 2.**

### Step 2 — Decision Extraction

1. `git diff <base_sha>..HEAD --stat` and `--name-only` (Bash).
2. For every touched fractal module, read its `INTENT.md` (and
   `DETAIL.md` when present) and compare against what the spike code
   actually does.
3. Build a numbered decision list (`D-01`, `D-02`, …). A decision is an
   implicit choice the code made that the INTENT tree does not yet
   record: a new interface or contract, a changed boundary, a dependency
   direction, an error-handling policy, a threshold/format choice.
   Style and incidental refactors are NOT decisions. For each decision
   draft: summary, evidence (files/hunks), affected module path(s), and
   a candidate claim (claim / observable / expected / scope) per the
   ledger lint (`reference.md` → "Claim Drafting Rules").
4. If a previous (now stale) manifest exists, diff against its recorded
   decisions (`reference.md` → "Incremental Re-Harvest") and interview
   only new or changed decisions.
5. Zero decisions extracted → skip the interview and the ledger/INTENT/
   commit work (Step 3 and Step 4 items 1–3), but STILL seal the
   manifest (Step 4 items 4–5) with an empty `decisions` array and
   `head_sha` = current HEAD — a dead-end spike is itself a finding, and
   only the manifest unlocks disposal and the merge track. Then proceed
   to Step 5.

**→ Immediately proceed to Step 3. Do NOT pause to summarize the list.**

### Step 3 — Interview (human-gated)

<!-- [INTERACTIVE] AskUserQuestion: one decision at a time, keep/discard/defer -->

For each decision, one `AskUserQuestion` (single question, no batching):

```
AskUserQuestion(
  question: "D-01: <summary>\nEvidence: <files>\nCandidate claim: <claim> — observable: <observable>, expected: <expected>",
  options: [
    { label: "Keep",    description: "Record as acceptance claim + INTENT delta" },
    { label: "Discard", description: "Probe result rejected — no record beyond the manifest" },
    { label: "Defer",   description: "Undecided — recorded in the manifest, not in the ledger" }
  ]
)
```

- A **Keep** is final ONLY via the human answer. "Other" answers may
  rewrite the candidate claim text — adopt the user's wording.
- Record every answer in memory: `{id, disposition, final claim}`.

**→ After the last answer, immediately proceed to Step 4 in the same turn.**

### Step 4 — Record & Seal

1. **Ledger append** — create `.filid/criteria.md` from the template in
   `reference.md` when missing. For each Keep, append a `## CLM-NNN`
   claim (next sequential id; fields: status `active`, scope, claim,
   observable, expected, source `spike/<branch> harvest <ISO date>
(D-NN)`). The PreToolUse ledger lint denies malformed claims (missing
   fields, tautology, claim deletion) — fix and retry on deny, never
   bypass.
2. **INTENT deltas** — for each Keep, update the affected module's
   INTENT.md (Conventions / Boundaries) to carry the decision. Keep
   every INTENT.md within its 50-line cap even though the deny is
   suspended on this branch — the merge-track review will enforce it.
3. **Harvest commit** — `git add .filid/criteria.md <INTENT files>` and
   commit: `harvest(<branch>): record N acceptance claims`. Nothing else
   goes into this commit.
4. **Manifest** — first ensure `.filid/harvest/.gitignore` exists
   containing the single line `*` (the local manifest must never dirty
   the worktree — it would trip this skill's own Step 1 dirty-tree abort
   on re-runs and resolve's pre-check). Then write
   `.filid/harvest/<normalized>/manifest.json` (NOT committed — local
   gate state, like `.filid/review/*`):

   ```json
   {
     "base_sha": "<base_sha>",
     "head_sha": "<git rev-parse HEAD — after the harvest commit>",
     "diff_hash": "<sha256 of git diff <base_sha>..HEAD>",
     "criteria_delta_hash": "<sha256 of the appended claim block text>",
     "created_at": "<ISO 8601>",
     "decisions": [{ "id": "D-01", "disposition": "keep|discard|defer", "claim": "<CLM-id or null>" }]
   }
   ```

   Any commit after this point changes HEAD and auto-invalidates the
   manifest — that is the gate working, not a bug. Re-run harvest
   incrementally.

5. **Stale degraded review cleanup** — if
   `.filid/review/<normalized>/fix-requests.md` exists and contains
   `Type: harvest-required` (the Harvest-Required Variant written by the
   review guard against the pre-harvest state), clear that review
   session: `mcp_t_review_manage(action: "cleanup", projectRoot,
branchName: <branch>)`. Otherwise the now-obsolete degraded artifacts
   would route the next pipeline run to resolve instead of a fresh
   review.

**→ Immediately proceed to Step 5.**

### Step 5 — Spike Disposal

<!-- [INTERACTIVE] AskUserQuestion: disposal decision -->

```
AskUserQuestion(
  question: "Harvest sealed (<N> claims). How should spike/<name> be disposed?",
  options: [
    { label: "Discard (Recommended)", description: "Create a fresh work branch from base, cherry-pick ONLY the harvest commit, delete the spike branch (recoverable via reflog)" },
    { label: "Promote", description: "Rename the branch off the spike/ namespace — the probe code itself enters the merge track and will face full review" },
    { label: "Keep as-is", description: "Stay on the spike for more probing — the manifest stays current until the next commit" }
  ]
)
```

- **Discard**: ask for the work-branch name ("Other" input), then:
  `git checkout -b <work-branch> <base_sha>` → `git cherry-pick <harvest
commit sha>` → `git branch -D <spike-branch>`. The spike's probe code
  is dropped; only the oracle survives. Merge-track work re-implements
  against the recorded claims (Path A).
- **Promote**: `git branch -m <new non-spike name>`. Doc-hygiene denies
  re-apply immediately (branch authority), and review will judge the
  probe code against the in-scope claims.
- **Keep as-is**: END after the report; the per-prompt banner keeps
  tracking the spike.

### Step 6 — Report

Output summary: claims recorded (ids), deferred/discarded counts,
manifest path, disposal action. End with the terminal marker:

```
Harvest complete — N claims recorded
```

(or `Harvest aborted` on any abort path.)
