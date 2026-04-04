# index-invalidator

## Purpose

PostToolUse 훅. 쓰기 도구 사용 후 인덱스 무효화 표시.

## Boundaries

### Always do

- shared.ts 유틸리티 사용
- advisory 메시지로 리빌드 안내

### Ask first

- 무효화 조건 변경

### Never do

- 인덱스 직접 삭제
