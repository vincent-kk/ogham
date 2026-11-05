## Purpose

Shared infrastructure modules for MCP tools: config, auth, environment detection, HTTP client.

## Conventions

- 각 인프라 관심사는 독립 sub-fractal로 분리
- 저장된 인증과 저장 전 연결 점검 모두 `buildAuthHeader`로 헤더를 조립해 인증 선택 정책의 분기를 막는다.
- HTTP 요청은 반드시 `httpClient`를 통해 실행
- 설정은 계층별로 다룬다 — `loadConfig`는 병합된 유효 설정, `loadConfigByScope`/`loadConfigScope`는 계층별 값과 재정의 상태, `configLayers`는 두 계층의 경로를 준다. 저장은 대상 계층을 명시해야 하며, 계층 원시값은 `@ogham/cross-platform`가 소유

## Boundaries

### Always do

- Use Zod schemas from types/ for validation
- Export through barrel index.ts

### Ask first

- Add new core module

### Never do

- Import from mcp/ layer (unidirectional: mcp → core)
- Expose raw credentials in tool responses or logs; only setup and connection checks may consume the credential loader.
