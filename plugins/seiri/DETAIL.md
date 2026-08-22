# DETAIL — seiri

## Requirements

### Rule deployment

- 규칙 문서는 `templates/rules/` 에 포함되며 설정 페이지 또는 `rule_docs_sync` 같은 셋업 표면만 배포한다. 세션 훅은 규칙 아티팩트에 쓰지 않는다.
- 배포 채널은 현재 호스트가 정한다. Claude 는 `<repoRoot>/.claude/rules/<filename>` 파일을 사용하고, Codex 는 유효한 루트 `AGENTS*.md` 에 `SEIRI` 소유 마커 섹션을 사용한다. 같은 공개 함수가 두 채널을 조정한다.
- Codex 채널은 마커 밖 사용자 텍스트와 다른 소유자의 섹션을 보존하고, 재실행해도 같은 섹션을 중복하지 않는다.
- Codex 후보 파일에 저장됐지만 override에 가려진 섹션은 stored target/hash/inSync로 UI의 선택·drift·relocate 입력을 보존하되, 별도 effective target/hash/inSync가 없는 한 활성 규칙으로 보고하지 않는다.
- 배포 상태는 파일시스템에서 읽는다. 설정에 미러링하지 않는다 — 미러는 그것이 설명한다고 주장하는 파일과 어긋날 수밖에 없다.
- 모든 규칙은 opt-in 이다. 필수 규칙도, 자동 배포도 없다.
- `seiri_function-boundaries` 는 함수 파일에 비공개 보조 함수를 최대 2개 허용하되, 각 보조 함수의 본문 구현만 8줄 이하여야 한다. 함수 선언·시그니처와 본문을 감싸는 중괄호는 세지 않으며, 더 긴 보조 함수는 별도 파일로 분리한다.
- 배포된 파일의 바이트가 배포 템플릿과 다르면 drift 이다. Core 는 호출자가 `resync` 에 해당 규칙 id 를 명시하기 전까지 drift 를 보존한다. 설정 페이지는 선택된 drift 규칙에 대해 최신 배포 템플릿으로 교체하는 선택을 기본 활성화하고, 사용자가 행별로 해제하면 로컬 편집을 보존한다. 읽을 수 없는 배포 파일은 일치가 아니라 drift 로 친다.
- 선택에 없는 규칙 id 는 opt-out 이며, 해당 파일을 제거한다.
- 은퇴한 아티팩트 정리는 `seiri` 소유 네임스페이스로 제한한다. 매니페스트의 첫 항목이나 다른 플러그인의 파일명으로 소유권을 추론하지 않는다.
- 부분 실패는 실패 항목을 이유와 함께 `skip` 으로 기록하고 계속한다. 묵시적 실패는 금지한다.

### Preview

- `plan` 은 `sync` 가 무엇을 할지 답하고 아무것도 쓰지 않으며 대상·선택을 묶은 revision 을 반환한다. 브라우저 저장은 이 revision 을 왕복시켜 현재 계획과 다르면 `skip` 하고 다시 preview 하므로, 더 최신 사용자 편집을 덮지 않는다.
- 브라우저 저장의 revision 이 없거나 stale 이면 config 와 규칙 채널 모두 한 바이트도 쓰지 않고 세션을 완료하지 않는다. 적용 중 lock/revision conflict 가 나도 config 를 쓰거나 저장 완료로 보고하지 않으며, 새 preview 를 확인한 다음에만 다시 저장할 수 있다.

### Session reporting

