## Purpose

codex-cli / gemini-cli 호출 본체. MCP 도구 핸들러에서 받은 `DispatchOptions` 를 외부 CLI 실행으로 변환하고, 결과·에러를 `ConversationResponse` envelope 로 정규화.

## Structure

| Path                   | Role                                                                       |
| ---------------------- | -------------------------------------------------------------------------- |
| `entities/envelope.ts` | `buildResponse` — DispatchResult + 메타 → ConversationResponse             |
| `errorMap/`            | exit code / stderr / Node 에러 → `ErrorCode` 매핑 (utils + constants)      |
| `utils/`               | `computeIgnoredOptions` + `composePrompt` (recency_policy + preamble) 공유 |
| `codex/`               | codex-cli 어댑터 (`spawn`, `jsonlParser`, `modelAlias`, dispatcher)        |
| `gemini/`              | gemini-cli 어댑터 (`spawn`, `sessionResolver`, `modelAlias`, dispatcher)   |
| `index.ts`             | `{ codex: Dispatcher, gemini: Dispatcher }` barrel                         |

## Conventions

- v1 `supportedOptions` 는 양쪽 dispatcher 모두 비어 있음. 모든 키는 `ignoredOptions` 로 보고
- 권한 플래그(`yolo`/`sandbox`/`sandbox_backend`)는 `DispatchOptions.flags` 채널 — config 단독, MCP input 노출 금지
- 외부 CLI 호출은 `node:child_process.spawn` 직접 사용 (의존성 추가 없음)
- 환경 변수: codex 상속만, gemini `GEMINI_CLI_TRUST_WORKSPACE=true` + `flags.sandbox && backend!=='auto'` 시 `GEMINI_SANDBOX=<backend>`
- 모델 alias `auto` 는 `-m` 플래그 자체를 생략
- prompt prefix 합성은 MCP tool 진입에서 `composePrompt` 1회 — dispatcher 는 합성 후 문자열만 받음

## Boundaries

### Always do

- 모든 에러를 `errorMap.ts` 의 단일 테이블로 정규화
- `ignoredOptions` 에 supportedOptions 미포함 키만 담기
- gemini resume 시 `sessionResolver` 로 UUID → 현재 integer index 재해결
- codex resume 시 sandbox/yolo/search/cd 플래그 자동 제거

### Ask first

- 새 옵션을 `supportedOptions` / `DispatchOptions.flags` 화이트리스트에 추가
- 새 exit code 매핑 (errorMap 테이블 변경)

### Never do

- 외부 CLI 의 자체 세션 파일(`$CODEX_HOME/sessions/`, gemini 글로벌 인덱스) 수정·삭제
- 외부 CLI 호출 결과를 `core/` 로 직접 우회 — 항상 `DispatchResult` 통해 반환
- 동기 spawn (`spawnSync`) 사용 — 항상 비동기

## Dependencies

- `node:child_process`, `node:fs/promises`, `node:path`, `node:perf_hooks`
- `core/sessionStore`, `core/counterManager` (호출자가 주입, dispatcher 내부 import 금지)
- 직접 의존하는 core 모듈 없음 (envelope·errorMap·codex·gemini 모두 self-contained)
