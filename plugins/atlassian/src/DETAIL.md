# src — Contract

## Requirements

- 의존 방향은 `mcp → jira → core` 한 방향이다. jira 계층 는 도메인 레시피 계층으로 core 계층·utils 계층·types 계층·constants 계층·lib 계층 만 import 하고 mcp 계층 를 참조하지 않는다. converter 계층 는 둘 어느 쪽도 import 하지 않는 순수 형제 모듈이다.
- 배포 환경 판별과 API 버전 정책은 core가 공유하고, 스킬과 MCP는 그 결과로 경로·표현 형식을 선택한다. 중복 판별을 막기 위해 agent와 dispatcher에 환경 분기를 올리지 않는다.
- 형제 fractal 은 서로의 배럴을 경유한다. 부모 배럴이 형제를 재노출하므로 그 경로는 의존 순환이다.
- Zod 스키마는 types 계층 organ 에만 정의한다.
- 자격증명은 MCP 도구 응답에 노출하지 않는다.
- 요청·설정·자격증명 상태는 호출 사이에 공유하지 않는다. 배포 중 불변인 설정 HTML만 지연 캐시할 수 있으며 사용자별 데이터를 섞지 않는다.
- `version.ts` 는 생성물이며 직접 수정하지 않는다.

## API Contracts

- 실행 진입점은 esbuild 가 mcp/serverEntry 계층 로부터 만드는 `bridge/mcp-server.cjs` 와 빌드된 `public/settings.html` 이다.
- `src/index.ts` 는 타입체크·테스트가 소비하는 집합 배럴이다. mcp 계층 를 재노출하지 않는다 — `mcp/server/server.ts` 가 `version.ts` 를 참조하므로 재노출은 `src → mcp → server → src` 순환이 된다.

## Acceptance Criteria

### AC-layer-direction — 단방향 의존

- core 계층 에서 mcp 계층 를 참조하는 import 가 0건이다.
- converter 계층 에서 core 계층·mcp 계층 를 참조하는 import 가 0건이다.
- jira 계층 에서 mcp 계층 를 참조하는 import 가 0건이다.

### AC-sibling-barrel-crossing — 형제 경계 통과

- 하위 fractal 이 부모 집합 배럴을 import 하여 형제 경계를 우회하지 않는다.

### AC-schema-location — 스키마 위치

- Zod 스키마 정의가 types 계층 밖에 없다.

### AC-generated-artifacts — 생성물 불가침

- `version.ts`·bridge 계층·public 계층 에 손편집 흔적이 없다.

## Boundary Exemptions

### version.ts — Generated version constant has no entry point

- **Consumers**: `**/src/**`
- **Direct import**: allowed
- **Reason**: `version.ts` 는 생성기가 만드는 단일 상수 파일이고 아무것도 import 하지 않는다. 배럴을 경유시키면 `src → mcp → server → src` 순환이 생기므로, 이 참조는 경계를 넘는 대신 면책을 받는다.

## Last Updated

소스 계층 의존 방향, 스키마 소유권 또는 버전 상수 예외가 바뀔 때 갱신한다.
