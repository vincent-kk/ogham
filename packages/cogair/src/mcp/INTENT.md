## Purpose

MCP 서버 (`tools`) 등록부. 3 개 도구 (`start_conversation`, `continue_conversation`, `open_settings`) 를 stdio transport 로 노출하는 fractal 진입점.

## Structure

| Path                          | Role                                                                  |
| ----------------------------- | --------------------------------------------------------------------- |
| `server/`                     | `createServer` + `startServer` — 도구 3 개 등록, stdio transport 연결 |
| `serverEntry/`                | esbuild 진입점 (`bridge/mcp-server.cjs` 산출)                         |
| `shared/`                     | `toolResult`, `toolError`, `wrapHandler`, `mapReplacer` 헬퍼          |
| `tools/startConversation/`    | 새 외부 LLM 세션 시작                                                 |
| `tools/continueConversation/` | 기존 세션 이어 호출 (project_hash 검증)                               |
| `tools/openSettings/`         | 설정 웹 UI 기동 (Phase 4 는 placeholder, Phase 5 에서 실제 구현)      |

## Conventions

- 도구 인자 이름은 `snake_case` (외부 LLM 인터페이스)
- 응답은 `toolResult` 로 compact JSON 직렬화 (디버그는 `COGAIR_PRETTY_JSON=1`)
- 핸들러는 `ConversationResponse` 를 반환 — `wrapHandler` 는 wrap-only, 실패 envelope 생성 안 함
- 외부 CLI 실패 시에도 `session_id` 디스크 기록 유지 (start_conversation 명세)

## Boundaries

### Always do

- 모든 `registerTool` 콜백을 `wrapHandler` 로 감싸 비정상 throw 흡수
- `continue_conversation` 은 project_hash 불일치 시 `error.code='unknown'` 반환 (fallback 검색 금지)
- 입력 스키마는 `zod` 로 검증 (MCP SDK 가 자동 적용)
- 도구마다 INTENT.md 보유 (서브 fractal)

### Ask first

- 새 도구 추가 / 기존 도구 이름 변경
- 도구 입력 스키마 (snake_case 키) 변경

### Never do

- `process.exit` 를 핸들러에서 직접 호출
- 응답 envelope 형태를 도구마다 다르게 (모두 `ConversationResponse` 표준)
- stdin/stdout 으로 직접 쓰기 (transport 만 사용 — stderr 만 허용)

## Dependencies

- `@modelcontextprotocol/sdk`, `zod`
- `../core/*` (sessionStore, counterManager, configManager, projectHash)
- `../dispatcher/*` (dispatchers map, buildResponse)
- `../utils/isoNow.ts`
