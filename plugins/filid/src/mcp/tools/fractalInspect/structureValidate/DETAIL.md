# fractal_inspect validate action — Filid 1.0 Contract

## Requirements

- 선택된 FCA scope의 canonical rule만 같은 snapshot에 평가한다.
- finding은 exact evidence 위에서도 `violations` status로 보존한다.
- 문서 계약 finding을 옮긴 diagnostic은 certainty를 낮추지 않으며, 그 밖의 snapshot diagnostic과 non-exact certainty는 `indeterminate` 또는 `unsupported` status로 보존한다.
- project source를 수정하지 않는다.

## API Contracts

- scope는 같은 snapshot의 canonical rule을 고른다. project validation은 plan 실행 검증을 소유하지 않는다.
- exact finding과 non-exact 증거는 서로 다른 status 의미로 유지한다.

## Acceptance Criteria

### AC-validate-project — Scoped project rules

- 생략 scope는 전체 canonical rule을 실행하고 지정 scope만 정확히 필터한다.
- violation 또는 indeterminate evidence는 `ok`가 아니다.
- `intent-document-contract`와 `detail-document-contract` diagnostic만 있고 finding이 있으면 `violations`이며 `indeterminate`가 아니다.

## Last Updated

scope 선택, 문서 finding과 불확실성의 구별이나 project validation 범위가 바뀔 때 갱신한다.
