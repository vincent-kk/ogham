# layerGuard — Contract

## Requirements

- `isInsideMaencofVault` 게이트를 먼저 통과한다. 볼트가 아니면 판정하지 않는다.
- 경로는 shared canonicalizer로 host target을 해석한 뒤 `isLayer1Path` 로 layer를 판정한다. Delete는 terminal entry를 보존해 unlink 위치를 검사하고 자체 경로 비교를 만들지 않는다.
- 보호 우회 경로를 만들지 않는다. L1(Core) 문서의 `Write`·`Edit`·`Delete` mutation 은 사용자 판단이 필요한 변경이라 훅이 조용히 허용하지 않는다.

## API Contracts

관심사는 차단 신호만 반환하고 최종 stdout 번역은 상위 디스패처가 소유한다. Delete는 대상 내용이 아니라 unlink할 terminal entry를 보호하므로 symlink를 따라가지 않는다.

## Acceptance Criteria

### AC-no-bypass — 우회 부재

- 차단을 건너뛰는 별도 분기가 없다.

## Boundary Exemptions

### `layerGuard.ts` — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`
- **Direct import**: `allowed`
- **Reason**: 훅은 esbuild 번들로 배송되고 이벤트별 크기 가드를 받는다. PreToolUse orchestrator 가 이 관심사를 직접 가져오며, 그 번들의 캡은 12288 바이트라 배럴 경유의 여유가 없다.

## Last Updated

L1 mutation 보호, Delete의 terminal entry 판정 또는 우회 금지 경계가 바뀔 때 갱신한다.
