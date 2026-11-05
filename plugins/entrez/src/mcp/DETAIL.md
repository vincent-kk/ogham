# mcp — Contract

## Requirements

- MCP 계층은 얇다 — `core`/`adapters` 를 오케스트레이션할 뿐 검색 규칙을 스스로 갖지 않는다.
- 등록된 모든 도구의 핸들러를 `wrapHandler` 로 감싼다.
- 자격증명은 도구 응답과 로그에 값으로 나타나지 않는다 — 존재 여부만 노출한다.
- stdio 가 유일한 transport 이며 stdout 직접 쓰기를 하지 않는다.

## API Contracts

호출 형태와 구체적인 반환 값은 공개 진입점과 테스트에서 확인한다.

## Acceptance Criteria

### AC-mcp-thin-layer — 얇은 계층

- `mcp/` 안에 검색 하드 규칙(dedup·분할·lint) 구현이 없다.

### AC-mcp-envelope — 응답 봉투

- 등록된 모든 도구의 콜백이 `wrapHandler` 를 거친다.
- `api_key` 값이 어떤 도구 응답에도 나타나지 않는다.

## Last Updated

검색 계층 위임·도구 등록과 MCP 응답 계약이 바뀔 때 갱신한다.
