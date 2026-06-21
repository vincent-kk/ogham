# dailynoteRecorder

## Purpose

PostToolUse 훅. write 도구 사용 기록을 활동 로그(NDJSON)에 append.

## Boundaries

### Always do

- TOOL_CATEGORY_MAP 기반 카테고리 분류
- activityLog(`appendActivityEntry`)로 NDJSON append, 설명은 dailynoteWriter(`buildToolDescription`) 재사용

### Ask first

- 기록 포맷 변경

### Never do

- 기존 활동 로그 라인 수정
- 레거시 `dailynotes/*.md` 에 쓰기
