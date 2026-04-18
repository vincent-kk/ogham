# imbas-manifest-implement-plan

## Purpose
Stories + devplan 매니페스트를 로드해 DAG 기반 구현 일정(implement-plan)을 생성, 저장, 리포트 렌더링까지 수행하는 도구 핸들러.

## Boundaries
### Always do
- 비즈니스 로직은 core/implement-planner 위임
- 매니페스트 로드/저장은 core/manifest-parser, lib/file-io 경유
### Ask first
- inputSchema 변경
- 리포트 포맷 변경
### Never do
- 핸들러에 DAG 계산 로직 직접 구현
