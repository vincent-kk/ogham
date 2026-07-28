# lcaCalculator — Contract

## Requirements

- file 또는 directory consumer를 snapshot tree의 가장 깊은 소유 node로 해석한다.
- organ과 pure-function의 owner는 `parentFractalPath`이며 fractal은 자신이 owner다.
- multi-consumer LCA는 pairwise 후보가 아니라 모든 owner ancestor chain의
  교집합에서 가장 깊은 `fractal`이다.
- Windows drive/UNC와 POSIX path의 separator·case 의미를 현재 host와
  독립적으로 보존한다.

## API Contracts

- `resolveOwningFractal(tree, targetPath): FractalNode | null` — project 밖,
  unknown path 또는 owner chain 누락은 null.
- `findLowestCommonFractal(tree, consumerPaths): FractalNode | null` — 모든
  consumer가 해석될 때만 deepest common fractal 반환.
- `getAncestorPaths(tree, nodePath): string[]` — canonical self-to-root
  structural path를 반환하며 portable alias를 허용.

## Acceptance Criteria

### AC-lca-all-consumers — 전체 교집합

- sibling 둘은 공통 부모, 세 번째가 다른 branch면 root를 반환한다.
- 단일 consumer는 owner fractal을 반환하고 organ 자체를 반환하지 않는다.

### AC-lca-portable-owner — host 독립 owner

- Windows separator/case alias와 POSIX path를 각각 같은 canonical owner로
  해석한다.
- project 밖 또는 하나라도 unknown인 consumer 집합은 null이다.

## Boundary Exemptions

### lcaCalculator.ts — Verification reaches module internals

- **Consumers**: `**/__tests__/**`, `**/e2e/**`
- **Direct import**: allowed
- **Reason**: 검증 파일이 내부 단위를 직접 검사한다. 이를 위해 진입점에 export 를 추가하면 소비자가 테스트뿐인 공개 심볼이 생기므로(`seiri_public-contract` §1) 구체 파일을 참조한다. 훅 테스트는 훅이 실제로 import 하는 경로를 mock 해야 하므로 같은 이유가 적용된다.

## Last Updated

2026-07-27 — portable owner와 true multi-consumer lowest common fractal 계약.
