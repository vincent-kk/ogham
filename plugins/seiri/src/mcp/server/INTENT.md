# server — MCP 서버 조립 + 도구 2개 등록

## Purpose

MCP 서버를 만들고 도구를 등록한다. 등록된 도구 스키마는 호출 여부와 무관하게
매 턴 컨텍스트로 나가므로, **여기 있는 도구 개수가 곧 상시 비용**이다.

## Structure

- `createServer.ts` — 서버 생성 + `open_settings` · `rule_docs_sync` 등록
- `startServer.ts` — stdio transport 연결
- `wrapHandler.ts` · `toolResult.ts` — 응답 직렬화, throw → 오류 결과
- `index.ts` — barrel

## Conventions

- 도구 이름은 `constants/toolNames.ts` 단일 원천.
- 설명 문구는 **모델이 그 도구를 언제 쓰지 말아야 하는지**까지 적는다
  (예: 세션 훅 금지, 브라우저 있으면 `open_settings` 우선).
- 필드별 `.describe()` 로 의미를 붙인다 — 특히 "빠진 id 는 해제로 읽힌다"
  같은 비자명한 계약.
- 핸들러의 throw 는 `wrapHandler` 가 오류 결과로 바꾼다. 서버를 죽이지 않는다.

## Boundaries

### Always do

- 도구 추가 전에 "하니스가 이미 제공하지 않는가"를 답할 것.
- 도구 계약 변경 시 소비처(스킬) 문서를 함께 갱신.

### Ask first

- 도구 추가 (설계 상한 3개, 현재 2개).
- 응답 직렬화 방식 변경.

### Never do

- 코드 분석·검색 도구 등록.
- 도구 핸들러에서 세션 상태를 임의로 변경.
