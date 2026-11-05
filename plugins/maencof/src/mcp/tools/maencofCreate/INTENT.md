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

- 경로 봉쇄와 frontmatter 검증을 거치지 않고 문서를 생성 — 파일 쓰기의 경계에서 vault 밖 쓰기와 무효 문서 저장을 막는다
