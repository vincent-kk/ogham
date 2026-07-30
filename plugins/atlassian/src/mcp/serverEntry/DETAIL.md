# serverEntry — Contract

## Requirements

- esbuild CJS 번들 진입점이다. `startServer()` 호출과 치명적 오류 처리 외에는 아무 로직도 갖지 않는다.
- 오류는 stderr 에 기록하고 `process.exit(1)` 로 끝낸다 — 이 신호가 없으면 호스트가 서버 죽음을 알 수 없다.
- 형제 fractal 은 배럴로만 건넌다: `../server/index.js` 를 쓰고 `../server/server.js` 를 직접 참조하지 않는다.

## API Contracts

- 진입점 파일 자체가 계약이다 — `node bridge/mcp-server.cjs` 가 이 번들을 실행한다.
- `index.ts` 는 빈 배럴이며 런타임 심볼이 없다.

## Acceptance Criteria

### AC-entry-minimality — 진입점 최소성

- 파일에 도구 등록·설정 로드 로직이 없다.
- `../server` 이외 모듈을 직접 import 하지 않는다.

### AC-fatal-signal — 실패 신호

- 기동 실패가 stderr 에 남고 종료 코드가 1이다.

## Last Updated

2026-07-30 — 번들 진입점 계약을 문서화하고 형제 참조를 배럴 경유로 고정했다.
