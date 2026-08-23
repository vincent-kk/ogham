# layerGuard — Contract

## Requirements

- `isInsideMaencofVault` 게이트를 먼저 통과한다. 볼트가 아니면 판정하지 않는다.
- 경로는 shared canonicalizer로 host target을 해석한 뒤 `isLayer1Path` 로 layer를 판정한다. Delete는 terminal entry를 보존해 unlink 위치를 검사하고 자체 경로 비교를 만들지 않는다.
- 보호 우회 경로를 만들지 않는다. L1(Core) 문서의 `Write`·`Edit`·`Delete` mutation 은 사용자 판단이 필요한 변경이라 훅이 조용히 허용하지 않는다.

## API Contracts

- `runLayerGuard(input)` — `PreToolUseResult`. Write/Edit의 host target 또는 Delete의 canonical-parent terminal entry가 L1이면 차단 신호를, 아니면 통과를 반환한다.
- 입력 `PreToolUseInput`, 출력 `PreToolUseResult`. 최종 stdout 번역은 `denyEnvelope` 가 한다.

## Acceptance Criteria

### AC-vault-gate-first — 볼트 게이트 우선

- 볼트가 아닌 cwd 에서 차단 판정이 일어나지 않는다.

### AC-layer1-mutation-blocked — L1 mutation 차단

- L1 경로의 `Write`·`Edit`·`Delete` 시도가 모두 같은 차단 신호를 받는다.
- case alias나 symlink ancestor를 거친 L1 target과 L1 안의 terminal symlink Delete도 lexical 경로와 같은 차단 신호를 받는다.

### AC-no-bypass — 우회 부재

- 차단을 건너뛰는 별도 분기가 없다.

## Boundary Exemptions

### `layerGuard.ts` — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`
- **Direct import**: `allowed`
- **Reason**: 훅은 esbuild 번들로 배송되고 이벤트별 크기 가드를 받는다. PreToolUse orchestrator 가 이 관심사를 직접 가져오며, 그 번들의 캡은 12288 바이트라 배럴 경유의 여유가 없다.

## Last Updated

2026-08-23 — L1 보호를 host-canonical mutation target과 Delete terminal entry로 현행화했다.
