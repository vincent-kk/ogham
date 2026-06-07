# indexer

## Purpose

사전 계산된 메타데이터 영속화 및 증분 인덱싱. 캐시 기반 빌드 최적화.

## Boundaries

### Always do

- .maencof/ 디렉토리에 캐시 저장
- mtime 기반 변경 감지

### Ask first

- 캐시 파일 포맷 변경
- 증분 범위 계산 로직 변경

### Never do

- 캐시 디렉토리 외부 파일 접근
