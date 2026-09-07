# fractal_inspect verification action — Filid 1.0 Contract

## Requirements

- 모든 file 또는 optional normalized file subset을 같은 snapshot에서 분석한다.
- spec-document 15, test-record 32, fragmentation과 DETAIL group link를 role별 요약으로 반환한다.
- 문서 계약 finding을 옮긴 diagnostic은 판독 가능한 위반 증거이므로 certainty를 낮추지 않는다.
- unsupported/indeterminate count와 discovery, 그 밖의 diagnostic을 violation 없는 PASS로 숨기지 않는다.
- scan은 project source와 verification document를 변경하지 않는다.

## API Contracts

- Input: `{ path, filePaths?, detail?: 'summary' | 'files' }`.
- Summary의 `specDocument`와 `testRecord`는 각각 `fileCount`, `knownCaseCount`, `caseCap`을 가지며 서로의 case를 합산하지 않는다.
- Summary는 `fragmentationCount`, 전체 `violationCount`와 certainty를 가진다.
- `utils/summarizeVerificationRole.ts`는 한 role의 file/known-case/cap projection만 계산하고 summary builder가 이를 조합한다.
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
- `intent-document-contract`와 `detail-document-contract` diagnostic만 있고 finding이 있으면 `violations`이며 `indeterminate`가 아니다.

## History

- 2026-09-05 — 기존 verification payload를 `fractal_inspect`의 `verification` action 뒤 child 계약으로 이동했다.
- 2026-08-20 — 문서 계약 finding diagnostic과 불완전 evidence를 구분했다.

## Last Updated

2026-09-05
