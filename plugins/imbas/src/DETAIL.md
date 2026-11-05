# src — Contract

## Requirements

- `version.ts` 는 `scripts/injectVersion.mjs` 가 `package.json` 에서 만드는 생성물이다. 손편집하지 않는다.
- 파이프라인 state·설정·매니페스트의 Zod 스키마는 `types/` 가 단독으로 소유한다. 다른 디렉터리에서 다시 정의하면 계약이 두 곳으로 갈라진다.
- 파일 I/O 래퍼 도구를 되살리지 않는다. 산출물 파일은 스킬이 Read/Write로 직접 다루므로 MCP에 같은 표면을 추가하지 않는다.

## API Contracts

- 공개 배럴에서 MCP를 재노출하지 않는다. 서버가 루트 버전 상수를 참조하므로 재노출은 의존 순환을 만든다.
- 이 배럴에는 워크스페이스 소비자가 없다. 배송 서버는 실행 진입점에서 concrete 모듈을 조립한다.
- 매니페스트 타입과 파일명 매핑의 정본은 상수 모듈이며 소비자가 파일명을 다시 정하지 않는다.

## Acceptance Criteria

### AC-no-barrel-cycle — 배럴 순환 부재

- `src/index.ts` 가 `mcp/` 를 재노출하지 않는다.
- `src` 를 지나는 의존성 순환이 0건이다.

### AC-generated-version-untouched — 생성된 버전 상수 불변

- `version.ts` 는 `VERSION` 상수 하나만 노출하고 아무것도 import 하지 않는다.

### AC-tool-surface-nine — MCP 도구 표면 고정

- `constants/mcpToolNames.ts` 의 도구 이름 집합은 `mcp/server/server.ts` 가 등록하는 도구 이름 집합과 정확히 일치한다.
- `mcp/server/server.ts` 의 registerTool 호출 수는 9다.

## Boundary Exemptions

### version.ts — Generated version constant has no entry point

- **Consumers**: `**/src/**`
- **Direct import**: allowed
- **Reason**: 생성기가 만드는 단일 상수 파일이고 아무것도 import 하지 않는다. 배럴을 경유시키면 `src → mcp → mcp/server → src` 순환이 생기므로, 이 참조는 경계를 넘는 대신 면책을 받는다.

## Last Updated

배송 표면·소유 상태·경계 계약의 내용과 근거가 바뀔 때 갱신한다.
