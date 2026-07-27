# verificationScan — verification document policy

## Purpose

snapshot의 adapter evidence로 spec-document/test-record case cap,
fragmentation, DETAIL contract link와 certainty를 요약한다.

## Structure

- `verificationScan.ts` — snapshot-backed verification projection 조율
- `utils/` — portable filter, diagnostic, status와 summary 계산
- `index.ts` — named handler export

## Conventions

- default detail은 `summary`, `files`만 per-file data를 반환한다.
- file filter는 portable absolute identity로 적용한다.

## Boundaries

### Always do

- spec 15와 test-record 32를 별도 role로 집계
- violation과 unsupported/indeterminate certainty를 status에 보존
- snapshot의 existing verification analysis 재사용

### Ask first

- role, cap, fragmentation 또는 detail projection 변경

### Never do

- 특정 test framework syntax를 MCP DTO에 추가
- project total case cap 생성
- dynamic count를 PASS로 변환

## Dependencies

- core projectSnapshot/verification, adapters와 common envelope
