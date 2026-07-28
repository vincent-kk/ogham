# boundaryDetector contract

## Requirements

- 임의 파일 경로에서 위로 올라가며 가장 가까운 `package.json` 디렉터리를 boundary로 찾는다. monorepo에서는 가장 가까운 것이 이긴다.
- boundary까지의 디렉터리 체인과 각 디렉터리의 `INTENT.md`/`DETAIL.md` 유무를 수집한다.
- 상향 탐색은 `dirname(dir) === dir`로 루트 도달을 감지해 멈춘다. 경로가 무한히 올라가지 않는다.
- boundary를 찾지 못하면 `null`을 반환한다. 임의의 디렉터리를 boundary로 추정하지 않는다.

## API Contracts

- `findBoundary(filePath: string): string | null` — 가장 가까운 package boundary 디렉터리.
- `buildChain(filePath: string): ChainResult | null` — boundary까지의 체인과 각 단계의 문서 존재 여부.
- `ChainResult` — boundary 경로와 디렉터리별 문서 플래그를 담는 인터페이스.

## Acceptance Criteria

### AC-boundary-nearest — 가장 가까운 경계

- 중첩 package 구조에서 파일에 가장 가까운 `package.json` 디렉터리를 반환한다.

### AC-boundary-root-stop — 루트에서 멈춘다

- boundary가 없는 경로에서 무한 루프 없이 `null`을 반환한다.

### AC-boundary-chain-documents — 체인의 문서 상태

- 체인의 각 디렉터리마다 `INTENT.md`와 `DETAIL.md` 존재 여부를 개별로 보고한다.

## Boundary Exemptions

### boundaryDetector.ts — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`, `**/__tests__/**`
- **Direct import**: allowed
- **Reason**: 훅 번들은 배럴을 import할 수 없다 — esbuild 가 배럴이 재노출하는 모듈 전체를 번들로 끌어오고, `scripts/buildHooks.mjs` 의 바이트 캡이 이를 빌드 실패로 막는다.

## Last Updated

2026-07-28 — 훅 번들 직접 참조 면책을 선언하고 계약을 문서화했다.
