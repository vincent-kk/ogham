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
│ 문서 동기화   │  │ 파일 리뷰·검증 │  │ 결정·위임 │  │ 재측정·판정   │
│ + PR 생성    │  │ fix-requests  │  │ justif.  │  │ PASS/FAIL    │
└──────────────┘  └───────────────┘  └──────────┘  └──────────────┘
        └────────────────── pipeline (--auto 연속 실행) ──────────────┘
```

`pipeline`이 주 사용 경로다. 네 단계를 진입점 자동 감지와 함께 한 번에 돈다.

#### resolve decision sheet

`resolve`는 confirmed fix를 하나씩 묻지 않는다. 의사결정 전에 `fix-requests.md` 전체를 파싱하고, `Severity`와 `Category`라는 finding 사실과 별개로 correction을 추천한다.

```
모든 FIX block 파싱
       │
       ▼
Recommendation 분류
├─ Apply   → 명백하고 bounded하거나 영향이 작은 correction, 기본 [x]
└─ Discuss → 제품·공개 API·아키텍처 선택이 필요한 correction, focus [?]
       │
       ▼
전체 decision sheet
├─ Needs attention (Discuss) 먼저
└─ Selected by default (Apply) 다음
       │
       ▼
한 batch decision round
├─ Apply recommended set
├─ Apply every item
└─ automatic Other → apply/discuss/skip/reject를 FIX ID로 한 번에 입력
       │
       ▼
모든 discuss 질문에 함께 답변 → 미결 FIX만 한 batch로 재표시
       │
       ▼
모든 skip/reject 사유의 ADR 완전성 검증
       │
       ▼
baseline capture → accepted correction 일괄 위임 → 검증된 ADR 직렬화
```

`Other` 응답에서 생략한 ID는 sheet의 default를 유지한다. `skip`은 reason을 가진 warning deferral에만 쓰며 error는 apply 또는 reason-bearing reject로 결정한다. unknown ID, error skip, 이유 없는 skip/reject와 불완전한 ADR은 전부 모아 한 번에 다시 요청한다. 이 검증이 끝나기 전에는 baseline을 잡거나 correction을 위임하지 않으며, 이후 rejection 단계는 decision을 다시 열지 않는다.

`--auto`도 전체 sheet를 먼저 출력한다. 원래 Recommendation과 그 이유는 그대로 두고 Decision만 모든 행 `[x] Apply (auto-selected)`로 바꾸며, prompt 없이 baseline과 delegation으로 진행한다. 따라서 pipeline에서도 무엇이 원래 논쟁적이었는지는 보이지만 실행은 멈추지 않는다.

`fix-requests.md`의 각 block은 Claim을 포함한 원 finding payload를 보존한다. resolve는 canonical FIX ID를 accepted heading에 유지하고, revalidate는 그 ID로 두 artifact를 exactly-one join한다. join이 누락·중복되거나 필드가 부족하면 비-FCA verifier를 실행하지 않고 해당 항목을 `inconclusive`로 둔다.

### 1.0에서 제거된 스킬

| 스킬               | 제거 사유                                                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `ast-fallback`     | 제거된 AST 기능의 fallback이다. 원래 기능이 없으므로 fallback도 대상이 없다.                                                               |
| `structure-review` | `scan`(전체 감사)과 `cross-review`(변경 감사)가 이미 범위를 나눠 갖는다. 세 번째 진입점은 어느 쪽을 써야 하는지만 모호하게 만든다.         |
| `promote`          | spec-document와 test-record는 서로 다른 문서 역할이며 승격 관계가 아니다(ADR-06). 승격이라는 동작 자체가 1.0 모델에 없다.                  |
| `harvest`          | acceptance 원장을 DETAIL.md 하나로 통일했으므로(ADR-05) `.filid/criteria.md`에 claim을 수확해 넣을 대상이 없다.                            |
| `sync`             | 한 스킬이 구조 이동과 문서 갱신을 동시에 하면 어느 쪽이 실패했는지 구분되지 않는다. 구조는 `restructure`, 문서는 `enrich-docs`로 분리했다. |
| `update`           | 코드 변경 뒤 문서·테스트를 자동 재작성하는 workflow다. 승인 지점이 없어 "무엇이 왜 바뀌었는지"가 남지 않는다. `enrich-docs`가 대체한다.    |
| `config-wizard`    | config 관리는 `project_init`(생성)과 `open_settings`(조회·수정) 두 MCP 도구가 이미 소유한다.                                               |

merge-track 네 스킬은 한때 제거 대상이었으나 되살렸다. 다만 모두 제거된 도구(`review_manage`, `debt_manage`, `ast_analyze`, `test_metrics`)와 `code-surgeon` 에이전트에 걸려 있었으므로 **원본 복원이 아니라 9개 도구 표면 위로 재작성**됐다.

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
context_resolve(path, requests: [{ targetPath }])
       │
       ▼
data.results[0] → { summary: { ownerFractalPath, chainPaths[owner → root],
                    nearestDetailPath, outputLanguage }, resolution }
       │
       ▼
호출자가 필요한 문서만 읽는다 (본문은 반환되지 않는다)
       │
       ▼
3라운드 안에 답변. 불가하면 "파악한 내용 + 추가로 필요한 정보"를 보고한다.
```

여러 target은 한 `requests` 배열에 넣어 하나의 snapshot으로 해석한다. 단일 target도 길이 1의 배열이다. target이 project root 밖이거나 owner를 결정할 수 없으면 해당 result가 명시적으로 실패하며 root 문서를 임의 fallback으로 고르지 않는다.

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

