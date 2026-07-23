# 03 — 규칙

**본 문서가 규칙의 정본입니다.** 각 절의 코드펜스 안 본문이 그대로 `plugins/seiri/templates/rules/seiri_<slug>.md`로 추출됩니다(추출 시 무수정). 한국어 판정 노트는 설계 기록이므로 추출하지 않습니다.

규칙 본문은 영문입니다 — 배포되어 모델이 읽는 산출물이기 때문입니다.

## 상태표

| #   | 파일                            | 형식 층  | 형태              | 상태                        |
| --- | ------------------------------- | -------- | ----------------- | --------------------------- |
| S1  | `seiri_agent-legible.md`        | L0·L1    | 레시피            | ✅ 통과 (07-23)             |
| S2  | `seiri_public-contract.md`      | L2       | 레시피            | ✅ 통과 (07-23)             |
| S3  | `seiri_test-validity.md`        | L4       | 혼합              | ✅ 이관본 (§1 프로세스)     |
| S4  | `seiri_reuse-first.md`          | L3       | 레시피            | ✅ 이관본 (0/3 준수)        |
| S5  | `seiri_naming.md`               | L0       | 레시피(발견 위임) | ✅ 이관본 (0/3 준수)        |
| S6  | `seiri_structure.md`            | L0·L1    | 방향형            | ✅ 이관본 (방향형)          |
| S7  | `seiri_context-efficiency.md`   | 6층 예외 | 레시피            | ✅ 통과 (D8 무삭감)         |
| S8  | `seiri_cognitive-discipline.md` | 6층 예외 | **금지+합리화표** | ✅ 통과 (D8 무삭감)         |
| S9  | `seiri_decision-trail.md`       | L5       | 템플릿 슬롯       | ⏸ opt-in 확정 · 대조군 대기 |

**공통 검증**: 전 규칙에 우선순위 사슬·형식 근거·이중 반증 적용. 임계 숫자 0건, 언어 특정 예시 0건, 각 200줄 미만.

**규칙 검증 판정 (2026-07-23)** — 근거·표본 원문 [phase0/](./phase0/) · 종합 [phase0/SYNTHESIS.md](./phase0/SYNTHESIS.md):

- **S1·S2 — 신규 검증 통과 (v1 무수정)**: 함정 구조의 신규 구조 규칙. 단일샷 대조→처치 반전(S1 0/5→5/5 · S2 §1 4/5→0/5 · S2 §2 재설계 5/5→0/5).
- **S3·S4·S5·S6 — 이관본(filid 계승) 통과**: 단일샷 micro-test에서 대조군 실패 미재현(S3 §1 fail-first 0/5×2설계 · S4 §1 reuse 0/3 · S5 §3 grab-bag 0/3). 규칙 무용이 아니라 **유능한 모델의 단일샷 기본 행동**이라 계측 불가 — 프로세스 규율·좋은 관행은 filid 운영 실적 + 실하니스 10이슈 A/B가 증거.
- **S7·S8 — 이관본 통과 (D8 확정 2026-07-23: 규칙 무삭감)**: 스킬과의 중복은 원칙(규칙·상시)/절차(스킬·순간)의 altitude 분리로 판정. 상시 예산은 규칙 1벌뿐(스킬 본문은 발화 시에만 로드)이라 I10 이중 지불 불성립, 스킬은 2KB 캡 직하(brainstorm 2048/2048B)라 trim은 이동이 아니라 삭제가 되며, 합리화 계열 조항의 자리는 02-ARCHITECTURE 삼분법의 "순간+**인지 부재**→규칙 잔류" 칸. 드리프트 완화는 리워딩이 아니라 고정 — A-6 rule-lint에 공유 관용구("pays twice"·"fix where it started") 양측 존재 검사를 추가한다. D7 실측 후 재검토 가능.
- **S9 — D2 확정 (편입 opt-in), 등재는 유보**: Phase 0 대원칙(대조군 없이 만들지 않는다)에 따라 자체 대조군(3표본)이 실패를 보인 뒤 manifest에 opt-in(recommended: false)으로 등재한다.

**A-1c 실행 완료 (2026-07-23)**: S1~S8을 `templates/rules/seiri_*.md`로 무수정 추출(결정적 스크립트, 전 파일 무결성 검사 통과, 최장 107줄, 러너명 금칙 0건) · manifest 8항 등재(권장 3종 S1·S3·S4) · `yarn seiri build`가 templateHash 8건 주입 · `yarn seiri test:run` **45 passed**. S9는 대조군 통과 후 추가 등재.

---

# 1. 상용구 사전

모든 규칙이 공유하는 문구. **여기서만 정의하고 규칙 문서는 이것을 인용합니다** — 규칙마다 제각각 쓰면 나중에 전 문서를 손봐야 합니다.

## B1. 우선순위 사슬 — 모든 규칙의 첫 줄

```markdown
> **Precedence**: repository instructions (CLAUDE.md, project rules) >
> repository conventions > this rule > seiri defaults. On conflict, the
> higher source wins and this rule yields.
```

