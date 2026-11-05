# serverEntry — MCP 서버 stdio 진입점

## Purpose

esbuild가 MCP 서버 stdio 실행 파일로 번들하는 진입점. 서버 기동을 위임하고 부팅 실패를 stderr로 보고한다.

## Structure

entry point 는 `index.ts` 가 아니라 `serverEntry.ts`다. esbuild가 실행 파일을 선택하며 빈 배럴은 런타임 심볼을 노출하지 않는다.

## Conventions

- `scripts/build-mcp-server.mjs`의 유일한 esbuild 진입점이다. 이 진입점은 실행과 실패 보고만 담당하고 서버 조립은 server 모듈이 소유하여 조립 정책이 두 곳으로 갈라지지 않게 한다.
- 형제 server 모듈은 `../server/index.ts`의 명시적 공개 표면을 통해 소비한다. 내부 배치 변경이 실행 진입점까지 전파되지 않게 하는 경계다.
- 부팅 실패는 `INJECTION_PREFIX` 접두 + `console.error` + `process.exit(1)` — Claude Code 가 서버 죽음을 알아채는 유일한 신호이므로 삼키지 않는다.

## Boundaries

### Always do

- 부팅 실패를 삼키지 말고 비-0 종료 코드로 드러낼 것.
- 형제 server 모듈의 공개 진입점을 통해 기동할 것.

### Ask first

- 부팅 실패 보고 형식(접두사·종료 코드) 변경 — bridge 산출물을 구동하는 Claude Code 와의 계약.

### Never do

- 서버 조립·도구 등록 로직 인라인 — server 모듈 소관.
- `INJECTION_PREFIX` 없이 직접 문자열로 오류 메시지 작성.
