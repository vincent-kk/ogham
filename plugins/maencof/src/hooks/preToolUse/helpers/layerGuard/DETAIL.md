# layerGuard — Contract

## Requirements

- `isMaencofVault` 게이트를 먼저 통과한다. 볼트가 아니면 판정하지 않는다.
- 경로 판정은 `isLayer1Path` 로만 한다. 자체 경로 비교를 만들지 않는다.
- 보호 우회 경로를 만들지 않는다. L1(Core) 문서 쓰기는 사용자 판단이 필요한 변경이라 훅이 조용히 허용하지 않는다.

## API Contracts

- `runLayerGuard(input)` — `PreToolUseResult`. L1 경로 쓰기 시도면 차단 신호를, 아니면 통과를 반환한다.
- 입력 `PreToolUseInput`, 출력 `PreToolUseResult`. 최종 stdout 번역은 `denyEnvelope` 가 한다.

## Acceptance Criteria

### AC-vault-gate-first — 볼트 게이트 우선

- 볼트가 아닌 cwd 에서 차단 판정이 일어나지 않는다.

### AC-layer1-write-blocked — L1 쓰기 차단

- L1 경로 쓰기 시도가 차단 신호를 받는다.

### AC-no-bypass — 우회 부재

- 차단을 건너뛰는 별도 분기가 없다.

## Boundary Exemptions

### `layerGuard.ts` — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`
- **Direct import**: `allowed`
- **Reason**: 훅은 esbuild 번들로 배송되고 이벤트별 크기 가드를 받는다. PreToolUse orchestrator 가 이 관심사를 직접 가져오며, 그 번들의 캡은 12288 바이트라 배럴 경유의 여유가 없다.

## Last Updated

2026-07-30 — L1 보호 계약과 훅 직접 import 면책을 문서화했다.
