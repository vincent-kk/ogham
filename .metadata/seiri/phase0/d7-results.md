# D7 Dispatch Battery — Results (subagent-proxy harness)

_2026-07-23. Run from session 0fc0faf5 against locally-installed seiri (cache/ogham/seiri/0.0.1, verified identical to source)._

## Executive summary — seiri real-harness validation (defined 2026-07-24)

What is established, and how far it is trusted:

1. **Dispatch works without coercion (D7)** ✅ — with no coercive bootstrap, trigger-description + Hand off chaining fired the auto skills at the right moment: **6/7 scenarios 5/5** on a fenced subagent proxy (33/35 = 94%). implement 3/5, its misses being competent base-behavior TDD (skill redundant at that altitude), not trigger failure. The D7 bet holds on the proxy; no SessionStart nudge is needed.
2. **Dispatched skills change behavior** ✅ — spot-checked: debug fixed root causes (not symptom patches), receive-review pushed back on unjust feedback 5/5, request-review handed work to independent reviewers with fail-to-pass verification, verify blocked a regression commit, execute/implement did fail-first.
3. **Standing cost + load** ✅ — the 4 invocable skills are absent from `/context` (0 standing cost); the 8 seiri rules + `filid_fca-policy` load as Memory files in a real main session (albatrion).
4. **Integration is merge-safe** ✅ — seiri × filid: 0 contradictions, transfers complete, boundaries clean (thresholds filid-only), live coexistence + orphan-retirement + byte-identical deployment confirmed, filid regression-free (1182 passed). Naming cross-tool seam accepted (seiri advisory, filid enforces — different layers by design).

Method artifact: a subagent-proxy harness (fresh agent + exact prompt + transcript grep) with a **cwd fence** to prevent the ambient-repo contamination that hit 9/35 v1 runs.

