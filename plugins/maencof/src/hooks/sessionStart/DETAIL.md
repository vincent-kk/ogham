# sessionStart — Contract

## Requirements

- 실행 순서는 bootstrap → lifecycle 이다. 각 관심사는 `safeConcern` 으로 감싸 격리한다 — 하나가 실패해도 세션이 시작되어야 한다.
- entry 와 orchestrator 에 로직을 인라인하지 않는다. 실제 작업은 `helpers/` 가 소유한다.
- entry 는 `@ogham/cross-platform` package root에서 `selfProbeHook`만 named import하고, `probeAdvisory`가 걸러 낸 오류만 `additionalContext` 끝에 덧붙인다. `sideEffects: false` tree-shaking 뒤 emitted-byte cap과 `FORBIDDEN_PATTERNS`가 출력 격리를 검증한다.
- 헬퍼·공유 관심사·core 는 concrete 경로로 가져온다. 배럴(`index.js`) import 는 훅 번들을 비대하게 만든다.
- 범용 `selfProbe`·`spawn`·`cross-spawn` 을 가져오지 않는다.

## API Contracts

probe advisory는 필터를 통과한 오류만 additionalContext 한 채널에 합친다. bootstrap이 lifecycle보다 앞서야 하며 실패가 다른 관심사나 세션 시작을 막아서는 안 된다.

## Acceptance Criteria

### AC-order-bootstrap-then-lifecycle — 실행 순서

- bootstrap 이 lifecycle 보다 먼저 실행된다.

## Last Updated

관심사 실행 순서·격리 방식 또는 entry의 import·번들 가드 조건이 바뀔 때 갱신한다.