**근거**: 공식 — _"두 규칙이 모순되면 Claude는 임의로 하나를 고를 수 있다."_ 텍스트로 못 박는 것 외에 수단이 없습니다.
**배치**: 제목 바로 아래, 목적 문단보다 **앞**.

## B2. 하방 개방 — 임계가 필요한 규칙

```markdown
If this repository declares a limit, follow that limit. Otherwise apply the
direction only: <direction>.
```

**금지**: 구체 숫자를 seiri 규칙에 쓰지 않습니다. 임계는 저장소나 filid 소유입니다.

## B3. 역할 지칭 — 오라클을 부를 때

```markdown
Use this repository's own verification command — the one its instructions or
tooling designate. Do not assume a specific tool or runner.
```

**금지**: 구체 명령(`npm test` 등)을 쓰지 않습니다.

## B4. 발견 위임 — 관례를 따를 때

```markdown
Discover the convention in place before applying this rule: read sibling files,
existing config, and recent commits. Match what you find. Where no convention
exists, use the language or framework's idiomatic form.
```

## B5. 형식 근거 — 각 규칙의 목적 문단에 1줄

```markdown
This rule rests on a property every codebase has: <형식 진술>.
```

**이 문장을 못 쓰면 그 규칙은 값에 기대고 있다는 신호이므로 기각합니다.** 규칙 심사의 실질적 게이트이며, `rule-lint`가 기계 검사합니다.

## B6. 이중 반증 — 각 규칙의 말미

```markdown
**This rule is working if:** <관측 가능한 결과 2~3개>
**This rule is wrong for you if:** <이 규칙을 적용하면 안 되는 관측 가능한 상황>
```

후자는 seiri 추가분입니다. 규칙이 자기 부적용 조건을 명시하면 모델이 무리하게 적용하지도, 통째로 기각하지도 않습니다.

## B7. 스코프 조건문 — 예외 조항 대신

```markdown
Applies when: <관측 가능한 술어>.
```

- ✅ `Applies when: the change is intended to land in version control.`
- ❌ `This rule does not apply to throwaway code.` — **예외 조항 금지**

**근거**: 실측 — _"예외 조항은 스코프하지 않는다"_, _"뉘앙스 조항 하나가 일관된 결과를 노이즈로 무너뜨렸다."_

## B8. 거부권 조항 — 호출 스킬 전용

```markdown
If the user says to proceed without further questions, stop asking. Write what
you have as an artifact and hand it over. Do not modify files or delegate
execution on the strength of an unfinished interview.
```

## B9. 자동 스킬 계약 — 상태 3·4 전용

```markdown
This skill was invoked automatically. Do not ask the user questions. When a
choice is needed, take the conservative default and state the choice in one line.
```

- frontmatter `disallowed-tools: AskUserQuestion`

---

# 2. 규칙 문서 골격

```markdown
# <Rule Title>

[B1 우선순위 사슬]

<목적 1~2문장>
[B5 형식 근거 1줄]

**Tradeoff:** <무엇을 희생하는가>
[B7 스코프 조건문]

## 1. <볼드 한 줄 명령>

<불릿>
Ask yourself: "<행동 앵커>"

## 2. …

---

[B6 이중 반증]
```

**규율**

- **200줄 미만**
- 원칙 문장은 6층 어휘로만, 예시는 의사코드·구조 서술
- **작성 전 실패 유형을 분류**합니다: 규율 위반형이면 금지+합리화표, **형태 오류형이면 긍정형 레시피**(금지문은 역효과), 요소 누락형이면 템플릿 슬롯, 조건 의존형이면 조건문
- 개수·목록을 쓰지 않습니다(드리프트하면 없느니만 못합니다)
- 수치를 쓰려면 재생산 명령을 같은 문단에

---

# 3. 규칙 전문

## S1. `seiri_agent-legible.md` — seiri의 존재 이유

**판정 노트**: 에이전트 코드 오독 6메커니즘 중 ②(암묵 관례)·⑤(반복 구조 오편집)·③(이름·위치 함정)·①(간접 참조)을 겨냥. 두 선례 어디에도 독립 규칙으로 없던 자리. 형태: 작성자가 표지판을 _빠뜨리는_ 실패이므로 긍정형 레시피.

