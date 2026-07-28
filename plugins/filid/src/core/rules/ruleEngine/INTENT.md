# ruleEngine — Filid 1.0 FCA rule 평가

## Purpose

ProjectSnapshot의 문서, node, entry, boundary, DAG, verification과 legacy migration 증거로 정확히 15개 built-in rule을 평가한다.

## Structure

- `loadBuiltinRules.ts` — 15개 rule roster와 config override 결합
- `evaluateRules.ts` — project/node granularity와 scope orchestration
- `evaluateRule.ts` — 단일 rule 실행과 failure diagnostic
- `utils/` — 관심 증거별 순수 check organ

## Conventions

- tradeoff 우선순위: 1. violation/불확실성 보존 2. 결정론 3. 호환성
- project rule은 snapshot당 한 번, node rule은 대상 node마다 한 번 실행한다.

## Boundaries

### Always do

- built-in ID를 canonical 15개 집합과 일치
- thrown check와 unsupported evidence를 PASS가 아닌 finding으로 변환
- exemption/allowed scope를 portable path identity로 판정
- organ 대상 boundary는 소비자 위치로 판정하고 면책은 소유 프랙탈 DETAIL 선언에서만 인정
- external consumer가 사용할 수 있도록 named facade에서만 export
- legacy criteria ledger를 project당 한 번 판정하고 root DETAIL target을 안내

### Ask first

- rule ID, severity, scope 또는 granularity 변경
- config override/exempt semantics 변경

### Never do

- naming, code metric, coverage rule 재도입
- core에서 생태계 파일명·확장자·import 문법 해석
- legacy criteria ledger 자동 삭제 또는 자동 변환
- project rule을 node 수만큼 중복 평가

## Dependencies

- `../../projectSnapshot/`, `../documentValidator/`, `../../verification/`
