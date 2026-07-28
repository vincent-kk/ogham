# 03. 플러그인 라이프사이클 & 워크플로우

> `@ogham/filid` 1.0 기준. 12개 스킬의 라이프사이클, 훅 이벤트 타임라인, merge-track 파이프라인.

---

## 라이프사이클 개요

```
┌───────────┐   ┌──────────┐   ┌────────────────┐   ┌──────────┐
│ setup     │──→│ scan     │──→│ context-query  │   │ guide    │
│ 초기화     │   │ 전체 감사 │   │ 좁은 질의       │   │ 규칙 설명 │
│ 1회성      │   │ 수시      │   │ 수시            │   │ 수시     │
└───────────┘   └──────────┘   └────────────────┘   └──────────┘

┌──────────────┐   ┌──────────────┐   ┌──────────┐
│ enrich-docs  │   │ restructure  │   │ migrate  │
│ 문서 갱신     │   │ 배치 계획·검증 │   │ 이름 이관 │
│ 문서 보강 시   │   │ 이동 필요 시   │   │ 최초 1회 │
└──────────────┘   └──────────────┘   └──────────┘
```

### merge-track 라이프사이클 (5개)

브랜치가 머지될 때 밟는 하나의 절차다. 각 단계의 **산출 형식이 계약**이며, 형식이 깨지면 다음 단계가 입력을 잃는다.

```
┌──────────────┐  ┌───────────────┐  ┌──────────┐  ┌──────────────┐
│ pull-request │─→│ cross-review  │─→│ resolve  │─→│ revalidate   │
│ 문서 동기화   │  │ 3관점 + 판정   │  │ 결정·위임 │  │ 재측정·판정   │
│ + PR 생성    │  │ fix-requests  │  │ justif.  │  │ PASS/FAIL    │
└──────────────┘  └───────────────┘  └──────────┘  └──────────────┘
        └────────────────── pipeline (--auto 연속 실행) ──────────────┘
```

`pipeline`이 주 사용 경로다. 네 단계를 진입점 자동 감지와 함께 한 번에 돈다.

1.0에는 승격(`promote`), 동기화(`sync`), 갱신(`update`), 전체 구조 리뷰(`structure-review`), 수확(`harvest`), 설정 마법사(`config-wizard`), AST fallback(`ast-fallback`)이 없다. 각각의 제거 사유는 계획 원장의 「목표 스킬 표면」 절에 있다.

문서 갱신 책임의 소유자는 다음과 같다.

| 작업                     | 소유                                   |
| ------------------------ | -------------------------------------- |
| 문서 위반·drift 탐지     | `scan`(전체) · `cross-review`(변경분)  |
| 문서 갱신 (승인 후 편집) | `enrich-docs`                          |
| 누락 문서 제안           | `setup`                                |
| **PR 시점 강제**         | `pull-request` Stage 1 → `enrich-docs` |

---

## setup — 프로젝트 초기화

**트리거**: 최초 1회, 또는 `/filid:setup [path]`

```
1. project_init(path, language, adapterIds)
   → .filid/config.json (schema 2.0) 생성
   → 이미 있으면 덮어쓰지 않는다
       │
       ▼
2. rule_docs_sync(sync)
   → managed FCA rule 문서 배포 (templates/rules/ 원본 기준)
       │
       ▼
3. fractal_scan(path)
   → snapshot 기반 트리 확인
       │
       ▼
4. structure_validate(path, scopes: [documents])
   → 문서 경계 검증
       │
       ▼
5. 누락 INTENT.md / DETAIL.md 제안
   → **제안만 한다.** 기존 문서를 편집하지 않는다.
```

config 저장은 사용자가 승인할 때만 디스크에 기록된다. v1 config가 발견되면 메모리에서 v2로 변환하고 `config-migration-required` 진단을 내되 파일은 쓰지 않는다.

---

## scan — 전체 FCA 감사

**트리거**: 수시, `/filid:scan [path]`

전체 감사의 **유일한** 진입점이다. 한 snapshot에 대해 모든 scope를 평가한다.

