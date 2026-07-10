# core

## Purpose

imbas 파이프라인의 비즈니스 로직 계층. .imbas/ 디렉토리의 상태·설정·매니페스트·캐시를 관리.

## Structure

- `paths/` — .imbas/ 경로 해석 (+ `utils/projectDirName.ts` ref→디렉토리 매핑)
- `runIdGenerator/` — YYYYMMDD-NNN 충돌 안전 ID 생성
- `stateManager/` — state.json CRUD + 전이 규칙 검증
- `configManager/` — config.json dot-path 접근
- `cacheManager/` — provider 메타데이터 캐시 + TTL
- `manifestParser/` — 매니페스트 로드 + 요약
- `manifestValidator/` — 스키마 + 참조 무결성 검증
- `executionPlanner/` — devplan 실행 계획 필터링
- `implementPlanner/` — DAG 기반 구현 배치 계획 (Kahn topo, DETAIL.md 보유)
- `utils/` — 상태 전이 헬퍼 organ (advancePhase, handleCompletePhase 등)

## Boundaries

### Always do

- 모든 파일 I/O는 lib/fileIo.ts 경유
- 상태 전이는 skills/\*/references/state-transitions.md 규칙 준수

### Ask first

- 전이 규칙 변경
- 새 캐시 타입 추가

### Never do

- 직접 fs.writeFileSync 호출 (atomic write 우회)
- Jira API 직접 호출 (Atlassian MCP 도구 경유만 허용)