- SessionStart 는 현재 호스트의 effective target에서 실제로 읽히는 활성 규칙 이름, dial 위치, drift 경고, 선출 계약을 주입한다 — 규칙 본문은 주입하지 않는다. 본문은 하니스가 이미 로드한다.
- 선출 줄은 규칙 배포와 분리되어 dial 만으로 게이트된다. 배포된 규칙이 없는 프로젝트는 선출 줄만 받고, `advisory` 에서는 배포 여부와 무관하게 아무것도 받지 않는다.
- 어떤 실패든 `{ continue: true }` 를 내고 주입하지 않는다. 훅이 세션을 막을 수 없어야 한다.
- PostToolUse 와 PostToolUseFailure 는 `Bash` 와 `Skill` 만 본다. Dial 이 상태 기록 전에 훅을 게이트하므로, `advisory` 에서는 아무것도 기록하지 않는다. 실패 체인은 세션당 명령 해시마다 최대 한 번만 알리고, 중단된 호출(`is_interrupt`)은 실패로 세지 않는다. 작업 원장의 CHECK 와 일치하는 Bash 결과는 EXPECT 로 판정해 원장에 증거를 기록하고 정확히 한 줄의 게이트 판정을 주입한다.
- `Skill` 로드는 관측만 한다: seiri 워크플로우면 마지막 상태를 `.seiri/session-signals.json` 에 기록하고 아무것도 주입하지 않는다. 체인 밖 스킬(다른 플러그인, 호출형 게이트)은 상태를 남기지 않는다. 상태는 로드마다 재무장되고 다음 턴이 한 번만 소비한다.
- SubagentStart 는 같은 자세를 압축 형태로 다시 주입한다. 최대 두 줄, `advisory` 에서는 전혀 주입하지 않는다. 선출 줄은 규칙 배포와 분리되어 dial 만으로 게이트되므로, 배포 0건인 프로젝트의 서브에이전트는 선출 줄 하나만 받는다.
- UserPromptSubmit 은 매 턴 한 줄 dispatch 리마인더를 주입하고, 아직 말하지 않은 워크플로우 상태가 있으면 한 절을 덧붙인다(읽기 실패는 리마인더만 남기고 넘어간다). dial 로 게이트한다. `advisory` 에서는 침묵; `standard` 는 선출 어휘로 상기하며 done-claim 순간만 `/seiri:verify` 로 명시하고, `strict` 는 순간마다의 소유 스킬을 전부 이름으로 댄다. 프롬프트 본문은 읽지 않는다. 미충족 작업 원장이 있으면 작업 수와 무관하게 `/seiri:execute` 소유의 환기 한 줄을 덧붙인다.
- InstructionsLoaded 는 구현되어 있으나 `hooks.json` 에 등록되지 않았다 (dormant). Dormant 인 동안에는 실행되지 않으며, 등록되면 훅 페이로드 전체를 보존하고 아무것도 주입하지 않는다.

### Configuration

- Intervention dial 은 `<repoRoot>/.seiri/` 아래 두 계층에만 저장되며, 그곳에는 다른 것을 두지 않는다. `config.json` 은 커밋되는 baseline 이며 셋업 표면만 쓴다. `runtime.json` 은 추적되지 않는 세션 밸브이며 `config` 액션만 쓴다.
- 실제로 적용되는 dial 은 `runtime ?? baseline ?? standard` 이다. 훅은 실행마다 해석하므로, 변경은 세션 재시작 없이 적용된다.
- Runtime 값이 baseline 과 다르면, dial 이 렌더되는 모든 곳에서 그 사실을 명시한다. 묵시적 override 는 금지한다.
- 읽기는 절대 throw 하지 않는다. 손상된 계층은 건너뛰고 다음 계층을 적용하며, 무시한 파일을 경고에 명시한다.
- `.seiri/` 에 처음 쓸 때(설정 저장·밸브 조작 어느 쪽이든) `.gitignore` 도 만들어, 그 디렉터리의 untracked 구성원을 나열한다. 저장소 루트 ignore 파일은 절대 편집하지 않는다.
- 이미 있는 `.gitignore` 는 seiri 가 쓴 것일 때만 손댄다 — 헤더로 판별하고, 빠진 구성원만 덧붙이며 기존 줄은 지우지 않는다. 헤더가 없으면 사용자가 쓴 파일이므로 그대로 둔다. 구성원이 늘어도 기존 프로젝트가 갱신을 받지 못하면, 새 untracked 파일이 커밋에 흘러든다.

### Skill posture

