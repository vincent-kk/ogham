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
- host-session resolver는 core와 훅의 내부 concrete import이며 `src/index.ts` 공개 표면에 노출하지 않는다.

## Acceptance Criteria

### AC-layer-direction — 단방향 의존

- `core/` 에서 `dispatcher/`·`mcp/` 를 참조하는 import 가 0건이다.
- `hooks/` 에서 `core/`·`types/` 를 참조하는 import 가 0건이다.

### AC-cli-via-cross-platform — CLI 호출 경유

- `child_process` 직접 호출이 dispatcher 밖에 없다.

### AC-generated-artifacts — 생성물 불가침

- `version.ts`·`bridge/`·`public/` 에 손편집 흔적이 없다.
- settings page와 bridge 생성기의 check 모드가 canonical source와 커밋 산출물의 불일치를 쓰기 없이 거부한다.

### AC-no-runtime-cycle — 런타임 순환 부재

- 배송되는 그래프(`mcp/serverEntry → mcp/server → version.ts`)에 순환이 없다.
- `src/index.ts` 가 `mcp/` 를 재노출하지 않는다.

**서버 identity 는 주입된다**: `createServer(version)`·`startServer(version)` 은 버전을 인자로 받고 `mcp/server` 안에서 `version.ts` 를 읽지 않는다. 실행 경로에서는 `mcp/serverEntry` 가, 테스트에서는 e2e Layer A 하네스가 `VERSION` 을 넘긴다. 이렇게 두는 이유는 `mcp/server` 가 `src` 루트를 참조하면 하네스의 `src → mcp/server` 엣지와 맞물려 의존 순환이 되기 때문이다 — 하네스는 케이스가 없어 어댑터가 검증 파일로 인식하지 않으므로 그 엣지는 사라지지 않는다.

## Boundary Exemptions

### `version.ts` — Generated version constant has no entry point

- **Consumers**: `**/src/**`
- **Direct import**: `allowed`
- **Reason**: 생성기가 만드는 단일 상수 파일이고 아무것도 import 하지 않는다. 소비자를 `src/index.ts` 로 돌리면 하위 fractal 이 조상 배럴의 공개 표면 전체에 의존하게 되고, 훅 도달 코드는 배럴 경유가 번들 크기 가드에 걸려 아예 불가능하다.

## Last Updated

2026-08-23 — host-session resolver를 내부 경계로 유지하고 생성 산출물 check 계약을 추가했다.
