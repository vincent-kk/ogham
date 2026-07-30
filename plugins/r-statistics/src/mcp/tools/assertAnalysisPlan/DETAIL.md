# assertAnalysisPlan — Contract

## Requirements

- `assert_analysis_plan` 은 입력의 순수 함수다 — R 을 실행하지 않고, 파일을 쓰지 않으며, 자연어 판단을 하지 않는다.
- hard 위반은 모드와 무관하게 항상 차단한다. soft 위반은 interactive 에서 경고로 허용하고 auto 에서 차단한다.
- 가정 아티팩트가 없으면 위반이 아니라 `unverified` soft 경고로 다룬다.
- 룰셋에 등록되지 않은 기법은 차단이 아니라 soft 경고다 — 미등록이 곧 부적합은 아니다.
- 룰셋(`operations/ruleset.ts`)은 `skills/analyze/references/methods/*/meta.yaml` 의 미러이며 둘은 함께 바뀐다.
- 예시·기본값·표본 변수명은 어떤 응용 분야도 암시하지 않는다.

## API Contracts

- `handleAssertAnalysisPlan(...)` — 정규화된 분석 계획을 받아 hard → soft 순으로 평가하고 `severity` 와 `allowed` 를 산출한다.
- `operations/evaluateHardRules.ts` — `OUTCOME_METHOD_MISMATCH`, `SAMPLE_TOO_SMALL`, `EXPECTED_COUNT_LOW` 등 결정적 차단 규칙.
- `operations/evaluateSoftRules.ts` — 가정 아티팩트 대조(violated / unverified)와 대안 권고 수집.
- `operations/ruleset.ts` — 기법별 family·outcomeTypes·soft 가정 정의.

## Acceptance Criteria

### AC-hard-gate — 결정적 차단

- 가정이 충족된 정상 parametric 계획은 통과한다.
- outcome 과 기법이 어긋나면 두 모드 모두에서 차단한다.
- 그룹당 표본이 2 미만이면 차단한다.
- EPV 가 심각하게 낮은 Cox·로지스틱 모형은 차단한다.
- 기대빈도가 낮은 카이제곱은 차단한다.

### AC-soft-gate-mode — 모드별 soft 처리

- 같은 soft 위반이 interactive 에서는 경고와 함께 허용되고 auto 에서는 차단된다.
- 가정 아티팩트 부재는 `unverified` soft 경고로 처리된다.
- 미등록 기법은 두 모드 모두에서 soft 경고다.
- 가정이 위반된 등록 기법(gam 등)은 조용히 통과하지 않는다.

### AC-ruleset-meta-sync — 룰셋 동기화

- 룰셋의 모든 기법에 대응하는 읽을 수 있는 `meta.yaml` 이 존재한다.

### AC-domain-neutrality — 도메인 중립

- 공개 예시와 표본 변수명이 특정 응용 분야를 암시하지 않는다.
- 생존분석 외 비임상 use-case 번들이 최소 하나 함께 노출된다.

## Last Updated

2026-07-30 — hard/soft 게이트와 도메인 중립 계약을 문서화했다.
