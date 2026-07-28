# rules contract

## Requirements

- 15개 내장 FCA 규칙의 정의·평가와 INTENT/DETAIL 문서 검증을 소유한다.
- `ruleEngine/`이 규칙 roster와 평가를, `documentValidator/`가 문서 계약을, `fractalValidator/`가 노드 단위 구조 검증을 담당한다.
- thrown check와 unsupported evidence는 PASS가 아니라 finding으로 변환된다.

## API Contracts

- `loadBuiltinRules`, `evaluateRule`, `evaluateRules`, `getActiveRules`, `applyOverrides` — 규칙 평가.
- `validateIntentMd`, `validateDetailMd`, `validateDetailAcceptanceGroups`, `parseBoundaryExemptions`, `countLines` — 문서 계약.
- `validateStructure`, `validateNode`, `validateDependencies` — 노드 검증.

## Acceptance Criteria

### AC-rules-roster — 정확히 15개

- 진입점이 노출하는 규칙 ID가 canonical 15개 집합과 일치하며 제거된 naming·metric·coverage 규칙이 없다.

### AC-rules-uncertainty — 불확실성 보존

- indeterminate와 unsupported 증거가 PASS로 변환되지 않는다.

## Last Updated

2026-07-28 — 중간 계층 fractal 계약을 문서화했다.