```
fractal_scan(path)              → 트리와 분류
       │
       ▼
structure_validate(path, mode: 'project')
       ├─ documents      → INTENT 50줄·3-tier, DETAIL 섹션·AC group
       ├─ nodes          → organ-no-intentmd, max-depth, zero-peer-file
       ├─ entry-points   → module-entry-point, entry-point-surface
       ├─ boundaries     → external-import-boundary
       ├─ dag            → circular-dependency, pure-function-isolation
       └─ verification   → 15/32 cap, fragmentation, contract link
       │
       ▼
verification_scan(path)         → spec/test 역할별 요약
       │
       ▼
위반 요약 + certainty 보고
```

`scopes`를 생략하면 전부 검사한다. 결과가 16 KiB를 넘으면 요약과 artifact 경로가 돌아온다.

**warning도 finding이다.** warning이 남아 있는 상태를 "준수"라고 부르지 않는다.

---

## context-query — 최소 문서 체인 질의

**트리거**: 수시, `/filid:context-query <path 또는 질문>`

```
context_resolve(path, targetPath)
       │
       ▼
{ ownerFractalPath, chain[owner → root], nearestDetailPath, outputLanguage }
       │
       ▼
호출자가 필요한 문서만 읽는다 (본문은 반환되지 않는다)
       │
       ▼
3라운드 안에 답변. 불가하면 "파악한 내용 + 추가로 필요한 정보"를 보고한다.
```

target이 project root 밖이거나 owner를 결정할 수 없으면 명시적 오류다. root 문서를 임의 fallback으로 고르지 않는다.

---

## guide — 규칙과 트리 설명

현재 트리, 분류, 검증 finding, 증거 기반 배치 규칙을 설명한다. **구조를 바꾸지 않는다.** 읽기 전용이다.

---

## enrich-docs — 문서 품질 개선

```
1. snapshot 증거 수집 (owner, 경계, 진입점, 소비자)
       │
       ▼
2. 개선안 제시 → **사용자 승인**
       │
       ▼
3. LLM이 INTENT.md / DETAIL.md 편집
       │
       ▼
4. structure_validate(scopes: [documents])로 사후 검증
```

승인 없이 문서를 고치지 않는다.

---

## restructure — 계획 → 승인 → 외부 실행 → 검증

```
1. 읽기 전용 계획 생성
   restructure_plan({ path, requests: [{ sourcePath, consumerPaths?, contractIntent? }] })
   → 항상 plan artifact를 남긴다 (persistence: always)
   → 프로젝트 트리는 변경되지 않는다
       │
       ▼
2. 사전조건 검증
   structure_validate(mode: 'plan-precondition', planPath)
   → snapshot hash 일치, unresolved decision 없음
       │
       ▼
3. 계획 제시 → **사용자 승인**
   Current / Target / Type / Basis / LCA를 그대로 인용한다
       │
       ▼
4. MCP 밖에서 실행
   파일 이동 + import 편집은 외부 도구가 한다
       │
       ▼
5. 사후조건 검증
   structure_validate(mode: 'plan-postcondition', planPath)
   → source 부재, target 존재, node type, 필수 문서, 진입점,
     import rewrite/boundary, DAG, graph certainty
```

계획과 다른 target으로 옮긴 경우 **기능이 동작해도 FAIL이다.** 사후 snapshot hash가 달라지는 것은 정상이며 사전 hash 일치를 요구하지 않는다.

---

## cross-review — FCA 증거 기반 다관점 리뷰

**트리거**: 커밋된 변경 또는 PR, `/filid:cross-review [PR URL]`

```
Step 1 — Resolve Source and Prepare State
├── 브랜치/PR 해석, base ref 결정
├── review_state(prepare) → fresh | resumable | cached
│     · 같은 hash의 prepared state → resumable (이어서)
│     · 같은 hash의 sealed state + report → cached (재사용)
│     · force: true → 캐시 무시하고 fresh
└── 출력: review state record

Step 2 — Collect Snapshot Evidence
├── 변경 프랙탈의 snapshot 증거만 수집
└── 읽는 증거는 아래 목록으로 제한된다

Step 3 — Run Three Independent Perspectives  (병렬, 단일 라운드)
├── contract     — INTENT/DETAIL/acceptance/public surface
├── structure    — classification/boundary/DAG/LCA/placement
└── verification — role/case count/fragmentation/link/certainty

Step 4 — Adversarial Arbitration
├── 모든 blocking finding을 CONFIRMED | PLAUSIBLE | REFUTED로 판정
└── REFUTED는 verdict에서 제거하되 arbitration log에 남긴다

Step 5 — Checkpoint, Report, and Seal
├── review_state(checkpoint) → artifact 목록과 report 경로
├── verdict: APPROVED | REQUEST_CHANGES | INCONCLUSIVE
├── review_state(seal) → prepared hash와 report가 있을 때만 sealed
└── (--scope=pr 요청 시에만) PR 코멘트
```

