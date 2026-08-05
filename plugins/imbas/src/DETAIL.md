# src — Contract

## Requirements

- `version.ts` 는 `scripts/injectVersion.mjs` 가 `package.json` 에서 만드는 생성물이다. 손편집하지 않는다.
- 파이프라인 state·설정·매니페스트의 Zod 스키마는 `types/` 가 단독으로 소유한다. 다른 디렉터리에서 다시 정의하면 계약이 두 곳으로 갈라진다.
- MCP 도구는 9개다: `run_create/get/transition/list` · `manifest_save/validate` · `config_get/set` · `open_settings`. 파일 I/O 래퍼 도구를 되살리지 않는다 — 산출물 파일은 스킬이 Read/Write 로 직접 다룬다 (`.metadata/imbas/mcp-tools.md`).

## API Contracts

- 배송 진입점은 esbuild 산출물 하나다: MCP 서버(원본 `mcp/serverEntry/serverEntry.ts` → `bridge/mcp-server.cjs`).
- `src/index.ts` 는 `types`·`core`·`lib` 의 공개 심볼과 `VERSION` 을 노출한다. `mcp/` 는 재노출하지 않는다 — `mcp/server/server.ts` 가 `version.ts` 를 참조하므로 재노출은 `src → mcp → mcp/server → src` 순환이 된다.
- 이 배럴에는 워크스페이스 소비자가 없다. MCP 서버는 자신의 진입점에서 concrete 모듈을 직접 조립한다.
- 매니페스트 type 은 `stories | estimation` 이며 파일명 매핑(`stories-manifest.json` · `estimation.json`)은 `constants/files.ts` 가 소유한다.

## Acceptance Criteria

### AC-no-barrel-cycle — 배럴 순환 부재

- `src/index.ts` 가 `mcp/` 를 재노출하지 않는다.
- `src` 를 지나는 의존성 순환이 0건이다.

### AC-generated-version-untouched — 생성된 버전 상수 불변

- `version.ts` 는 `VERSION` 상수 하나만 노출하고 아무것도 import 하지 않는다.

### AC-tool-surface-nine — MCP 도구 표면 고정

- `constants/mcpToolNames.ts` 의 도구는 위 9개와 정확히 일치한다.
- `mcp/server/server.ts` 의 registerTool 호출 수는 9다.

## Boundary Exemptions

### version.ts — Generated version constant has no entry point

- **Consumers**: `**/src/**`
- **Direct import**: allowed
- **Reason**: 생성기가 만드는 단일 상수 파일이고 아무것도 import 하지 않는다. 배럴을 경유시키면 `src → mcp → mcp/server → src` 순환이 생기므로, 이 참조는 경계를 넘는 대신 면책을 받는다.

## History

- 2026-08-05 — v2 재구성: `ast/`·`hooks/` 계층 제거, MCP 17→9, phase 체계 `refine/estimate/split` 전환. 근거는 `.metadata/imbas/spec.md` §4.

## Last Updated

2026-08-05 — v2 재구성에 맞춰 배송 진입점 단일화·도구 표면 9개 고정을 계약화했다.