```markdown
# Agent-Legible Code

> **Precedence**: repository instructions (CLAUDE.md, project rules) >
> repository conventions > this rule > seiri defaults. On conflict, the
> higher source wins and this rule yields.

Code is read by agents and newcomers who hold no tribal memory: what the
file does not show, they will guess. This rule makes the invisible parts
visible at the point where they bite.
This rule rests on properties every codebase has: code lives in files with
names and paths, and symbols are defined and referenced.

**Tradeoff:** a few lines of signposting, and sometimes a plainer
construction where a cleverer one would also work.
**Applies when:** the change is intended to land in version control.

## 1. State the invisible wiring

**When behavior is bound by position, name, or registration — write down
where the binding lives.**

- Some code has no visible call site: the framework invokes it because of
  its file path, its name pattern, an annotation, or a registration made
  elsewhere. A reader holding only this file cannot predict when it runs.
- At the entry of such a file (or its module doc), state the mechanism in
  one line: `loaded by <mechanism>; <path/name/annotation> determines <what>`.
- Framework conventions stay — this rule asks you to label them, not to
  fight them.

Ask yourself: "Could a reader with only this file and its imports predict
when this code runs?"

## 2. Give every repeated block a unique anchor

**In repetitive structures, order is not an address.**

- Lists of near-identical entries (config blocks, case tables, parallel
  handlers, fixtures) invite edits that land on the wrong instance. Each
  instance needs a distinct handle: a name, a key, or an adjacent marker
  that appears nowhere else.
- When several near-identical copies of a structure exist across the
  repository (source vs. generated, template vs. instance), make the
  editable one identifiable — state which copy is canonical.

Ask yourself: "If I asked someone to edit the third block, could they
pick the wrong one?"

## 3. Defuse name traps

**When a name will mislead, fix the name — or post a warning where the
misleading happens.**

- Traps: an entry point that is not the conventional file; several files
  sharing one basename in sibling directories; a module whose name
  suggests a role it does not have; aliases that diverge from on-disk
  paths.
- Prefer renaming toward the convention. When renaming is out of scope,
  one line at the point of confusion: `entry point is <X>, not <Y>`.

Ask yourself: "What would someone reasonably assume from this name — and
is that assumption true?"

## 4. Prefer the direct reference

**When a direct call and an indirect mechanism are equally capable,
choose direct.**

- Every hop — a re-export chain, an event bus, a registry lookup, a
  string-keyed dispatch, deep inheritance — hides the reader's next step.
  Indirection is a cost you pay for a capability; when the capability is
  not needed, do not pay.
- Indirection demanded by the architecture or the framework is not yours
  to remove — label it (rule 1) and move on.

Ask yourself: "Can a reader follow this reference with plain text search?"

## 5. Keep one unit graspable in one sitting

**A unit should be understandable alone: purpose from its name and head,
dependencies from its imports, effect from its exports.**

- When understanding one file requires holding several others open at
  once, the boundary is drawn wrong — split the unit, or localize what it
  depends on.
- Readers — human and agent — reason best about what fits in view at
  once. A file that keeps demanding context beyond itself is a boundary
  smell, not a reading-skill problem.

Ask yourself: "Can I state what this file does without opening a second
file?"

---

**This rule is working if:** edits land on the intended instance on the
first attempt; a new file's run-conditions can be stated from the file
alone; plain text search finds a feature's wiring.
**This rule is wrong for you if:** the indirection you want to remove IS
the framework — label framework conventions and leave them standing.
```

## S2. `seiri_public-contract.md`

**판정 노트**: filid의 배럴 규칙·진입점 규칙·재사용 규칙 §5를 병합 승격. 경계의 _형태_(`index.ts` 여부, 적용 대상, 외부/내부 import 구분)는 filid 잔류 — seiri는 "무엇을 공개하는가"만 다룹니다.

```markdown
# Public Contract

> **Precedence**: repository instructions (CLAUDE.md, project rules) >
> repository conventions > this rule > seiri defaults. On conflict, the
> higher source wins and this rule yields.

What a module exports is a promise to every present and future consumer.
This rule keeps that promise small, named, and enumerable.
This rule rests on a property every codebase has: a distinction exists
between what is public and what is internal.

**Tradeoff:** occasionally you will export one symbol twice on purpose
(once for use, once for stated intent) instead of exporting everything once.
**Applies when:** the language or module system in use has an export or
visibility mechanism.

## 1. Export only what has a consumer

**An export with no consumer carries a stated intent — or gets removed.**

- Exporting is publication, not filing. Every public symbol widens the
  surface that must stay compatible.
- A symbol nothing consumes is either intended API (state it: a doc line,
  a public-surface list — whatever this repository uses) or leftover
  (remove it). Usage is checkable by tools; intent must be written by you —
  exported symbols cannot enumerate their future callers.

Ask yourself: "Who consumes this — and if no one yet, where did I say so?"

## 2. Name every re-export

**A contract you cannot enumerate is not a contract.**

- Wildcard re-exports hide the surface three ways: a new symbol added to
  an internal file silently widens the public contract; duplicate names
  across re-exported files drop silently; and text tools lose the symbol
  list at the boundary.
- Entry points list what they export, by name. The list is the contract,
  and diffs to the list are visible in review.

Ask yourself: "Can I read the public surface without resolving a wildcard?"

## 3. Entry points declare, internals implement

**The set of symbols reachable from the entry point IS the public
contract; everything behind it is free to change.**

- An entry point contains declarations of the surface — re-exports and
  wiring — not implementation. Implementation lives in internal files
  where it can be reshaped without touching the contract.
- Consumers outside the module hold only entry-point symbols. What shape
  the entry point takes and where module boundaries lie is the
  repository's (or its architecture tooling's) decision — follow it.

Ask yourself: "If I renamed every internal file, would any consumer break?"

## 4. Framework-invoked files are entry points too

**A file the framework calls by convention is public surface, even though
no import names it.**

- Routes, pages, handlers, plugin manifests: their exported shape is a
  contract with the framework. Treat changes to that shape as contract
  changes, and label the convention that invokes them (see
  seiri_agent-legible §1).

Ask yourself: "What breaks at runtime if I change this export's shape —
and would any import have warned me?"

---

**This rule is working if:** the public surface can be enumerated by
reading entry points; removing an internal symbol breaks no consumer;
review diffs show contract changes as changed lines in an export list.
**This rule is wrong for you if:** the code is a single-file script or
notebook with no module boundary — there is no contract to keep small.
```

