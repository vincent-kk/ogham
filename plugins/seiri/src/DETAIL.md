# src — Contract

## Requirements

- 이 플러그인은 **규칙 본문을 주입하지 않는다.** 배포된 파일은 하니스가 로드하며, 훅이 나르는 것은 파일이 스스로 말할 수 없는 것뿐이다 — 무엇이 활성인지, 다이얼이 어디인지, 드리프트가 있는지, 같은 명령이 몇 번째 실패인지.
- 어떤 훅도 차단하지 않는다. 신호는 제안이고 판정은 모델이 한다.
- built-in `intervention: off`에서는 스킬만 남기고 모든 훅이 규칙·세션 상태 접근 전에 빠져나온다. 무주입 결과는 wire stdout도 비운다.
- 훅 도달 코드는 배럴을 거치지 않고 concrete 파일을 직접 import 한다. esbuild 가 배럴의 재노출 그래프 전체를 번들에 끌어오고 `build:hooks` 의 크기 가드가 이를 빌드 실패로 막기 때문이다 — typecheck 는 이 비대를 잡지 못한다.
- 상태의 진실은 파일시스템이 소유한다. 규칙 배포 상태를 config 에 미러링하지 않는다.
- `version.ts` 는 자동 생성 파일이며 직접 수정하지 않는다.

## API Contracts

- 배포 진입점은 esbuild 산출물이다: MCP 서버(`bridge/mcp-server.cjs`, 원본 `mcp/serverEntry/`)와 훅 번들 5종(`bridge/*.mjs`).
- `src/index.ts` 는 named re-export 만 담는 공개 배럴이다.
- 소유 상태는 넷이다: 개입 강도 다이얼(`core/infra/configLoader`), 호스트 규칙 배포 상태(`core/ruleDocs`), 세션 스코프 신호(`core/sessionSignals`), 작업 상태(`core/gates`).

## Acceptance Criteria

### AC-no-rule-injection — 규칙 본문 비주입

- 어떤 훅 출력에도 규칙 문서 본문이 실리지 않는다.
- 훅은 활성 목록·다이얼·드리프트·실패 연쇄만 보고한다.

### AC-hook-non-blocking — 비차단

- 모든 훅이 차단 결정을 반환하지 않는다.
- `off`와 모든 no-op 경로의 entry stdout이 비어 있고 exit 0을 유지한다.

### AC-hook-bundle-size — 번들 크기 가드

- `build:hooks` 의 바이트 캡을 넘는 번들이 생기지 않는다.

## Boundary Exemptions

### version.ts — Generated version constant has no entry point

- **Consumers**: `**/src/**`
- **Direct import**: allowed
- **Reason**: `version.ts` 는 생성기가 만드는 단일 상수 파일이고 아무것도 import 하지 않는다. 배럴을 경유시키면 `src → mcp → server → src` 순환이 생기므로, 이 참조는 경계를 넘는 대신 면책을 받는다.

## Last Updated

2026-09-03 — skills-only `off`와 wire-level no-op skip을 추가했다.
