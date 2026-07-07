# fractalNavigate -- 프랙탈 트리 탐색 도구

## Purpose

프랙탈 트리 탐색 도구.

## Conventions

- `classify`는 entries에서 대상 경로 항목을 우선 사용하되, 항목이 없고 경로가 실재하면 `INTENT.md`/`DETAIL.md` 존재를 파일시스템에서 직접 확인한다 (분류 우선순위 1·2 보존 — entries 누락이 organ 오판으로 이어지지 않도록)

## Boundaries

### Always do
- 변경 후 관련 테스트 업데이트

### Ask first
- 공개 API 시그니처 변경

### Never do
- 모듈 경계 외부 로직 인라인
