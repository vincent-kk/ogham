## Purpose

MCP 서버 (`tools`) 등록부. 도구를 stdio transport로 노출하는 fractal 진입점.

## Conventions

- 도구 인자 이름은 `snake_case` (외부 LLM 인터페이스)
- 응답은 `toolResult` 로 compact JSON 직렬화 (디버그는 `CENNAD_PRETTY_JSON=1`)
- 대화 시작·재개는 `ConversationResponse`, 중단·설정 도구는 각 조작 결과를 반환한다. 래퍼는 도메인 응답을 바꾸지 않아 도구별 소비자 계약을 보존한다
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
- 도구별로 MCP 직렬화·오류 래퍼를 우회하거나 조작 결과를 대화 응답으로 변환
- stdin/stdout 으로 직접 쓰기 (transport 만 사용 — stderr 만 허용)
