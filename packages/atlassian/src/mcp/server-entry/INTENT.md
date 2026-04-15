## Purpose

esbuild CJS 번들 진입점. `node bridge/mcp-server.cjs` 실행 시
MCP 서버를 stdio 모드로 기동하는 단일 책임 파일.

## Structure

| 파일 | 역할 |
|---|---|
| `server-entry.ts` | `startServer()` 호출 및 치명적 오류 처리 |
| `index.ts` | barrel export (빈 re-export) |

## Boundaries

### Always do

- `startServer()` 호출만 수행하고 다른 로직 추가 금지
- 치명적 오류 발생 시 `process.stderr`에 기록 후 `process.exit(1)` 종료

### Ask first

- 번들 진입점 파일 분리 또는 추가 (빌드 파이프라인 영향)
- stdio 외 다른 시작 모드 추가

### Never do

- 도구 등록·설정 로드 등 서버 초기화 로직을 이 파일에 직접 구현
- `../server` 이외의 모듈을 직접 import하여 의존 범위 확장
- 오류를 무시하고 서버를 계속 실행

## Dependencies

- `../server/server.js` — `startServer`
