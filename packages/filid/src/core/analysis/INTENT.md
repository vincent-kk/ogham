# analysis -- 프로젝트 분석 파이프라인

## Purpose

프로젝트 전체 분석을 오케스트레이션하는 sub-fractal. 스캔/검증/드리프트 결과를 종합해 `AnalysisReport`와 건강도 점수를 산출하고, 의존성 DAG와 LCA 계산으로 공유 코드 배치 위치를 제안한다.

## Structure

| 모듈 | 역할 |
|------|------|
| `project-analyzer` | `scan → validate → drift → healthScore → render` 파이프라인. text/json/markdown 리포트 생성 |
| `dependency-graph` | `DependencyEdge[]`에서 DAG 구축, Kahn 위상 정렬, DFS 사이클 감지, 직접 의존 조회 |
| `lca-calculator` | 두 노드의 Lowest Common Ancestor 계산. 공유 모듈 배치 위치 제안 (`getModulePlacement`) |

## Conventions

- 분석 결과는 `types/report.ts`의 타입 객체로만 반환 (string 직접 조립 금지)
- 건강도 상수는 `constants/health-score.ts`에서만 import
- `project-analyzer`는 순수 오케스트레이터 — 알고리즘 구현은 하위 모듈에 위임
- 사이클 감지 실패 시 null/빈 배열 반환, 예외로 던지지 않음

## Boundaries

### Always do

- 파이프라인 단계 추가 시 `AnalysisReport` 타입과 `calculateHealthScore` 가중치를 함께 갱신
- 분석 함수 변경 후 `__tests__/unit/core/analysis/` 테스트 갱신

### Ask first

- 건강도 가중치 변경 (`HEALTH_BASE_SCORE`, `*_PENALTY`, `*_CAP`)
- LCA 알고리즘을 naive traversal에서 Tarjan/Euler tour로 교체

### Never do

- `mcp/`, `hooks/` 등 상위 계층 직접 import
- 리포트 content 문자열을 타입 없이 raw JSON으로 덤프

## Dependencies

- `../tree/` (스캔), `../rules/` (검증·드리프트), `../module/` (모듈 분석), `../../types/`, `../../constants/health-score.js`
