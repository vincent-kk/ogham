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
- 배포된 파일의 바이트가 배포 템플릿과 다르면 drift 이다. Drift 는 보고되고, 호출자가 `resync` 에 해당 규칙 id 를 명시하기 전까지 보존된다. 읽을 수 없는 배포 파일은 일치가 아니라 drift 로 친다.
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
- PostToolUse 와 PostToolUseFailure 는 `Bash` 와 `Skill` 만 본다. Dial 이 상태 기록 전에 훅을 게이트하므로, `advisory` 에서는 아무것도 기록하지 않는다. 실패 체인은 세션당 명령 해시마다 최대 한 번만 알리고, 중단된 호출(`is_interrupt`)은 실패로 세지 않는다.
- `Skill` 로드는 관측만 한다: seiri 워크플로우면 마지막 상태를 `.seiri/session-signals.json` 에 기록하고 아무것도 주입하지 않는다. 체인 밖 스킬(다른 플러그인, 호출형 게이트)은 상태를 남기지 않는다. 상태는 로드마다 재무장되고 다음 턴이 한 번만 소비한다.
- SubagentStart 는 같은 자세를 압축 형태로 다시 주입한다. 최대 두 줄, `advisory` 에서는 전혀 주입하지 않는다. 선출 줄은 규칙 배포와 분리되어 dial 만으로 게이트되므로, 배포 0건인 프로젝트의 서브에이전트는 선출 줄 하나만 받는다.
- UserPromptSubmit 은 매 턴 한 줄 dispatch 리마인더를 주입하고, 아직 말하지 않은 워크플로우 상태가 있으면 한 절을 덧붙인다(읽기 실패는 리마인더만 남기고 넘어간다). dial 로 게이트한다. `advisory` 에서는 침묵; `standard` 는 선출 어휘로 상기하며 done-claim 순간만 `/seiri:verify` 로 명시하고, `strict` 는 순간마다의 소유 스킬을 전부 이름으로 댄다. 프롬프트 본문은 읽지 않는다.
- InstructionsLoaded 는 구현되어 있으나 `hooks.json` 에 등록되지 않았다 (dormant). Dormant 인 동안에는 실행되지 않으며, 등록되면 훅 페이로드 전체를 보존하고 아무것도 주입하지 않는다.

### Configuration

- Intervention dial 은 `<repoRoot>/.seiri/` 아래 두 계층에만 저장되며, 그곳에는 다른 것을 두지 않는다. `config.json` 은 커밋되는 baseline 이며 셋업 표면만 쓴다. `runtime.json` 은 추적되지 않는 세션 밸브이며 `config` 액션만 쓴다.
- 실제로 적용되는 dial 은 `runtime ?? baseline ?? standard` 이다. 훅은 실행마다 해석하므로, 변경은 세션 재시작 없이 적용된다.
- Runtime 값이 baseline 과 다르면, dial 이 렌더되는 모든 곳에서 그 사실을 명시한다. 묵시적 override 는 금지한다.
- 읽기는 절대 throw 하지 않는다. 손상된 계층은 건너뛰고 다음 계층을 적용하며, 무시한 파일을 경고에 명시한다.
- `.seiri/` 에 처음 쓸 때(설정 저장·밸브 조작 어느 쪽이든) `.gitignore` 도 만들어, 그 디렉터리의 untracked 구성원을 나열한다. 이미 있으면 그대로 두고, 저장소 루트 ignore 파일은 절대 편집하지 않는다.

## API Contracts

| Export                                     | Contract                                                                                           |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `loadConfig(projectRoot)`                  | Baseline 계층만: `{ config \| null, path, warning? }`. 절대 throw 하지 않음.                       |
| `loadIntervention(projectRoot)`            | 두 계층: `{ effective, source, baseline, runtime, warnings }`. 절대 throw 하지 않음.               |
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

## Last Updated

2026-07-27