## cross-review — 파일별 변경 리뷰와 독립 검증

**트리거**: 커밋된 변경 또는 PR, `/filid:cross-review [PR URL]`

```
Step 1 — Prepare
├── 브랜치·PR과 base ref를 해석하고 현재 사용자 요구를 USR-NNN으로 고정
├── review_state({ action: "prepare", ..., effort }) → fresh | resumable | cached
├── resumable이면 checkpoint의 산출물 존재 정보로 첫 누락 지점부터 재개
├── schema 또는 source identity가 맞지 않으면 한 번만 force-fresh
└── roster·FCA evidence·group·diff·brief·JSON 뼈대·session을 결정적으로 준비

Step 2 — Context
├── prepare의 data.files와 data.groups를 권위 있는 roster로 사용
├── PR 본문 또는 base 이후 commit log 요약으로 session.md의 pending 문구를 교체
└── worktree가 documents-only 또는 source-dirty이면 Step 5로 이동

Step 3 — Review  (최대 summary.concurrency개 병렬)
├── rounds: 0은 건너뛰고 dependsOn이 끝난 group부터 reviewer를 배정
├── 생성된 review brief와 USR-NNN을 읽어 opinions/review-NN.r<k>.json을 작성
├── review_state({ action: "validate", kind: "review", group, round })로 검사·병합
└── newFindings가 0이면 종료하고, 아니면 effort가 허용하는 다음 round를 실행

Step 4 — Verify
├── 각 group의 briefs/verify-NN.md로 효율 등급 verifier 한 명을 배정
├── merged opinions/review-NN.json의 finding과 FCA-NNN 후보를 독립적으로 재현
├── 후보마다 CONFIRMED | REFUTED | INDETERMINATE를 opinions/verify-NN.json에 기록
└── review_state({ action: "validate", kind: "verify", group })로 검사

Step 5 — Verdict and Seal
├── review_state({ action: "seal", projectRoot, branchName }) 호출
├── source identity와 validate가 기록한 artifact hash를 재확인
├── coverage·verification을 APPROVED | REQUEST_CHANGES | INCONCLUSIVE로 fold
└── review-report.md·필요한 fix-requests.md·pr-comment.md·session checklist를 렌더링

Step 6 — Publish
└── PR이 있으면 canonical verdict 코멘트를 갱신하고, 없으면 게시하지 않음
```

### cross-review 입력과 규칙

- PR 본문 또는 base 이후 commit log에서 고정한 변경 배경
- 변경 파일별 전체 diff, 현재 파일, 필요한 호출자와 테스트
- 내장 `default`·`tests`·`documents`·`fca` 규칙과 저장소의 적용 규칙
- 변경된 프랙탈의 INTENT.md와 DETAIL.md 계약
- `review_state(prepare)`가 만든 owner·role·churn roster, group, canonical `evidence.md`
- 생성된 review·verify brief가 가리키는 bounded diff·규칙·후보
- 변경 범위의 entry point·외부 import boundary·DAG·verification 후보
- LCA placement 및 승인된 restructure plan 사후조건
- `unsupported` / `indeterminate` 진단

오케스트레이터는 diff·source·rule·opinion 본문을 열지 않고 경로만 전달한다. verdict는 이 입력으로 확인한 커밋 변경 범위에만 적용된다. 범위 밖에서 발견한 새 우려는 기록할 수 있지만 verdict에는 영향을 주지 않는다.

### verdict 규칙

state 부재나 source hash 불일치는 seal 실패로 중단하며 terminal verdict를 만들지 않는다.

| 상황                                                                 | verdict           |
| -------------------------------------------------------------------- | ----------------- |
| evidence 불완전, documents-only/source-dirty, 신뢰 가능한 group 부재 | `INCONCLUSIVE`    |
| checklist 미마감 또는 변경 파일을 가리키는 reviewer gap              | `INCONCLUSIVE`    |
| 후보가 `INDETERMINATE`                                               | `INCONCLUSIVE`    |
| `CONFIRMED` 후보가 하나 이상                                         | `REQUEST_CHANGES` |
| 모든 후보가 `REFUTED`이거나 후보 없음                                | `APPROVED`        |

`INDETERMINATE`는 unresolved evidence로 기록하며 pass로 바꾸지 않는다. cross-review는 **코드를 고치거나 이동하지 않는다.** 구조 finding은 `restructure_plan`이 반환한 Current/Target/Type/Basis/LCA를 그대로 인용한다.

### review state 수명주기

```
prepare ──→ (review → validate)* ──→ verify → validate ──→ seal ──→ cleanup
   │
   ├─ fresh     : 새 roster·group·artifact
   ├─ resumable : checkpoint → 첫 누락 artifact부터 재개
   ├─ cached    : matching sealed + report, 저장된 verdict 반환
   └─ force: true → 캐시 무시

assess ──→ working tree를 독립적으로 관측
```

`stale`과 `missing`은 `ok` status가 아니다. 메시지 파싱 없이 안정적인 disposition과 diagnostics로 판정할 수 있다. `assess`는 working tree를 독립적으로 관측하고, `prepare`는 같은 disposition을 증거 payload에 포함한다. `cleanup`은 리터럴 `confirm: true` 뒤에 해당 브랜치 디렉터리만 제거한다.

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
       ├─ 소유 모듈 첫 접근 → [filid:ctx] 규칙 포인터 전달
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
