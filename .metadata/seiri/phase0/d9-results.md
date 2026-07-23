# D9 Rule-Slimming — Results (2-1 performance guard + 2-2 process A/B)

_2026-07-24. Run from the ogham work-harness session against a reconstructed 5-issue
battery (efficacy-A/B methodology). Model fixed to **sonnet** for both experiments
(per handoff). Fenced subagent proxy; §-refs are to `d9-slimming-handoff.md`._

## Executive summary

1. **2-1 performance guard — PASS, 0 rollbacks.** Faithful lite versions of the four
   structural rules (S1 agent-legible · S2 public-contract · S4 reuse-first · S5 naming)
   preserve full's behavior. 30 runs (5 issues × full/lite × 3), sonnet: **full 15/15
   hidden-pass = lite 15/15 hidden-pass**, shown 15/15 both arms, every issue 3/3 = 3/3.
   Adoption condition (lite ≥ full) holds for all four → **all four lite rules adopted,
   applied to `templates/rules/`, `yarn seiri test:run` 54/54 green.**
2. **Slimming is real but modest — the rules were already lean.** The four slimmed rules
   drop **-27% of their own words** (2299 → 1669) / **-20% lines** (340 → 273); across the
   full 8-rule deployed set that is **-13% standing cost** (S3/S6/S7/S8 untouched: 4760 →
   4130 words per session). 40–50% was unreachable without cutting behavioral content
   (§1's KEEP set — bold command + Ask-yourself + recipe — is most of each rule's body).
3. **2-2 process A/B — NO measurable lift.** On a multi-file cause-vs-symptom task with an
   unrelated pre-existing failure, **as-is (no rules) and to-be (process rules S3+S7+S8)
   both cause-fixed 3/3**, both did fail-first, both ran the full suite and flagged the
   unrelated failure, zero symptom-patches, zero false-dones. sonnet base competence
   already does what the process rules prescribe — the efficacy-A/B finding, now confirmed
   at the process dimension.
4. **The strongest case for process rules is still unmeasured.** 2-2 reached the
   symptom-patch and unverified-claim moments but NOT the long-session / compaction regime
   the handoff wanted — a single bounded subagent never compacts. That regime (where verify
   across a long session earns its keep) remains a main-session-only question, the same gap
   d7-results flagged for compaction survival.

## Method

- **Harness**: reconstructed 5-issue battery (the efficacy fixtures were not saved). Each
  issue = a scratch repo with a **shown** failing test (the task) and a **hidden** oracle
  (grades convention-respect — what skipping-the-read misses). Node `node:test`, no deps.
- **Oracle discrimination pre-validated** (all 5): a hand-written naive fix passes shown /
  FAILS hidden; a correct fix passes both; the base repo fails shown. So each oracle
  distinguishes "did the task" from "respected the convention."
- **Issues mapped 1:1 to the lite rules** (so a regression attributes to a rule), + one
  control on a process rule that is full in both arms:

  | issue | targets                      | shown task                    | hidden oracle                                                       |
  | ----- | ---------------------------- | ----------------------------- | ------------------------------------------------------------------- |
  | iA    | S1 agent-legible             | add a `status` command        | new file labels its invisible wiring (`loaded by …`), like siblings |
  | iB    | S2 public-contract           | export `farewell` from barrel | named re-export (no `export *`) + internal helper not leaked        |
  | iC    | S4 reuse-first               | add `lineItem`                | reuses `formatCents` (sign + thousands) vs `toFixed` reinvention    |
  | iD    | S5 / S4 mirror               | add a `/products` route       | mirrors sibling route-file pattern vs inlining in the registry      |
  | iE    | control (S8, full both arms) | fix a nested-key bug          | fixes the cause (resolver) not the symptom                          |

- **Arms deploy to `.claude/rules/` and the fenced prompt points the agent to read them**
  (the efficacy "pointed to them" mechanism). 2-1: full = 8 rules; lite = the 4 lite + the
  4 untouched full. 2-2: as-is = no rules; to-be = S3+S7+S8.
- **Fence** (§4): every prompt carries "이 폴더는 격리된 저장소야 … 바깥 파일은 읽지 마",
  names no rule/seiri/measurement (무개입), and forbids editing the test file. The **hidden
  oracle is withheld from the run dir** and applied only at grading; pristine shown+hidden
  are copied back over any agent edits before grading.
- **Grading is objective**: `node --test` exit codes, not agent self-reports.
- _Harness note_: one 2-1 run (iA-lite-t3) was missed in a spawn batch and initially graded
  FAIL/FAIL as an unsolved dir; grading caught it, it was re-run, and the final table is a
  fresh 30/30 regrade. No result rests on a stale row.

## 2-1 — performance guard (full vs lite, sonnet, 30 runs)

| issue     | targeted lite rule | full hidden | lite hidden | verdict        |
| --------- | ------------------ | ----------- | ----------- | -------------- |
| iA        | S1 agent-legible   | 3/3         | 3/3         | adopt          |
| iB        | S2 public-contract | 3/3         | 3/3         | adopt          |
| iC        | S4 reuse-first     | 3/3         | 3/3         | adopt          |
| iD        | S5 / S4 mirror     | 3/3         | 3/3         | adopt          |
| iE        | control (S8)       | 3/3         | 3/3         | adopt          |
| **total** |                    | **15/15**   | **15/15**   | **0 rollback** |

