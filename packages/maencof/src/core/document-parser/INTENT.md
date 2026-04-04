# document-parser

## Purpose

마크다운 문서 파싱. frontmatter 추출, 링크 파싱, KnowledgeNode 구축.

## Boundaries

### Always do

- yaml-parser 재사용
- FrontmatterSchema 검증
- wikilink/markdown link 모두 지원

### Ask first

- frontmatter 필수 필드 변경
- 링크 추출 패턴 변경

### Never do

- 파싱 중 파일 수정
