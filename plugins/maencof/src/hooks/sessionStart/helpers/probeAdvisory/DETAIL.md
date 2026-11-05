# probeAdvisory — Contract

## Requirements

- 정상 동작에서도 나오는 신호는 걸러 낸다. `CLAUDE_PLUGIN_ROOT not set` 은 env 미전파가 기본값이므로 경고가 아니다.
- 필터 결과가 비면 advisory 는 `null` 이다. 로그도 경고도 남기지 않는다 — 잡음은 실제 실패를 묻는다.
- 남는 것은 사용자가 조치할 수 있는 실패(node·git·PATH)뿐이다.
- 경고 문구에는 error-log 경로 안내를 유지한다.
- shared `selfProbe` 자체를 고치는 것에 계약을 걸지 않는다. 필터는 maencof 쪽에서만 한다.
- 경고를 `systemMessage` 등 다른 채널로 이중 발신하지 않는다.

## API Contracts

호출자는 advisory가 null이면 로그와 경고 모두 생략한다. 정상 환경의 무시 신호를 실패로 승격하면 실제 조치가 필요한 오류가 잡음에 묻힌다.

## Acceptance Criteria

### AC-single-channel — 단일 채널

- 경고가 `additionalContext` 한 곳으로만 나간다.

## Boundary Exemptions

### `probeAdvisory.ts` — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`
- **Direct import**: `allowed`
- **Reason**: 훅은 esbuild 번들로 배송되고 이벤트별 크기 가드를 받는다. SessionStart entry 가 이 필터를 직접 가져오는 것은 `sessionStart/INTENT.md` 가 선언한 형태이고, 배럴 경유는 같은 번들의 57344 바이트 캡을 잠식한다.

## Last Updated

정상 probe 신호의 제외 기준, 조치 가능한 경고 범위 또는 단일 전달 채널이 바뀔 때 갱신한다.
