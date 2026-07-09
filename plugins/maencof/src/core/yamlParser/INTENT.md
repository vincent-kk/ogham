# yamlParser

## Purpose

YAML frontmatter 파싱 및 직렬화. 마크다운 문서 메타데이터 처리.

## Structure

- `index.ts` — 순수 barrel (공개 API: parseScalarValue/quoteYamlValue/parseYamlFrontmatter)
- `operations/` organ — 파싱/직렬화 함수 (함수 1개/파일, 외부 의존 없음)

## Boundaries

### Always do

- 순수 파싱 함수, 외부 의존 없음
- quoteYamlValue로 안전한 직렬화

### Ask first

- YAML 파싱 동작 변경

### Never do

- 외부 YAML 라이브러리 도입
