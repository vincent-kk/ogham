# probeAdvisory — Contract

## Requirements

- 정상 동작에서도 나오는 신호는 걸러 낸다. `CLAUDE_PLUGIN_ROOT not set` 은 env 미전파가 기본값이므로 경고가 아니다.
- 필터 결과가 비면 advisory 는 `null` 이다. 로그도 경고도 남기지 않는다 — 잡음은 실제 실패를 묻는다.
- 남는 것은 사용자가 조치할 수 있는 실패(node·git·PATH)뿐이다.
- 경고 문구에는 error-log 경로 안내를 유지한다.
- shared `selfProbe` 자체를 고치는 것에 계약을 걸지 않는다. 필터는 maencof 쪽에서만 한다.
- 경고를 `systemMessage` 등 다른 채널로 이중 발신하지 않는다.

## API Contracts

- `buildProbeAdvisory(errors)` — 무시 목록(`IGNORED_PROBE_ERRORS`)을 적용한 뒤 `ProbeAdvisory` 를 만든다.
- `ProbeAdvisory` — `actionable`(걸러 남은 오류 목록)과 `advisory`(Claude 에게 보일 문구, 남는 것이 없으면 `null`). 호출자는 `advisory === null` 로 침묵 여부를 판정한다.

## Acceptance Criteria

### AC-ignored-signals-filtered — 무시 신호 제거

- 무시 목록에 있는 신호만 담긴 결과에서 advisory 가 `null` 이다.

### AC-single-channel — 단일 채널

- 경고가 `additionalContext` 한 곳으로만 나간다.

## Boundary Exemptions

### `probeAdvisory.ts` — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`
- **Direct import**: `allowed`
- **Reason**: 훅은 esbuild 번들로 배송되고 이벤트별 크기 가드를 받는다. SessionStart entry 가 이 필터를 직접 가져오는 것은 `sessionStart/INTENT.md` 가 선언한 형태이고, 배럴 경유는 같은 번들의 57344 바이트 캡을 잠식한다.

## Last Updated

2026-07-30 — 필터·단일 채널 계약과 훅 직접 import 면책을 문서화했다.
