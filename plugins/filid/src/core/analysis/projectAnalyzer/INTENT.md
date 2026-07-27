# projectAnalyzer -- snapshot 분석 파이프라인

## Purpose

프로젝트 설정에서 하나의 `ProjectSnapshot`을 만들고 검증, drift, health score, report 생성을 순서대로 조합한다.

## Structure

- `analyzeProject.ts` — snapshot 생성부터 report까지 오케스트레이션한다.
- `calculateHealthScore.ts` — finding과 drift의 건강도 점수를 계산한다.
- `renderers/` organ — text, JSON, Markdown 출력을 렌더링한다.
- entry point는 `index.ts`이며 `projectAnalyzer.ts`는 호환 facade다.

## Conventions

- tradeoff 우선순위는 1. 동일 snapshot 증거 2. 진단 보존 3. 출력 호환이다.
- 알고리즘은 snapshot, tree, rules, drift 모듈에 위임한다.
- 중간 단계 실패를 조용히 드롭하지 않고 report 진단으로 보존한다.

## Boundaries

### Always do

- scan, validate, drift가 같은 snapshot과 hash를 참조하게 한다.
- 파이프라인 결과를 `AnalysisReport` 타입에 명시적으로 포함한다.
- health score는 모든 구조 finding이 모인 뒤 계산한다.

### Ask first

- 파이프라인 단계 순서나 health score 가중치를 변경한다.
- report 공개 포맷 유니온을 확장한다.

### Never do

- 단계별로 프로젝트를 다시 scan해 서로 다른 시점의 증거를 섞는다.
- rejected 분석을 PASS 또는 빈 결과로 바꾼다.
- 중간 결과를 전역 상태에 캐시한다.

## Dependencies

- `../../projectSnapshot/`
- `../../rules/fractalValidator/`, `../../rules/driftDetector/`
- `../../infra/configLoader/`
- `../../../types/`