### cross-review가 읽는 증거

- 변경된 프랙탈의 INTENT.md와 DETAIL.md 계약
- node classification과 owner
- entry point surface와 외부 import boundary
- dependency DAG와 cycle
- LCA placement 및 승인된 restructure plan 사후조건
- spec-document 15, test-record 32
- spec fragmentation과 DETAIL acceptance group link
- `unsupported` / `indeterminate` 진단

이 밖의 것은 읽지 않는다. 그래서 verdict 제목과 본문에 **FCA scope**를 명시한다.

### verdict 규칙

| 상황                                                  | verdict           |
| ----------------------------------------------------- | ----------------- |
| 명확한 위반                                           | `REQUEST_CHANGES` |
| evidence가 `indeterminate`이고 merge 안전성 판정 불가 | `INCONCLUSIVE`    |
| 위반 없음                                             | `APPROVED`        |

cross-review는 **코드를 고치거나 이동하지 않는다.** 구조 finding은 `restructure_plan`이 반환한 Current/Target/Type/Basis/LCA를 그대로 인용한다.

### review state 수명주기

```
prepare ──→ (작업) ──→ checkpoint ──→ seal ──→ cleanup
   │                       │
   │                       ├─ missing   : state 없음
   │                       ├─ stale     : hash 불일치
   │                       ├─ resumable : matching prepared
   │                       └─ cached    : matching sealed + report
   │
   └─ force: true → 캐시 무시
```

`stale`과 `missing`은 `ok` status가 아니다. 메시지 파싱 없이 안정적인 disposition과 diagnostics로 판정할 수 있다. `cleanup`은 리터럴 `confirm: true` 뒤에 해당 브랜치 디렉터리만 제거한다.

---

## migrate — legacy 문서명 이관

`CLAUDE.md` → `INTENT.md`, `SPEC.md` → `DETAIL.md`.

```
1. 대상 탐색
2. **dry-run 우선** — 무엇이 바뀌는지 먼저 보여준다
3. 이식 가능한 스크립트로 실행
4. structure_validate로 사후 검증
```

legacy `.filid/criteria.md`는 이 스킬의 대상이 아니다. 자동 변환하지 않고 `legacy-criteria-ledger` finding으로 보고되며, 이관 시점은 사용자가 정한다.

---

## Hook 이벤트 타임라인

```
시간 →

T0  세션 시작
    └─ SessionStart → setup.mjs
       캐시 초기화, 만료 세션 정리, FCA 프로젝트 감지

T1  사용자 프롬프트 입력
    └─ UserPromptSubmit → user-prompt-submit.mjs
       턴당 visit map 리셋, 세션 첫 FCA 규칙 포인터

T2  에이전트가 Read/Write/Edit 호출
    └─ PreToolUse (matcher: Read|Write|Edit) → pre-tool-use.mjs
       ├─ 소유 모듈 첫 접근 → [filid:ctx] 규칙 전달
       ├─ 방문 집합 변화 → [filid:map]
       └─ INTENT/DETAIL write → 검증 게이트 (위반 시 deny)

T3  (통과 시) 도구 실행
```

`PostToolUse`와 `SubagentStart`에는 훅이 없다.

---

## 관련 문서

- [01-ARCHITECTURE.md](./01-ARCHITECTURE.md) — 레이어와 책임 경계
- [04-USAGE.md](./04-USAGE.md) — 스킬 사용법 상세
- [06-HOW-IT-WORKS.md](./06-HOW-IT-WORKS.md) — 훅·MCP 내부 동작
- [07-RULES-REFERENCE.md](./07-RULES-REFERENCE.md) — 각 단계에서 적용되는 규칙
