# serverEntry — Contract

## Requirements

- esbuild 가 `bridge/mcp-server.cjs` 로 번들하는 stdio 진입점이다. `startServer()` 호출과 부팅 실패 보고 외에는 아무 로직도 갖지 않는다.
- 부팅 실패는 stderr 로 보고한다.
- **진입점은 `index.ts` 가 아니라 `serverEntry.ts` 다** — esbuild `entryPoints` 가 가리키는 실제 번들 대상이며, `index.ts` 는 런타임 export 가 없는 `export {}` 배럴이다.

## API Contracts

- `serverEntry.ts` — shebang 실행 진입점. `startServer()` 호출과 부팅 실패 처리.
- `index.ts` — `export {}` 배럴. 노출 심볼 없음.

## Acceptance Criteria

### AC-entry-minimality — 진입점 최소성

- 파일에 도구 등록·설정 로드 로직이 없다.

### AC-entry-failure-report — 부팅 실패 보고

- 부팅 실패 사유가 stderr 로 나간다.

## Last Updated

2026-07-30 — 번들 진입점 계약을 문서화했다.
