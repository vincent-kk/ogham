# maencofUpdate

## Purpose

지식 문서 수정 도구. L1 보호, 중복 제거 포함.

## Conventions

metadata 쓰기를 update로 통합해 L1 게이트와 쓰기 전 검증이 복제되지 않게 한다.

## Boundaries

### Always do

- L1 3중 게이트·보호 unset·쓰기 직전 검증 유지

### Ask first

- 입출력 스키마 변경

### Never do

- 파일 I/O 직접 수행 또는 제외 사유 없이 metadata 쓰기 표면 축소
