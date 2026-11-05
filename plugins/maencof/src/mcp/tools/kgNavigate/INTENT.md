# kgNavigate

## Purpose

지식 그래프 탐색 도구. 노드 이웃 및 연결 조회.

## Conventions

허브 응답 폭주를 막기 위해 이웃 목록과 siblings의 상한을 별도로 둔다.

## Boundaries

### Always do

- 절단 전 총수 보고; 전체 siblings는 명시적 opt-in만 허용

### Ask first

- 입출력 스키마 변경

### Never do

- 파일 I/O 직접 수행
