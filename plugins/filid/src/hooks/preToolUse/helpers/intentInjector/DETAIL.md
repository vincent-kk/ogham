# intentInjector — Filid 1.0 Contract

## Requirements

- Read/Write/Edit 방문에서 소유 fractal의 INTENT와 상위 chain, DETAIL 힌트를 전달한다.
- 전달 상태는 `commitVisit`의 none/stale/fresh 판정과 turn TTL을 따른다.
- 미전달 소유 fractal의 일반 mutation은 INTENT 본문을 포함한 deny로 한 번 차단한다.
- INTENT.md/DETAIL.md 자기 문서화는 mutation gate에서 면제하되 문서 validator는 별도로 실행한다.
- branch, spike 상태, criteria ledger 또는 agent 역할은 방문 판정 입력이 아니다.

## API Contracts

- `processVisit(input): HookOutput` — 단일 방문 입력을 전달/cache 결정으로 변환한다.
- `resolveGateContext(...)` — owner, delivery key, self-authoring과 gate eligibility를 계산한다.
- machine path 비교와 상대경로 표현은 `@ogham/cross-platform` portable API를 사용한다.

## Acceptance Criteria

### AC-visit-delivery — 전달 상태 보존

- none Read는 ctx를, fresh 재방문은 무출력을, stale 재방문은 soft ctx를 반환한다.
- 동일 turn의 동일 디렉터리 재방문은 map과 ctx를 중복 방출하지 않는다.

### AC-visit-gate — branch-independent mutation gate

- 모든 branch에서 미전달 일반 mutation은 한 번 deny되고 동일 재시도는 통과한다.
- INTENT.md/DETAIL.md mutation과 owner INTENT가 없는 mutation은 방문 gate로 deny하지 않는다.

## Boundary Exemptions

### intentInjector.ts — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`, `**/__tests__/**`
- **Direct import**: allowed
- **Reason**: 훅 번들은 배럴을 import할 수 없다 — esbuild 가 배럴이 재노출하는 모듈 전체를 번들로 끌어오고, `scripts/buildHooks.mjs` 의 바이트 캡이 이를 빌드 실패로 막는다.

## Last Updated

2026-07-27 — spike mode 인자를 제거하고 branch-independent delivery 계약으로 재구성했다.
