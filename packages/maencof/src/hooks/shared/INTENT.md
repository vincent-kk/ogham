# shared

## Purpose

훅 공통 유틸리티. 경로 헬퍼, vault 검증, stdin/stdout 처리.

## Boundaries

### Always do

- 모든 훅에서 공유하는 상수/함수 제공
- MAENCOF_DIR/META_DIR 경로 상수

### Ask first

- 공유 함수 시그니처 변경

### Never do

- 훅 특화 로직 추가
