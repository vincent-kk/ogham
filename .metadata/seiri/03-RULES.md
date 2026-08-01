# 03 — 규칙

**규칙 전문의 정본은 [`plugins/seiri/templates/rules/`](../../plugins/seiri/templates/rules/)입니다.** 이 문서는 각 규칙의 판정 노트(설계 근거)와 정본 링크를 보유합니다 — 규칙 문언을 고칠 때는 정본 파일을 편집합니다. 판정 노트는 배포되지 않습니다(설계 기록). **예외**: S9 `decision-trail`은 아직 미배포(opt-in 대기)라 전문이 이 문서에만 있습니다.

규칙 본문은 영문입니다 — 배포되어 모델이 읽는 산출물이기 때문입니다.

## 상태표

| #   | 파일                            | 형식 층  | 형태              | 상태                                  |
| --- | ------------------------------- | -------- | ----------------- | ------------------------------------- |
| S1  | `seiri_agent-legible.md`        | L0·L1    | 레시피            | ✅ lite                               |
| S2  | `seiri_public-contract.md`      | L2       | 레시피            | ✅ lite                               |
| S3  | `seiri_test-validity.md`        | L4       | 혼합              | ✅ 이관본 · **`paths:` 조건부**(유일) |
| S4  | `seiri_reuse-first.md`          | L3       | 레시피            | ✅ lite                               |
| S5  | `seiri_naming.md`               | L0       | 레시피(발견 위임) | ✅ lite                               |
| S6  | `seiri_structure.md`            | L0·L1    | 방향형            | ✅ 이관본 (방향형)                    |
| S7  | `seiri_context-efficiency.md`   | 6층 예외 | 레시피            | ✅ 통과 (D8 무삭감)                   |
| S8  | `seiri_cognitive-discipline.md` | 6층 예외 | **금지+합리화표** | ✅ 통과 (D8 무삭감)                   |
| S9  | `seiri_decision-trail.md`       | L5       | 템플릿 슬롯       | ⏸ opt-in 확정 · 대조군 대기           |

**공통 검증**: 전 규칙에 우선순위 사슬·형식 근거·이중 반증 적용. 임계 숫자 0건, 언어 특정 예시 0건, 각 200줄 미만.

**재단·배포**: 구조 4종(agent-legible·public-contract·reuse-first·naming)은 lite로 재단, 프로세스 4종(test-validity·structure·context-efficiency·cognitive-discipline)은 full. S1~S8 배포, S9는 대조군 통과 후 opt-in 등재. 근거·수치는 [phase0/](./phase0/).

**v2 압축(2026-08-01)**: 전 10종(+filid 4종)을 압축형으로 재재단 — 골격을 1줄 헤더(B1+목적+B5+B7 병합)와 1줄 B6로 줄이고, Ask-yourself는 reuse-first §1 하나만 유지하며, 레시피·표·D8 관용구·규범 내용은 보존. rule-bench 80런 haiku A/B(R0 무규칙/R1 v1/R2 v2)에서 전 이슈 R2 ≥ R1로 채택 게이트 통과 — 판별 이슈 iC(reuse)는 R0 0% vs R1·R2 100%로 v2가 효능을 보존. 바이트 -24%(전체)·-23%(상시). 하네스·수치는 [../rule-bench/](../rule-bench/).

---

# 1. 상용구 사전

모든 규칙이 공유하는 문구. **여기서만 정의하고 규칙 문서는 이것을 인용합니다** — 규칙마다 제각각 쓰면 나중에 전 문서를 손봐야 합니다.

## B1. 우선순위 사슬 — 모든 규칙의 첫 줄

```markdown
> **Precedence**: repository instructions (CLAUDE.md, project rules) > repository conventions > this rule > seiri defaults — the higher source wins.
```

**근거**: 공식 — _"두 규칙이 모순되면 Claude는 임의로 하나를 고를 수 있다."_ 텍스트로 못 박는 것 외에 수단이 없습니다.
**배치**: 제목 바로 아래. v2부터 한 줄이며, 같은 blockquote 헤더 안에 목적 1문장·B5 형식 근거·B7 스코프 조건문을 이어 붙입니다(별도 문단 금지 — 골격 비용 절감의 핵심).

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
**This rule is working if:** <관측 가능한 결과 1~2개>. **This rule is wrong for you if:** <이 규칙을 적용하면 안 되는 관측 가능한 상황>.
```

v2부터 한 줄로 씁니다 — 두 문구(`This rule is working if:` · `is wrong for you if:`)는 rule-lint가 검사하는 계약이라 유지합니다.

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
This skill may be invoked automatically. Prefer autonomous judgment: when a
choice is needed, take the conservative default and say so in one line. A
genuine blocker — a decision only the user can resolve — earns one crisp
AskUserQuestion; a routine checkpoint does not.
```

- frontmatter 도구 차단은 두지 않는다 — 정본 문장 전문을 `skillPolicy.test.ts` 가 검사한다.

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

**규칙 전문 (정본)**: [`plugins/seiri/templates/rules/seiri_agent-legible.md`](../../plugins/seiri/templates/rules/seiri_agent-legible.md). 이 문서는 판정 노트(설계 근거)만 보유합니다 — 규칙 문서를 편집할 때는 정본 파일을 고칩니다.

## S2. `seiri_public-contract.md`

**판정 노트**: filid의 배럴 규칙·진입점 규칙·재사용 규칙 §5를 병합 승격. 경계의 _형태_(`index.ts` 여부, 적용 대상, 외부/내부 import 구분)는 filid 잔류 — seiri는 "무엇을 공개하는가"만 다룹니다.