## S3. `seiri_test-validity.md`

**판정 노트**: filid 5조 계승 + §6 무한 축적 금지 신설(하방 개방). 오라클은 전부 역할 지칭 — 구체 명령 0건. §1의 리팩토링 계약 반전 조항은 filid `restructurer` 안전 조항의 원본이므로 문구를 보존합니다.

```markdown
# Test Validity

> **Precedence**: repository instructions (CLAUDE.md, project rules) >
> repository conventions > this rule > seiri defaults. On conflict, the
> higher source wins and this rule yields.

A passing test is evidence only if it could have failed. These rules
define when a test counts as verification.
This rule rests on a property every codebase has: a means of verification
exists and can be run.

**Tradeoff:** one extra verification step per test, in exchange for tests
that mean something.
**Applies when:** the change is intended to land in version control.

## 1. Fail first, then fix

**A fix's test is valid only if it fails without the fix — for the bug's
reason.**

- Before finishing a bug fix, run its test against the pre-fix code and
  watch it fail. Use a scoped mechanism (revert locally, stash only the
  changed files, or a scratch worktree) — never disturb unrelated work.
- The failure must be the bug's symptom — not a setup error, a wrong
  path, or a missing import. When the fix introduces a new symbol, the
  expected pre-fix failure IS that symbol's absence.
- Refactors invert the contract: existing tests MUST pass unmodified
  before and after. Pin current behavior with added characterization
  tests BEFORE moving code — adding tests is fine; editing existing
  assertions is not.

Ask yourself: "Have I watched this test fail for the reason the bug exists?"

## 2. Verify the artifact you changed

**Verification against the wrong build always passes.**

- Use this repository's own designated verification command — the one its
  instructions or tooling name. Wrappers carry environment, build steps,
  and flags that raw tools lack; a raw-tool pass is diagnostic, never the
  final evidence.
- Confirm the harness exercises your modified code — not a stale build,
  an installed copy, or a cached artifact. If unsure, break your change
  deliberately once in a unit-scoped check and revert the probe: the run
  must go red. If it stays green, you are testing some other copy.

Ask yourself: "Is this command exercising the code I just edited?"

## 3. A snapshot is a claim, not a recording

**A snapshot captured from buggy code certifies the bug.**

- A regenerated snapshot is an assertion you are authoring. Read the
  diff; be able to defend every changed line, or do not commit it.
- Never regenerate snapshots to turn a run green without stating, in the
  diff or the change description, why the new output is the correct output.

Ask yourself: "Can I defend every changed line of this snapshot?"

## 4. Skips are loud

**A silent skip reports PASSED.**

- A test that cannot run in the current environment is a skip with a
  reason string, through the harness's own skip mechanism. A bare early
  return or a commented-out assertion converts a missing test into a
  green one.

Ask yourself: "If this test silently stopped testing, would anyone know?"

## 5. Every clause of a fix is load-bearing

**For each clause of your fix, some test must break when it is removed.**

- Delete each load-bearing clause (mentally or actually): at least one
  test must go red for each. A clause no test requires is untested or
  unnecessary.
- The same check applies to defensive code in module internals: a guard
  no internal path can reach is scope creep in a safety vest.
  Trust-boundary validation (public APIs, user input, external data) is
  exempt — exported symbols cannot enumerate their callers.

Ask yourself: "Which test breaks if I remove this line?"

## 6. Tests are curated, not accumulated

**A suite that only ever grows is drifting toward noise.**

- If this repository declares a per-file or per-suite limit, follow that
  limit. Otherwise apply the direction only: a test file that keeps
  growing is a signal to split by behavior or to merge duplicates into a
  parameterized form.
- Never delete or omit a needed test to satisfy tidiness — coverage
  outranks curation. Curate by merging and splitting, not by discarding.

Ask yourself: "Is this file accumulating cases, or organizing them?"

---

**This rule is working if:** your tests fail before your fixes and pass
after; snapshot diffs are explained; skipped tests say why; deleting any
part of a fix turns something red.
**This rule is wrong for you if:** the code is a throwaway spike that
will never be committed — then remember only that a test you never saw
fail proves nothing either way.
```

