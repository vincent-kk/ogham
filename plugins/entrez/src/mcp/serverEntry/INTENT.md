## Purpose

esbuild CJS 번들 진입점. `node bridge/mcp-server.cjs` 실행 시 MCP 서버를 stdio 모드로 기동하는 단일 책임 파일.

## Structure

| 파일             | 역할                                     |
| ---------------- | ---------------------------------------- |
| `serverEntry.ts` | `startServer()` 호출 및 치명적 오류 처리 |
| `index.ts`       | 배럴(빈 re-export)                       |

## Conventions

- `startServer()` 호출만 수행하고 다른 로직은 추가하지 않는다.
- 치명적 오류는 `process.stderr` 기록 후 `process.exit(1)`.

## Boundaries

### Always do

- 서버 초기화 실패 시 stderr에 사유를 남기고 비정상 종료한다.

### Ask first

- 번들 진입점 파일 분리·추가(빌드 파이프라인 영향).

### Never do

- 도구 등록·설정 로드 등 초기화 로직을 이 파일에 구현.
- `../server` 이외 모듈을 직접 import.

## Dependencies

- `../server/lifecycle/startServer.js` — `startServer`
