# serverEntry — Contract

## Requirements

- esbuild 가 `bridge/mcp-server.cjs` 로 번들하는 진입점이다. `startServer` 호출과 미처리 예외 처리 외에는 아무 로직도 갖지 않는다.
- 프로세스 종료를 다루는 유일한 자리다.

## API Contracts

- 진입점 파일 자체가 계약이다 — `node bridge/mcp-server.cjs` 가 이 번들을 실행한다.

## Acceptance Criteria

### AC-entry-minimality — 진입점 최소성

- 파일에 도구 등록·설정 로드 로직이 없다.

### AC-fatal-report — 치명적 실패 보고

- 미처리 예외가 stderr 에 남고 비-0 종료 코드로 드러난다.

## Last Updated

2026-07-30 — 번들 진입점 계약을 문서화했다.
