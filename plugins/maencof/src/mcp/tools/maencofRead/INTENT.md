# maencofRead

## Purpose

지식 문서 읽기 도구. frontmatter 파싱 포함.

## Boundaries

### Always do

- 입력 Zod 스키마 검증
- core/ 모듈에 로직 위임
- 응답은 `content`(전문) + `node` 메타만 — SA 관련 문서 확장은 `kg_search`/`kg_context` 소관이라 read 는 `depth`/`include_related` 를 받지 않는다

### Ask first

- 입출력 스키마 변경

### Never do

- 파일 I/O 직접 수행 (core/ 위임)
