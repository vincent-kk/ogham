# project-analyzer -- 분석 파이프라인 오케스트레이터

## Purpose

프로젝트 루트에서 `scan → validate → drift → healthScore → render` 파이프라인을 실행하고 `AnalysisReport`를 생성한다. text/json/markdown 세 가지 출력 형식을 지원한다.

## Structure

- `project-analyzer.ts` — `analyzeProject`, `calculateHealthScore`, `generateReport`, `renderTextReport`, `renderMarkdownReport`

## Conventions

- `analyzeProject`는 오케스트레이션만 담당하고 알고리즘은 `tree/`, `rules/`, `module/`에 위임
- 모듈 분석은 `Promise.allSettled`로 실패 허용 (rejected 결과는 드롭)
- 건강도 점수는 0~100 범위로 `Math.max(0, score)` 클램프
- 페널티·가중치 상수는 `constants/health-score.ts`에서만 참조

## Boundaries

### Always do

- 파이프라인 단계 추가 시 `AnalysisReport`/`ScanReport`/`DriftReport` 타입 동시 갱신
- 렌더러 분기 추가 시 `format: 'text' | 'json' | 'markdown'` 유니온 확장

### Ask first

- `calculateHealthScore` 가중치 변경 (기본: error -5/-50, warning -2/-20, critical drift -10/-30, high drift -5/-20)
- 파이프라인 순서 변경 (scan은 항상 최초, healthScore는 항상 최후)

### Never do

- 렌더 content 문자열을 타입 없이 조립 (반드시 `RenderedReport` 반환)
- 분석 단계 중간 결과를 전역 상태로 캐싱

## Dependencies

- `../../tree/fractal-tree/` (scanProject)
- `../../rules/fractal-validator/`, `../../rules/drift-detector/`
- `../../module/module-main-analyzer/` (analyzeModule)
- `../../../types/report.js`, `../../../types/drift.js`, `../../../types/fractal.js`
- `../../../constants/health-score.js`
