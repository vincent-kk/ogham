# companionBudget

## Purpose

companion-identity 정본의 매 턴/세션 렌더 길이를 측정하고 500자(turn) 예산을 게이트하며 brief↔detail 동기화를 검증하는 util. 렌더러와 동일 primitive(`renderIdentitySection`)로 측정해 측정↔렌더 드리프트를 차단한다. 렌더러·companionEdit·companionMigration·setup 스킬이 공유한다.

## Structure

- `index.ts` — 순수 barrel (공개 API: measure/assert(turn·session) + checkBriefSubsumption + 타입)
- `types/` organ — 공개 타입 (BudgetOffender/BudgetResult/BriefSubsumptionResult)
- `operations/` organ — 측정/게이트 (measure·codePointLength 공유 헬퍼 + measureTurnChars/measureSessionChars/assertTurnBudget/assertSessionBudget/checkBriefSubsumption, 함수 1개/파일)

## Boundaries

### Always do

- 렌더 길이는 `turnContext/renderIdentitySection`으로 측정 (직접 마크업 재구성 금지)
- 코드포인트 길이(`[...s].length`)로 계산 (서로게이트 안전)
- 예산 초과는 결과 객체로 반환 (throw 금지 — 저작 도구가 판단)

### Ask first

- 예산 상수(500/4000) 변경
- offenders 정렬/반환 계약 변경

### Never do

- 런타임 렌더 경로에서 컷 수행 (예산은 저작 게이트 전용)
- 파일 I/O · mcp/ · hooks/ 직접 의존
