# src — Contract

## Requirements

- 의존 방향은 `mcp → dispatcher → core` 한 방향이다. `core` 는 dispatcher 를, dispatcher 는 mcp 를 알지 못한다.
- 훅은 `core`·`types` 를 import 하지 않는다 — zod·MCP SDK 가 번들에 들어오면 크기 캡을 넘긴다. 훅은 `hooks/shared` organ 의 concrete 파일만 쓴다.
- 모든 외부 CLI 호출은 `@ogham/cross-platform` 을 경유한다.
- 디스크 JSON 키는 snake_case, 심볼·파일명은 camelCase 다.
- `version.ts` 는 생성물이며 직접 수정하지 않는다.

## API Contracts

- 실행 진입점은 esbuild 산출물이다: MCP 서버(`bridge/mcp-server.cjs`)와 훅 번들 2종(`bridge/*.mjs`).
- `src/index.ts` 는 타입체크·테스트가 소비하는 집합 배럴이다. `package.json` 에 `main: dist/index.js` 와 `files: ["dist", ...]` 가 남아 있지만 이 패키지에는 `publish:npm` 스크립트가 없어 npm 으로 배송되지 않으며, 워크스페이스 안에서 `@ogham/cennad` 를 소비하는 패키지도 없다.
- 배럴은 `mcp/` 를 재노출하지 않는다 — `mcp/server/lifecycle/createServer.ts` 가 `version.ts` 를 참조하므로 재노출은 `src → mcp → server → src` 순환이 된다.

## Acceptance Criteria

### AC-layer-direction — 단방향 의존

- `core/` 에서 `dispatcher/`·`mcp/` 를 참조하는 import 가 0건이다.
- `hooks/` 에서 `core/`·`types/` 를 참조하는 import 가 0건이다.

### AC-cli-via-cross-platform — CLI 호출 경유

- `child_process` 직접 호출이 dispatcher 밖에 없다.

### AC-generated-artifacts — 생성물 불가침

- `version.ts`·`bridge/`·`public/` 에 손편집 흔적이 없다.

### AC-no-runtime-cycle — 런타임 순환 부재

- 배송되는 그래프(`mcp/serverEntry → mcp/server → version.ts`)에 순환이 없다.
- `src/index.ts` 가 `mcp/` 를 재노출하지 않는다.

**남는 판정 하나**: 구조 스캔은 `src → mcp/server → src` 순환을 계속 보고한다. 닫는 엣지는 e2e Layer A 하네스(`__tests__/e2e/helpers/mcpClientLayerA.ts` → `mcp/server`)이고 되돌아오는 엣지는 `createServer.ts` → `version.ts` 다. 검증 파일의 참조는 순환을 닫지 않는다는 것이 규칙의 취지지만, 어댑터는 테스트 케이스를 담은 파일만 검증으로 인식하고 케이스 없는 헬퍼는 일반 소스로 본다. 하네스를 없애지 않고 이 엣지를 지울 방법은 없으며, `version.ts` 는 생성기가 `src/` 루트에 고정하므로 organ 으로 내릴 수도 없다.

## Boundary Exemptions

### version.ts — Generated version constant has no entry point

- **Consumers**: `**/src/**`
- **Direct import**: allowed
- **Reason**: `version.ts` 는 생성기가 만드는 단일 상수 파일이고 아무것도 import 하지 않는다. 배럴을 경유시키면 `src → mcp → server → src` 순환이 생기므로, 이 참조는 경계를 넘는 대신 면책을 받는다.

## Last Updated

2026-07-30 — 레이어 계약을 문서화하고 생성된 `version.ts` 참조 면책을 선언했다.
