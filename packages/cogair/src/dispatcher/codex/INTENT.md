## Purpose

codex-cli (`codex exec` / `codex exec resume`) 어댑터. JSONL 이벤트 스트림에서 thread UUID 와 최종 agent 메시지를 추출해 `DispatchResult` 로 정규화.

## Structure

| File             | Role                                                                        |
| ---------------- | --------------------------------------------------------------------------- |
| `modelAlias.ts`  | `high/mid/low/auto` → 기본 null (codex-cli default 사용), env override 가능 |
| `jsonlParser.ts` | JSONL 라인 단위 파싱 → `{ threadId, finalMessage, resolvedModel }`          |
| `spawn.ts`       | `node:child_process.spawn('codex', ...)`, ENOENT 캐치                       |
| `index.ts`       | `Dispatcher` 구현 + `supportedOptions = new Set()`                          |

## Conventions

- `start`: `codex exec --skip-git-repo-check --ask-for-approval never --sandbox read-only [-m <model>] <prompt>`
- `resume`: `codex exec resume <externalSessionRef> <prompt>` (sandbox/search/cd 플래그 제거)
- sandbox 는 v1 에서 `read-only` 고정 — 옵션으로 노출 안 함
- `--ask-for-approval never` 강제 (비대화형)
- JSONL stdout 파싱: `thread.started`/`session_id` 변종 모두 허용 (codex 업스트림 rename 대비)
- 최종 응답: 마지막 `agent.message` / `agent.complete` / `item.completed (agent_message)` 텍스트

## Boundaries

### Always do

- ENOENT (`codex` not on PATH) → `errorMap` 의 `cli_error`
- resume 호출 시 sandbox/search/cd 플래그 자동 제거
- 알 수 없는 이벤트 shape 는 무시하고 계속 파싱

### Ask first

- `--sandbox` 를 옵션으로 노출
- `supportedOptions` 에 새 옵션 추가
- codex 0.132 이외 버전의 이벤트 shape 추가 지원

### Never do

- `--ask-for-approval` 를 `never` 외 값으로 호출 (대화형 차단)
- `$CODEX_HOME/sessions/` 등 codex 자체 세션 파일 조작
- stdin 으로 prompt 입력 (v1 은 argv 만)

## Dependencies

- `node:child_process` (spawn), `node:fs/promises` (없음 — codex 는 외부 파일 캡처 안 함)
- `../envelope.ts`, `../errorMap.ts`
- `../../types/index.ts`