- 스킬 파티션의 정본은 `src/constants/skillPolicy.ts` 다 — 자동 호출 규율 7종, 조건부 질문 스킬 2종(write-plan·review-plan), 사용자 게이트 7종(scaffold-pr·trace-change 포함). `skillPolicy.test.ts` 가 각 스킬의 frontmatter 와 본문 정본 문장을 검사한다.
- 자동 호출 규율은 자율 판단을 우선한다: 선택이 필요하면 보수적 기본값을 택하고 한 줄로 공개한다. 사용자만 결정할 수 있는 진짜 blocker 는 AskUserQuestion 1회로 묻되, 관례적 체크포인트 질문은 하지 않는다. frontmatter 도구 차단(`disallowed-tools`)은 사용하지 않는다.
- review-plan 은 계획 검토 게이트다: 계획은 저장소에 대한 주장 묶음이므로 실행 전에 증명한다. 트리아지를 한 줄로 선언하고(무언 스킵 금지), 현재 상태 주장만 도구로 접지하며(제안 상태의 부재는 정상, 계획의 명령은 읽어서 확인하되 실행 금지), challenge 트리거(광역 변경·비가역 단계·이 세션이 쓰지 않은 계획)가 켜지면 위임/진행을 정확히 한 번 묻는다 — 위임은 request-review 규격 인계물을 만들고 턴을 끝낸다. 판정(cleared·grounded-only·rework-required)은 계획 문서에 기록한다 — 훅 상태는 스킬 이름만 나르므로 산출물이 판정을 나른다. challenge 없이 cleared 없음, 재작업은 1회에 바뀐 주장의 scoped recheck 만.
- 게이트 원장은 write-plan → review-plan → execute → verify → request-review → finish 를 가로지르는 횡단 관심사이며, 포맷 정본은 `skills/execute/references/gates-format.md` 다.
- scaffold-pr 는 작업 시작 게이트다: 브랜치·빈 커밋·Draft PR 만 만들고 소스 파일은 건드리지 않는다(이슈·티켓 연동 없음). git·gh 시퀀스는 동봉 `scaffold-pr.mjs` 가 결정적으로 수행하고(셸 미사용 argv spawn — 크로스플랫폼), LLM 은 브랜치·제목·본문 결정과 JSON 결과의 안정 실패 코드 해석만 맡는다. finish 가 닫는 브랜치 수명의 반대쪽 끝을 연다.

## API Contracts

| Export                                     | Contract                                                                                           |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `loadConfig(projectRoot)`                  | Baseline 계층만: `{ config \| null, path, warning? }`. 절대 throw 하지 않음.                       |
| `loadIntervention(projectRoot)`            | 세 계층: `{ effective, source, baseline, user, runtime, warnings }`. 절대 throw 하지 않음.         |
| `writeConfig(projectRoot, config)`         | Baseline 을 원자적으로 쓰고 `.seiri/.gitignore` 도 처리; 쓴 경로를 반환.                           |
| `writeRuntime(projectRoot, level)`         | 밸브를 원자적으로 쓰고 `.seiri/.gitignore` 도 처리; 경로를 반환.                                   |
| `clearRuntime(projectRoot)`                | 밸브를 제거하고, 존재 여부를 반환.                                                                 |
| `loadManifest(pluginRoot)`                 | 잘못된 manifest 또는 없는 `templateHash` 에서 throw.                                               |
| `getRuleDocsStatus(projectRoot, plugin)`   | 현재 호스트 채널의 규칙별 스냅샷 (`inSync` 포함).                                                  |
| `planRuleDocs(...)` / `applyRuleDocs(...)` | 동일한 호스트 대상·revision 을 사용; `applied` 로 preview 와 write 를 구분.                        |
| `open_settings`                            | `{ status: saved \| closed \| pending, url, summary? }`. 대기 시간 상한 있음.                      |
| `rule_docs_sync`                           | 액션 `status` · `manifest` · `plan` · `sync` · `config`.                                           |
| `rule_docs_sync` action `config`           | `{ op, changed, dial, posture }`. `set` 은 유효한 `intervention` 필요; baseline 은 절대 쓰지 않음. |

## Scope

범위 밖: 아키텍처 강제, 에이전트 오케스트레이션, 작업 분해, 지식 관리, 알림, 상태 표시, 코드 검색·분석 도구. seiri 가 소유하는 것은 컨텍스트 — 저장소의 진실도, 모델의 판단도 아니다.

## Acceptance Criteria

### AC-context-only — 소유 범위

- 어떤 도구도 코드 읽기·검색·분석 기능을 노출하지 않는다.
- 어떤 훅도 차단 결정을 반환하지 않는다.

### AC-rule-body-not-injected — 규칙 본문 비주입

- 훅 주입에 배포된 규칙 문서 본문이 복제되지 않는다. 이름과 상태만 나간다.

### AC-dial-precedence — 다이얼 우선순위

- 유효 다이얼이 `runtime ?? project ?? user ?? standard` 로 정해지고 출처가 함께 보고된다.
- advisory 에서 SessionStart·SubagentStart·UserPromptSubmit 주입이 모두 침묵한다.

