# TODO — seiri 개발 작업 문서

> ⚠️ **이 문서는 개발 완료 후 제거됩니다.** 원장으로 보관되는 것은 [README.md](./README.md) · [01-CONSTITUTION.md](./01-CONSTITUTION.md) · [02-ARCHITECTURE.md](./02-ARCHITECTURE.md) · [03-RULES.md](./03-RULES.md) 넷입니다.

관련 이슈: [#97 seiri 구현](https://github.com/vincent-kk/ogham/issues/97) · [#98 filid 슬리밍](https://github.com/vincent-kk/ogham/issues/98)

---

# 브랜치 전략 — 단일 브랜치 통합

seiri 신설(#97)과 filid 슬리밍(#98)을 **하나의 브랜치에서 함께** 진행합니다.

## 무엇이 해결되고, 무엇이 남는가

| 층위 | 공백 위험 | 단일 브랜치의 효과 |
|---|---|---|
| **저장소** — 플러그인 소스 | seiri 룰이 없는데 filid 룰이 먼저 제거됨 | ✅ **해소** — 같은 머지에 포함되므로 원자적 |
| **사용자 프로젝트** — `.claude/rules/` | filid 룰이 제거됐는데 seiri 룰이 아직 없음 | ⚠️ **남음** — 아래 참조 |

**왜 남는가**: 배포는 플러그인 업데이트가 아니라 **사용자가 setup 스킬을 실행할 때** 일어납니다. `/filid:setup`과 `/seiri:setup`은 별개 스킬이므로, 사용자가 filid만 다시 돌리고 seiri를 돌리지 않으면 그 사이가 공백입니다.

## 완화 — 마이그레이션 안내

- [ ] **`filid:setup`이 이관 안내를 표시**: 이관된 4종이 목록에서 사라질 때 *"이 규칙들은 seiri로 이관되었습니다. `/seiri:setup`을 실행하세요"* — 제거 확인 화면에 노출
- [ ] `seiri:setup`이 filid 잔재를 감지하면 안내 (선택) — 플러그인 간 결합을 늘리지 않는 선에서 파일명 패턴 검사만
- [ ] 릴리스 노트에 순서 명시: **seiri setup 먼저, filid setup 나중**

## 커밋 순서

한 브랜치 안에서도 **논리적 순서는 유지**합니다 — 히스토리를 읽는 사람이 "왜 filid에서 뺐나"를 알려면 seiri가 먼저 존재해야 합니다.

```
0. (완료) 플러그인 스캐폴드                    ← 25f8bd0e
1. filid 에이전트 안전 조항 (독립·선행 가능)
2. seiri 규칙 자산 + manifest + 빌드 스크립트   ← Phase 1
3. seiri MCP + 설정 UI                        ← Phase 2
4. seiri 훅 2개                               ← Phase 3
5. seiri 스킬 4개                             ← Phase 4
6. filid 룰 정리 (제거·회수)                   ← 트랙 B
7. 통합 검증
```

---

# 진행 현황

두 트랙이 한 브랜치에서 병행합니다. **트랙 B는 트랙 A의 Phase 1 산출물에 의존**합니다 — seiri 규칙 파일이 확정돼야 filid에서 뺄 것이 확정되기 때문입니다.

| 트랙 | 단계 | 내용 | 상태 | 선행 |
|---|---|---|---|---|
| — | — | 플러그인 스캐폴드 (`package.json`·tsconfig·`libs/run.cjs`·`.mcp.json`) | ✅ `25f8bd0e` | — |
| **A** | 0 | 규칙 검증 (micro-test) | ⏭ **다음** | — |
| **A** | 1 | 규칙 자산 + 매니페스트 + 해시 동기화 | ⏸ | A-0 |
| **A** | 2 | MCP 서버 — `open_settings` · `rule_docs_sync` + 설정 UI | ⏸ | A-1 |
| **A** | 3 | 훅 2개 — SessionStart 주입 · InstructionsLoaded 측정 | ⏸ | A-2 |
| **A** | 4 | 스킬 4개 — setup · brainstorm · interview · debug | ⏸ | A-2 |
| **B** | — | **filid 에이전트 수정** | ⏸ | 없음 — **독립 착수 가능** |
| **B** | — | **filid 룰 정리** | ⏸ | **A-1** |
| **A+B** | — | **통합 검증 (머지 게이트)** | ⏸ | 전부 |

**B의 에이전트 수정(B-1~B-3)은 지금 착수해도 됩니다** — seiri와 무관하게 그 자체로 옳은 수정이고(무방비 상태 해소·문서 불일치 정정), 먼저 해두면 룰 이관 시 리스크가 줄어듭니다.

**설계는 완료됐습니다.** 사상·헌법·구조·규칙 전문 9종·명명까지 확정. 3사 적대 리뷰와 메커니즘 실측을 거쳤습니다.

## 형태 — filid 기반 풀스택

seiri는 **filid와 같은 4계층 플러그인**입니다(Hook · MCP · Skill, Agent 없음). 스캐폴드는 이미 초기화되었고, 상세 구조는 [02-ARCHITECTURE.md](./02-ARCHITECTURE.md) §2입니다.

| 계층 | seiri | filid 대비 |
|---|---|---|
| Hook | **2개** — SessionStart · InstructionsLoaded | filid 4개, **차단 훅 없음** |
| MCP | **2~3개** — openSettings · ruleDocsSync | filid 15개+, 코드 분석 도구 없음 |
| Skill | 4개 | |
| Agent | **0개** | filid 7개 |

**FCA 자기적용**: seiri 소스도 filid 규칙을 지킵니다 — fractal마다 `INTENT.md`, `index.ts` 순수 배럴. 두 플러그인의 위계가 실물에서 성립하는지 보는 시험대이기도 합니다.

---

# Phase 0 — 규칙 검증 (코드 0줄)

**목적**: 초안 9종이 실제로 행동을 바꾸는지 확인. **바꾸지 못하는 규칙은 만들지 않습니다.**

| 항목 | 내용 |
|---|---|
| 착수 조건 | ✅ 규칙 전문 v1 완성 ([03-RULES.md](./03-RULES.md)) |
| 산출물 | 규칙별 micro-test 결과표 · 개정된 규칙 v2 · 기각 목록 |
| 완료 조건 | 각 규칙에 대해 대조군이 실패를 보였고, 규칙 적용 시 5회가 같은 형태로 수렴 |
| **중단 조건** | 절반 이상이 대조군에서 실패를 못 보이면 → **규칙 세트 재설계**(형식 층 매핑부터) |

## micro-test 5단계

1. **신선한 컨텍스트 1회 1샘플** — 시스템 프롬프트는 규칙이 살 실제 맥락, 사용자 메시지는 그 실패를 유혹하는 과제
2. **무지침 대조군 필수** — 대조군이 실패를 보이지 않으면 **고칠 게 없습니다. 멈추고 그 규칙을 쓰지 않습니다.**
3. **변형당 5회 이상** — 단일 샘플은 거짓말합니다
4. **매칭된 것 전부 사람이 읽기** — 템플릿 반향과 인용된 반례가 히트로 위장합니다
5. **분산이 지표** — 5회가 제각각이면 문구에 구속력이 없습니다. 말을 더하기 전에 형태를 조입니다

## 작업 체크리스트

- [ ] S1 `agent-legible` — 유혹 시나리오 작성 (암묵 배선을 빠뜨리고 싶어지는 과제)
- [ ] S1 대조군 5회 + 규칙 적용 5회, 분산 확인
- [ ] S2 `public-contract` — 동일
- [ ] S3 `test-validity` — 동일
- [ ] S5 `naming` / S6 `structure` / S4 `reuse-first` — 이관본이므로 filid 운영 실적이 대용 증거, 표본 축소 가능
- [ ] S7 / S8 — 이관본, 동일
- [ ] S9 `decision-trail` — 편입 여부 결정과 함께
- [ ] 결과를 [03-RULES.md](./03-RULES.md) 상태표에 반영, 통과분만 v2로 확정

**우선순위**: S1 → S2 → S3. **첫 규칙은 S1**입니다 — 신작이고 seiri의 존재 이유이며, 여기가 무너지면 나머지는 filid에서 이미 굴러가던 것들이라 seiri를 따로 만들 이유가 약해집니다.

**실행 도구**: `/cennad:crosscheck` 또는 개별 provider 호출. 외부 모델에 돌리면 설계 세션과 독립된 판정이 됩니다.

---

# Phase 1 — 규칙 자산 + 매니페스트

**목적**: 배포할 것을 확정하고, 해시 자동화를 세웁니다. **트랙 B의 룰 정리가 여기에 의존합니다.**

| 항목 | 내용 |
|---|---|
| 착수 조건 | Phase 0 완료 — 최소 3종 통과 |
| 완료 조건 | `rule-lint` 전 항목 통과. `yarn build` 시 해시가 자동 갱신 |
| **중단 조건** | 통과 규칙이 3종 미만이면 → Phase 0으로 복귀 |

## 스캐폴드 보정

- [ ] `package.json`의 `repository.directory`: `plugins/filid` → **`plugins/seiri`** (초기화 시 복사된 값)
- [ ] `package.json`의 `description`·`keywords` 채우기
- [ ] `.claude-plugin/plugin.json` 생성 — `skills: "./skills/"` · `mcpServers: "./.mcp.json"`, **`agents` 필드 없음**

## 규칙 자산

- [ ] `templates/rules/seiri_*.md` — [03-RULES.md](./03-RULES.md)의 코드펜스에서 **무수정 추출** (통과분만)
- [ ] `templates/rules/manifest.json` — id·filename·legacyFilename·**required: false**·title·description·templateHash
- [ ] `templates/gates/` — pre-commit·CI placeholder 골격 (**값 없음**)
- [ ] `templates/INTENT.md`

## 빌드 스크립트

- [ ] `scripts/sync-rule-hashes.mjs` — `templates/rules/*.md` → manifest `templateHash` 갱신
- [ ] `scripts/build-settings-html.mjs` · `build-mcp-server.mjs` · `build-hooks.mjs` (filid에서 이식·축소)

## 테스트 (`src/__tests__/`)

- [ ] `rule-lint` — 아래 표
- [ ] `wiring` — 모든 `templates/rules/*.md`가 manifest 등재 · 모든 `bridge/*.mjs`가 `hooks.json` 등록
- [ ] `size` — 규칙 ≤200줄, 스킬 ≤2KB
- [ ] `hash-fresh` — `sync-rule-hashes` 실행 후 diff 없음

## rule-lint 검사 항목

| 검사 | 규칙 |
|---|---|
| 우선순위 사슬 | 모든 규칙 첫 블록에 `> **Precedence**:` |
| **형식 근거** | `rests on a property` **또는** `rests on properties` 1건 이상 — **P5 게이트**. 수는 기대는 형식 개수에 맞춘다 |
| 이중 반증 | `This rule is working if:` **와** `is wrong for you if:` |
| 크기 | 규칙 ≤200줄, 스킬 ≤2KB |
| **임계 금칙** | 본문에 독립 숫자 임계 금지 (인용부 내부는 허용) |
| **언어 금칙** | 러너명 금지 — `npm `·`yarn `·`pytest`·`cargo `·`go test` 등 |
| 배선 | manifest 등재 · 훅 등록 |
| 해시 최신 | `sync-rule-hashes` 후 diff 없음 |

> ⚠️ 현재 S1 `agent-legible`은 `rests on **properties**`(복수)입니다. 단수만 검사하면 **자기 규칙을 통과시키지 못합니다.** 두 형태를 모두 인정해야 합니다.

---

# Phase 2 — MCP 서버 + 설정 UI

**목적**: 규칙이 대상 저장소에 안전하게 도달하는 경로.

| 항목 | 내용 |
|---|---|
| 착수 조건 | Phase 1 완료 |
| 완료 조건 | 빈 저장소·기존 저장소 양쪽에서 배포·해제 무손실. `/context`에 seiri 규칙 열거 |
| **중단 조건** | 규칙이 `/context`에 안 나타나면 → 로드 메커니즘 재실측 |

## core (FCA — fractal마다 INTENT.md)

- [ ] `src/types/` · `src/constants/` (organ — INTENT.md 없음)
- [ ] `src/core/infra/configLoader/` — 활성 규칙·다이얼 읽기·쓰기
- [ ] `src/core/infra/cacheManager/` — 세션 플래그
- [ ] `src/core/infra/projectHash/` — **저장소 신원 + 워크트리** 키
- [ ] `src/core/rules/manifestLoader/` — 파싱·검증
- [ ] `src/core/rules/ruleSync/` — 배포·제거·**diff 생성**
- [ ] `src/core/rules/hashCompare/` — 드리프트 감지
- [ ] `src/index.ts` — 순수 배럴 (named re-export만, `export *` 금지)

## MCP

- [ ] `src/mcp/server/` · `src/mcp/serverEntry/`
- [ ] `src/mcp/tools/openSettings/` (+ `webServer/`)
- [ ] `src/mcp/tools/ruleDocsSync/` — **diff 제시 → 확인 → 쓰기/삭제**
- [ ] `src/mcp/pages/settings/` — 체크박스 + 다이얼 UI
- [ ] `e2e/` — 설정 UI Playwright

## 검증

- [ ] 배포 → 해제 왕복, 파일 정확히 생성/제거
- [ ] **`/context`로 실제 로드 확인** — Memory files에 나타나는가
- [ ] **주입 전 diff가 실제로 보이는가**
- [ ] 드리프트 감지 — 로컬 편집 후 경고, **임의로 덮지 않는가**
- [ ] 부분 실패 시 무엇이 쓰였고 실패했는지 보고 (조용한 실패 금지)
- [ ] 빈 저장소(CLAUDE.md 없음)에서 동작 — 오라클 부재 시 "오라클을 세워라" 촉구만
- [ ] MCP 도구 스키마 토큰을 규모 목표에 계상

---

# Phase 3 — 훅 2개

**목적**: 상태 요약 주입과 효능 측정.

| 항목 | 내용 |
|---|---|
| 착수 조건 | Phase 2 완료 |
| 완료 조건 | 다이얼 3단이 렌더를 바꾸고 배포 문서는 불변. 로드 로그가 남음 |
| **중단 조건** | `src/`가 1,500줄을 넘으면 → 기능을 덜어냅니다(역할 밖 목록 재적용) |

## 선행 실측 2건

- [ ] `InstructionsLoaded` 훅 페이로드 스키마
- [ ] 규칙의 컴팩션 생존 여부 (CLAUDE.md는 재주입 명시, 규칙은 미확인)

## 작업 체크리스트

- [ ] `hooks/hooks.json` — SessionStart(timeout 10) · InstructionsLoaded(timeout 5), `libs/run.cjs` 경유
- [ ] `hooks/INTENT.md`
- [ ] `src/hooks/shared/` — stdin 파싱·출력 계약
- [ ] `src/hooks/setup/` — SessionStart. **활성 규칙 · 다이얼 · 드리프트 경고만, ~5줄**
- [ ] `src/hooks/instructionsLoaded/` — 로드 관측, **주입 없음**
- [ ] 다이얼 3단 — 블록 선택 중심

**규칙 내용을 복제하지 않습니다.** 하니스가 이미 로드하므로 위치만 가리킵니다.

## 검증

- [ ] 주입 렌더가 기본 ~5줄인지
- [ ] `InstructionsLoaded` 로그로 **규칙 로드 실측**
- [ ] **상태 키 충돌** — 같은 저장소 워크트리 2개 동시 세션
- [ ] **훅 실패 시 무주입으로 안전 폴백** — 세션을 막지 않는가
- [ ] 다이얼 변경이 렌더만 바꾸고 배포 문서는 불변인가

---

# Phase 4 — 스킬 4개

**목적**: 대화형 도구와 자동 절차. 상시 예산을 늘리지 않습니다.

| 항목 | 내용 |
|---|---|
| 착수 조건 | Phase 2 완료 (setup은 MCP 도구 필요) |
| 완료 조건 | 네 스킬 형태 검증 통과, 상시 주입 총량 유지 |
| **중단 조건** | 자동 스킬이 계속 질문하면 → 자동 카테고리 폐기, 전부 호출형으로 |

## 작업 체크리스트

- [ ] `skills/setup/` — 호출 전용. `open_settings` → `rule_docs_sync` 호출
- [ ] `skills/brainstorm/` — 호출 전용 + 거부권 조항(B8)
  - 승인 게이트·3중 승인·"한 메시지에 질문 하나"는 **가져오지 않습니다**
- [ ] `skills/interview/` — 호출 전용 + 거부권 조항, 라운드 상한
- [ ] `skills/debug/` — 자동. `disallowed-tools: AskUserQuestion` + 자동 계약(B9)
  - 이관 시 3항 제거: 사람 논의 강제 · 출처 없는 수치 · 사용자 발화를 리셋 트리거로 재해석
- [ ] 스킬 작성 규율: **상시 지시로 작성**(재독되지 않음), `description`+`when_to_use` 1,536자 캡

## 검증

- [ ] 크기 회귀 (각 ≤2KB)
- [ ] **자동 스킬이 질문하지 않는지** 실측 — 유도 시나리오
- [ ] 호출 스킬의 거부권 실측 — "그냥 해"에 산출물만 남기고 멈추는가
- [ ] `/context`에서 호출 스킬 description이 **안 보이는지** (상시 비용 0 확인)
- [ ] 적대 검토 1회 — `/cennad:crosscheck`

---

# 트랙 B — filid 슬리밍 (같은 브랜치)

**목적**: 중복 제거와 역할 정리. filid = FCA 코어 + INTENT 관리·주입 + PR 리뷰.

| 항목 | 내용 |
|---|---|
| 착수 조건 | **A절(룰 정리)**: 트랙 A Phase 1의 규칙 파일 확정 후 / **B절(에이전트)**: 즉시 착수 가능 |
| 완료 조건 | `fca-policy` 단독 잔류. 중복 2건 소멸. 에이전트 3건 수정 완료 |
| **중단 조건** | 통합 검증에서 규칙 공백이 재현되면 이관 커밋만 되돌립니다 |

## 순서 규약

같은 브랜치이므로 저장소 레벨의 공백은 없습니다. 다만 **커밋 순서는 유지**합니다 — seiri 규칙이 먼저 존재해야 filid 제거가 논리적으로 읽힙니다.

`syncRuleDocs()`가 선택 해제 시 대상 프로젝트의 `.claude/rules/` 파일을 **삭제**한다는 사실은 변하지 않습니다. 사용자 프로젝트 레벨의 공백은 **마이그레이션 안내**(문서 상단)로 완화합니다.

## A. filid 규칙 문서 정리

### A-1. `filid_fca-policy.md` 분할 (225줄)

**잔류 — FCA 코어**
- [ ] 노드 타입 체계(fractal/organ/pure-function/hybrid) + 분류 우선순위 8단계
- [ ] `organ-no-intentmd` · `pure-function-isolation` · `zero-peer-file`
- [ ] INTENT.md(50줄, 3-tier) · DETAIL.md 문서 제약
- [ ] **15-case rule + 3+12 각 개수의 의미** (보편 규칙 아님)
- [ ] 의사결정 트리 + 임계값(LCOM4·CC·파일 크기) · 90일 테스트 승격
- [ ] 배럴·진입점의 **구체 형태와 적용 대상** + **외부↔내부 import 경계 규칙**

**제거 → seiri 이관**
- [ ] `naming-convention` 전체
- [ ] `max-depth` · `circular-dependency`
- [ ] `index-barrel-pattern` 1~3번 (순수 배럴 · 직접 선언 금지 · `export *` 금지 + 3논거)
- [ ] `module-entry-point` 2~3번 (프레임워크 진입 파일 · 진입점 심볼이 계약)
- [ ] Quality Thresholds 원칙 서술부 (임계 숫자는 잔류)

### A-2. `filid_reuse-first.md` 분할 (109줄)

- [ ] **filid 회수 (1문장)**: §5의 *"Internal implementation files should import concrete internal files directly, not route through the local `index.ts`…"* → `module-entry-point`로 병합
- [ ] 나머지 전부 seiri 이관. §6 네이밍은 seiri에서 `naming`과 **병합**

### A-3. 전부 seiri 이관

- [ ] `filid_test-validity.md` (88줄)
- [ ] `filid_context-efficiency.md` (66줄)
- [ ] `filid_cognitive-discipline.md` (101줄)

### A-4. 전 규칙 공통 — `Tradeoff:` 블록 형태 교정

현행 filid 규칙의 `Tradeoff:` 블록은 전부 **예외 조항** 형태입니다(예: *"Exemption: only code that will never be committed"*). 실측에 따르면 예외 조항은 스코프하지 않습니다.

- [ ] ❌ "이 규칙은 커밋되지 않을 코드에는 적용되지 않는다"
- [ ] ✅ "커밋 대상 파일이면 이 규칙을 적용한다" (술어가 관측 가능)
- [ ] 잔류 규칙과 이관 규칙 **양쪽 모두**에 적용

### A-5. `manifest.json`

- [ ] 이관된 4개 항목 제거 → `fca-policy` 단독
- [ ] 제거 항목의 `templateHash` 정리

## B. filid 에이전트 수정 — 이관 리스크 대응

### B-1. ❗ `agents/restructurer.md` — 리팩토링 안전 조항 **신설**

현재 105줄에 `test` 단어가 **0건**입니다. `characterization`·fail-first는 filid의 `agents/`·`skills/` 전체에 한 건도 없습니다. 유일한 근거였던 `test-validity §1`이 이관되면 **구조를 옮기는 에이전트가 무방비**가 됩니다.

- [ ] 리팩토링은 계약 반전 — 기존 테스트가 **무수정으로 전후 통과**해야 한다
- [ ] 코드 이동 **전에** characterization 테스트로 현재 동작 고정
- [ ] 기존 assertion 편집 금지 (테스트 추가는 허용)

### B-2. `agents/code-surgeon.md` — 동일 조항 보강

현재 파라미터화 시 "값 보존"만 있고 fail-first 없음.

- [ ] B-1과 같은 조항을 수술 범위에 맞춰 추가

### B-3. `agents/implementer.md` — 문서-구현 불일치 정정

- [ ] 현재: *"Respect the 3+12 rule — max 15 test cases per `spec.ts` (3 basic + 12 complex)"*
- [ ] 정정본: *"at most 15 cases per spec file — the scan gate checks the total only; '~3 basic + ~12 complex' is the recommended shape, **not a separately enforced pair**"*
- [ ] TDD 내장 조항(Red/Green, fail-first)은 **유지** — 규칙 이관 후에도 이 에이전트가 자립하는 근거

## C. filid 단독 검증

- [ ] `yarn build:plugin` 재빌드 → `/filid:setup` 체크박스에 `fca-policy` 단독 표시
- [ ] 테스트 프로젝트에서 이관 4종이 `.claude/rules/`에서 정상 제거
- [ ] `restructurer` 안전 조항 반영 확인
- [ ] `implementer` 3+12 표현이 정정본과 일치

---

# 통합 검증 — 머지 게이트

**한 브랜치로 진행하는 가장 큰 이점**: 이관의 정합성을 머지 전에 한 번에 확인할 수 있습니다. 아래를 통과하지 못하면 머지하지 않습니다.

## 이관 정합성

- [ ] **누락 없음** — filid에서 제거한 규칙 조항이 seiri에 전부 존재. 조항 단위로 대조
- [ ] **중복 없음** — 같은 조항이 양쪽에 남아 있지 않음. 특히 해소 대상 2건:
  - `naming-convention` ↔ `reuse-first §6` → seiri `naming`으로 병합됐는가
  - `module-entry-point §4` ↔ `reuse-first §5` → filid로 회수됐고 seiri에는 없는가
- [ ] **경계 정확** — 임계 숫자는 filid에만, 방향은 seiri에만. seiri `rule-lint`의 임계 금칙이 이를 기계 검사

## 동시 설치

- [ ] seiri + filid를 같은 테스트 프로젝트에 설치
- [ ] `.claude/rules/`에 `seiri_*.md`와 `filid_fca-policy.md`가 공존, 파일명 충돌 없음
- [ ] `/context`에 양쪽 모두 로드됨
- [ ] **모순 없음** — 두 플러그인의 규칙이 같은 상황에 다른 답을 주지 않는가. 주면 우선순위 사슬이 해소하는가

## 공백 재현 테스트

- [ ] 기존 filid 사용 프로젝트에서 `/filid:setup` 먼저 실행 → 이관 4종 제거됨
- [ ] 이때 **마이그레이션 안내가 표시되는가**
- [ ] `/seiri:setup` 실행 → 규칙이 복원되는가
- [ ] 두 단계 사이의 세션에서 무엇이 사라지는지 기록 (완화 효과 측정)

## 회귀

- [ ] filid 기존 기능 정상 — `/filid:scan` · `/filid:review` 파이프라인
- [ ] seiri `rule-lint` 전 항목 통과
- [ ] 배선 테스트 — 양쪽 manifest 등재 확인

---

# 전 단계 관통 검증

| 축 | 수단 | 시점 |
|---|---|---|
| **행동 변화** | micro-test (무지침 대조군) | Phase 0, 규칙 개정 시마다 |
| **자기 준수** | `rule-lint` | 매 커밋 |
| **실제 도달** | `/context` Memory files | Phase 1 이후 상시 |
| **로드 관측** | `InstructionsLoaded` 로그 | Phase 3 이후 |
| **최종 효능** | **10이슈 A/B** | Phase 3 완료 후 |
| **적대 검토** | `/cennad:crosscheck` | Phase 2 완료 시 1회 |

## 10이슈 A/B 프로토콜

seiri의 승리 조건은 주관적 구조 평가가 아니라 **동일 이슈에 대한 as-is/to-be 에이전트 성공률**입니다.

- 이슈 10개 층화: 버그픽스 3 / 기능 3 / 패턴 전파 2 / 암묵지 의존 2
- fail-to-pass + pass-to-pass 오라클, 인간 체크포인트
- 모델·하네스 고정, **3회 시행**(분산 측정)
- 지표: 성공률 + 토큰 + 읽은 파일 수 + 오편집 수 + 사용자 개입 횟수
- 동작 보존은 별개 축 — characterization 선행

---

# 리스크 대장

| # | 리스크 | 완화 | 감지 |
|---|---|---|---|
| R1 | **순응 미달** — 규칙을 읽고도 안 따름 | 형식 기반(무충돌성) · 구체 문구 · 200줄 제한 | micro-test 분산, 10이슈 A/B |
| R2 | **저장소 관례와 충돌** | 우선순위 사슬 첫 줄 박제 | 사용자 보고, A/B의 오편집 지표 |
| R3 | **오라클 부재 저장소** | "오라클을 세워라" 촉구만, 값 주입 금지 | Phase 1 빈 저장소 테스트 |
| R4 | **대형화** | 역할 밖 목록 · `src/` MCP 도구 3개 이하 · 훅 2개 | Phase 3 중단 조건 |
| R5 | **다중 플러그인 충돌** | `seiri_` 네임스페이싱 · 우선순위 사슬 | filid 동시 설치 테스트 |
| R6 | **전환 공백** | 저장소 레벨은 단일 브랜치로 해소. 사용자 프로젝트 레벨은 **마이그레이션 안내**로 완화 | 통합 검증의 공백 재현 테스트 |
| R9 | **이관 누락·중복** | 조항 단위 대조 + `rule-lint` 임계 금칙 | 통합 검증의 이관 정합성 |
| R7 | **문서 드리프트** | `rule-lint`로 기계 집행 · 개수·목록 금지 | 매 커밋 |
| R8 | **보안** — 규칙 배포가 인젝션 표면 | 확인 후에만 쓰기 · diff 제시 · 네트워크 없음 | Phase 1 검토 |

---

# 남은 설계 결정

| # | 결정 | 제안 | 확정 시점 |
|---|---|---|---|
| D1 | manifest `required` | **전부 opt-in** + setup이 권장 3종 기본 체크 | Phase 1 |
| D2 | S9 `decision-trail` 편입 | 편입하되 opt-in (민감정보·squash 리스크) | Phase 1 |
| D3 | 다이얼 어휘 조절(MUST/SHOULD) | **폐지** — 배포 문서와 주입의 이중 강도 문제 | Phase 3 |
| D4 | 에이전트 보유 | **없음** | — |
| D5 | 조건부 규칙(`paths:`) 사용 | v1은 전부 무조건 로드. 총량이 넘치면 도입 | Phase 1 |
| D6 | 게이트 스캐폴드 제공 | Phase 2 이후, placeholder 골격만 | Phase 2 |

---

# 머지 시 정리

- [ ] **통합 검증 전 항목 통과** — 위 머지 게이트
- [ ] 릴리스 노트에 마이그레이션 순서 명시: **`/seiri:setup` 먼저, `/filid:setup` 나중**
- [ ] 이 문서(`TODO.md`) 제거
- [ ] [03-RULES.md](./03-RULES.md) 상태표를 최종 확정본으로 갱신
- [ ] [README.md](./README.md) 현재 상태 절 갱신
- [ ] filid `.metadata` 문서에 위계 분담 상호 참조 추가
- [ ] 이슈 [#97](https://github.com/vincent-kk/ogham/issues/97) · [#98](https://github.com/vincent-kk/ogham/issues/98) 닫기 (같은 PR로 함께)
