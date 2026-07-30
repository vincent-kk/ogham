# src — Contract

## Requirements

- **볼트 접근은 읽기 전용이다.** 볼트 파일시스템에 쓰지 않고 maencof 의 mutation 핸들러를 호출하지 않는다.
- 레이어 필터는 설정된 레이어와 요청 레이어의 교집합으로 결정한다 — 요청이 설정 범위를 넓히지 못한다.
- `@ogham/maencof` 의 handler·타입을 공유하며 alias 가 `../maencof/src` 로 해석된다. 이 경계는 additive 로만 바꾼다 — maencof 배럴에서 심볼을 빼면 이 패키지가 깨진다.
- 훅 도달 코드는 배럴을 거치지 않고 concrete 파일을 직접 import 한다(번들 크기 가드).
- `version.ts` 는 생성물이며 직접 수정하지 않는다.

## API Contracts

- 실행 진입점은 esbuild 산출물이다: MCP 서버(원본 `mcp/serverEntry/`)와 훅 번들.
- `src/index.ts` 는 설정·볼트·필터의 공개 심볼을 노출한다. `mcp/` 를 재노출하지 않는다 — `mcp/server/server.ts` 가 `version.ts` 를 참조하므로 재노출은 `src → mcp/server → src` 순환이 된다.
- MCP 도구 5종은 모두 읽기 전용이다.

## Acceptance Criteria

### AC-read-only-vault — 읽기 전용

- 볼트 경로에 대한 쓰기 호출이 0건이다.
- maencof 의 mutation 핸들러를 import 하지 않는다.

### AC-layer-intersection — 레이어 교집합

- 요청 레이어가 설정 레이어를 넘어서면 교집합으로 좁혀진다.

### AC-no-barrel-cycle — 배럴 순환 부재

- `src/index.ts` 가 `mcp/` 를 재노출하지 않는다.

## Boundary Exemptions

### version.ts — Generated version constant has no entry point

- **Consumers**: `**/src/**`
- **Direct import**: allowed
- **Reason**: `version.ts` 는 생성기가 만드는 단일 상수 파일이고 아무것도 import 하지 않는다. 배럴을 경유시키면 `src → mcp/server → src` 순환이 생기므로, 이 참조는 경계를 넘는 대신 면책을 받는다.

## Last Updated

2026-07-30 — 읽기 전용 계약과 생성된 `version.ts` 참조 면책을 문서화했다.