### AC-deployment-consent — 배포 동의

- 규칙 파일 쓰기가 사용자의 명시적 확인 뒤에만 일어난다.
- 드리프트한 파일은 `resync` 에 id 가 명시될 때만 덮어쓰인다.

### AC-tool-surface-fixed — 도구 표면

- 등록 도구가 정확히 3개이며 새 요구는 기존 도구의 action 으로 흡수된다.

### AC-host-parity — 호스트가 판정을 바꾸지 않는다

- 같은 저장소 상태·같은 명령·같은 원장이면 Claude Code 와 Codex 가 같은 판정 줄과 같은 원장 바이트를 낸다. 게이트 판정은 정규화된 출력 텍스트와 `EXPECT` 만으로 결정되며, exit code·훅 이벤트 이름·`tool_response` 의 형태는 판정에 들어가지 않는다.
- 호스트에 이벤트나 필드가 없을 때만 차이를 허용하고(Codex 의 `PostToolUseFailure`·`is_interrupt` 부재), 그 차이는 보수적 방향으로만 나타난다 — 어떤 호스트에서도 거짓 met 은 생기지 않는다.

## History

- 2026-08-23 — 게이트 판정을 호스트 중립으로 옮긴 결정. 실패를 별도 이벤트로 받고 `tool_response.stdout` 을 읽는 판정은 Claude 하니스의 우연한 형태였고, Codex 에서는 EXPECT 있는 게이트가 영구 unmet·EXPECT 없는 게이트가 거짓 met 이 됐다. 두 호스트가 공유하는 재료는 관측된 출력 텍스트뿐이므로 판정은 EXPECT 매치가 하고 exit code 는 이유·증거만 꾸민다. 실행 가능한 게이트의 EXPECT 는 요건이 된다.
- 2026-08-22 — 계획 태스크의 실행 가능한 CHECK 를 세션 독립적인 작업별 게이트 원장에 두고 훅이 증거를 판정하며 verify 가 미충족 완료 주장을 execute 로 되돌리도록 한 결정 — 완료를 기억이 아니라 파일의 증명으로 만든다.
- 2026-08-19 — 조건부 질문 스킬에 review-plan(계획 검토 게이트) 추가, 워크플로우 체인을 write-plan → review-plan → execute 로 확장. 계획은 주장 묶음인데 완료 주장의 verify 에 대응하는 검증 소유자가 없었다는 결정. 같은 세션 접지는 유효하되(심판은 저장소), challenge 는 신선한 눈 흉내 대신 위임 질의 1회 + 인계물 산출로 실체화해 검토 연극을 구조로 제거. execute 의 frontmatter description 도 함께 갱신 — "a plan exists" 가 다이얼 무관 상시 채널(스킬 카탈로그)로 남는 두-주인 문제.
- 2026-08-12 — 사용자 게이트에 scaffold-pr(빈 Draft PR 스캐폴드) 추가. 이슈 연동과 provider 분기를 걷어낸 작업 시작 게이트로, git·gh 절차 전체를 동봉 `scaffold-pr.mjs`(셸 미사용 argv spawn·안정 실패 코드 JSON)에 위임해 LLM 은 브랜치·제목·본문 결정만 맡도록 축소한 결정.
- 2026-08-07 — 사용자 게이트에 trace-change(변경의 계층적 설명) 추가, mental-model 을 6단계로 개편. 설명 산출이 이해를 강제한다는 수용 절차(2층위 수집·본질 가설·시뮬레이션 공격·질문 회귀 게이트)를 기존 반증 뼈대에 접목한 결정.
- 2026-07-31 — 자동 호출 스킬의 `disallowed-tools: AskUserQuestion` frontmatter 차단을 산문 정본 문장 검사로 대체. 차단은 턴 스코프(다음 사용자 메시지에 소멸)이고 턴을 끝내며 텍스트로 묻는 것을 막지 못해, 실효가 정당한 멈춤의 형식 격하뿐이었다.
- 2026-07-30 — 계약을 검증 가능한 acceptance group 으로 명시하고 `loadIntervention` 의 계층 수를 실제(3계층)에 맞췄다.

## Last Updated

2026-08-23 — 게이트 판정의 호스트 패리티 계약(AC-host-parity)을 반영했다.
