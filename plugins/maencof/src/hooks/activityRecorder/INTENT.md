# activityRecorder

## Purpose

PostToolUse 훅. write 도구 사용 기록을 활동 로그(NDJSON)에 append.

## Boundaries

### Always do

- TOOL_CATEGORY_MAP 기반 카테고리 분류
- activityLog 재사용 (`appendActivityEvent` + `buildToolDescription`)
- self-reference 경로(.maencof / .maencof-meta / changelog / 볼트 dailynotes)는 기록 제외

### Ask first

- 기록 포맷 변경

### Never do

- 기존 활동 로그 라인 수정/덮어쓰기
