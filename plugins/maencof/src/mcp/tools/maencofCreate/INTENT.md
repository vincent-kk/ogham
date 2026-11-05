# maencofCreate

## Purpose

지식 문서 생성 도구. 레이어/서브레이어 기반 경로 결정.

## Conventions

평면 레이어·서브레이어 경로의 정본은 아키텍처 상수이며 쓰기도 같은 규칙을 따라야 한다.

## Boundaries

### Always do

- 파일명 슬러그는 sanitizeSegment에 위임; 읽기와 같은 frontmatter 게이트로 쓰기 전 검증

### Ask first

- 입출력 스키마 변경

### Never do

- 파일 I/O 직접 수행 (core 위임 정책)
