## Purpose

`@ogham/prawf` 소스 루트. MCP 서버와 hooks 를 모은 fractal 루트. 현재 MCP 는 도구 0개 stub, hook 은 SessionStart 배너 1개.

## Structure

| Directory | Role                                               |
| --------- | -------------------------------------------------- |
| `mcp/`    | stdio MCP 서버 (esbuild → `bridge/mcp-server.cjs`) |
| `hooks/`  | SessionStart 훅 (esbuild → `bridge/*.mjs`)         |

## Conventions

- ESM (`"type": "module"`), import 확장자 `.js`
- 디렉토리·파일 이름은 camelCase (organ `__tests__`, `build` 예외)
- 공개 API 는 `index.ts` 에서 re-export (hooks 는 esbuild 전용, 미export)
- `version.ts` 는 `yarn version:sync` 로만 갱신

## Boundaries

### Always do

- `src/hooks/*` 는 `node:*` 빌트인만 (zod / MCP SDK 금지)

### Ask first

- 새 하위 fractal 추가 (core / dispatcher 등)
- 공개 API 시그니처 변경

### Never do

- `version.ts` 직접 수정
- `hooks/` 가 `mcp/`, `core/` import (cap 위반)
- 순환 의존성 도입

## Dependencies

- Node.js >= 20, TypeScript 5.7
- `@modelcontextprotocol/sdk`, `zod`
