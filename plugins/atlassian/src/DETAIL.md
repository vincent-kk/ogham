# src — Contract

## Requirements

- 의존 방향은 `mcp → core` 한 방향이다. `converter/` 는 둘 어느 쪽도 import 하지 않는 순수 형제 모듈이다.
- Cloud 와 Server/DC 차이는 스킬과 MCP 계층에서 흡수한다. agent 와 dispatcher 로 배포 환경 분기를 올리지 않는다.
- 형제 fractal 은 서로의 배럴을 경유한다. 부모 배럴이 형제를 재노출하므로 그 경로는 의존 순환이다.
- Zod 스키마는 `types/` organ 에만 정의한다.
- 자격증명은 MCP 도구 응답에 노출하지 않는다.
- 전역 가변 상태를 쓰지 않는다.
- `version.ts` 는 생성물이며 직접 수정하지 않는다.

## API Contracts

- 실행 진입점은 esbuild 가 `mcp/serverEntry/` 로부터 만드는 `bridge/mcp-server.cjs` 와 빌드된 `public/settings.html` 이다.
- `src/index.ts` 는 타입체크·테스트가 소비하는 집합 배럴이다. `mcp/` 를 재노출하지 않는다 — `mcp/server/server.ts` 가 `version.ts` 를 참조하므로 재노출은 `src → mcp → server → src` 순환이 된다.
- MCP 도구 4종: `fetch`, `convert`, `auth_check`, `setup`.

## Acceptance Criteria

### AC-layer-direction — 단방향 의존

- `core/` 에서 `mcp/` 를 참조하는 import 가 0건이다.
- `converter/` 에서 `core/`·`mcp/` 를 참조하는 import 가 0건이다.

### AC-sibling-barrel-crossing — 형제 경계 통과

- 하위 fractal 이 부모 배럴(`../index.js`)을 import 하지 않는다.

### AC-schema-location — 스키마 위치

- Zod 스키마 정의가 `types/` 밖에 없다.

### AC-generated-artifacts — 생성물 불가침

- `version.ts`·`bridge/`·`public/` 에 손편집 흔적이 없다.

## Boundary Exemptions

### version.ts — Generated version constant has no entry point

- **Consumers**: `**/src/**`
- **Direct import**: allowed
- **Reason**: `version.ts` 는 생성기가 만드는 단일 상수 파일이고 아무것도 import 하지 않는다. 배럴을 경유시키면 `src → mcp → server → src` 순환이 생기므로, 이 참조는 경계를 넘는 대신 면책을 받는다.

## Last Updated

2026-07-30 — 레이어 계약을 문서화하고 생성된 `version.ts` 참조 면책을 선언했다.
