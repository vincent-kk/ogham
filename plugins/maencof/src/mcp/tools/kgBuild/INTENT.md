# kgBuild

## Purpose

지식 그래프 빌드 도구. 전체/증분 빌드 지원.

## Conventions

서고는 그래프 스냅샷 밖이므로 무변경 빌드에도 열거 인덱스를 다시 스캔한다.

## Boundaries

### Always do

- 개별 파싱 실패는 격리하고 응답 실패 목록에 상한 적용

### Ask first

- 입출력 스키마 변경

### Never do

- 파일 I/O 직접 수행 (core 위임 정책)