## S4. `seiri_reuse-first.md`

**판정 노트**: filid 재사용 규칙 계승(원류는 LLM 코딩 함정 대응 가이드라인). §5의 지역 배럴 경유 금지 문장은 경계 규칙이므로 **filid로 회수**하고 미포함. 네이밍 절은 S5로 병합했습니다.

```markdown
# Reuse First

> **Precedence**: repository instructions (CLAUDE.md, project rules) >
> repository conventions > this rule > seiri defaults. On conflict, the
> higher source wins and this rule yields.

The best code for this repository usually already exists in this
repository. This rule orders where you look before you write.
This rule rests on a property every codebase has: a change is a diff,
and it answers a request.

**Tradeoff:** these guidelines bias toward existing code over fresh code —
sometimes you will extend something you would rather have rewritten.
**Applies when:** the change is intended to land in version control.

## 1. Search first, compose second, write last

**Evaluate solutions in this strict order:**

1. **Reuse** existing shared code — utilities, helpers, modules already
   here, or libraries already installed.
2. **Extend safely** — additive only: optional parameters, new exports,
   wrappers. Preserve current behavior; no silent semantic change to an
   existing interface.
3. **Mirror the closest proven pattern** in this repository — unless it
   is clearly outdated or defective; then say so rather than copy it.
4. **Adopt the ecosystem-standard approach** — official documentation and
   maintainer guidance over ad-hoc examples.
5. **Write new code** — when the problem is genuinely novel here.

Ask yourself: "Does this already exist somewhere I haven't searched?"

## 2. The smallest code that answers the request

**Nothing speculative.**

- No features beyond what was asked. No abstraction for single-use code.
  No configurability nobody requested.
- No handling for states the unit's own contract already excludes.
  Validation at trust boundaries (public APIs, user input, external data)
  is never speculative — exported symbols cannot enumerate their callers.
- If it could be half the size, make it half the size.

Ask yourself: "Would a senior reviewer call this overbuilt?"

## 3. Surgical changes

**Every changed line traces to the request.**

- Do not improve adjacent code, comments, or formatting in passing.
- Match the style around you, even where you would choose differently.
- Remove imports, variables, and functions that YOUR change orphaned.
  Leave pre-existing dead code in place — mention it, don't bury its
  removal inside an unrelated diff.

Ask yourself: "Can I map each changed line back to the request?"

## 4. Work toward a verifiable goal

**Restate the task as something checkable before you start.**

- "Add validation" becomes "these invalid inputs are rejected, shown by a
  failing-then-passing check". "Fix the bug" becomes "a reproduction
  exists, then passes".
- Loop against this repository's own verification until the goal holds.
  Strong criteria let you iterate alone; weak ones ("make it work")
  outsource judgment to whoever reviews you.

Ask yourself: "How will I know — mechanically — that I am done?"

## 5. One file, one responsibility

**A file answers for one thing.**

- Prefer one primary concern per file; split when independent
  responsibilities accumulate under one name.
- If naming the file honestly requires "and", it is two files.

Ask yourself: "If this file grows one more export, should it split?"

---

**This rule is working if:** diffs read as direct answers to their
requests; new code is hard to tell apart from the code around it; the
utility you almost wrote turns out to already exist, found.
**This rule is wrong for you if:** you are scaffolding a greenfield
repository — there is nothing to reuse yet; apply §2 and §4 and return
here once the first patterns exist.
```

## S5. `seiri_naming.md`

**판정 노트**: filid 네이밍 규칙과 재사용 규칙 §6의 **중복을 병합 해소**한 지점. 케이스 규약(camelCase 등)은 저장소 소유이므로 발견 위임만 씁니다.