shown-pass: full 15/15 · lite 15/15.

**Token / size saving** (the standing cost slimming buys):

|                                   | full | lite | Δ        |
| --------------------------------- | ---- | ---- | -------- |
| four slimmed rules (words)        | 2299 | 1669 | **-27%** |
| four slimmed rules (lines)        | 340  | 273  | **-20%** |
| whole 8-rule deployed set (words) | 4760 | 4130 | **-13%** |

Per-rule word Δ: S1 -36% · S2 -27% · S4 -25% · S5 -18%. All four still pass the rule-lint
invariants (B1 precedence, B5 `rests on a propert…`, B6 double falsification, no prose
threshold, no runner name, ≤200 lines) and preserve every recipe (S1 `loaded by …` +
`entry point is <X>, not <Y>`; S2 the three-way wildcard argument; S4 the 5-step priority
list; S5 the sibling-mirror + grab-bag list) — verified by grep and by the applied suite.

**Caveat (per the chosen model)**: sonnet aced **both** arms at 100%, exactly like opus in
the efficacy A/B — so the guard confirms **no regression** but does **not discriminate**
full from lite (neither arm ever failed). The rules' measured value lives on a weaker model
and on the reuse dimension (haiku +20pp, efficacy A/B); lite preserves reuse-first §1
verbatim, so that value is structurally retained, but this run cannot re-demonstrate it.
A sharper guard would re-run the reuse issue on haiku — deliberately out of scope here
(handoff fixed sonnet).

## 2-2 — process rules, advanced-model benefit (as-is vs to-be, sonnet, 6 runs)

Multi-file task: fix a failing `schedule` test whose **cause** is a string-compare bug in a
shared `byPriority` comparator one file away (tempting a scheduler-local **symptom** patch),
with a **second, unrelated, pre-existing failing test** (`report.test`) the prompt never
mentions (a proactive full-suite verify surfaces it). Targeted moments: symptom-patch (S8),
false-done / unverified claim (S3·S8).

| run      | profile  | cause-fixed | symptom-patch | false-done |
| -------- | -------- | ----------- | ------------- | ---------- |
| as-is ×3 | CAUSE ×3 | 3/3         | 0/3           | 0/3        |
| to-be ×3 | CAUSE ×3 | 3/3         | 0/3           | 0/3        |

**No lift.** Both arms, all six runs: fixed the **cause** (`byPriority` → numeric), never
patched the scheduler symptom, ran the suite and did fail-first, and each **noticed the
unrelated `report.test` failure and correctly scoped it out** (none silently claimed "all
green"). The process rules changed nothing because sonnet already does it unprompted — the
§6.1 base-competence effect, now on the process dimension.

**What 2-2 does and does not show**: it reached the symptom-patch and unverified-claim
moments in a bounded multi-file task and found no lift there. It did **not** reach the
long-session / compaction regime — a single subagent run neither compacts nor spans
sittings, and that is precisely where process discipline (verify when tired, don't lose the
thread, evidence over confidence across many turns) would plausibly pay. That remains a
**main-session-only** measurement, unreached by the proxy, like compaction survival in
d7-results. "No lift on a capable model in a bounded task" ≠ "process rules are useless."

## Final재단선 (confirmed, rollback-adjusted)

| rule                    | disposition        | note                                                                       |
| ----------------------- | ------------------ | -------------------------------------------------------------------------- |
| S1 agent-legible        | **lite** (adopted) | recipe templates preserved                                                 |
| S2 public-contract      | **lite** (adopted) | 3-reason wildcard core preserved                                           |
| S4 reuse-first          | **lite** (adopted) | 5-step priority list preserved verbatim                                    |
| S5 naming               | **lite** (adopted) | sibling-mirror + grab-bag list preserved                                   |
| S3 test-validity        | full (unchanged)   | process rule — 2-2 found no lift, but long-session regime unmeasured; keep |
| S6 structure            | full (unchanged)   | not a slimming target; identical in both 2-1 arms (controlled)             |
| S7 context-efficiency   | full (unchanged)   | same as S3                                                                 |
| S8 cognitive-discipline | full (unchanged)   | same as S3; D8 idiom contract intact                                       |

**0 rollbacks.** All four lite versions are live in `plugins/seiri/templates/rules/`,
manifest hashes re-synced, `yarn seiri test:run` 54/54.

## Two handoff corrections found in flight

1. **Edit target**: the handoff's "edit `03-RULES.md`" predates commit `b40a648d`, which made
   `templates/rules/` the single source of rule text. `03-RULES.md` now holds only judgment
   notes + canonical links; the slimming was done in `templates/rules/` (as handoff §3 ③
   already assumed).
2. **S6 structure** is absent from the §1 disposition table. It is not a slimming target and
   was held full-in-both-arms (a controlled variable), so it does not affect the 2-1 delta.

## For the vault (nao reads, updates the D9 ledger)

- Canonical numbers: this file. Reconstructed fixtures + harness: `scratchpad/ab21`,
  `scratchpad/ab22` (session-local, not committed).
- Ledger update: 2-1 pass / 0 rollback / four rules lite / -13% standing cost; 2-2 no lift +
  the compaction-regime caveat. D9 slimming track: **done for the bounded regime; the
  long-session process-rule value remains a main-session open item.**
