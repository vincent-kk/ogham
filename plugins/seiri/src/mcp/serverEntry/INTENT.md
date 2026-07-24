# serverEntry — MCP 서버 stdio 진입점

## Purpose

esbuild 가 `bridge/mcp-server.cjs` 로 번들하는 MCP 서버 stdio 진입점.
`server/lifecycle/startServer` 를 호출하고 부팅 실패를 stderr 로 보고한다.

## Structure

| Path             | Role                                                              |
| ---------------- | ----------------------------------------------------------------- |
| `serverEntry.ts` | 실제 진입점 — shebang 실행, `startServer()` 호출 + 부팅 실패 처리 |
| `index.ts`       | `export {}` barrel — 런타임 export 없음 (번들 진입 디렉터리)      |

entry point 는 `index.ts` 가 아니라 `serverEntry.ts` — esbuild `entryPoints`
가 가리키는 실제 번들 대상이다.

## Conventions

- `scripts/build-mcp-server.mjs` 의 유일한 esbuild 진입점 — 조립 로직을
  끌어들이면 번들이 커지므로 이 파일은 얇아야 한다.
- `server/index.ts` 배럴이 아니라 concrete `../server/lifecycle/startServer.js`
  를 직접 import — 배럴을 거치면 재수출 전체가 번들에 끌려온다.
- 부팅 실패는 `INJECTION_PREFIX` 접두 + `console.error` + `process.exit(1)` —
  Claude Code 가 서버 죽음을 알아채는 유일한 신호이므로 삼키지 않는다.

## Boundaries

### Always do

- 부팅 실패를 삼키지 말고 비-0 종료 코드로 드러낼 것.
- `server/` 배럴이 아니라 concrete 파일 경로로 import.

### Ask first

- 부팅 실패 보고 형식(접두사·종료 코드) 변경 — bridge 산출물을 구동하는
  Claude Code 와의 계약.

### Never do

- 서버 조립·도구 등록 로직 인라인 — `server/` 소관.
- `INJECTION_PREFIX` 없이 직접 문자열로 오류 메시지 작성.

## Dependencies

- `../server/lifecycle/startServer.js` (concrete import, `server/index.ts` 배럴 아님)
- `../../constants/plugin.js` (`INJECTION_PREFIX`)
