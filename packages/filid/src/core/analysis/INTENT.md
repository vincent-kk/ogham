# analysis -- 프로젝트 분석 모듈

## Purpose

프로젝트 전체 분석, 의존성 그래프 구축, LCA(최소 공통 조상) 계산을 수행한다.

## Structure

| 모듈 | 역할 |
|------|------|
| `project-analyzer` | 프로젝트 분석 및 리포트 생성 |
| `dependency-graph` | DAG 구축, 순환 감지, 위상 정렬 |
| `lca-calculator` | 모듈 배치를 위한 LCA 계산 |

## Boundaries

### Always do
- 분석 결과는 타입 안전한 리포트 객체로 반환

### Ask first
- 분석 파이프라인 순서 변경

### Never do
- `mcp/`, `hooks/` 모듈 직접 import

## Dependencies
- `../tree/`, `../rules/`, `../module/`, `../../types/`
