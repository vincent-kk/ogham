# serverEntry contract

## Requirements

- MCP 서버 esbuild 번들의 진입점이다.
- 로직을 담지 않는다. 서버를 기동하고 치명적 실패를 stderr로 보고한 뒤
  종료 코드를 남기는 것이 전부다.
- 기동 실패는 `FILID_DEBUG`와 무관하게 항상 stderr에 보인다.

## API Contracts

- 기본 export 없음. 모듈 로드가 곧 서버 기동이다.

## Acceptance Criteria

### AC-server-entry-thin — 얇은 진입점

- 진입점이 서버 기동과 실패 보고 외의 책임을 갖지 않는다.

## Last Updated

2026-07-28 — 중간 계층 fractal 계약을 문서화했다.
