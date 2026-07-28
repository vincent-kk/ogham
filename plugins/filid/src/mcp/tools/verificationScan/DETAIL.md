# verification_scan — Filid 1.0 Contract

## Requirements

- 모든 file 또는 optional normalized file subset을 같은 snapshot에서 분석한다.
- spec-document 15, test-record 32, fragmentation과 DETAIL group link를
  role별 요약으로 반환한다.
- unsupported/indeterminate count와 discovery를 violation 없는 PASS로 숨기지 않는다.
- scan은 project source와 verification document를 변경하지 않는다.

## API Contracts

- Input: `{ path, filePaths?, detail?: 'summary' | 'files' }`.
- Summary의 `specDocument`와 `testRecord`는 각각 `fileCount`,
  `knownCaseCount`, `caseCap`을 가지며 서로의 case를 합산하지 않는다.
- Summary는 `fragmentationCount`, 전체 `violationCount`와 certainty를 가진다.
- `utils/summarizeVerificationRole.ts`는 한 role의 file/known-case/cap
  projection만 계산하고 summary builder가 이를 조합한다.
- `detail: files` data는 filtered file analyses와 violations를 포함한다.
- file filter가 snapshot evidence에 없는 path를 가리키면 diagnostic을 반환한다.

## Acceptance Criteria

### AC-verification-summary — Role-aware counts

- spec/test-record를 섞지 않고 project total case cap을 만들지 않는다.
- role 요약의 cap은 verification policy의 안정 상수 15/32와 동일하다.
- `fragmentationCount`는 `spec-fragmentation` violation만 집계한다.
- detail 생략 시 per-file 배열을 inline하지 않는다.

### AC-verification-certainty — No false PASS

- dynamic/unsupported count 또는 discovery는 `ok`가 아니다.

## Boundary Exemptions

### utils — Verification reaches module internals

- **Consumers**: `**/__tests__/**`, `**/e2e/**`
- **Direct import**: allowed
- **Reason**: 검증 파일이 내부 단위를 직접 검사한다. 이를 위해 진입점에 export 를 추가하면 소비자가 테스트뿐인 공개 심볼이 생기므로(`seiri_public-contract` §1) 구체 파일을 참조한다. 훅 테스트는 훅이 실제로 import 하는 경로를 mock 해야 하므로 같은 이유가 적용된다.

## Last Updated

2026-07-27 — role/cap/fragmentation이 명시된 verification summary 계약.
