# TODO — seiri 개발 작업 문서

> ⚠️ **이 문서는 개발 완료 후 제거됩니다.** 원장으로 보관되는 것은 [README.md](./README.md) · [01-CONSTITUTION.md](./01-CONSTITUTION.md) · [02-ARCHITECTURE.md](./02-ARCHITECTURE.md) · [03-RULES.md](./03-RULES.md) 넷입니다. **원장에는 확정 설계만, 작업 항목은 전부 이 문서에 모읍니다** — 누락 방지가 이 문서의 존재 이유입니다.

관련 이슈: [#97 seiri 구현](https://github.com/vincent-kk/ogham/issues/97) · [#98 filid 슬리밍](https://github.com/vincent-kk/ogham/issues/98)

---

# 세션 재개 — 여기부터 읽으세요

**2026-07-24 기준. 브랜치 `feature/97-98`.**

**코드 작업은 전부 완료됐습니다.** #97·#98 원안(빌드·MCP·설정 UI·훅·스킬 11종·규칙 8종·filid 슬리밍·통합 검증·D7 프록시 실측·10이슈 A/B·D9 lite 슬리밍)에 더해, **확장 트랙(다이얼 배선·선제 훅·조건부 규칙)도 2026-07-24 착지**했습니다. 완료 절은 이 문서에서 들어냈습니다 — 설계는 원장 4서, 실험 기록은 [phase0/](./phase0/), 변경 이력은 git 에 있습니다(`git log --format='%h %s' main..HEAD` — SHA 는 rebase 로 바뀌므로 제목 줄이 안정 식별자).

**남은 것은 세 갈래입니다**: 사람이 해야 하는 것(아래 "사용자 할 일") · 실사용 세션이 있어야 하는 관측(아래 "실하니스 잔여") · 머지 정리.

## 지금 상태

|           |                                                                                                                                                              |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 동작      | `yarn seiri build` green · 설정 페이지 배포/해제 왕복 · 스킬 11종(각 ≤2KB, 최대 2031B) · 규칙 8종                                                            |
| 테스트    | `yarn seiri test:run` **89 green** (12 파일) · e2e 5 pass · `yarn typecheck` 9 워크스페이스 clean · filid 회귀 1188 passed / 7 skipped                       |
| 훅        | 번들 4 = 등록 3 + dormant 1(InstructionsLoaded). **등록은 4개 이벤트** — `post-tool-use` 번들이 `PostToolUseFailure`(카운트)·`PostToolUse`(리셋) 양쪽에 걸림 |
| MCP       | 도구 2(open_settings · rule_docs_sync) — `config` action 흡수 완료 (도구 수 불변)                                                                            |
| 다이얼    | 2계층 — `.seiri/config.json` 기준선(커밋) / `.seiri/runtime.json` 밸브(비추적). 유효값 `runtime ?? baseline ?? advisory`                                     |
| 규칙      | 8종 등재(권장 S1·S3·S4) · D9 lite 4종 채택(상시 -13%) · **S3 는 `paths:` 조건부** · S9 는 대조군 통과 후                                                     |
| 커밋 규약 | AI 는 `src/`·`skills/`·문서만 커밋 — `bridge/`·`public/` 빌드 산출물은 **사용자가 직접 커밋**                                                                |

## 재개 시 알아야 할 함정 5가지

1. **포매팅은 매 턴 끝에 훅이 돌립니다** (`.claude/settings.json` 의 Stop 훅 → `prettier --write --ignore-unknown`). 커밋 전에 같은 명령을 직접 돌려야 커밋과 포매팅 결과가 어긋나지 않습니다.
2. **훅이 저장소 루트에서 실행되므로 무시 규칙도 루트 `.prettierignore` 만 참조됩니다.** 패키지 레벨 `.prettierignore` 는 효력이 없습니다. 규칙 템플릿 보호(`plugins/*/templates/rules/`)가 루트에 들어가 있는 이유입니다 — 포매팅되면 `templateHash` 가 무효화되어 모든 사용자에게 거짓 드리프트가 뜹니다.
3. **훅 도달 코드는 배럴 import 금지**입니다. concrete 파일 직접 import 만. typecheck 는 못 잡고 `scripts/build-hooks.mjs` 의 캡·금칙 가드만 잡습니다. 훅 소스를 고쳤으면 반드시 `yarn seiri build:plugin`.
4. **번들 금칙 정규식은 미니파이 후에도 살아남는 문자열이어야 합니다.** 패키지 이름은 번들링이 지웁니다 (`env-paths` 대신 `XDG_CONFIG_HOME` 을 매칭하는 이유).
5. **경로는 `@ogham/cross-platform/compat` 경유**, 네이티브 `node:path` 금지. `hostPaths` 는 MCP 전용이고 **훅에서 소비 금지**입니다 (호스트가 훅에 `CLAUDE_PLUGIN_ROOT` 와 cwd 를 직접 줍니다).

**테스트 규율**: 89건 전부 **일부러 깨뜨려 red 를 확인**한 것들입니다. 새 테스트도 같은 절차를 밟습니다 — 실패를 본 적 없는 테스트는 아무것도 증명하지 않습니다.

---

# 확장 트랙 — 착지 요약 (2026-07-24)

체크리스트는 전 항목 완료되어 들어냈습니다. **확정 설계는 원장이 정본**입니다 — [01-CONSTITUTION.md](./01-CONSTITUTION.md) P4(다이얼 4축·2계층) · [02-ARCHITECTURE.md](./02-ARCHITECTURE.md) §4(훅·config action·다이얼) · §5(조건부 로드·파서 실측).

| #   | 결정      | 착지한 것                                                                                             | 테스트    |
| --- | --------- | ----------------------------------------------------------------------------------------------------- | --------- |
| 2   | D11 · D14 | `config` action(get·set·clear) + 다이얼 2계층 + `.seiri/.gitignore` 자기완결                          | 12        |
| 3   | D10       | 렌더 발동 폭(standard 체인 / strict +경계·완료 계약) · 출처 표기 · setup 게이트 권유                  | 9         |
| 4   | D13       | `PostToolUseFailure`+`PostToolUse` 한 번들 · N=3 · 명령별 카운터 · 세션 1회 dedup · fail-first 인정형 | 7         |
| 5   | D12       | SubagentStart 축약 재주입 · `execute`·`request-review` 위임 재진술 · `renderStatusLines` 를 shared 로 | 5         |
| 6   | D5 재개   | S3 `paths:` frontmatter(템플릿 포함) · rule-lint 가 `globs:` 기계 차단                                | 1         |
| 7   | —         | 전체 회귀 green                                                                                       | 계 **34** |

**선제 배선 원칙**(이 트랙 전체의 근거, 사용자 결정 2026-07-24):

> D7 프록시·10이슈 A/B 가 검증한 것은 **소컨텍스트 정합까지**다. 배선이 겨냥하는 **대컨텍스트·다유혹 조건**(긴 세션, 컴팩션 후, 연쇄 실패 중, 서브에이전트 위임)은 미측정이고, 그 실측은 긴 메인 세션이 필요해 비용이 금지적이다. 따라서 **실측을 기다리지 않고 선제 적용**하되 **전부 다이얼로 게이팅**한다 — advisory = 조건부 주입 전부 침묵(= D7 이 검증한 상태), 불용 판단 시 다이얼을 낮추는 것이 opt-out 이다.
>
> Phase 0 원칙("측정 없이 짓지 않는다")과의 관계: 그 원칙은 micro-test 가 저렴한 **규칙 본문**에 적용된다. 측정 비용이 금지적인 영역은 **선제 + 밸브 + 사후 관측**으로 간다 — 측정 가능성이 원칙의 적용 범위를 가른다.

## 실측이 계획을 고친 것 2건 (원장 반영 완료)

**둘 다 "구현 중 확정할 것"으로 위임됐던 항목이고, 실측 결과가 원안과 달랐습니다.**

**① D13 — 실패는 별개 이벤트다.** 비-0 종료는 `PostToolUse` 를 발화시키지 않고 `PostToolUseFailure` 로 옵니다. 실패 페이로드엔 `tool_response` 자체가 없어(대신 `error` + `is_interrupt`), 원안이 가정한 "`tool_response` 어디에 실패가 오는지"는 성립하지 않았습니다. 둘 다 `additionalContext` 를 받으므로 **번들 하나를 두 이벤트에 등록** — 실패에서 세고 성공에서 잊습니다. 번들 수는 4 불변, 등록 이벤트만 4개.

**② D5 — 키는 `paths:` 하나뿐이다.** 블랙박스 스모크는 성립하지 않았습니다: 규칙 목록 캐시가 `session_start`·`compact` 에서만 무효화되어, 같은 세션에 규칙 파일을 넣으면 어느 키를 쓰든 로드되지 않고 **"키가 틀렸다"와 "캐시가 안 깨졌다"가 같은 관측**으로 나옵니다. 그래서 셸 바이너리(2.1.218)의 파서를 직접 읽었고, 프론트매터 파서 전체가 `if (!t.paths) return { content }` 였습니다. `globs:` 는 읽히지도 않고 버려지며, 그러면 규칙이 **무조건 로드로 되돌아갑니다** — 조건부화 실패가 조용한 이유입니다. 커뮤니티 혼동(#17204·#22170)의 근원도 나왔습니다: `globs` 는 InstructionsLoaded **페이로드의 필드명**이고 문서가 그것을 _"매칭된 `paths:` 패턴"_ 으로 설명합니다 — 관측 이름과 입력 키가 한자리에 등장해 입력 키로 읽힌 것입니다.

부수 사실(gitignore 문법·루트 상대·후행 `/**` 절단·프론트매터 컨텍스트 미주입)까지 원장 §5 에 표로 보존했습니다.

## 체크리스트 밖 판단 3건 (전부 유지)

1. **`config` action 이 플러그인 루트 확인보다 먼저 분기** — 템플릿이 안 잡히는 환경이야말로 seiri 를 낮추고 싶은 순간이라, 그때 다이얼을 못 내리면 밸브의 의미가 없습니다.
2. **실패 카운터는 명령별 리셋** — 전역 리셋이면 무관한 `git status` 하나가 연쇄를 지워 신호가 사실상 발화하지 않습니다.
3. **SubagentStart 는 advisory 에서 완전 침묵** — 이 문서의 원안("advisory: Active rules 한 줄")보다 원장 다이얼 표(세션 신호 훅 advisory = 침묵)를 따랐습니다. **원장이 정본이므로 실물이 옳고 원안이 어긋났던 것**입니다. 되돌리려면 `renderStatusLines` compact 분기 한 줄.

---

# 실하니스 잔여 — 실사용 세션 의존

전부 로컬 설치 + 실사용 세션이 있어야 관측됩니다. 확장 트랙의 **사후 관측**이 여기 합류합니다 — 선제 배선은 "짓고 나서 본다"가 설계이므로, 이 목록이 그 "본다"에 해당합니다.

> **관측 설계·판정 규칙 정본: [phase0/ext-observation.md](./phase0/ext-observation.md)** (2026-07-24 신설).
> D7 프록시 하니스는 여기 쓸 수 없습니다 — 프록시의 정의적 속성(신선·소컨텍스트)이 확장 트랙이 겨냥하는 조건의 반대라서, 그 하니스로 재면 D7이 이미 준 답만 다시 나옵니다. 그래서 **T1 배선 검증**(결정론적, 재설치 직후 1회)과 **T2 사후 관측**(사건 기반, 실사용 누적)으로 갈랐고, **처리 규칙을 관측 전에 사전 등록**했습니다.

- [x] **T1 배선 검증 8항목** — ✅ **8/8 PASS, 배선 결함 0** (2026-07-24, [phase0/t1-results.md](./phase0/t1-results.md)). 머지 게이트 통과. 실측 중 문서 개선 3건(#7 재집계≠재발화 · #6 서브에이전트 로그 경로 · #4 `.gitignore` 트리거)과 baseline 정정을 관측 정본에 반영. 인계 프롬프트: [phase0/t1-handoff.md](./phase0/t1-handoff.md)
- [ ] **T2 사후 관측 개시** — 항목별 최소 3사례 누적 시 판정. D13 적중/오발화 · D12 서브에이전트 참조 · D10 발화 폭 · 컴팩션 생존 · S3 실로드. **개시 전제**: 실사용 baseline이 advisory여야 "무비용 기준선"과의 대조가 성립(seiri 기본은 advisory — 스크래치가 standard였던 건 T1 항목 5~8 테스트용 조작이지 배포 기본값이 아님)
- [ ] **S9 `decision-trail` 대조군** (cennad 3표본) → 통과 시 manifest 등재 (D2)
- [ ] **D7 §8 메인세션 잔여** — implement·plan 발화 재확인 · 질문금지 집행 (AskUserQuestion 존재 환경. 프록시는 집행 증명이 약했습니다)
- [ ] `seiri:setup` 의 filid 잔재 감지 (선택 — 파일명 패턴 검사만, 플러그인 간 결합 금지)
- [ ] `/filid:scan` 으로 seiri 소스 FCA 구조 점검 (부수)

# 사용자 할 일

1. **`bridge/` · `public/` 커밋** — 확장 트랙 재빌드분. 신규 산출물 2개(`bridge/post-tool-use.mjs` · `bridge/subagent-start.mjs`)는 **untracked** 이므로 `git add` 필요
2. **로컬 재설치 + `/seiri:setup` 재배포** — S3 frontmatter 로 해시가 바뀌어 재배포해야 조건부가 반영됩니다. 재설치 직후 **격리 프로젝트에서 T1 배선 검증 8항목**([phase0/ext-observation.md](./phase0/ext-observation.md) §1) — 끝나면 반드시 `config clear` 로 다이얼 원위치(안 그러면 평소 작업이 처치군이 되어 T2 기준선이 사라집니다)
3. **`agy` CLI 점검** — antigravity 2연속 "no output" 으로 Phase 0 실험에서 제외됐던 건

---

# 결정 대장

| #        | 결정                                                                           | 확정      |
| -------- | ------------------------------------------------------------------------------ | --------- |
| D1       | 전부 opt-in · 권장 3종 S1(agent-legible)·S3(test-validity)·S4(reuse-first)     | 07-23     |
| D2       | S9 편입 opt-in — 등재는 자체 대조군(3표본) 통과 후                             | 07-23     |
| D3       | 문구 강도(MUST/SHOULD) 조절 **폐지** — 이중 강도 문제 (헌법 P4 반영)           | 07-24     |
| D4       | 에이전트 0개                                                                   | —         |
| D6       | 게이트 스캐폴드는 placeholder 골격만 (값 없음)                                 | —         |
| D7       | 디스패치 베팅 — 프록시 승리 33/35(94%), 강압 부트스트랩 불요. 메인세션 §8 잔여 | 07-23~24  |
| D8       | S7·S8 ↔ 스킬 중복 — 규칙 무삭감 (원칙/절차 altitude 분리)                      | 07-23     |
| D9       | 규칙 lite 4종 채택(상시 -13%) — 전면 슬리밍은 실하니스 후                      | 07-24     |
| **원칙** | **선제 배선** — 대컨텍스트 겨냥 배선은 선제 + 다이얼 밸브 + 사후 관측          | **07-24** |
| D5       | 재개 → **`paths:` 조건부 로드 착지** (S3)                                      | 07-24     |
| D10      | 다이얼 3축 완성 — 발동 폭·게이트 권유 **배선 완료**                            | 07-24     |
| D11      | config 는 `rule_docs_sync` action 흡수 — 3번째 도구 없음                       | 07-24     |
| D12      | SubagentStart 상태 재주입 + 위임 재진술                                        | 07-24     |
| D13      | 실패 연쇄 → trace-cause 신호 (**PostToolUseFailure** + PostToolUse)            | 07-24     |
| D14      | 다이얼 2계층 저장 — 기준선(커밋) / 런타임(비추적)                              | 07-24     |

**미해결 결정 없음.** "구현 중 확정할 것" 2건(D5 키 · D13 페이로드)은 실측으로 종결되어 원장에 반영됐습니다.

---

# 머지 시 정리

- [x] 확장 트랙 전 항목 완료 + 회귀 통과 (2026-07-24)
- [x] 원장 정합 — §4 훅 표(두 이벤트) · 훅 수 표기 · §5 파서 실측 절 반영 (2026-07-24)
- [x] T1 배선 검증 8/8 PASS — 배선 결함 0, 머지 게이트 통과 (2026-07-24)
- [ ] 릴리스 노트에 마이그레이션 순서 명시: **`/seiri:setup` 먼저, `/filid:setup` 나중**
- [ ] [03-RULES.md](./03-RULES.md) 상태표를 최종 확정본으로 갱신 (S3 조건부 포함)
- [ ] [README.md](./README.md) 현재 상태 절 갱신 (훅 4 · config action · 다이얼 2계층 반영)
- [ ] filid `.metadata` 문서에 위계 분담 상호 참조 추가
- [ ] 이 문서(`TODO.md`) 제거
- [ ] 이슈 [#97](https://github.com/vincent-kk/ogham/issues/97) · [#98](https://github.com/vincent-kk/ogham/issues/98) 닫기 (같은 PR 로 함께)
