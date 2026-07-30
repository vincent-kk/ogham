# src — Contract

## Requirements

- `version.ts` 는 `scripts/injectVersion.mjs` 가 `package.json` 에서 만드는 생성물이다. 손편집하지 않는다.
- 훅 도달 코드는 배럴을 거치지 않고 concrete 파일을 직접 import 한다. 배럴을 거치면 재노출 그래프 전체가 번들에 끌려 들어와 크기 가드를 넘긴다.
- 파이프라인 state·설정·매니페스트의 Zod 스키마는 `types/` 가 단독으로 소유한다. 다른 디렉터리에서 다시 정의하면 계약이 두 곳으로 갈라진다.

## API Contracts

- 배송 진입점은 esbuild 산출물이다: MCP 서버(원본 `mcp/serverEntry/serverEntry.ts` → `bridge/mcp-server.cjs`)와 훅 4종(원본 `hooks/<name>/<name>.entry.ts` → `bridge/<hook-name>.mjs`).
- `src/index.ts` 는 `types`·`core`·`ast`·`hooks`·`lib` 의 공개 심볼과 `VERSION` 을 노출한다. `mcp/` 는 재노출하지 않는다 — `mcp/server/server.ts` 가 `version.ts` 를 참조하므로 재노출은 `src → mcp → mcp/server → src` 순환이 된다.
- 이 배럴에는 워크스페이스 소비자가 없다. MCP 서버와 훅은 각자의 진입점에서 concrete 모듈을 직접 조립한다.

## Acceptance Criteria

### AC-no-barrel-cycle — 배럴 순환 부재

- `src/index.ts` 가 `mcp/` 를 재노출하지 않는다.
- `src` 를 지나는 의존성 순환이 0건이다.

### AC-generated-version-untouched — 생성된 버전 상수 불변

- `version.ts` 는 `VERSION` 상수 하나만 노출하고 아무것도 import 하지 않는다.

## Boundary Exemptions

### version.ts — Generated version constant has no entry point

- **Consumers**: `**/src/**`
- **Direct import**: allowed
- **Reason**: 생성기가 만드는 단일 상수 파일이고 아무것도 import 하지 않는다. 배럴을 경유시키면 `src → mcp → mcp/server → src` 순환이 생기므로, 이 참조는 경계를 넘는 대신 면책을 받는다.

## Last Updated

2026-07-30 — 배럴 표면과 생성된 `version.ts` 참조 면책을 문서화했다.
