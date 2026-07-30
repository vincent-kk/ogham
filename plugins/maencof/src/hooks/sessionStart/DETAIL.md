# sessionStart — Contract

## Requirements

- 실행 순서는 bootstrap → lifecycle 이다. 각 관심사는 `safeConcern` 으로 감싸 격리한다 — 하나가 실패해도 세션이 시작되어야 한다.
- entry 와 orchestrator 에 로직을 인라인하지 않는다. 실제 작업은 `helpers/` 가 소유한다.
- entry 는 `@ogham/cross-platform` package root에서 `selfProbeHook`만 named import하고, `probeAdvisory`가 걸러 낸 오류만 `additionalContext` 끝에 덧붙인다. `sideEffects: false` tree-shaking 뒤 emitted-byte cap과 `FORBIDDEN_PATTERNS`가 출력 격리를 검증한다.
- 헬퍼·공유 관심사·core 는 concrete 경로로 가져온다. 배럴(`index.js`) import 는 훅 번들을 비대하게 만든다.
- 범용 `selfProbe`·`spawn`·`cross-spawn` 을 가져오지 않는다.

## API Contracts

- `sessionStart.entry.ts` — 브리지 진입점. stdin → selfProbe → orchestrator → stdout. esbuild 가 `bridge/session-start.mjs` 로 번들한다.
- `orchestrateSessionStart(input)` — bootstrap 과 lifecycle 결과를 단일 envelope 으로 병합한다.

## Acceptance Criteria

### AC-concern-isolation — 관심사 격리

- 한 관심사가 throw 해도 나머지가 실행되고 envelope 이 반환된다.

### AC-quiet-on-healthy — 정상 시 침묵

- selfProbe 에 실제 실패가 없으면 advisory 가 붙지 않는다.

### AC-order-bootstrap-then-lifecycle — 실행 순서

- bootstrap 이 lifecycle 보다 먼저 실행된다.

## Last Updated

2026-07-30 — 실행 순서·격리 계약을 유지하며 공유 패키지 root import와 출력 기반 번들 가드를 현행화했다.
