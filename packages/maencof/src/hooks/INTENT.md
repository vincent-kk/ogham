# hooks

## Purpose

Claude Code 훅 이벤트 핸들러. 세션 시작/종료, 도구 사용 전후 처리.

## Boundaries

### Always do

- shared.ts 유틸리티 함수 사용
- 각 훅은 독립 entry 파일 보유
- config-registry에 설정 등록

### Ask first

- 새 훅 추가 시 build-hooks.mjs 업데이트 필요
- entry 파일 구조 변경

### Never do

- core/ 모듈 직접 수정
- 훅 간 순환 의존
