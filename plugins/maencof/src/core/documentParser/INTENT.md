# documentParser

## Purpose

마크다운 문서 파싱. frontmatter 추출, 링크 파싱, KnowledgeNode 구축.

## Structure

- `index.ts` — 순수 barrel (공개 API: extractFrontmatter/extractLinks/parseDocument/buildKnowledgeNode/inferSubLayerFromPath/parseDocumentFromFile + yamlParser 재노출 + 타입)
- `types/` organ — 공개 타입 (MarkdownLink/ParsedDocument/NodeBuildResult)
- `operations/` organ — 파싱/구축 함수 (함수 1개/파일; extractHeadingTitle 은 buildKnowledgeNode 인라인 private)

## Boundaries

### Always do

- yamlParser 재사용
- FrontmatterSchema 검증
- wikilink/markdown link 모두 지원
- 레이어 경로 게이트를 통과한 문서만 KnowledgeNode 로 구축 (게이트 밖 경로는 기본 거부)

### Ask first

- frontmatter 필수 필드 변경
- 링크 추출 패턴 변경

### Never do

- 파싱 중 파일 수정
- 그래프 편입 경로에서 allowNonLayerPath 옵트아웃 사용 (frontmatter 검증 전용 소비자에게만 허용)
