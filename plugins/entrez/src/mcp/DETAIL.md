# mcp — Contract

## Requirements

- MCP 계층은 얇다 — `core`/`adapters` 를 오케스트레이션할 뿐 검색 규칙을 스스로 갖지 않는다.
- 도구 5종(`paper_search`·`mesh_lookup`·`fetch_fulltext`·`setup`·`auth_check`)을 등록하고, 모든 핸들러를 `wrapHandler` 로 감싼다.
- 자격증명은 도구 응답과 로그에 값으로 나타나지 않는다 — 존재 여부만 노출한다.
- stdio 가 유일한 transport 이며 stdout 직접 쓰기를 하지 않는다.

## API Contracts

- `createServer()` · `startServer()` — 서버 수명주기(소유: `server/`).
- 도구 핸들러 5종 — 소유: `tools/`.
- `serverEntry/` 는 esbuild 번들 진입점으로 `bridge/mcp-server.cjs` 를 만든다. 형제 fractal 은 배럴로만 건넌다.
- `pages/` 는 설정 폼 FE 소스이며 빌드가 `public/settings.html` 로 인라인한다.

## Acceptance Criteria

### AC-mcp-thin-layer — 얇은 계층

- `mcp/` 안에 검색 하드 규칙(dedup·분할·lint) 구현이 없다.

### AC-mcp-envelope — 응답 봉투

- 도구 5종이 등록되고 모든 콜백이 `wrapHandler` 를 거친다.
- `api_key` 값이 어떤 도구 응답에도 나타나지 않는다.

## Last Updated

2026-07-30 — MCP 계층 경계를 문서화했다.
