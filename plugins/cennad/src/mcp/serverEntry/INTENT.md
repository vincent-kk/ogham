## Purpose

esbuild 가 `bridge/mcp-server.cjs` 로 번들링하는 MCP 서버 진입점. `startServer` 를 호출하고 미처리 예외를 처리한다.

## Structure

| File             | Role                                                            |
| ---------------- | --------------------------------------------------------------- |
| `serverEntry.ts` | 실행 진입점 — `startServer` 호출 + `.catch` 로 exit 1 처리      |
| `index.ts`       | barrel (빈 re-export — esbuild 입력은 serverEntry.ts 직접 지정) |

## Conventions

- 비즈니스 로직 금지 — 진입점 역할만 수행
- top-level await 회피 (`.catch` 체인 사용)
- 예외는 `console.error` (stderr) 후 `process.exit(1)` 로 종료

## Boundaries

### Always do

- `startServer().catch` 로 미처리 예외 흡수 후 exit 1

### Ask first

- 새 환경 변수 도입 또는 시작 전 초기화 로직 추가

### Never do

- stdout 출력 (`console.log` 등)
- transport 직접 생성 또는 수정 (server 모듈 책임)

## Dependencies

- `../server` — `startServer`
- `node:process` — `process.exit`
