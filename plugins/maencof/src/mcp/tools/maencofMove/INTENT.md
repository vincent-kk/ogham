# maencofMove

## Purpose

지식 문서 이동 도구. 레이어 간 문서 재배치.

## Conventions

대상 디렉터리는 실명과 맞아야 하므로 정규화하지 않고 검증한다.

## Boundaries

### Always do

- 대상 쓰기 성공 뒤 소스 삭제; 양쪽 vault 봉쇄와 L1 보호 유지

### Ask first

- 입출력 스키마 변경

### Never do

- 파일 I/O 직접 수행 또는 전체 배치 원자성·backlink 수리를 보장한다고 주장
