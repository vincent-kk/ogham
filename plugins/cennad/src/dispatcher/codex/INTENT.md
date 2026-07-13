## Purpose

codex-cli (`codex exec` / `codex exec resume`) 어댑터. JSONL 이벤트 스트림에서 thread UUID 와 최종 agent 메시지를 추출해 `DispatchResult` 로 정규화.

## Structure

| File / Path          | Role                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------- |
| `resolveTier.ts`     | tier → `{model?, effort?}` (`config.model_map.codex` + env override)                        |
| `jsonlParser/`       | JSONL 라인 단위 파싱 → `{ threadId, response, resolvedModel }` (utils/constants organ 포함) |
| `spawn.ts`           | `node:child_process.spawn('codex', ...)`, ENOENT 캐치                                       |
| `codexDispatcher.ts` | `Dispatcher<CodexFlags, CodexModelMap>` 구현 + `supportedOptions = new Set()`               |
| `utils/`             | `buildStartArgs`, `buildResumeArgs`, `dispatch` (`DispatchInternal`)                        |
| `index.ts`           | `export { codexDispatcher }` barrel                                                         |

## Conventions

- `start`: `codex exec --skip-git-repo-check --json [--yolo | --sandbox <mode>] [-m <model>] [-c model_reasoning_effort=<v>] <prompt>`
- `resume`: `codex exec resume --skip-git-repo-check --json [-m <model>] [-c model_reasoning_effort=<v>] <externalSessionRef> <prompt>` (sandbox/yolo 미부여; `--skip-git-repo-check` 없으면 non-trusted 디렉터리에서 거부됨)
- tier→`{model, effort}` 는 `config.model_map.codex` 단독; env override `CENNAD_CODEX_<TIER>_MODEL`/`_EFFORT`; 미해결 차원은 플래그 생략 → 사용자 `~/.codex/config.toml` 이 결정
- effort 스케일 `low<medium<high<xhigh<max<ultra`; 지원 집합은 모델마다 다름 (`core/codexModels` 카탈로그)
- `flags.yolo=true` → `--yolo`; 아니고 `flags.sandbox !== 'off'` → `--sandbox <mode>` (config 단독 결정)
- JSONL stdout: `thread.started`/`session_id` 변종 허용(업스트림 rename 대비); 응답은 마지막 `agent.message`/`agent.complete`/`item.completed (agent_message)` 텍스트

## Boundaries

### Always do

- ENOENT (`codex` not on PATH) → `errorMap` 의 `cli_error`
- resume 호출 시 sandbox/yolo/search/cd 플래그 모두 제거 (재시도 안전성)
- 알 수 없는 이벤트 shape 는 무시하고 계속 파싱

### Ask first

- `CodexFlags` 스키마에 새 키 추가
- `supportedOptions` 에 새 옵션 추가
- `CodexEffortSchema` 스케일 변경 (모델별 지원 집합은 카탈로그가 결정)

### Never do

- `--ask-for-approval` 플래그 사용 (`codex exec` 에서 unexpected argument)
- 모델이 광고하지 않은 effort 전송 — codex 는 다운그레이드가 아니라 API 에러로 실패
- `$CODEX_HOME/sessions/` 등 codex 자체 세션 파일 조작
- stdin 으로 prompt 입력 (v1 은 argv 만)

## Dependencies

- `node:child_process` (spawn), `../envelope.ts`, `../errorMap.ts`
- `../../types/index.ts` (`CodexModelMap`, `CodexEffort`)
