## Purpose

Claude Code 훅 계층 fractal. SessionStart 에서 정적 배너를 `additionalContext` 로 1회 주입한다. 엔트리 파일(`*.entry.ts`)은 esbuild 가 `bridge/*.mjs` 로 번들링.

## Structure

| 모듈           | 이벤트       | 역할               |
| -------------- | ------------ | ------------------ |
| `injectStatic` | SessionStart | 정적 배너 1회 주입 |

## Conventions

- 외부 npm 모듈 import 금지 (`node:*` 빌트인만)
- `src/mcp/`, `src/core/`, `src/types/` import 금지 (10 KB cap 위반)
- 엔트리는 try/catch → 항상 `{ continue: true }` 출력 후 `process.exit(0)`
- 수정 후 `yarn prawf build` 로 `bridge/*.mjs` 재생성

## Boundaries

### Always do

- 새 훅 추가 시 `hooks/hooks.json` + `scripts/buildHooks.mjs` 의 `hookEntries` 동시 갱신
- 어떤 예외에도 세션을 차단하지 않음 (`continue: true`)

### Ask first

- 새 외부 의존성 (10 KB cap 위협)
- hook 이벤트 타입 변경

### Never do

- entry 파일에 비즈니스 로직
- MCP SDK / zod import (cap 위반)

## Dependencies

- `node:*` builtins only
- esbuild 진입: `<name>/build/<name>.entry.ts`