**규칙 전문 (정본)**: [`plugins/seiri/templates/rules/seiri_public-contract.md`](../../plugins/seiri/templates/rules/seiri_public-contract.md). 이 문서는 판정 노트(설계 근거)만 보유합니다 — 규칙 문서를 편집할 때는 정본 파일을 고칩니다.

## S3. `seiri_test-validity.md`

**판정 노트**: filid 5조 계승 + §6 무한 축적 금지(하방 개방). 오라클은 전부 역할 지칭 — 구체 명령 0건. §1의 리팩토링 계약 반전 조항은 filid `restructurer` 안전 조항의 원본이므로 문구를 보존합니다.

**조건부 로드 (유일)**: 8종 중 이 규칙만 `paths:` frontmatter를 갖습니다 — 테스트 파일을 연 동안에만 구속하는 유일한 규칙이라 상시 상주시킬 이유가 없습니다.

키는 **`paths:`** 입니다(하니스 파서 실측). `globs:` 는 파서가 읽지 않아 무시되고, 그러면 규칙이 조건부가 아니라 **무조건 로드**로 되돌아갑니다 — 커뮤니티의 "paths 불량" 보고는 이 방향 착오로 보이며, 이벤트 페이로드의 필드명이 `globs`(매칭된 `paths:` 패턴)인 것이 혼동의 근원입니다. `ruleInvariants` 가 `globs:` 사용을 기계 차단합니다.

**glob 값 선택 근거**: glob 은 불가피하게 "값"이므로(테스트 파일 위치는 저장소 관례) 폭을 **넓게** 잡았습니다 — 좁은 목록이 만드는 실패(테스트를 편집 중인데 규칙이 안 뜸)는 조용하고, 넓은 목록이 만드는 실패(테스트 아닌 파일에서 규칙이 뜸)는 눈에 보이고 값쌉니다. 그래서 접미/접두 관례(`*.test.*`·`*_test.*`·`test_*.*`·`*Test.*`)와 디렉터리 관례(`test`·`tests`·`spec`·`specs`·`e2e`·`__tests__`)를 언어 중립으로 함께 싣고, 매칭이 gitignore 문법이라 슬래시 없는 패턴이 모든 깊이에 걸립니다. 브레이스 확장은 하니스가 지원하지만 이식성을 위해 쓰지 않습니다.

**규칙 전문 (정본)**: [`plugins/seiri/templates/rules/seiri_test-validity.md`](../../plugins/seiri/templates/rules/seiri_test-validity.md). 이 문서는 판정 노트(설계 근거)만 보유합니다 — 규칙 문서를 편집할 때는 정본 파일을 고칩니다.

## S4. `seiri_reuse-first.md`

**판정 노트**: filid 재사용 규칙 계승(원류는 LLM 코딩 함정 대응 가이드라인). §5의 지역 배럴 경유 금지 문장은 경계 규칙이므로 **filid로 회수**하고 미포함. 네이밍 절은 S5로 병합했습니다.

**규칙 전문 (정본)**: [`plugins/seiri/templates/rules/seiri_reuse-first.md`](../../plugins/seiri/templates/rules/seiri_reuse-first.md). 이 문서는 판정 노트(설계 근거)만 보유합니다 — 규칙 문서를 편집할 때는 정본 파일을 고칩니다.

## S5. `seiri_naming.md`

**판정 노트**: filid 네이밍 규칙과 재사용 규칙 §6의 **중복을 병합 해소**한 지점. 케이스 규약(camelCase 등)은 저장소 소유이므로 발견 위임만 씁니다.

**규칙 전문 (정본)**: [`plugins/seiri/templates/rules/seiri_naming.md`](../../plugins/seiri/templates/rules/seiri_naming.md). 이 문서는 판정 노트(설계 근거)만 보유합니다 — 규칙 문서를 편집할 때는 정본 파일을 고칩니다.

## S6. `seiri_structure.md`

**판정 노트**: filid의 깊이·순환의존·품질 임계 규칙에서 **원칙부만** 추출. 임계 숫자를 전부 제거하고 하방 개방으로 치환했으므로, 규칙 전체가 B2의 반복 적용입니다. 스캐너를 약속하지 않습니다 — 리뷰어와 모델이 집행합니다.

**규칙 전문 (정본)**: [`plugins/seiri/templates/rules/seiri_structure.md`](../../plugins/seiri/templates/rules/seiri_structure.md). 이 문서는 판정 노트(설계 근거)만 보유합니다 — 규칙 문서를 편집할 때는 정본 파일을 고칩니다.

## S7. `seiri_context-efficiency.md`

**판정 노트**: **6층 예외 1** — 코드가 아니라 세션의 속성(컨텍스트 유한성)에 기댑니다. 형식 근거 문장을 변형해 예외를 숨기지 않고 명시합니다.

**규칙 전문 (정본)**: [`plugins/seiri/templates/rules/seiri_context-efficiency.md`](../../plugins/seiri/templates/rules/seiri_context-efficiency.md). 이 문서는 판정 노트(설계 근거)만 보유합니다 — 규칙 문서를 편집할 때는 정본 파일을 고칩니다.

## S8. `seiri_cognitive-discipline.md`

**판정 노트**: **6층 예외 2**이자 **유일한 규율 위반형**. 실패 유형 분류에 따라 금지+합리화표+Red Flags가 옳은 형태입니다 — 다른 규칙에 이 형태를 쓰면 역효과라는 실측이 있습니다.

**규칙 전문 (정본)**: [`plugins/seiri/templates/rules/seiri_cognitive-discipline.md`](../../plugins/seiri/templates/rules/seiri_cognitive-discipline.md). 이 문서는 판정 노트(설계 근거)만 보유합니다 — 규칙 문서를 편집할 때는 정본 파일을 고칩니다.

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
