## Purpose

esbuild 진입점. config 루트를 해석하고 stdio 트랜스포트를 통해 MCP 서버를 시작한다. `bridge/mcp-server.cjs`로 번들된다.

## Conventions

- config 루트 해석 순서: `MAENCOF_LENS_CONFIG_ROOT` env → `tryProjectRoot()` (호스트 워크스페이스). 둘 다 없으면 `null` 을 그대로 `createLensServer` 에 넘긴다 — 서버는 config 없이 기동하고 툴 호출 시 에러를 반환한다.

## Boundaries

### Always do

- 이 모듈의 단일 책임을 유지한다
- 변경 시 관련 테스트를 함께 업데이트한다

### Ask first

- 공개 API 시그니처 변경
- 다른 모듈에 대한 새로운 의존성 추가

### Never do

- 순환 의존성 도입
- organ 경계를 넘는 직접 import
- config 루트를 `process.cwd()` 로 폴백 (`@ogham/cross-platform/host-paths` 계약 위반)