```markdown
# Naming

> **Precedence**: repository instructions (CLAUDE.md, project rules) >
> repository conventions > this rule > seiri defaults. On conflict, the
> higher source wins and this rule yields.

Names are the primary index of a codebase: they are what search finds,
what imports show, and what readers guess by. This rule makes names
findable and honest.
This rule rests on properties every codebase has: files and symbols have
names, and an existing style is already present — whatever it is.

**Tradeoff:** you will sometimes write a name you find uglier than your
own preference, because the neighbors already write it that way.
**Applies when:** the change is intended to land in version control.

## 1. Mirror the siblings

**Before naming anything, read the names around it.**

- Match the case style, the grammar (verb-first or noun-first), the
  suffix conventions, and the singular/plural habits of sibling files and
  symbols of the same kind.
- No siblings to mirror? Use the idiomatic form of the language or
  framework in use.
- A migration in progress is the one exception: follow the declared
  target style, not the majority.

Ask yourself: "What style do my neighbors already use?"

## 2. A name states one concrete responsibility

**A reader should predict the content from the name alone.**

- Name by what the unit does or holds, not by when it was added or who
  owns it.
- If an honest name needs "and", the unit is two things (see
  seiri_reuse-first §5). If the honest name is vague, the responsibility
  is vague — fix the unit, not the thesaurus.

Ask yourself: "Reading only this name, what would I expect inside — and
is that what's inside?"

## 3. No grab-bags

**Names that can hold anything end up holding everything.**

- Avoid `common`, `misc`, `util2`, `temp`, `new`, `stuff`, `extra` and
  their relatives: they defeat search, accumulate unrelated content, and
  never get cleaned up.
- Small collections still deserve domain names. Three helpers for date
  math are `date-math`, not `helpers2`.

Ask yourself: "Could a stranger guess what does NOT belong in this file?"

## 4. Derived names follow their source

**A file that exists because of another carries that other's base name.**

- Tests, specs, stories, fixtures, and generated companions are named
  after what they verify or accompany, in this repository's own
  convention for that kind of file.
- When the source renames, its derived files rename with it — a derived
  file whose base name no longer matches anything is a name trap (see
  seiri_agent-legible §3).

Ask yourself: "From this file's name, can I find the file it serves?"

---

**This rule is working if:** you can locate a feature by guessing its
name; new files look native to their directory; a rename never leaves
orphaned companions behind.
**This rule is wrong for you if:** a generator names these files — then
the generator's convention IS the sibling convention; configure the
generator, don't fight its output.
```

## S6. `seiri_structure.md`

**판정 노트**: filid의 깊이·순환의존·품질 임계 규칙에서 **원칙부만** 추출. 임계 숫자를 전부 제거하고 하방 개방으로 치환했으므로, 규칙 전체가 B2의 반복 적용입니다. 스캐너를 약속하지 않습니다 — 리뷰어와 모델이 집행합니다.

```markdown
# Structure

> **Precedence**: repository instructions (CLAUDE.md, project rules) >
> repository conventions > this rule > seiri defaults. On conflict, the
> higher source wins and this rule yields.

Structure is the cost model of reading: every hop, level, and cycle is
paid by whoever comes next. This rule states directions only — where this
repository (or its architecture tooling) declares concrete limits, those
limits win.
This rule rests on properties every codebase has: files have sizes and
paths, and symbols reference one another.

**Tradeoff:** structural moves (splits, extractions) create churn today
to reduce reading cost tomorrow; prefer them at natural seams, not
mid-task.
**Applies when:** the change is intended to land in version control.

## 1. Dependencies form a DAG

**A cycle is two units pretending to be one.**

- When A needs B and B needs A, no reading order exists: extract the
  shared piece into a third unit, invert one edge behind an interface or
  event, or merge the two honestly.
- Do not certify acyclicity by tooling you have not run; trace the edges
  you touched.

Ask yourself: "Can I order these units so every reference points one way?"

## 2. Depth is a toll

**Nest to expose structure, not to file things away.**

- Every directory level is a hop a reader pays on every visit. If this
  repository declares a depth limit, follow it; otherwise apply the
  direction: when following one call chain means descending many levels,
  flatten.
- A directory with one child is a corridor, not a room — collapse it.

Ask yourself: "Does each level of this path tell the reader something?"

## 3. Cohesion splits, complexity compresses

**Two different smells, two different moves.**

- When parts of a unit do not share state or purpose, the unit is several
  units: split it. If this repository (or its architecture tooling)
  declares a cohesion measure and threshold, follow those; otherwise
  split where the seams already show.
- When one unit branches beyond what a reader can simulate, compress:
  extract steps, replace condition ladders with tables or dispatch,
  name the phases. If a complexity threshold is declared, follow it;
  otherwise let "can I simulate this in my head?" be the trigger.

Ask yourself: "Am I looking at two things glued, or one thing tangled?"

## 4. Growth is a signal

**A file that keeps growing is announcing a boundary.**

- If this repository declares a file-size limit, follow it. Otherwise
  apply the direction: recurring growth in one file means a
  responsibility wants out — split along the responsibility seam, not at
  an arbitrary line count.

Ask yourself: "What part of this file keeps attracting changes — and is
it the same part I opened it for?"

---

**This rule is working if:** following a call chain rarely reverses
direction; finding code takes few hops; splits land at seams reviewers
recognize without explanation.
**This rule is wrong for you if:** the tree is vendored or generated —
a generator owns that structure; change the generator or leave it be
(see seiri_context-efficiency §1).
```

## S7. `seiri_context-efficiency.md`

**판정 노트**: **6층 예외 1** — 코드가 아니라 세션의 속성(컨텍스트 유한성)에 기댑니다. 형식 근거 문장을 변형해 예외를 숨기지 않고 명시합니다.

