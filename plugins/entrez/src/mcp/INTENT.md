## Purpose

MCP 서버 계층. 결정론·계약 실행 레이어로, core/adapters를 얇게 오케스트레이션해 도구를 노출한다.

## Conventions

- 도구 등록은 `server.registerTool(name, {description, inputSchema, annotations}, wrapHandler(handler))`.
- `inputSchema`는 `types/`의 zod 스키마 재사용.
- 모든 외부 HTTP는 `core/httpClient` 경유(핸들러에서 `fetch` 직접 금지).

## Boundaries

### Always do

- 도구 핸들러를 `wrapHandler`로 감싸 표준 에러 처리 보장.
- 문자열 리터럴은 `constants/`·`types/enums.ts`에서 import.

### Ask first

- 새 MCP 도구 추가 또는 트랜스포트 방식 변경.

### Never do

- 검색 도메인 하드 규칙(10k cap·POST·dedup)을 이 계층에 직접 구현(core 소관).
- `api_key` 값을 응답·로그에 노출.
