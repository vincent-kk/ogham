# boundaryDetector contract

## Requirements

- 임의 파일 경로에서 위로 올라가며 가장 가까운 `package.json` 디렉터리를 boundary로 찾는다. monorepo에서는 가장 가까운 것이 이긴다.
- boundary까지의 디렉터리 체인과 각 디렉터리의 `INTENT.md`/`DETAIL.md` 유무를 수집한다.
- boundary를 찾지 못하면 `null`을 반환한다. 임의의 디렉터리를 boundary로 추정하지 않는다.

## API Contracts

- 가장 가까운 package 경계까지만 chain을 전달한다.

## Acceptance Criteria

구체적인 동작과 경계값은 이 모듈의 테스트가 고정하므로 별도 수락 그룹을 중복 선언하지 않는다.

## Boundary Exemptions

### boundaryDetector.ts — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`, `**/__tests__/**`
- **Direct import**: allowed
- **Reason**: 훅 번들은 배럴을 import할 수 없다 — esbuild 가 배럴이 재노출하는 모듈 전체를 번들로 끌어오고, `scripts/buildHooks.mjs` 의 바이트 캡이 이를 빌드 실패로 막는다.

## Last Updated

boundary 정의, chain 범위나 훅 번들 면제가 바뀔 때 갱신한다.
