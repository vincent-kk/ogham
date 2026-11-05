# shared — Filid 1.0 Contract

## Requirements

- hook에서 공통으로 쓰는 FCA 프로젝트, INTENT.md와 DETAIL.md 판별만 제공한다.
- 경로 문자열 판별은 POSIX와 Windows 표현을 host OS와 무관하게 처리한다.
- criteria ledger, branch mode, agent 역할 또는 문서 내용 파싱을 소유하지 않는다.

## API Contracts

- 파일명 predicate는 portable basename의 정확 비교다. 유사한 이름을 보호 문서로 추측하지 않는다.
- FCA 탐색은 git root를 넘지 않는다.

## Acceptance Criteria

구체적인 동작과 경계값은 이 모듈의 테스트가 고정하므로 별도 수락 그룹을 중복 선언하지 않는다.

## Boundary Exemptions

### utils — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`, `**/__tests__/**`
- **Direct import**: allowed
- **Reason**: 훅 번들은 배럴을 import할 수 없다 — esbuild 가 배럴이 재노출하는 모듈 전체를 번들로 끌어오고, `scripts/buildHooks.mjs` 의 바이트 캡이 이를 빌드 실패로 막는다.

## Last Updated

FCA 감지의 탐색 경계, portable 문서명 판별이나 공통 훅 표면이 바뀔 때 갱신한다.
