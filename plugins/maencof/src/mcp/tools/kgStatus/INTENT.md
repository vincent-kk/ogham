# kgStatus

## Purpose

지식 그래프 상태 조회 도구.

## Conventions

진단 조회는 자동 리빌드 없이 현재 캐시·디스크 상태를 보고한다.

## Boundaries

### Always do

- 진단용 적재 경로 사용; stale 메타정보는 이 진단 표면에 한정

### Ask first

- 입출력 스키마 변경

### Never do

- 파일 I/O 직접 수행 또는 진단 호출을 자동 리빌드 대기로 전환