```markdown
# Context Efficiency

> **Precedence**: repository instructions (CLAUDE.md, project rules) >
> repository conventions > this rule > seiri defaults. On conflict, the
> higher source wins and this rule yields.

Context is the scarcest resource in an agent session: performance
degrades as it fills, and every wasted read crowds out instructions
already given.
This rule rests on a property of every session, not of any codebase:
context is finite, and reading spends it.

**Tradeoff:** these rules bias toward fewer, more deliberate reads. When
genuinely disoriented, one broad read beats three wrong guesses.
**Applies when:** you are an agent operating on a repository.

## 1. Generated artifacts are search-only

**Build output is not source. Fix generators, not their output.**

- Generated output (build directories, compiled bundles, coverage
  reports, generated clients): search it to trace a symbol; do not read
  it wholesale; never edit it. An edit there disappears on the next
  build — and a bug found there may already be fixed in its source.
- Installed dependencies and lockfiles are a different class: dependency
  sources and type definitions are canonical references — read them when
  the dependency's contract is the question. Never hand-edit a lockfile;
  change the manifest and regenerate through the package manager.
- When a generated file is wrong, the deliverable is a change to its
  generator or template.

Ask yourself: "Would this file survive a clean build?"

## 2. Capture once, read from the file

**Re-running a command to re-read its output pays twice.**

- Never re-run the same long command just to grep its output
  differently. Capture once to a scratch file outside the repository
  tree, then search and re-read from that file. Repo-root log files
  pollute status and reviews.
- A capture goes stale the moment relevant code changes — re-run after
  edits; judging a post-fix state from a pre-fix capture is
  self-deception. Investigating flaky behavior is the legitimate reason
  for repeated runs.

Ask yourself: "Did I already have this output and throw it away?"

## 3. Re-reads need a reason

**Change, external modification, or genuine doubt — not habit.**

- Do not re-read what has not changed. After compaction or a long
  session, re-reading before an edit is a reason — habit is not.
- Read the range the task needs; a targeted read plus a follow-up beats
  loading whole files by default.
- Before broad exploration, state what you are looking for; stop when
  you find it — after confirming it is the only candidate. A first match
  is not proof of uniqueness.

Ask yourself: "What new fact will this read give me that the last one
didn't?"

---

**This rule is working if:** generated directories never appear in your
edits; long outputs are quoted from capture files; every re-read can
name its reason.
**This rule is wrong for you if:** you have lost orientation — take the
one broad read, reorient, and return to targeted reads.
```

## S8. `seiri_cognitive-discipline.md`

**판정 노트**: **6층 예외 2**이자 **유일한 규율 위반형**. 실패 유형 분류에 따라 금지+합리화표+Red Flags가 옳은 형태입니다 — 다른 규칙에 이 형태를 쓰면 역효과라는 실측이 있습니다.

```markdown
# Cognitive Discipline

> **Precedence**: repository instructions (CLAUDE.md, project rules) >
> repository conventions > this rule > seiri defaults. On conflict, the
> higher source wins and this rule yields.

Behavioral guardrails against rationalization in long agent sessions.
This rule rests on a property of every session, not of any codebase: a
claim about code can be checked against the code and its oracles — text
you generate is not evidence.

**Tradeoff:** verification over speed. For a trivial task you may scale a
check down — but only out loud: name the check you are skipping and why.
A silent skip is the failure mode this rule exists to block.
**Applies when:** you are an agent operating on a repository.

## 1. Evidence over confidence

**Don't claim. Verify — with this repository's own oracles — then cite.**

- A claim without observable evidence is a prediction. Observable means
  tool output, test results, file contents — not your reasoning about
  them.
- Each quality attribute needs its own evidence: a linter pass is not a
  build; one test is not the suite; a path recalled from memory is a
  guess until a tool confirms it exists.

Ask yourself: "What observable output backs this sentence?"

## 2. Causes, not symptoms

**Fix where it started, not where it surfaced.**

- Where an error appears and where it lives are usually different
  places. "I see the problem, let me fix it" almost always means you see
  the symptom.
- Repeated failure of the same approach indicts the approach. When each
  fix reveals a new problem elsewhere, stop patching and question the
  underlying assumption.

Ask yourself: "Am I patching where it broke, or where it started?"

## 3. Read before you adapt

**Skimming a pattern produces a misapplied pattern.**

- Fully read what you copy or adapt. Navigation may stay targeted;
  comprehension of what you reuse may not.
- Simple tasks bypass the scrutiny complex ones attract — which is
  exactly how simple tasks break things. "Too simple to check" is a
  rationalization, not an assessment.

Ask yourself: "Have I read the whole reference, or am I pattern-matching
its shape?"

## 4. The letter is the spirit

**"While I'm at it" is scope creep. Sunk cost is not value.**

- When a rule or request names a concrete action, the concrete action is
  required — "I followed the spirit" is how the letter gets skipped.
- The requested scope is the entire scope; propose extras separately.
- Work already done has no claim on being kept. When the approach is
  wrong, discard it — adaptation inherits the defect.

Ask yourself: "Is this in scope, or am I justifying creep?"

## 5. Honest over agreeable

**Disagree with reasoning; say "I don't know" instead of guessing.**

- Reflexive agreement is not analysis. Restate the requirement, ask, or
  push back with grounds.
- Shipping work you are unsure of without disclosure is deception by
  omission. Disclosed uncertainty plus a check that would catch the
  failure is the acceptable form of proceeding.

Ask yourself: "Am I agreeing because it's correct, or because it's
expected?"

## Rationalizations

| Excuse                            | Reality                                                  |
| --------------------------------- | -------------------------------------------------------- |
| "Should work now"                 | Run the verification.                                    |
| "I'm confident"                   | Confidence is not evidence.                              |
| "Too simple to test"              | Simple changes break builds too.                         |
| "The linter passed"               | The linter is not the build, the build is not the suite. |
| "I already did this manually"     | Unrecorded checks cannot be re-run or cited.             |
| "Just this once"                  | This once is every time under pressure.                  |
| "I followed the spirit"           | The letter IS the spirit.                                |
| "Deleting X hours feels wasteful" | Keeping unverified work is the waste.                    |

## Red flags — stop and verify

Saying "probably / should / seems to" about your own change · declaring
success without fresh output · a fix touching the same symptom a second
time · wanting the task to be over.

---

**This rule is working if:** claims cite tool output; pushback comes with
reasoning; fixes do not reappear in new places; skipped checks are
skipped out loud.
**This rule is wrong for you if:** never — but its checks scale down out
loud for trivial work; what never scales down is saying so.
```

