# kgSearch

## Purpose

지식 그래프 검색 도구. 시드 기반 확산 활성화 검색.

## Boundaries

### Always do

- 입력 Zod 스키마 검증
- core/ 모듈에 로직 위임
- 응답은 참조 메타(path·title·tags·gist)가 기본 — hop 체인은 `include_trace`, 본문 전문은 `include_content` 옵션일 때만 싣는다. 쿼리 엔진의 `ActivationResult` 는 불변이고 메타 매핑은 핸들러 몫이다

### Ask first

- 입출력 스키마 변경

### Never do

- 파일 I/O 직접 수행 (core/ 위임)
