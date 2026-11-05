# kgContext

## Purpose

지식 그래프 컨텍스트 조회 도구. 쿼리 기반 스니펫 조합.

## Conventions

후보 선정은 평가 하네스와 공유하는 단일 경로를 유지한다.

## Boundaries

### Always do

- 선정 전에 필터 적용; 스니펫을 포함한 최종 context를 토큰 예산에 계상

### Ask first

- 입출력 스키마 변경

### Never do

- 파일 I/O 직접 수행 또는 투기적 bigram을 미해석 사용자 단어로 보고