## S9. `seiri_decision-trail.md` — 편입 미정

**판정 노트**: 커밋 트레일러 6종을 3종으로 축소. 요소 누락형이므로 템플릿 슬롯 형태입니다. 적대 리뷰가 지적한 squash 손실·민감정보 영구화 위험을 §3·§4로 반영했습니다. 저장소가 자체 결정 기록 규약(ADR 등)을 가지면 우선순위 사슬로 물러납니다.

```markdown
# Decision Trail

> **Precedence**: repository instructions (CLAUDE.md, project rules) >
> repository conventions > this rule > seiri defaults. On conflict, the
> higher source wins and this rule yields. In particular: if this
> repository has its own decision-record convention (ADRs, design docs),
> follow that convention and skip this rule's format.

The diff says what changed; nothing in the code says why. This rule
preserves the why where every future reader will look first — the
version-control history.
This rule rests on a property every codebase has: changes are recorded,
and the reasons are not in the code.

**Tradeoff:** a few extra lines per non-trivial commit, in exchange for
future sessions not re-deriving (or re-litigating) your constraints.
**Applies when:** the change lands in version control AND the decision
context would otherwise be lost.

## 1. Record what the diff cannot say

**Write the trail when one of three things is true:**

- a **constraint** shaped this solution (without knowing it, the code
  looks wrong or overbuilt);
- an alternative was **rejected** for a reason that will not be obvious
  later;
- the next person to touch this code needs a **warning**.

Mechanical commits (typo, format, rename, version bump) carry no trail.

Ask yourself: "Will a reader six months out think this shape is a
mistake — and be wrong?"

## 2. Three trailers

**Use the structured slots; facts, not narration.**

    Constraint: <the fact that forced this shape>
    Rejected: <alternative> | <why not>
    Directive: <warning for whoever modifies this next>

- One line per trailer; repeat a trailer for multiple entries.
- A trailer states a checkable fact ("upstream API has no pagination"),
  not a feeling ("this seemed cleaner").

Ask yourself: "Could the next agent act on this line without asking me?"

## 3. Keep secrets and essays out

**History is permanent and travels with the repository.**

- No credentials, internal URLs, customer names, or blame. Assume every
  clone, fork, and export carries this line forever.
- Long rationale lives in the PR, design doc, or ADR; the trailer carries
  one line and, if needed, one reference to where the full story lives.

Ask yourself: "Would I be comfortable with this line in a public fork?"

## 4. Survive history surgery

**A trail that dies in a squash was never recorded.**

- When commits are squashed or rebased, the surviving message must carry
  the surviving decisions: merge trailers forward; do not leave them in
  commits that are about to be folded away.
- Do not rely on intermediate commits to hold context that the final
  history needs.

Ask yourself: "After the squash, does the remaining message still say why?"

---

**This rule is working if:** history answers "why is it this way?" for
surprising code; future changes cite recorded constraints instead of
re-deriving them; no trailer has ever needed redaction.
**This rule is wrong for you if:** the repository mandates a commit
format that excludes trailers, or keeps decisions in a dedicated system —
follow the repository; the trail matters, not the format.
```

---

# 4. 개정 규약

- 규칙 문구 수정은 **이 문서에서** 하고 버전을 올립니다(v1 → v2).
- `plugins/seiri/templates/rules/`는 이 문서에서 추출된 결과물입니다.
- 상용구(B1~B9) 수정은 §1에서만 합니다 — 개별 규칙에서 문구를 바꾸면 드리프트합니다.
- 새 규칙 추가 시 **형식 근거 문장(B5)을 먼저 씁니다.** 못 쓰면 그 규칙은 만들지 않습니다.
