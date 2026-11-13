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

- 켜진 규칙의 예외가 아닌 dynamic/unsupported count 또는 discovery는 `ok`가 아니다. 면제 finding에는 확실성을 싣지 않으며 그 밖의 unsupported·indeterminate finding 판정이 우선한다.
- validate와 같은 snapshot·rules·maxDepth로 `validateStructure`를 verification 스코프에서 한 번 호출한다. 별도 설정 적용이나 형제 handler 호출은 없다.
- 프로젝트 확실성은 filePaths로 거르기 전 전체 평가 finding에서 계산한다. missingPaths가 있으면 기존대로 indeterminate이며 files 증거와 진단 범위는 유지한다.
- summary의 violationCount·fragmentationCount와 상태는 면제가 아닌 finding만 센다. exemptedCount는 양수일 때만 실으며 info·exemptedBy finding은 결과에 남는다.
- 규칙 끄기는 해당 finding과 개수 불확실성을 제외한다. 설정이 없어도 계약 선언 증거가 없는 exact-count spec finding은 판정 불가를 유지한다.
- `intent-document-contract`와 `detail-document-contract` diagnostic만 있고 finding이 있으면 `violations`이며 `indeterminate`가 아니다.

## Last Updated

role별 요약, certainty 판정이나 path-not-found 진단 계약이 바뀔 때 갱신한다.
