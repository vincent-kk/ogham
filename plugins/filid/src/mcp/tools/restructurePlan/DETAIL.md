# restructure_plan — Filid 1.0 Contract

## Requirements

- `RestructurePlanInput`의 project path와 placement request를 그대로 받는다.
- 같은 snapshot으로 모든 consumer, LCA, artifact와 rewrite evidence를 계산한다.
- 계획 생성은 project tree를 변경하지 않는다.
- full plan은 크기와 관계없이 검증 가능한 ephemeral artifact에 저장한다.

## API Contracts

- Input: core `RestructurePlanInput`.
- Summary: plan ID/hash, move/fractal/organ/decision count.
- Data: core `RestructurePlan`, `persistence: always`.
- unresolved move가 있으면 status는 `indeterminate`다.

## Acceptance Criteria

### AC-plan-artifact — Always persisted

- 작은 plan도 inline data 없이 absolute artifact path와 matching hash를 가진다.
- artifact JSON은 full common `ToolPayload`를 저장하고 `.data`에서 같은 plan과
  precondition snapshot hash를 복원할 수 있다.

### AC-plan-read-only — No executor

- 호출 전후 project tree의 path와 file bytes가 동일하다.

## Last Updated

2026-07-27 — full ToolPayload artifact를 사용하는 always-persist read-only
placement plan 계약.
