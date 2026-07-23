# TODO — seiri 개발 작업 문서

> ⚠️ **이 문서는 개발 완료 후 제거됩니다.** 원장으로 보관되는 것은 [README.md](./README.md) · [01-CONSTITUTION.md](./01-CONSTITUTION.md) · [02-ARCHITECTURE.md](./02-ARCHITECTURE.md) · [03-RULES.md](./03-RULES.md) 넷입니다.

관련 이슈: [#97 seiri 구현](https://github.com/vincent-kk/ogham/issues/97) · [#98 filid 슬리밍](https://github.com/vincent-kk/ogham/issues/98)

---

# 세션 재개 — 여기부터 읽으세요

**2026-07-23 기준. 브랜치 `feature/97-98`.**

플러그인의 **런타임은 전부 동작합니다** — 빌드·MCP·설정 UI·훅·스킬. **2026-07-23 스킬 계층이 4종→11종으로 확장**되었습니다(sp 완전 대체 결정 — 아래 Phase 4b). 아직 없는 것은 **규칙 본문 자체**뿐입니다.

**Phase 0 완료 + A-1c 완료 (2026-07-23)**: S1~S8 판정 확정 · `templates/rules/` 8종 등재 · templateHash 주입 · `yarn seiri test:run` **45 passed** ([phase0/SYNTHESIS.md](./phase0/SYNTHESIS.md)). 남은 트랙: S9 대조군(통과 시 opt-in 등재) · D7 디스패치 micro-test(실하니스) · A-6 rule-lint · 트랙 B(filid 슬리밍) · 통합 검증.

## 지금 상태

|            |                                                                                                    |
| ---------- | -------------------------------------------------------------------------------------------------- |
| 동작       | `yarn seiri build` green · 설정 페이지 배포/해제 왕복 · 훅 2개 번들 · 스킬 11종(각 ≤2KB)           |
| 테스트     | `yarn seiri test:run` **45 passed** (5 파일)                                                       |
| 타입       | `yarn typecheck` — 9 워크스페이스 clean (seiri 등록 완료)                                          |
| 린트       | `yarn lint` clean                                                                                  |
| filid 회귀 | `yarn filid test:run` **1181 passed / 7 skipped** (트랙 B: 선택-규칙 2건 skip 전환)                |
| 배포 규칙  | **8개** — S1~S8 등재(권장 3종 S1·S3·S4) · templateHash 주입 · `--check` up to date. S9는 대조군 후 |

## 이 브랜치의 커밋 (오래된 것부터)

```
78e86f77 feat(seiri): introduce foundational documents ...   ← 설계 원장
0f8493b4 feat(seiri): initialize seiri plugin ...            ← 스캐폴드
e520f304 feat(filid): add refactoring safety contract to code-editing agents
fd834444 chore(seiri): wire the plugin into the monorepo
e16cacdb feat(seiri): add rule-hash sync and the rule manifest
aacea609 feat(seiri): add config and rule-doc core
2b391aeb style(seiri): normalize design ledger markdown
dbcd4740 feat(seiri): add SessionStart and InstructionsLoaded hooks
5cfb35f4 feat(seiri): add the MCP layer and the settings page
19086afd feat(seiri): add the four skills and package documentation
```

SHA 는 rebase·amend 로 바뀝니다. 어긋나면 `git log --format='%h %s' main..HEAD` 로
다시 확인하세요 — 제목 줄이 안정된 식별자입니다.

**미커밋**: `plugins/seiri/bridge/` · `plugins/seiri/public/` (빌드 산출물 — **사용자가 직접 커밋**하는 저장소 규약. AI 는 `src/`·`skills/`·문서만 커밋). 스킬 확장분·Phase 0 기록·규칙 자산은 07-23 커밋 완료.

## 지금 사용자가 할 일 (07-23 A-1c·커밋 완료 시점)

1. **`bridge/`·`public/` 커밋** — 07-23 A-1c 빌드로 재생성되었습니다(빌드 산출물 규약: 사용자가 직접 커밋).
2. **`agy` CLI 점검** — antigravity가 2연속 "no output" 오류로 Phase 0 실험에서 제외됐습니다.
   CLI 업데이트가 필요해 보입니다.
3. **트랙 B(filid 슬리밍) 착수 지시** — A-1c 완료로 선행 조건이 충족됐습니다. 착수 시점은 사용자 지시.
   (D2·D8·D1은 확정 완료 — "확정된 결정" 표. D5·D7은 규칙 분량 평가와 함께 하니스 트랙으로.)

## 이미 있는 테스트 45건 — 무엇을 지키는가

| 파일                                                      | 건수 | 지키는 것                                                                              |
| --------------------------------------------------------- | ---- | -------------------------------------------------------------------------------------- |
| `src/core/ruleDocs/__tests__/decideRuleDocAction.test.ts` | 11   | 배포·제거·드리프트 판정 전체. **resync 없이는 로컬 편집을 덮지 않는다**가 핵심         |
| `src/hooks/setup/__tests__/renderStatusLines.test.ts`     | 11   | 배포 0건이면 무주입 · 다이얼별 렌더 분량 · 규칙 본문 비복제                            |
| `src/mcp/tools/openSettings/__tests__/webServer.test.ts`  | 11   | 실제 HTTP 왕복 — 토큰 가드 · 상태 주입 · **plan 과 save 의 결과 일치** · 드리프트 보존 |
| `src/__tests__/wiring.test.ts`                            | 10   | 언어 경계를 넘는 계약 (상수 ↔ `hooks.json` ↔ 빌드 스크립트 ↔ HTML/JS)                  |
| `src/__tests__/size.test.ts`                              | 3    | 스킬 2KB · 규칙 200줄 · 배포 스킬 목록                                                 |

이 테스트들은 전부 **일부러 깨뜨려 red 를 확인**한 것들입니다 (판정 가드 제거·상태 주입 제거·훅 이름 불일치·스킬 200B 추가). 새 테스트를 추가할 때도 같은 절차를 밟으세요 — 실패를 본 적 없는 테스트는 아무것도 증명하지 않습니다.

**아직 없는 테스트**: `rule-lint` (규칙 문서 자체 검사 — Precedence 블록 · `rests on a propert(y|ies)` · 이중 반증 · 임계 금칙 · 러너명 금칙). 검사 대상 규칙이 0개라 A-1c 와 함께 만드는 것이 맞습니다. `hash-fresh` 는 `sync-rule-hashes --check` 를 CI 에서 부르면 되므로 별도 테스트가 필요한지 재검토하세요.

## 다음 작업 (07-23 A-1c 완료 이후)

1. **트랙 B — filid 룰 정리(B-4)**: A-1c 완료로 선행 조건 충족. 이관 4종 제거 · `fca-policy` 분할 · filid manifest 정리 (아래 트랙 B 절 절차 그대로).
2. **A-6 `rule-lint` 테스트**: Precedence 블록 · `rests on a propert(y|ies)` · 이중 반증 · 임계 금칙 · 러너명 금칙 + **공유 관용구 고정 검사**(D8 처방 — "pays twice"·"fix where it started"가 규칙과 해당 스킬 양쪽에 존재하는지, 드리프트를 기계적으로 red로).
3. **S9 대조군(3표본)**: 커밋 메시지 결정-맥락 유혹 시나리오. 실패를 보이면 처치군 → 통과 시 opt-in 등재(D2).
4. **규칙 분량 평가**: 전체 플러그인 완성 후 하니스에서 — 아래 "규칙 분량 평가 (D9)" 절.
5. **D7 디스패치 micro-test**: 실제 하니스에 seiri 설치 후 순간별 유혹 세션으로 발화율 측정 — 4번과 같은 하니스 트랙에서 통합 진행.
6. **통합 검증(머지 게이트)**: 이관 정합성(규칙↔스킬 축 포함) · 동시 설치 · 공백 재현 · 회귀.

## 재개 시 알아야 할 함정 5가지

1. **포매팅은 매 턴 끝에 훅이 돌립니다** (`.claude/settings.json` 의 Stop 훅 → `prettier --write --ignore-unknown`). 커밋 전에 같은 명령을 직접 돌려야 커밋과 포매팅 결과가 어긋나지 않습니다.
2. **훅이 저장소 루트에서 실행되므로 무시 규칙도 루트 `.prettierignore` 만 참조됩니다.** 패키지 레벨 `.prettierignore` 는 효력이 없습니다. 규칙 템플릿 보호(`plugins/*/templates/rules/`)가 루트에 들어가 있는 이유입니다 — 포매팅되면 `templateHash` 가 무효화되어 모든 사용자에게 거짓 드리프트가 뜹니다.
3. **훅 도달 코드는 배럴 import 금지**입니다. concrete 파일 직접 import 만. typecheck 는 못 잡고 `scripts/build-hooks.mjs` 의 캡·금칙 가드만 잡습니다. 훅 소스를 고쳤으면 반드시 `yarn seiri build:plugin`.
4. **번들 금칙 정규식은 미니파이 후에도 살아남는 문자열이어야 합니다.** 패키지 이름은 번들링이 지웁니다 (`env-paths` 대신 `XDG_CONFIG_HOME` 을 매칭하는 이유).
5. **경로는 `@ogham/cross-platform/compat` 경유**, 네이티브 `node:path` 금지. `hostPaths` 는 MCP 전용이고 **훅에서 소비 금지**입니다 (호스트가 훅에 `CLAUDE_PLUGIN_ROOT` 와 cwd 를 직접 줍니다).

---

# 이번 세션의 원장 교정 · 결정

구현 중 실측으로 드러나 정본을 고친 항목입니다.

| #   | 항목                                                              | 결론                                                                                                                                                                                                                                                         |
| --- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `.seiri/config.json` 의 "언어"·"활성 규칙" 필드                   | **제거.** 배포 상태의 진실은 `.claude/rules/` 파일시스템이고, 규칙 본문은 영문 고정이라 언어 설정이 쓸 곳이 없습니다. config 가 담는 것은 **다이얼 하나뿐**.                                                                                                 |
| 2   | `InstructionsLoaded` 의 matcher                                   | **무의미.** 공식 문서 실측 — 이벤트는 실재하나 decision-control 표가 "no matcher support · exit code ignored". 로드 사유는 페이로드로 오므로 훅 안에서 분기합니다. 페이로드의 이벤트별 키는 **문서에 없어 미확정** — 그래서 훅이 페이로드 전체를 기록합니다. |
| 3   | `SessionStart` matcher                                            | `fork` 추가됨 (`startup`·`resume`·`clear`·`compact`·`fork`). seiri 는 `*` 라 영향 없음.                                                                                                                                                                      |
| 4   | `core/rules/{manifestLoader,ruleSync,hashCompare}` 3-fractal 구조 | **`core/ruleDocs/` 하나로 통합.** 셋 다 같은 매니페스트·경로를 공유하는 1함수 모듈이라 seiri 자신의 규칙("자식 하나짜리 디렉터리는 방이 아니라 복도")에 걸립니다.                                                                                            |
| 5   | `src/` ≤1,500줄 목표                                              | **폐지** (사용자 결정). 근거는 [02-ARCHITECTURE.md](./02-ARCHITECTURE.md) 규모 목표 절. 실측 2,199줄(설정 UI 자산 919줄 별도).                                                                                                                               |

**filid 에 없던 보강 1건**: `plan`(dry-run) 경로. 설정 페이지가 저장 전 diff 를 보여줍니다. `plan` 과 `save` 가 같은 본문 스키마와 같은 판정 함수(`decideRuleDocAction`)를 경유하므로 미리보기가 저장이 하지 않을 일을 약속할 수 없습니다.

---

# 브랜치 전략 — 단일 브랜치 통합

seiri 신설(#97)과 filid 슬리밍(#98)을 **하나의 브랜치에서 함께** 진행합니다.

## 무엇이 해결되고, 무엇이 남는가

| 층위                                   | 공백 위험                                  | 단일 브랜치의 효과                          |
| -------------------------------------- | ------------------------------------------ | ------------------------------------------- |
| **저장소** — 플러그인 소스             | seiri 룰이 없는데 filid 룰이 먼저 제거됨   | ✅ **해소** — 같은 머지에 포함되므로 원자적 |
| **사용자 프로젝트** — `.claude/rules/` | filid 룰이 제거됐는데 seiri 룰이 아직 없음 | ⚠️ **남음** — 아래 참조                     |

**왜 남는가**: 배포는 플러그인 업데이트가 아니라 **사용자가 setup 스킬을 실행할 때** 일어납니다. `/filid:setup`과 `/seiri:setup`은 별개 스킬이므로, 사용자가 filid만 다시 돌리고 seiri를 돌리지 않으면 그 사이가 공백입니다.

## 완화 — 마이그레이션 안내

> ✅ **능동 정리 구현 (2026-07-23, 사용자 A안).** filid `syncRuleDocs`·seiri `applyRuleDocs`/`planRuleDocs` 가 setup 시 **자기 네임스페이스(`{plugin}_*`)의 매니페스트-부재 파일을 은퇴(삭제)** 한다 — 네임스페이스는 매니페스트에서 파생(하드코딩·retired 목록 없음 → 미래 규칙 추가/제거 무코드 대응), setup 표면 전용(세션 훅 무관), seiri 는 plan 이 은퇴를 미리 보인다. **"구판 `filid_*` orphan + 신판 `seiri_*` 이중 로드" 문제 해소** — `/filid:setup` 재실행만으로 구판이 정리된다. 실측: 양쪽 fail-first(red 후 구현) · filid `test:run` 1182/7 · seiri 47 · 번들 가드 통과. "seiri 로 이관됨" 안내는 filid→seiri **런타임 결합**을 만들어 플러그인 독립 원칙에 걸리므로 런타임 메시지 대신 릴리스 노트로(아래 3번) — 은퇴 자체는 setup summary 의 `removed` 로 이미 보고된다.

- [x] ~~**`filid:setup`이 이관 안내를 표시**~~ → **능동 정리로 대체**(위 배너). orphan 은 setup 시 자동 은퇴, summary 가 보고. "어디로 갔나"는 릴리스 노트 소관
- [ ] `seiri:setup`이 filid 잔재를 감지하면 안내 (선택) — 플러그인 간 결합을 늘리지 않는 선에서 파일명 패턴 검사만
- [ ] 릴리스 노트에 순서 명시: **seiri setup 먼저, filid setup 나중**

## 커밋 순서

한 브랜치 안에서도 **논리적 순서는 유지**합니다 — 히스토리를 읽는 사람이 "왜 filid에서 뺐나"를 알려면 seiri가 먼저 존재해야 합니다.

```
0. (완료) 플러그인 스캐폴드                    ← 0f8493b4
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

**Phase 0 을 인프라와 병행**하기로 했습니다 (사용자 결정). 빌드·MCP·훅·UI 는 규칙 내용과 무관하므로 먼저 만들었고, `templates/rules/` 에 실제 규칙을 넣는 시점만 Phase 0 통과에 종속됩니다. 그래서 아래 표에서 **A-1 만 부분 완료**입니다.

| 트랙    | 단계  | 내용                                                                   | 상태                                | 선행     |
| ------- | ----- | ---------------------------------------------------------------------- | ----------------------------------- | -------- |
| —       | —     | 플러그인 스캐폴드 (`package.json`·tsconfig·`libs/run.cjs`·`.mcp.json`) | ✅ `0f8493b4`                       | —        |
| **B**   | —     | filid 에이전트 수정 (B-1~B-3)                                          | ✅ `e520f304`                       | 없음     |
| **A**   | 1a    | 모노레포 배선 + 스캐폴드 보정                                          | ✅ `fd834444`                       | —        |
| **A**   | 1b    | 빌드 스크립트 4종 + 빈 매니페스트                                      | ✅ `e16cacdb` `dbcd4740` `5cfb35f4` | —        |
| **A**   | 2     | core — configLoader · ruleDocs                                         | ✅ `aacea609`                       | —        |
| **A**   | 3     | 훅 2개 — SessionStart 주입 · InstructionsLoaded 측정                   | ✅ `dbcd4740`                       | A-2      |
| **A**   | 4     | MCP 2개 + 설정 UI (+ `plan` diff)                                      | ✅ `5cfb35f4`                       | A-2      |
| **A**   | 5     | 스킬 4개 + 패키지 문서                                                 | ✅ `19086afd`                       | A-4      |
| **A**   | 5b    | **스킬 확장 v2** — sp 절차 7종 이식 + 체이닝 (Phase 4b)                | ✅ 07-23                            | A-5      |
| **A**   | **0** | **규칙 검증 + 스킬 디스패치 검증 (micro-test)**                        | ✅ 07-23 규칙 축 — 디스패치는 D7    | —        |
| **A**   | 1c    | 규칙 자산 추출 → `templates/rules/`                                    | ✅ 07-23 — 8종 + manifest           | **A-0**  |
| **A**   | 6     | `rule-lint` 테스트                                                     | ⏸                                   | A-1c     |
| **B**   | —     | filid 룰 정리 (B-4)                                                    | ✅ 07-23 (A-1~A-5·C)                | **A-1c** |
| **A+B** | —     | 통합 검증 (머지 게이트)                                                | ⏸                                   | 전부     |

**부수 항목** (독립 착수 가능, 순서 무관): `e2e/` Playwright · `templates/gates/` placeholder 골격 · `/filid:scan` 으로 구조 점검.

**설계는 완료됐습니다.** 사상·헌법·구조·규칙 전문 9종·명명까지 확정. 3사 적대 리뷰와 메커니즘 실측을 거쳤습니다.

## 형태 — filid 기반 풀스택

seiri는 **filid와 같은 4계층 플러그인**입니다(Hook · MCP · Skill, Agent 없음). 스캐폴드는 이미 초기화되었고, 상세 구조는 [02-ARCHITECTURE.md](./02-ARCHITECTURE.md) §2입니다.

| 계층  | seiri                                       | filid 대비                       |
| ----- | ------------------------------------------- | -------------------------------- |
| Hook  | **2개** — SessionStart · InstructionsLoaded | filid 4개, **차단 훅 없음**      |
| MCP   | **2~3개** — openSettings · ruleDocsSync     | filid 15개+, 코드 분석 도구 없음 |
| Skill | 4개                                         |                                  |
| Agent | **0개**                                     | filid 7개                        |

**FCA 자기적용**: seiri 소스도 filid 규칙을 지킵니다 — fractal마다 `INTENT.md`, `index.ts` 순수 배럴. 두 플러그인의 위계가 실물에서 성립하는지 보는 시험대이기도 합니다.

---

# Phase 0 — 규칙 검증 (코드 0줄)

**목적**: 초안 9종이 실제로 행동을 바꾸는지 확인. **바꾸지 못하는 규칙은 만들지 않습니다.**

| 항목          | 내용                                                                             |
| ------------- | -------------------------------------------------------------------------------- |
| 착수 조건     | ✅ 규칙 전문 v1 완성 ([03-RULES.md](./03-RULES.md))                              |
| 산출물        | 규칙별 micro-test 결과표 · 개정된 규칙 v2 · 기각 목록                            |
| 완료 조건     | 각 규칙에 대해 대조군이 실패를 보였고, 규칙 적용 시 5회가 같은 형태로 수렴       |
| **중단 조건** | 절반 이상이 대조군에서 실패를 못 보이면 → **규칙 세트 재설계**(형식 층 매핑부터) |

## micro-test 5단계

1. **신선한 컨텍스트 1회 1샘플** — 시스템 프롬프트는 규칙이 살 실제 맥락, 사용자 메시지는 그 실패를 유혹하는 과제
2. **무지침 대조군 필수** — 대조군이 실패를 보이지 않으면 **고칠 게 없습니다. 멈추고 그 규칙을 쓰지 않습니다.**
3. **변형당 5회 이상** — 단일 샘플은 거짓말합니다
4. **매칭된 것 전부 사람이 읽기** — 템플릿 반향과 인용된 반례가 히트로 위장합니다
5. **분산이 지표** — 5회가 제각각이면 문구에 구속력이 없습니다. 말을 더하기 전에 형태를 조입니다

## 작업 체크리스트

- [x] S1 `agent-legible` — 유혹 시나리오 작성 완료 ([phase0/s1-agent-legible.md](./phase0/s1-agent-legible.md))
- [x] S1 대조군 5회 — **유효 5/5 전원 F1 실패 후보, 분산 극저. 사용자 판독 대기**
- [ ] S1 처치군 5회 — 판독 통과 후. **반드시 격리된 빈 스크래치 cwd에서** (provider CLI가 cwd에 실제 파일을 씀 — 라운드 1에서 실제 오염 사고. phase0 파일 "실행 노트" 참조). antigravity 제외
- [ ] S2 `public-contract` — 동일
- [ ] S3 `test-validity` — 동일
- [ ] S5 `naming` / S6 `structure` / S4 `reuse-first` — 이관본이므로 filid 운영 실적이 대용 증거, 표본 축소 가능
- [ ] S7 / S8 — 이관본, 동일
- [ ] S9 `decision-trail` — 편입 여부 결정과 함께
- [ ] **스킬 디스패치 micro-test** — Phase 4b 절의 항목을 같은 방법론(무지침 대조군·5회·분산)으로
- [ ] 결과를 [03-RULES.md](./03-RULES.md) 상태표에 반영, 통과분만 v2로 확정

**우선순위**: S1 → S2 → S3. **첫 규칙은 S1**입니다 — 신작이고 seiri의 존재 이유이며, 여기가 무너지면 나머지는 filid에서 이미 굴러가던 것들이라 seiri를 따로 만들 이유가 약해집니다.

**실행 도구**: `/cennad:crosscheck` 또는 개별 provider 호출. 외부 모델에 돌리면 설계 세션과 독립된 판정이 됩니다.

## 재개 절차 — 이 순서로

1. **[03-RULES.md](./03-RULES.md) S1 절을 읽습니다.** 코드펜스 안 영문이 시험 대상이고, 그 위 한국어 "판정 노트"가 **무엇을 겨냥한 규칙인지**를 말해줍니다. S1 은 에이전트 코드 오독 6메커니즘 중 ②암묵 관례·⑤반복 구조 오편집·③이름 함정·①간접 참조를 겨냥합니다.
2. **유혹 시나리오를 씁니다.** 규칙을 어기고 싶어지는 과제여야 합니다. S1 이라면: 프레임워크가 경로 규약으로 호출하는 파일을 추가하되, 호출 지점이 보이지 않는 상황. 표지판을 빠뜨리는 것이 자연스러운 과제.
3. **대조군을 먼저 돌립니다** — 규칙 없이 5회. **실패가 안 나오면 거기서 멈추고 그 규칙은 만들지 않습니다.** 이것이 Phase 0 의 전부입니다.
4. 대조군이 실패를 보이면 규칙을 넣고 5회. **5회 산출물을 사람이 직접 읽습니다** — 규칙 문구를 그대로 반향한 것과 실제로 행동이 바뀐 것은 다릅니다.
5. **분산을 봅니다.** 5회가 제각각이면 문구가 아니라 형태가 문제입니다 (레시피형/금지형/템플릿형 중 실패 유형에 맞는 형태인지). 말을 더하기 전에 형태를 바꿉니다.
6. 결과를 [03-RULES.md](./03-RULES.md) 상태표(문서 상단)에 기록합니다.

## 통과 후 — A-1c 규칙 자산 추출

인프라는 이미 완성되어 있으므로 **파일을 놓고 매니페스트에 등재하면 끝**입니다.

- `templates/rules/seiri_<slug>.md` — 03-RULES 코드펜스에서 **무수정 추출** (통과분만)
- `templates/rules/manifest.json` 의 `rules` 배열에 항목 추가:
  `id`(=`seiri_<slug>`) · `filename`(=`<id>.md`) · `title` · `description` · `recommended`(권장 3종만 `true`) · `templateHash`(**손대지 말 것 — 빌드가 채웁니다**)
- `yarn seiri build` → `sync-rule-hashes` 가 해시를 주입
- `yarn seiri test:run` → `wiring` 이 id/filename 규약을, `size` 가 200줄 상한을 검사

**`required` 필드는 없습니다** (전부 opt-in). **`legacyFilename` 도 없습니다** (신규 플러그인이라 마이그레이션 대상 부재).

---

# Phase 1 — 규칙 자산 + 매니페스트

> ✅ **인프라 완료** (`fd834444` `e16cacdb`) — 스캐폴드 보정·모노레포 배선·빌드 스크립트 4종·빈 매니페스트.
> ⏸ **규칙 자산만 남음** — Phase 0 통과분 추출. 절차는 위 "Phase 0 › 통과 후" 절 참조.
> 아래 체크리스트는 원안이며, 남은 항목은 `templates/rules/seiri_*.md` · `templates/gates/` · `templates/INTENT.md` 뿐입니다.

**목적**: 배포할 것을 확정하고, 해시 자동화를 세웁니다. **트랙 B의 룰 정리가 여기에 의존합니다.**

| 항목          | 내용                                                       |
| ------------- | ---------------------------------------------------------- |
| 착수 조건     | Phase 0 완료 — 최소 3종 통과                               |
| 완료 조건     | `rule-lint` 전 항목 통과. `yarn build` 시 해시가 자동 갱신 |
| **중단 조건** | 통과 규칙이 3종 미만이면 → Phase 0으로 복귀                |

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

| 검사          | 규칙                                                                                                          |
| ------------- | ------------------------------------------------------------------------------------------------------------- |
| 우선순위 사슬 | 모든 규칙 첫 블록에 `> **Precedence**:`                                                                       |
| **형식 근거** | `rests on a property` **또는** `rests on properties` 1건 이상 — **P5 게이트**. 수는 기대는 형식 개수에 맞춘다 |
| 이중 반증     | `This rule is working if:` **와** `is wrong for you if:`                                                      |
| 크기          | 규칙 ≤200줄, 스킬 ≤2KB                                                                                        |
| **임계 금칙** | 본문에 독립 숫자 임계 금지 (인용부 내부는 허용)                                                               |
| **언어 금칙** | 러너명 금지 — `npm `·`yarn `·`pytest`·`cargo `·`go test` 등                                                   |
| 배선          | manifest 등재 · 훅 등록                                                                                       |
| 해시 최신     | `sync-rule-hashes` 후 diff 없음                                                                               |

> ⚠️ 현재 S1 `agent-legible`은 `rests on **properties**`(복수)입니다. 단수만 검사하면 **자기 규칙을 통과시키지 못합니다.** 두 형태를 모두 인정해야 합니다.

---

# Phase 2 — MCP 서버 + 설정 UI

> ✅ **완료** (`aacea609` core · `5cfb35f4` MCP+UI). 구조는 원안과 둘 다릅니다:
> `core/rules/{manifestLoader,ruleSync,hashCompare}` 3-fractal → **`core/ruleDocs/` 단일 fractal**,
> 그리고 filid 에 없는 **`plan`(dry-run) 경로 + `/plan` 엔드포인트**가 추가되었습니다.
> ⏸ 남은 것: `e2e/` Playwright (서버 왕복은 `src/mcp/tools/openSettings/__tests__/webServer.test.ts` 11건이 이미 검증 — 남은 것은 브라우저 페이지 자체).

**목적**: 규칙이 대상 저장소에 안전하게 도달하는 경로.

| 항목          | 내용                                                                          |
| ------------- | ----------------------------------------------------------------------------- |
| 착수 조건     | Phase 1 완료                                                                  |
| 완료 조건     | 빈 저장소·기존 저장소 양쪽에서 배포·해제 무손실. `/context`에 seiri 규칙 열거 |
| **중단 조건** | 규칙이 `/context`에 안 나타나면 → 로드 메커니즘 재실측                        |

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

> ✅ **완료** (`dbcd4740`). 번들 실측: `setup.mjs` 4,445 B · `instructions-loaded.mjs` 2,257 B, 캡 16 KB 단일 light 티어.
> filid 와 달리 `selfProbe` 를 쓰지 않아 cross-spawn 이 인라인되지 않습니다 (탐지할 외부 바이너리가 없음).
> **선행 실측 2건 중 1건 해소** — matcher 무의미 확인. 페이로드 스키마는 여전히 미확정이라 훅이 페이로드 전체를 기록합니다.
> ⏸ 남은 것: 실사용 세션에서 `~/.claude/plugins/seiri/instructions-loaded.jsonl` 을 읽어 **실제 페이로드 형태 확인** · 규칙의 컴팩션 생존 여부.

**목적**: 상태 요약 주입과 효능 측정.

| 항목          | 내용                                                                                                                          |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 착수 조건     | Phase 2 완료                                                                                                                  |
| 완료 조건     | 다이얼 3단이 렌더를 바꾸고 배포 문서는 불변. 로드 로그가 남음                                                                 |
| **중단 조건** | ~~`src/` 1,500줄~~ → **폐지** (위 "원장 교정 · 결정" 5번). 대형화 신호는 도구·훅·에이전트 개수와 역할 밖 목록 위반으로 봅니다 |

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

> ✅ **완료** (`19086afd`). 네 스킬 모두 2 KB 이내 (2038·2044·2046·2046 B) — 초안은 전부 초과했고 여러 번 깎아 맞췄습니다.
> 상한은 `src/__tests__/size.test.ts` 가 기계 검사하고, 예산 값은 `src/constants/budgets.ts` 에 있습니다.
> 프론트매터는 `user_invocable` + `disable-model-invocation`(호출형 3종) / `disallowed-tools: AskUserQuestion`(debug).
> ⏸ 남은 검증: **`/context` 에서 호출형 스킬 description 이 실제로 안 보이는지** — "상시 비용 0" 은 원장의 주장이지 아직 측정되지 않았습니다. 자동 스킬(debug)이 질문하지 않는지도 유도 시나리오로 실측 필요.

**목적**: 대화형 도구와 자동 절차. 상시 예산을 늘리지 않습니다.

| 항목          | 내용                                                            |
| ------------- | --------------------------------------------------------------- |
| 착수 조건     | Phase 2 완료 (setup은 MCP 도구 필요)                            |
| 완료 조건     | 네 스킬 형태 검증 통과, 상시 주입 총량 유지                     |
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

# Phase 4b — 스킬 계층 확장 (2026-07-23)

**결정**: seiri는 sp의 **완전 대체**를 지향합니다(사용자 결정 07-23). 원장의 "대체재" 관계 선언을 스킬 4종은 이행하지 못했습니다 — sp가 덮던 작업 주기 한가운데(계획→수행→구현→검증→통합)가 공백이었습니다.

> ✅ **작성 완료** (07-23, 미커밋). 자동 5종 — `plan`(sp writing-plans 증류: 리뷰 가능한 태스크 경계·placeholder 금지·인라인 자가리뷰) · `execute`(sp executing-plans + SDD의 비-오케스트레이션 원리: 진행 원장·연속 실행·파일 핸드오프) · `implement`(sp TDD의 **시퀀스만** — 테스트 유효성 속성은 S3 규칙 소관이라 중복 없음) · `verify`(sp verification-before-completion — 증류에서 "최우선 채택" 판정을 받고도 미착지였던 것) · `request-review`/`receive-review`(리뷰어 사전판단 금지·수행적 동의 금지). 호출 1종 — `finish`(통합 결정은 사용자 몫 → `disable-model-invocation`, discard는 백업 ref + 타이핑 확인).
> 기존 3종(brainstorm·interview·debug)에 `Hand off` 체이닝 추가. `SHIPPED_SKILLS` 11종 갱신, **45 tests green**.

**형태 근거**는 [02-ARCHITECTURE.md](./02-ARCHITECTURE.md) §3 "스킬 지도" — 할당 원리(연속 구속→규칙 / 순간+자기 인지→자동 스킬 / 순간+**인지 부재**→규칙 잔류), sp에서 가져오지 않은 것(강압 부트스트랩=P1 감가 · 오케스트레이션 기계=역할 밖 · worktree=하니스 내장 · terminal state 봉쇄=공존 파괴), 그리고 **베팅 D7**.

## 남은 검증 (Phase 0에 합류)

- [ ] **스킬 디스패치 micro-test** — 강압 부트스트랩 없이 자동 7종이 제 순간에 발화하는가. 대조군: 스킬 미설치. 처치군: 설치만(추가 지시 없음). 순간별 유혹 시나리오 5회, 분산이 지표. **미달 시**: SessionStart 렌더에 비강압 안내 1줄 검토(D7)
- [ ] 자동 스킬 질문 금지 실측 — 7종으로 확대 (기존 debug 단독 항목을 흡수)
- [ ] 체이닝 실효 실측 — implement 완료 후 verify가 실제로 이어지는가
- [ ] `/context`에서 호출 4종(setup·brainstorm·interview·finish) description 비노출 확인

## S7·S8 ↔ 스킬 중복 대조 (07-23 발견 — D8의 근거)

규칙(상시 로드)과 스킬(순간 로드)이 같은 원류(filid 룰 + sp)에서 따로 증류되어 생긴 계보적 중복. 같은 내용의 이중 지불이자 사본 드리프트 위험(I10의 정신). **머지 게이트의 이관 정합성 검사에 "규칙↔스킬" 축을 추가한다.**

| 규칙 조항                                                                                                    | 겹치는 스킬                                 | 정도      |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------- | --------- |
| S8 §1 Evidence over confidence + 합리화표("Should work now"·"I'm confident"·"Too simple"·"Deleting X hours") | `verify` 게이트 전체 · `implement` 합리화표 | 거의 1:1  |
| S8 §2 _"Fix where it started, not where it surfaced"_                                                        | `debug` 표제 _"fix where it started"_       | 표제 동일 |
| S8 §5 _"Disagree with reasoning; say I don't know"_                                                          | `brainstorm` Rules 동일 문구                | 문장 동일 |
| S7 §2 _"capture once … pays twice"_                                                                          | `debug` §1 동일 문구                        | 문장 동일 |
| 중복 아님(잔류 근거)                                                                                         | S7 §1·§3, S8 §3·§4 — 순간 없는 연속 규율    | 규칙 잔류 |

---

# 트랙 B — filid 슬리밍 (같은 브랜치)

**목적**: 중복 제거와 역할 정리. filid = FCA 코어 + INTENT 관리·주입 + PR 리뷰.

| 항목          | 내용                                                                                     |
| ------------- | ---------------------------------------------------------------------------------------- |
| 착수 조건     | **A절(룰 정리)**: 트랙 A Phase 1의 규칙 파일 확정 후 / **B절(에이전트)**: 즉시 착수 가능 |
| 완료 조건     | `fca-policy` 단독 잔류. 중복 2건 소멸. 에이전트 3건 수정 완료                            |
| **중단 조건** | 통합 검증에서 규칙 공백이 재현되면 이관 커밋만 되돌립니다                                |

## 순서 규약

같은 브랜치이므로 저장소 레벨의 공백은 없습니다. 다만 **커밋 순서는 유지**합니다 — seiri 규칙이 먼저 존재해야 filid 제거가 논리적으로 읽힙니다.

`syncRuleDocs()`가 선택 해제 시 대상 프로젝트의 `.claude/rules/` 파일을 **삭제**한다는 사실은 변하지 않습니다. 사용자 프로젝트 레벨의 공백은 **마이그레이션 안내**(문서 상단)로 완화합니다.

## A. filid 규칙 문서 정리

> ✅ **완료 (2026-07-23).** 이관 정합성 조항 단위 대조 → 누락 0. `filid_fca-policy.md` 225→183줄 · manifest fca-policy 단독(hash 재주입) · 이관 4종 삭제. 테스트 manifest-driven 재작성(선택 규칙 0개 → 관련 테스트 loud skip, 등재 시 자동 부활). 증거: `yarn filid test:run` **1181 passed / 7 skipped** · e2e 6 passed/2 skipped · typecheck·eslint·`sync-rule-hashes --check` clean · 잔여 참조 0.
>
> **승인 판단 3건** (03-RULES 판정 노트 > A-1 약칭): ① `index-barrel`/`module-entry` 트림은 스캐너 검사 대상 **구조 사실** 잔류·큐레이션 서술만 이관(빈 껍데기 방지) ② `module-entry` bullet 2(프레임워크 진입 파일 + `additional-entry-points`)는 설정 UI·e2e가 쓰는 config 메커니즘이라 잔류 ③ `circular-dependency` 블록 제거하되 "스캔 미검증" caveat는 intro 1줄 보존.

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

- [ ] **filid 회수 (1문장)**: §5의 _"Internal implementation files should import concrete internal files directly, not route through the local `index.ts`…"_ → `module-entry-point`로 병합
- [ ] 나머지 전부 seiri 이관. §6 네이밍은 seiri에서 `naming`과 **병합**

### A-3. 전부 seiri 이관

- [ ] `filid_test-validity.md` (88줄)
- [ ] `filid_context-efficiency.md` (66줄)
- [ ] `filid_cognitive-discipline.md` (101줄)

### A-4. 전 규칙 공통 — `Tradeoff:` 블록 형태 교정

현행 filid 규칙의 `Tradeoff:` 블록은 전부 **예외 조항** 형태입니다(예: _"Exemption: only code that will never be committed"_). 실측에 따르면 예외 조항은 스코프하지 않습니다.

- [ ] ❌ "이 규칙은 커밋되지 않을 코드에는 적용되지 않는다"
- [ ] ✅ "커밋 대상 파일이면 이 규칙을 적용한다" (술어가 관측 가능)
- [ ] 잔류 규칙과 이관 규칙 **양쪽 모두**에 적용

### A-5. `manifest.json`

- [ ] 이관된 4개 항목 제거 → `fca-policy` 단독
- [ ] 제거 항목의 `templateHash` 정리

## B. filid 에이전트 수정 — 이관 리스크 대응

> ✅ **B-1 ~ B-3 완료** (`e520f304`). `restructurer.md` 와 `code-surgeon.md` 에 "Refactoring Safety Contract" 절 신설, `implementer.md` 의 3+12 표현 2곳 정정.
> 회귀 확인: `yarn filid test:run` 1183 passed / 5 skipped.
> **주의**: `docsLanguage.test.ts` 의 SCOPE 는 qa-reviewer·engineering-architect·operations-sre 셋뿐이라 이 세 파일을 검사하지 않습니다 — 그 테스트 통과는 이 변경의 증거가 아닙니다.

### B-1. ❗ `agents/restructurer.md` — 리팩토링 안전 조항 **신설**

현재 105줄에 `test` 단어가 **0건**입니다. `characterization`·fail-first는 filid의 `agents/`·`skills/` 전체에 한 건도 없습니다. 유일한 근거였던 `test-validity §1`이 이관되면 **구조를 옮기는 에이전트가 무방비**가 됩니다.

- [ ] 리팩토링은 계약 반전 — 기존 테스트가 **무수정으로 전후 통과**해야 한다
- [ ] 코드 이동 **전에** characterization 테스트로 현재 동작 고정
- [ ] 기존 assertion 편집 금지 (테스트 추가는 허용)

### B-2. `agents/code-surgeon.md` — 동일 조항 보강

현재 파라미터화 시 "값 보존"만 있고 fail-first 없음.

- [ ] B-1과 같은 조항을 수술 범위에 맞춰 추가

### B-3. `agents/implementer.md` — 문서-구현 불일치 정정

- [ ] 현재: _"Respect the 3+12 rule — max 15 test cases per `spec.ts` (3 basic + 12 complex)"_
- [ ] 정정본: _"at most 15 cases per spec file — the scan gate checks the total only; '~3 basic + ~12 complex' is the recommended shape, **not a separately enforced pair**"_
- [ ] TDD 내장 조항(Red/Green, fail-first)은 **유지** — 규칙 이관 후에도 이 에이전트가 자립하는 근거

## C. filid 단독 검증

> ✅ **완료 (2026-07-23).** e2e 페이지 렌더가 fca-policy 단독(필수1·선택0) 확인. 이관 4종 전수 제거(잔여 참조 0). 재빌드 불요 — manifest·템플릿 런타임 로드(번들 미포함). B-1~B-3는 `e520f304`. **후속(web UI 슬리밍)**: 선택 규칙 0개면 rule-doc 섹션 숨김(task 3) + 브라우저 미기동·config는 config-wizard 안내(task 4).

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
- [ ] 스킬 11종 — 크기·`SHIPPED_SKILLS` 일치·자동/호출 frontmatter 계약(`disallowed-tools` vs `disable-model-invocation`)

---

# 전 단계 관통 검증

| 축            | 수단                       | 시점                      |
| ------------- | -------------------------- | ------------------------- |
| **행동 변화** | micro-test (무지침 대조군) | Phase 0, 규칙 개정 시마다 |
| **자기 준수** | `rule-lint`                | 매 커밋                   |
| **실제 도달** | `/context` Memory files    | Phase 1 이후 상시         |
| **로드 관측** | `InstructionsLoaded` 로그  | Phase 3 이후              |
| **최종 효능** | **10이슈 A/B**             | Phase 3 완료 후           |
| **적대 검토** | `/cennad:crosscheck`       | Phase 2 완료 시 1회       |

## 10이슈 A/B 프로토콜

seiri의 승리 조건은 주관적 구조 평가가 아니라 **동일 이슈에 대한 as-is/to-be 에이전트 성공률**입니다.

- 이슈 10개 층화: 버그픽스 3 / 기능 3 / 패턴 전파 2 / 암묵지 의존 2
- fail-to-pass + pass-to-pass 오라클, 인간 체크포인트
- 모델·하네스 고정, **3회 시행**(분산 측정)
- 지표: 성공률 + 토큰 + 읽은 파일 수 + 오편집 수 + 사용자 개입 횟수
- 동작 보존은 별개 축 — characterization 선행

---

# 리스크 대장

| #   | 리스크                                | 완화                                                                                                                                        | 감지                                           |
| --- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| R1  | **순응 미달** — 규칙을 읽고도 안 따름 | 형식 기반(무충돌성) · 구체 문구 · 200줄 제한                                                                                                | micro-test 분산, 10이슈 A/B                    |
| R2  | **저장소 관례와 충돌**                | 우선순위 사슬 첫 줄 박제                                                                                                                    | 사용자 보고, A/B의 오편집 지표                 |
| R3  | **오라클 부재 저장소**                | "오라클을 세워라" 촉구만, 값 주입 금지                                                                                                      | Phase 1 빈 저장소 테스트                       |
| R4  | **대형화**                            | 역할 밖 목록 · MCP 도구 3개 이하 · 훅 2개 · 에이전트 0개                                                                                    | 도구·훅·에이전트 개수 회귀 · 역할 밖 목록 대조 |
| R5  | **다중 플러그인 충돌**                | `seiri_` 네임스페이싱 · 우선순위 사슬                                                                                                       | filid 동시 설치 테스트                         |
| R6  | **전환 공백**                         | 저장소 레벨은 단일 브랜치. 사용자 프로젝트 레벨은 **능동 정리**(setup 시 `{plugin}_*` orphan 은퇴)로 이중 로드 해소 + 릴리스 노트 순서 안내 | 통합 검증의 공백 재현 테스트                   |
| R9  | **이관 누락·중복**                    | 조항 단위 대조 + `rule-lint` 임계 금칙                                                                                                      | 통합 검증의 이관 정합성                        |
| R7  | **문서 드리프트**                     | `rule-lint`로 기계 집행 · 개수·목록 금지                                                                                                    | 매 커밋                                        |
| R8  | **보안** — 규칙 배포가 인젝션 표면    | 확인 후에만 쓰기 · diff 제시 · 네트워크 없음                                                                                                | Phase 1 검토                                   |

---

# 남은 설계 결정

| #   | 결정                          | 제안                                                                                                                                                                                                       | 확정 시점 |
| --- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| D1  | manifest `required`           | **전부 opt-in** + setup이 권장 3종 기본 체크                                                                                                                                                               | Phase 1   |
| D2  | S9 `decision-trail` 편입      | 편입하되 opt-in (민감정보·squash 리스크)                                                                                                                                                                   | Phase 1   |
| D3  | 다이얼 어휘 조절(MUST/SHOULD) | **폐지** — 배포 문서와 주입의 이중 강도 문제                                                                                                                                                               | Phase 3   |
| D4  | 에이전트 보유                 | **없음**                                                                                                                                                                                                   | —         |
| D5  | 조건부 규칙(`paths:`) 사용    | v1은 전부 무조건 로드. 총량이 넘치면 도입 (S3 `test-validity`가 1순위 후보)                                                                                                                                | Phase 1   |
| D6  | 게이트 스캐폴드 제공          | Phase 2 이후, placeholder 골격만                                                                                                                                                                           | Phase 2   |
| D7  | 자동 스킬 디스패치 신뢰도     | **베팅** — 강압 부트스트랩 없이 description+체이닝으로 충분. 미달 시 SessionStart 비강압 안내 1줄                                                                                                          | Phase 0   |
| D8  | S7·S8 ↔ 순간 스킬 중복 해소   | 6층 예외 두 규칙과 신설 스킬의 문장 수준 중복(아래 Phase 4b 대조표). 조항 단위로 — 순간이 명확한 조항은 스킬이 갖고 규칙에서 덜어내며, 연속 조항(S7 §3·S8 §4 등)만 잔류. S7·S8 micro-test 결과와 함께 판정 | Phase 0   |

---

# 확정된 결정 (2026-07-23)

| #   | 결정                   | 확정 내용                                                                                                                                                                                                          |
| --- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D8  | S7·S8 ↔ 스킬 중복      | **규칙 무삭감.** 중복은 원칙(규칙·상시)/절차(스킬·순간)의 altitude 분리 — 근거 5종은 [phase0/SYNTHESIS.md](./phase0/SYNTHESIS.md). 드리프트는 A-6 rule-lint의 공유 관용구 고정 검사로 완화. D7 실측 후 재검토 가능 |
| D2  | S9 decision-trail 편입 | **편입 opt-in 확정, 등재 유보** — 자체 대조군(3표본) 통과 후 manifest 등재                                                                                                                                         |
| D1  | 권장 3종               | S1(agent-legible) · S3(test-validity) · S4(reuse-first) — manifest `recommended: true` 반영 완료                                                                                                                   |

# 규칙 분량 평가 — 전체 플러그인 완성 후 (D9, 07-23 사용자 결정)

**질문**: 상시 로드 규칙이 길다 — 규칙=관점 주입 / 스킬=행동 유도(sp 모사) 아키텍처에서 절차·디테일을 스킬로 빼고 코어만 남길 수 없는가.

**실측**: 권장 3종(S1·S3·S4) 294줄/12.2KB(~3k 토큰) · 전부 8종 704줄/29.2KB(~7k 토큰). 이관 대응분은 filid 은퇴분과 거의 등량(~434→~450줄) — 순증의 주체는 신규 검증 통과분 S1·S2(+S6 일부, ~250줄), 즉 새 커버리지의 값.

**결정(사용자, 07-23)**: v1 전문을 당장 유지하고, **슬리밍 평가는 규칙 단독이 아니라 스킬 포함 전체 플러그인 완성 후 실하니스에서** "어디까지 줄여도 구속력이 유지되는가"로 진행한다. 스킬 발화가 절차를 얼마나 받쳐주는지가 변수라 규칙 단독 평가는 성립하지 않는다.

**당장 유지의 근거 3**:

1. **검증된 산출물이 v1 전문이다** — S1 처치군 수렴은 헤드라인이 아니라 부연 불릿의 레시피 템플릿(`loaded by <mechanism>; …`)이 만들었다(처치 5/5가 구체값으로 채움 — phase0 기록). 얇은 판의 구속력은 미측정 — 미검증 슬림판 배포는 Phase 0 원칙 위반.
2. **얇은-상시 경제학은 sp의 강압 부트스트랩 전제다** — seiri는 강압을 기각했으므로(P1) 발화는 베팅(D7)이고, 두꺼운 규칙이 그 베팅의 헤지다. D7이 좋게 실측되면 헤지를 줄인다.
3. **opt-in(D1) + 권장 3종 기본**이 기본 노출을 ~3k 토큰으로 가격한다.

**평가 체크리스트 (플러그인 완성 후 — D7 하니스 트랙과 통합)**:

- [ ] lite판 제작 — 각 절 = 볼드 명령 + Ask yourself + 핵심 1불릿, S8 합리화표는 유지(작동 기제). 목표 40~50% 감량
- [ ] full vs lite 처치군 A/B(S1·S2 방법론 재사용) + 하니스 세션에서 스킬 발화와의 상호작용 관측
- [ ] 유지되면 전 규칙 lite화(총량 ~400줄대), full판은 문서 참조로 강등 / 안 되면 현 결정을 실증으로 승격
- [ ] 병행 밸브: D5 `paths:` 조건부 로드(S3 1순위) 검토

# 머지 시 정리

- [ ] **통합 검증 전 항목 통과** — 위 머지 게이트
- [ ] 릴리스 노트에 마이그레이션 순서 명시: **`/seiri:setup` 먼저, `/filid:setup` 나중**
- [ ] 이 문서(`TODO.md`) 제거
- [ ] [03-RULES.md](./03-RULES.md) 상태표를 최종 확정본으로 갱신
- [ ] [README.md](./README.md) 현재 상태 절 갱신
- [ ] filid `.metadata` 문서에 위계 분담 상호 참조 추가
- [ ] 이슈 [#97](https://github.com/vincent-kk/ogham/issues/97) · [#98](https://github.com/vincent-kk/ogham/issues/98) 닫기 (같은 PR로 함께)
