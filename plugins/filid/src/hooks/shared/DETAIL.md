# shared — Filid 1.0 Contract

## Requirements

- hook에서 공통으로 쓰는 FCA 프로젝트, INTENT.md와 DETAIL.md 판별만 제공한다.
- 경로 문자열 판별은 POSIX와 Windows 표현을 host OS와 무관하게 처리한다.
- criteria ledger, branch mode, agent 역할 또는 문서 내용 파싱을 소유하지 않는다.

## API Contracts

- `isFcaProject(cwd): boolean` — git root까지 `.filid/` 또는 INTENT.md marker를 탐색한다.
- `isIntentMd(path): boolean` — portable basename이 정확히 INTENT.md인지 판정한다.
- `isDetailMd(path): boolean` — portable basename이 정확히 DETAIL.md인지 판정한다.

## Acceptance Criteria

### AC-shared-portable-path — portable document names

- POSIX와 Windows 형식의 동일 문서 경로는 같은 결과를 반환한다.
- 대소문자나 확장자가 다른 lookalike는 일치하지 않는다.

### AC-shared-minimal-surface — 최소 공통 표면

- public surface는 FCA 프로젝트, INTENT.md와 DETAIL.md predicate만 열거한다.
- `.filid/criteria.md` 전용 predicate를 노출하지 않는다.

## Boundary Exemptions

### utils — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`, `**/__tests__/**`
- **Direct import**: allowed
- **Reason**: 훅 번들은 배럴을 import할 수 없다 — esbuild 가 배럴이 재노출하는 모듈 전체를 번들로 끌어오고, `scripts/buildHooks.mjs` 의 바이트 캡이 이를 빌드 실패로 막는다.

## Last Updated

2026-07-27 — criteria predicate를 제거한 1.0 공통 hook 계약으로 재구성했다.
