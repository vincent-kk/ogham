## Purpose

codex-cli (`codex exec` / `codex exec resume`) 어댑터. JSONL 이벤트 스트림에서 thread UUID 와 최종 agent 메시지를 추출해 `DispatchResult` 로 정규화.

## Structure

| File / Path          | Role                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------- |
| `reasoningEffort.ts` | `high/mid/low` → reasoning effort(high/medium/low)                                          |
| `jsonlParser/`       | JSONL 라인 단위 파싱 → `{ threadId, response, resolvedModel }` (utils/constants organ 포함) |
| `spawn.ts`           | `node:child_process.spawn('codex', ...)`, ENOENT 캐치                                       |
| `codexDispatcher.ts` | `Dispatcher<CodexFlags>` 구현 + `supportedOptions = new Set()`                              |
| `utils/`             | `buildStartArgs`, `buildResumeArgs`, `dispatch` (`DispatchInternal`)                        |
| `index.ts`           | `export { codexDispatcher }` barrel                                                         |

## Conventions

- `start`: `codex exec --skip-git-repo-check --json [--yolo | --sandbox <mode>] [-c model_reasoning_effort=<v>] <prompt>`
- `resume`: `codex exec resume --json [-c model_reasoning_effort=<v>] <externalSessionRef> <prompt>` (sandbox/yolo 미부여)
- `flags.yolo=true` → `--yolo`; 아니고 `flags.sandbox !== 'off'` → `--sandbox <mode>` (config 단독 결정)
- `--json` 강제 (JSONL 스트림). `--ask-for-approval` 은 `codex exec` 에서 unexpected argument
- JSONL stdout 파싱: `thread.started`/`session_id` 변종 모두 허용 (업스트림 rename 대비)
- 최종 응답: 마지막 `agent.message` / `agent.complete` / `item.completed (agent_message)` 텍스트

## Boundaries

### Always do

- ENOENT (`codex` not on PATH) → `errorMap` 의 `cli_error`
- resume 호출 시 sandbox/yolo/search/cd 플래그 모두 제거 (재시도 안전성)
- 알 수 없는 이벤트 shape 는 무시하고 계속 파싱

### Ask first

- `CodexFlags` 스키마에 새 키 추가
- `supportedOptions` 에 새 옵션 추가
- codex 0.132 이외 버전의 이벤트 shape 추가 지원

### Never do

- `--ask-for-approval` 플래그 사용 (`codex exec` 에서 unexpected argument)
- `$CODEX_HOME/sessions/` 등 codex 자체 세션 파일 조작
- stdin 으로 prompt 입력 (v1 은 argv 만)

## Dependencies

- `node:child_process` (spawn), `node:fs/promises` (없음 — codex 는 외부 파일 캡처 안 함)
- `../envelope.ts`, `../errorMap.ts`
- `../../types/index.ts`
