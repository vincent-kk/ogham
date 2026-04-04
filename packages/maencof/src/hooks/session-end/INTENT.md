# session-end

## Purpose

세션 종료 훅. 일일 노트 종료 기록 및 세션 캐시 정리.

## Boundaries

### Always do

- dailynote-writer로 종료 항목 추가
- cache-manager로 세션 파일 삭제

### Ask first

- 종료 기록 포맷 변경

### Never do

- 볼트 데이터 삭제
