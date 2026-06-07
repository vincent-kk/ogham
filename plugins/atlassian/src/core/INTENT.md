## Purpose

Shared infrastructure modules for MCP tools: config, auth, environment detection, HTTP client.

## Structure

| Directory | Role |
|---|---|
| `configManager/` | Load/save config.json with Zod validation |
| `authManager/` | Credential storage (plain JSON), header injection |
| `environmentResolver/` | Cloud/Server detection, URL normalization |
| `httpClient/` | Fetch wrapper with retry, SSRF guard, auth injection |
| `connectionTester/` | Jira/Confluence connectivity test via core modules |

## Conventions

- 각 인프라 관심사는 독립 sub-fractal로 분리
- 인증 헤더는 `authManager`만 생성, 직접 조합 금지
- HTTP 요청은 반드시 `httpClient`를 통해 실행

## Dependencies

- Node.js `fs`, `path` — 설정/자격증명 파일 I/O
- `zod` — 설정 스키마 검증
- `node-fetch` 또는 Node.js `fetch` — HTTP 클라이언트

## Boundaries

### Always do

- Use Zod schemas from types/ for validation
- Export through barrel index.ts

### Ask first

- Add new core module

### Never do

- Import from mcp/ layer (unidirectional: mcp → core)
- Expose raw credentials outside authManager