**Efficacy (measured 2026-07-24)**: no lift on a capable model (opus: as-is 100% = to-be 100% hidden-pass) but a **+20pp lift on a weaker model** (haiku: 80% → 100%, the whole gap on the reuse dimension where haiku's base competence slips). seiri is **insurance for weaker models**, not a universal boost — a token tax (~2.8×) that earns nothing on a strong model and a real correctness margin on a weak one.

Not yet established: **compaction survival** (needs a long main session) and the S9/D9 follow-ups. Proxy ≠ main-session gold standard throughout.

## Harness & method

- **Proxy**: each (scenario, run) = a fresh `general-purpose` subagent (opus-4-8), given the **exact temptation prompt only** (무개입, §1). This is NOT a main Claude Code session — it is a faithful proxy. §8 main-session runs by Vincent remain the gold standard.
- **Observation A (1급)**: grep the agent transcript `agent-*.jsonl` for `"skill":"seiri:<x>"` — the Skill tool_use input that marks an **autonomous dispatch**. Distinct from the skills-listing text (which uses different formatting), so it isolates real firing.
- **Behavior (layer D)** recorded separately from dispatch, per §2/§6.1.

### Harness flaw found → fixed mid-battery

v1 subagents inherit the **ogham cwd**, where the untracked test-design doc `.metadata/seiri/phase0/d7-dispatch.md` and the battery `manifest.json` are visible. Exploratory agents (planning agents; verify agents running `git status`) read the design and **learned they were being measured** — the observer effect §6.2 warns of. `plan-r1` detected this itself, cited §6.2/§6.3, and correctly refused to produce contaminated data. This is exactly why §5 mandates an **isolated test project**; the proxy harness violated it.

**Fix (v2 re-runs)**: a workspace **fence** in the prompt — "이 폴더는 격리된 저장소야. 이 폴더 안에서만 작업하고 바깥 파일은 읽지 마." — restoring §5 isolation. It names no skill and mentions no seiri, so it complies with §1; it only re-imposes the isolation a real separate test project would have. Agent descriptions also changed from revealing ("D7 plan r1", which `plan-r1` quoted) to neutral ("scratch repo task").

## Static contracts (confirmed, this session)

| Property                        | Result | Evidence                                                                                                                                                                                  |
| ------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| auto vs invocable split         | ✅     | auto 7 = `disallowed-tools: AskUserQuestion` only; invocable 4 = `disable-model-invocation: true`                                                                                         |
| 호출형 비노출 (standing cost 0) | ✅     | model skill-listing in this session shows only the 7 auto skills; setup/brainstorm/interview/finish absent                                                                                |
| chaining wired                  | ✅     | all 7 auto SKILL.md carry a `Hand off` line (implement/debug→verify, verify→request-review, plan→execute, execute→request-review/finish, receive-review→verify, request-review→implement) |
| finish discard safety           | ✅     | "name a backup ref first, require the user to type 'discard', then delete"                                                                                                                |
| installed artifact == source    | ✅     | diff cache verify SKILL.md vs source: identical; plugin.json has no `agents` field                                                                                                        |

## Dispatch firing rate (autonomous, no skill hint)

Metric = of N clean runs at the trigger moment, how many autonomously dispatched the target seiri skill.

| Scenario               | Target skill         | Fired / clean-N | Source    | Note                                                                                |
| ---------------------- | -------------------- | --------------- | --------- | ----------------------------------------------------------------------------------- |
| debug                  | seiri:debug          | **5/5**         | v1 clean  | + root-cause fixes, reproduce-first                                                 |
| execute                | seiri:execute        | **5/5**         | v1 clean  | + fail-first + progress ledger                                                      |
| receive-review         | seiri:receive-review | **5/5**         | v1 clean  | + 5/5 pushed back on the unjust "make it async"                                     |
| verify                 | seiri:verify         | **5/5**         | v2 fenced | v1 was 0 clean (all contaminated); the fence closed it                              |
| plan                   | seiri:plan           | **5/5**         | v2 fenced | v1-clean also 2/2 → consistent                                                      |
| request-review         | seiri:request-review | **5/5**         | v2 fenced | v1-clean also 4/4 → consistent                                                      |
| implement              | seiri:implement      | **3/5**         | v1 clean  | 2 non-fires = competent base-behavior TDD, not failures                             |
| **Total (clean runs)** |                      | **33/35 = 94%** |           | 6 of 7 scenarios at 5/5; only implement short, and its misses did fail-first anyway |

### Fence validation (harness self-check)

The v2 re-runs (verify, plan, request-review — 15 runs) had **0 contamination** vs. v1's 9/35. The workspace fence eliminated the ambient-cwd leak, and firing held at 5/5 — so the fence fixed the leak **without** depressing dispatch. plan and request-review firing agreed between v1-clean (unfenced) and v2 (fenced), so the fence did not distort the metric.

### Non-fire characterization

- **implement-r3, implement-r5**: NOT contaminated. The model fixed `parseDuration` with a **failing test first, then green** — the implement skill's own discipline — WITHOUT dispatching the skill. This is the §6.1 base-competence effect: on a simple single-function change a capable model already does fail-first TDD, so the skill is redundant there. Behavior good; dispatch absent. Real signal, not a harness artifact.

### Behavior quality (dispatch → correct action), spot-checked on clean runs

Dispatch is only half; §2 says record behavior separately. On clean ✓ runs the dispatched skill demonstrably changed action:

- **debug 5/5**: all fixed the **root cause** (`stored === password`, replacing the buggy `stored.compare(...)`) — not a symptom patch on the `catch`/500. Sequence = reproduce (run failing test) → dispatch → investigate → fix → verify green.
- **receive-review 5/5**: all **pushed back on the unjust ① "make it async"** with code-grounded reasoning ("JSON.parse is synchronous; wrapping in async forces `await` on all callers for no benefit"); applied ② error-handling and ③ rename. None blindly complied. This is the skill's core value (verify feedback against code).
- **implement / execute**: fail-first observed (test fails for the right reason pre-fix, green after) — reported by the runs themselves and confirmed in trees.
- **verify (v1, base-behavior)**: even without dispatch, a verify-moment agent ran the suite fresh, caught the uncommitted regression, and **blocked the commit** — the right outcome.
- **request-review (all runs)**: every run **handed the work to a fresh independent reviewer** (not its own session), which ran fail-to-pass verification and pushed back on unsound findings. Reviewers caught the seeded off-by-one (`todo.add` returns length, not index) and the unbounded-`complete` crash; several ran mutation probes to prove each fix was load-bearing. "Hand the reviewer the work," fully enacted — and correctly stopped short of merging (integration left to the lead).
- **execute (design observation)**: when a PLAN listed the implementation _before_ its test, execute agents consistently **reordered to test-first** to honor implement's fail-first discipline, and logged the deviation in a progress ledger. A real plan-order-vs-fail-first tension in the execute↔implement handoff — worth addressing in the execute skill or the PLAN template, not a dispatch problem.

## Contamination log (v1)

9/35 runs contaminated (read the test design or battery meta):

- **Deep** (used meta-vocabulary 무개입/자율발화/관측자 → fully understood the test): plan-r1, plan-r2, plan-r5, verify-r1, verify-r2, verify-r4, request-review-r3
- **Shallow** (glimpsed battery filenames only): verify-r3, verify-r5

All excluded from the honest rate; verify (0 clean) fully re-run in v2.

## Chain (§4)

Both `chain-r1` and `chain-r2` (fenced) took the multi-file "add a payment webhook handler" task. Both dispatched **implement → verify** — the completion-gating Hand off works. Neither began with **plan** (the "여러 파일이 얽힐" wording did not evoke it; each judged the feature directly implementable and built `src/webhook/*` across files under implement's own fail-first), and neither ended with a **request-review** handoff after verify (verify→request-review is a suggestion; both stopped at "done"). Both produced real, tested multi-file implementations — chain-r1: 14/14 green, HMAC-SHA256 + `crypto.timingSafeEqual`, fail-closed on missing secret; chain-r2: 21/21 green plus a **mutation probe** (broke `verifySignature`, watched 7 tests go red, restored) confirming the tests are load-bearing.

**Chain conclusion**: the load-bearing transition (implement→verify) fires reliably; the plan-lead and request-review-tail are scope-sensitive and did not trigger on a single tractable feature — consistent with the standalone plan finding.

## Side measurements

| Measure                 | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 호출형 비노출           | ✅ **confirmed in a real main-session `/context`** (2026-07-23, fresh session): `Skills · Plugin (seiri)` lists only the 7 auto skills (~50-60 tokens each); setup/brainstorm/interview/finish absent → 0 standing cost. Upgrades the proxy static finding to gold-standard.                                                                                                                                                                                                                                                                                           |
| 질문 금지 (auto skills) | 0 / 52 battery transcripts used `AskUserQuestion`; firing agents used conservative defaults (plan-r2 reported explicitly). **Caveat**: subagents may lack `AskUserQuestion` inherently (headless), so this 0 does not prove the skill's `disallowed-tools` _enforcement_ — only the static contract (declared) + consistent behavior. Enforcement is a Vincent main-session check.                                                                                                                                                                                     |
| 규칙 `/context` 실로드  | ✅ **confirmed in a real main-session `/context`** (albatrion, 2026-07-23). Two snapshots tell the whole migration: **before** — 5 legacy filid rules loaded (fca-policy, reuse-first, cognitive-discipline, test-validity, context-efficiency), no seiri. **after** `/seiri:setup` + re-run `/filid:setup` — Memory files show **8 `seiri_*.md` (S1–S8) + `filid_fca-policy` alone**; the 4 transferred rules retired from the `filid_*` namespace and reappear under `seiri_*`. Orphan retirement + no double-load, live in a real project. See Integration section. |
| 규칙 컴팩션 생존        | Vincent main-session track (needs long session)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

## Integration / merge gate (main-session `/context`, albatrion 2026-07-23)

The albatrion `/context` (both plugins installed, rules deployed) closes several merge-gate items live in a real project:

- **공존 (coexistence)** ✅ — `.claude/rules/` holds 8 `seiri_*.md` + `filid_fca-policy.md` side by side, no filename collision (namespace prefixes keep them apart).
- **Orphan retirement / no double-load** ✅ — re-running `/filid:setup` after the slim retired the 4 transferred `filid_*` rules; they now exist only under `seiri_*`. The feared "old `filid_*` orphan + new `seiri_*` → double-load" did not occur.
- **File-level transfer consistency (중복 없음, namespace)** ✅ — no rule name appears in both namespaces.
- **호출형 비노출** ✅ — /context Skills lists only the 7 auto seiri skills; the 4 invocable ones absent.

Content-level cross-check (adversarial contradiction audit + inline verification, 2026-07-24; the duplication/transfer audit died after reading the 9 files, so that half was completed inline):

- **모순 없음** ✅ — **0 contradictions**. 8 near-misses (barrel imports, ceremony vs minimal-code, split-direction vs thresholds, 15-case, naming, corridor vs fractal-nesting, reuse vs pure-function-isolation) all resolved by each seiri rule's precedence header + explicit deferral of specific values to the architecture tool. seiri declares no numeric thresholds of its own (verified: 0 threshold numbers in seiri bodies). **Robust to precedence ranking**: since both plugins deploy to `.claude/rules/` as peers (header ranking may not order them), the audit verified that seiri's substantive "if the repo or its architecture tooling declares a limit, follow it" clauses resolve every overlap on their own — the result does not depend on filid outranking seiri. Positive alignments (DAG, wildcard-export ban, entry-point/internals split, framework-file-as-public-surface, trust-boundary exemption) reinforce rather than merely coexist.
- **누락 없음** ✅ — every transferred clause landed (naming → seiri principle; import-boundary → filid; barrel → both altitudes; INTENT/DETAIL → filid).
- **중복** ◐ — clean for thresholds, INTENT/DETAIL, import-boundary, 15-case (each single-homed). **Two _deliberate_ cross-altitude overlaps, not accidental drift**: (1) no-`export *` — filid keeps the structural fact ("index.ts pure barrel, named re-exports"), seiri_public-contract §2 keeps the principle + 3 reasons (design A-1: 구조 사실 잔류·서술만 이관); (2) naming — seiri_naming holds the principle ("mirror the siblings"), while filid's **scanner code** (`checkNamingConvention.ts`) retains the camelCase/kebab/PascalCase regex as a warning. Both intentional, both non-contradictory.

**Decision — naming cross-tool seam (resolved 2026-07-24: accept, no change)**: seiri_naming defers to repo conventions ("mirror the siblings; no siblings → idiomatic form"); filid's scanner warns on anything outside camelCase/kebab/PascalCase. Resolution: **accept as-is.** Rationale (user): seiri is advisory — it enforces nothing — and filid enforcing naming, one of many structural checks it runs, is exactly filid's role (임계/구조). The two operate at different layers by design; the seam is not a defect. seiri's precedence already yields to repo conventions and filid's check is a configurable warning, so nothing needs softening.

**회귀 (filid regression)** ✅ — after the slim, `yarn filid test:run` = **1182 passed / 7 skipped** (2026-07-24). The scanner/review engine is untouched by the rule-doc removal.

Still open:

- **공백 재현** — the transient gap when `/filid:setup` runs before `/seiri:setup`; the success path is demonstrated, the gap window itself is obvious by construction — an accepted R6 tradeoff mitigated by orphan-retirement + release-note ordering. Effectively closed.
- **컴팩션 생존** — needs a long real session (main-session track).

**Merge-gate bottom line**: green on every axis that can be verified now — no contradictions, transfers complete, boundaries clean, coexistence + orphan-retirement + /context load confirmed live in albatrion, deployment byte-identical, filid regression-free. Only compaction survival (needs a long session) and the efficacy A/B remain, and neither blocks the structural merge.

## Efficacy A/B (B) — does seiri raise agent success? (2026-07-24)

**Design**: 5 issues stratified (tacit-convention, pattern-propagation, feature/reuse, 2× bugfix). Each is a scratch repo with a **shown** failing test (the task) and a **hidden** oracle (grades whether the fix respected the repo's convention/pattern — the thing skipping-the-read would miss). Pre-flight validated: hand-written _naive_ fixes pass shown but FAIL hidden; _correct_ fixes pass both — so the oracle discriminates. Arms: **as-is** (no rules) vs **to-be** (8 seiri rules in `.claude/rules/`, agent pointed to them), fresh **opus-4-8** subagent, 3 trials each = 30 runs. Fenced. Control verified pure (as-is read 0 seiri rule files).

| metric                                           | as-is            | to-be            |
| ------------------------------------------------ | ---------------- | ---------------- |
| **hidden-pass (quality / convention respected)** | **15/15 (100%)** | **15/15 (100%)** |
| shown-pass (task done)                           | 15/15            | 15/15            |
| avg output tokens                                | 3.2k             | 8.8k (**2.8×**)  |
| avg files read                                   | 4                | 7                |

**No measurable success-rate lift; to-be cost ~2.8× the tokens for the same 100% outcome.** On every discriminating issue the as-is (no-rules) agents already read the siblings, mirrored the pattern, and reused the helper — a capable model does unprompted exactly what seiri's read-before-adapt / mirror-siblings / reuse-first rules prescribe. The §6.1 base-competence effect, now measured on efficacy rather than dispatch. A sharper observation from the completion reports: the to-be agents **cite the rules by section** ("reuse-first §1", "test-validity §1", "cognitive-discipline §5") in their justifications, yet emit **identical code** to as-is — here the rules changed the _explanation vocabulary_, not the actions.

**What this does and does not show** (critical to read together):

- It shows no lift **in this regime**: strongest model + tiny repos where the convention sits one file away + one-shot tasks.
- It does NOT show seiri is useless. The regime was maximally unfavorable to detecting a lift: (a) opus reads repos better than any weaker model; (b) 2–4 file repos make conventions trivially discoverable — a large repo hides them, which is exactly where read-before-adapt earns its keep; (c) one-shot tasks never reach the moments seiri's PROCESS rules target (false "done", symptom-patch under load, unverified claims across a long session). Treatment engagement also varied: to-be agents read all 8 rules on i1/i2 but only 0–2 on the bugfixes (they judged simple tasks didn't need them) — yet as-is already hit 100%, so this changed nothing.
- The **token cost is real and regime-independent**: heavy rule injection is a standing tax (~2.8× here). This sharpens **D9** (slim the rules) and echoes the D7 implement finding (skill redundant with base competence).

### Weaker-model arm (haiku, same 5 issues × 2 arms × 3 trials, 2026-07-24)

| metric                    | as-is           | to-be            |
| ------------------------- | --------------- | ---------------- |
| **hidden-pass (quality)** | **12/15 (80%)** | **15/15 (100%)** |
| shown-pass (task done)    | 15/15           | 15/15            |

**The lift appears — and it is dimension-specific.** The entire 20-point gap is one issue: **i3 (reuse) — as-is 0/3, to-be 3/3.** Haiku _without_ rules **never** reused `formatCents` (all three reinvented the money format with `toFixed`, missing the thousands separator and negative-sign placement → hidden FAIL); haiku _pointed at the rules_ **always** composed the existing helper (reuse-first §1) → hidden PASS. On i1/i2/i4/i5 haiku handled both arms fine (no gap). shown-pass stayed 100% both arms — the difference is convention-respect on the reuse task, not task completion.

### Synthesis — seiri's value is model- and dimension-dependent

|                   | opus  | haiku                    |
| ----------------- | ----- | ------------------------ |
| as-is hidden-pass | 100%  | 80%                      |
| to-be hidden-pass | 100%  | 100%                     |
| **seiri lift**    | **0** | **+20pp (all on reuse)** |

seiri rescues a weaker model exactly where that model's base competence slips — composition/reuse — and adds nothing where the model is already capable (opus, or haiku on the easier dimensions). It is **insurance, not a universal boost**: a token tax (~2.8× on opus) that buys nothing on a strong model and a real correctness margin on a weaker one. This prices the **D9** tradeoff precisely — the heavier the model, the less the rules earn; deployments on weaker/cheaper models are where the standing cost pays for itself.

**Still untested**: large repos with hidden conventions (harder to construct, and opus would likely still ace them), and multi-step work where the process rules (verify, fail-first, cause-not-symptom) target moments a one-shot task never reaches.

## Verdict (§7)

**D7 bet largely upheld — on the subagent proxy.** With no coercive bootstrap (§4's part ②), trigger-`description` + `Hand off` chaining alone drove autonomous dispatch at the right moment: **6 of 7 scenarios fired 5/5**, misfires low (only chain-forward implement↔verify, zero spurious over-broad firing), and question-asking was fully suppressed (0/52).

Two honest nuances, not failures:

- **implement 3/5**: the two non-fires were a capable model doing fail-first TDD on a one-function change _without_ the skill — the skill is redundant at that altitude, not failing. Its value should show on larger changes; on trivial ones base competence substitutes. (Bears on the D9 slimming question more than on D7.)
- **plan trigger is size-sensitive**: standalone `plan` scenarios fired 5/5, but in the CHAIN prompt ("여러 파일이 얽힐 거야") on a tiny 2-file repo the agents went straight to `implement`, not `plan`. The multi-file _words_ did not evoke plan; the agent judged the work directly implementable. plan appears to need genuinely larger / multi-sitting scope to fire. In the chain runs the load-bearing **implement→verify** transition fired in both; the plan-lead and request-review-tail did not (scope-sensitive), so the chain is real at its gating link but not end-to-end on a single tractable feature.

### Caveats binding this verdict

1. **Proxy ≠ gold standard.** Subagents dispatch by the same description-matching, but a main Claude Code session carries CLAUDE.md, deployed rules, prior turns, and other skills competing for attention. §8 main-session runs remain the authoritative confirmation, especially for verify-suppression enforcement, `/context` rule-load, and compaction survival — none of which the proxy can settle.
2. **Harness leak (now fixed).** 9/35 v1 runs self-contaminated via the ambient ogham cwd; corrected by a workspace fence (0/15 in v2). Any future proxy battery must fence from the start (or run in a truly separate project, per §5).
3. **Residual name-leak.** Agent identities were descriptive in v1 ("D7 plan r1"); neutralized in v2. Fenced agents cannot connect a name to a skill without the design doc, so the residual is negligible — but a fully clean run uses opaque identities too.

### Recommendation

On proxy evidence, the **SessionStart 비강압 안내 1줄 (D7 fallback) is not needed for debug/execute/verify/receive-review/request-review** — they fire reliably unprompted. Re-check **implement** and **plan** under §8 main sessions before deciding: their "misses" may be benign (base competence / correct altitude judgment) rather than trigger weakness. Do not add coercive bootstrap.
