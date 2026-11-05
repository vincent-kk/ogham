# kgSearch

## Purpose

지식 그래프 검색 도구. 시드 기반 확산 활성화 검색.

## Conventions

엔진 ActivationResult는 불변이며 응답 메타 매핑만 이 도구가 소유한다.

## Boundaries

### Always do

- 참조 메타를 기본으로 두고 trace·본문은 opt-in; 필터는 절단 전에 적용

### Ask first

- 입출력 스키마 변경

### Never do

- 파일 I/O 직접 수행 또는 클러스터 확장으로 결과 랭킹 변경
