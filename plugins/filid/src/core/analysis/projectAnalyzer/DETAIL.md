# projectAnalyzer Contract

## Requirements

- `analyzeProject`는 설정을 읽고 하나의 `ProjectSnapshot`을 만든 뒤 모든 분석 단계에 전달한다.
- report는 snapshot, 구조 validation, drift, adapter/verification 진단과 health score를 함께 보존한다.
- 같은 실행 안에서 tree, dependency graph, verification 증거를 독립적으로 다시 scan하지 않는다.
- 분석 단계가 실패하거나 불확실하면 원인을 report에서 확인할 수 있어야 한다.
- 구조 `maxDepth`는 허용 한계이지 snapshot traversal cap이 아니며, 한계를
  넘는 실제 node를 validation evidence에 포함한다.

## API Contracts

- `analyzeProject(projectRoot, options?)`는 `Promise<AnalysisReport>`를 반환한다.
- `AnalysisReport.snapshot`은 report의 모든 구조 판단이 참조한 snapshot이다.
- 렌더러는 report 값을 표현할 뿐 live filesystem이나 config를 읽지 않는다.
- `calculateHealthScore`의 기존 점수 범위와 가중치 계약은 유지한다.

## Acceptance Criteria

### AC-analysis-consistency — 동일 snapshot

- scan, validation, drift 결과가 한 snapshot hash를 공유한다.
- content가 바뀌면 다음 분석 snapshot hash가 달라진다.

### AC-analysis-evidence — 실패 보존

- adapter, dependency, verification의 unsupported 또는 indeterminate 진단이 report에서 사라지지 않는다.
- 분석 예외가 빈 module 결과나 PASS로 축소되지 않는다.
- configured max depth 아래에서 scan을 자르지 않고 초과 node를 보고한다.

## Last Updated

2026-07-27
