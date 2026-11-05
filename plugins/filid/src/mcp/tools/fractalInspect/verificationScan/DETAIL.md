# fractal_inspect verification action — Filid 1.0 Contract

## Requirements

- 모든 file 또는 optional normalized file subset을 같은 snapshot에서 분석한다.
- spec-document 15, test-record 32, fragmentation과 DETAIL group link를 role별 요약으로 반환한다.
- 문서 계약 finding을 옮긴 diagnostic은 판독 가능한 위반 증거이므로 certainty를 낮추지 않는다.
- unsupported/indeterminate count와 discovery, 그 밖의 diagnostic을 violation 없는 PASS로 숨기지 않는다.
- scan은 project source와 verification document를 변경하지 않는다.

## API Contracts

- file filter가 snapshot evidence에 없는 path를 가리키면 `verification-path-not-found` diagnostic을 반환한다. `message`는 요청 경로를 담고, `nextAction`은 프로젝트 안의 파일을 주거나 `fractal_inspect` action `verification`을 `filePaths` 없이 불러 인식 가능한 파일을 나열하라고 안내한다.

## Acceptance Criteria

### AC-verification-certainty — No false PASS

- dynamic/unsupported count 또는 discovery는 `ok`가 아니다.
- `intent-document-contract`와 `detail-document-contract` diagnostic만 있고 finding이 있으면 `violations`이며 `indeterminate`가 아니다.

## Last Updated

role별 요약, certainty 판정이나 path-not-found 진단 계약이 바뀔 때 갱신한다.
