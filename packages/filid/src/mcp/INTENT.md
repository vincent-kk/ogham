# mcp — MCP 서버 모듈

## Purpose

Model Context Protocol 서버를 초기화하고 17개 FCA-AI 분석 도구를 등록·제공한다. Claude Code 에이전트가 MCP 프로토콜을 통해 filid 기능을 호출하는 진입층이다.

## Structure

| 경로 | 역할 |
|------|------|
| `server/` | MCP 서버 생성 + 17개 도구 등록 (`createServer`, `startServer`) |
| `server-entry/` | esbuild 번들 진입 fractal (`bridge/mcp-server.cjs` 생성 대상) |
| `tools/` | 각 도구의 비즈니스 로직 핸들러 (17개 sub-fractal + `utils/` organ) |

## Conventions

- MCP SDK(`@modelcontextprotocol/sdk`) + `zod` 스키마 검증 사용
- 도구 응답: 성공 시 `toolResult()`, 실패 시 `toolError()` 래퍼 사용
- `Map`/`Set` JSON 직렬화: `mapReplacer` 함수로 처리
- `server-entry/`는 `startServer()` 호출만 — 로직 없음

## Boundaries

### Always do

- 새 도구 추가 시 `server/server.ts`에 `registerTool` 호출 + `tools/` sub-fractal 추가
- `src/index.ts`는 외부 소비자에 공개할 핸들러만 선별 re-export (내부 전용 도구 제외)
- Zod 스키마로 모든 도구 입력 검증

### Ask first

- 기존 도구 입력 스키마 변경 (클라이언트 호환성 영향)
- 도구 이름 변경 (`.mcp.json` 및 스킬 파일 동시 수정 필요)

### Never do

- `server-entry/`에 비즈니스 로직 추가
- `toolResult`/`toolError` 래퍼 없이 raw 응답 반환
- `core/` 로직을 `server/server.ts`에 직접 인라인 구현

## Dependencies

- `@modelcontextprotocol/sdk` — MCP 서버/트랜스포트
- `zod` — 입력 스키마 검증
- `../core/`, `../ast/`, `../metrics/`, `../compress/` — 도구 핸들러가 사용하는 로직
