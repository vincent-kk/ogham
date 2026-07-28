# serverEntry — MCP 서버 esbuild 번들 진입점

## Purpose

MCP 서버 번들의 실행 진입점. `startServer()`를 호출해 서버를 기동하고 치명적 기동 실패만 보고한다. 도구 등록, envelope, lifecycle 정책은 `../server/`가 소유한다.

## Structure

- `serverEntry.ts` — `#!/usr/bin/env node` shebang을 가진 실행 진입점. `startServer()` 호출과 실패 처리가 전부다.
- `index.ts` — 의도적으로 비어 있는 배럴. 이 fractal은 공개 심볼을 노출하지 않는다.

## Conventions

- 모듈 로드가 곧 서버 기동이다. 함수를 export하고 호출자가 부르는 구조가 아니다.
- 기동 실패는 `FILID_DEBUG`와 무관하게 항상 `console.error`로 stderr에 남긴 뒤 `process.exit(1)`로 끝낸다. logger에만 남기면 debug 비활성 시 실패가 보이지 않는다.
- esbuild 번들 대상이라 진입점 파일 경로는 `scripts/buildMcpServer.mjs`가 고정한다.

## Boundaries

### Always do

- 기동 실패를 stderr와 logger 양쪽에 남기고 0이 아닌 종료 코드로 끝내기
- 서버 조립 변경은 `../server/`에서 하고 이 진입점은 얇게 유지

### Ask first

- 진입점 파일 경로·이름 변경 (`scripts/buildMcpServer.mjs` 동반 수정)
- 진입점에 CLI 인자 파싱이나 환경 분기 도입

### Never do

- 도구 등록, schema validation, envelope 조립을 여기에 인라인
- `index.ts`에서 `serverEntry.ts`를 재수출 (import가 곧 기동 부작용이다)
- 기동 실패를 삼키고 정상 종료 코드로 끝내기

## Dependencies

- `../server/` entry point의 `startServer`, `lib/logger.ts`의 `createLogger`
