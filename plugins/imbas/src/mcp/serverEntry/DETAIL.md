# serverEntry — Contract

## Requirements

- 이 fractal 의 공개 표면은 심볼이 아니라 실행 파일이다. `scripts/buildMcpServer.mjs` 가 `serverEntry.ts` 를 진입점으로 `bridge/mcp-server.cjs` 를 번들하고, 호스트는 `node bridge/mcp-server.cjs` 로 그 산출물을 실행한다.
- 모듈 최상위에서 `startServer()` 를 호출한다 — import 자체가 부수효과다. 그래서 어떤 모듈도 이 파일을 import 하지 않으며, `index.ts` 는 아무것도 재노출하지 않는다.
- 시작 실패를 삼키지 않는다. stderr 에 한 줄을 쓰고 종료 코드 1로 나간다. stdout 은 MCP stdio 프레임 전용이라 진단 출력을 쓰지 않는다.
- 서버 조립과 도구 등록은 `mcp/server` 가 소유한다. 이 fractal 은 어떤 도구가 등록되는지, 어떤 transport 가 쓰이는지 알지 못한다.

## API Contracts

```typescript
// serverEntry.ts — no exports; top-level effect
startServer().catch((err: unknown) => {
  process.stderr.write(`imbas MCP server error: ${String(err)}\n`);
  process.exit(1);
});
```

- 의존은 `../server/index.js` 의 `startServer` 단 하나다. `startServer` 는 `createServer()` 로 서버를 만들고 `StdioServerTransport` 로 연결한다.
- `index.ts` 는 주석 한 줄만 담는 빈 배럴이다 — 재노출할 심볼이 없다는 사실 자체가 계약이다.
- 실패 계약: `startServer()` 의 rejection → stderr `imbas MCP server error: <원인>` + exit code 1. 정상 기동 시 이 파일은 아무것도 출력하지 않는다.

## Acceptance Criteria

### AC-no-symbol-surface — 심볼 표면 부재

- `index.ts` 가 아무것도 export 하지 않는다.
- 워크스페이스 어디에서도 `serverEntry` 를 import 하지 않는다 — 참조는 번들 스크립트의 entryPoint 경로와 `src/INTENT.md` 의 서술뿐이다.

### AC-startup-failure-visible — 시작 실패 가시화

- `startServer()` 가 reject 하면 프로세스가 종료 코드 1로 끝나고, 원인이 stderr 한 줄로 남는다.
- 어떤 경로에서도 stdout 에 쓰지 않는다 — 진단 한 줄이 MCP 프레임을 깨뜨리지 않는다.

## Last Updated

2026-07-30 — 번들 진입점 계약과 실패 시 종료 규약을 문서화했다.
