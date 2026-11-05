## Purpose

esbuild 진입점. config 루트를 해석하고 stdio 트랜스포트를 통해 MCP 서버를 시작한다. `bridge/mcp-server.cjs`로 번들된다.

## Conventions

- config 루트 해석 순서: `MAENCOF_LENS_CONFIG_ROOT` env → `tryProjectRoot()` (호스트 워크스페이스). 둘 다 없으면 `null` 을 그대로 `createLensServer` 에 넘긴다 — 서버는 config 없이 기동하고 툴 호출 시 에러를 반환한다.

## Boundaries

### Always do

- 설정 루트 미해석을 기동 실패로 바꾸지 않고 호출 시점의 복구 안내에 맡긴다
- 이 경계의 계약 변경은 해당 검증과 함께 갱신하여 소비자와 구현이 어긋나지 않게 한다

### Ask first

- 공개 API 시그니처 변경
- 다른 모듈에 대한 새로운 의존성 추가

### Never do

- 순환 의존성 도입
- organ 경계를 넘는 직접 import
- config 루트를 `process.cwd()` 로 폴백 (`@ogham/cross-platform` 계약 위반)
