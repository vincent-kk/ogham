# yamlParser

## Purpose

YAML frontmatter 파싱 및 직렬화. 마크다운 문서 메타데이터 처리.

## Conventions

훅 번들 크기 때문에 외부 YAML 런타임을 추가하지 않는다. 배열과 스칼라가 같은 해석 경로를 거쳐 직렬화 왕복의 드리프트를 막는다.

## Boundaries

### Always do

- 순수 파싱 함수, 외부 의존 없음
- quoteYamlValue로 안전한 직렬화

### Ask first

- YAML 파싱 동작 변경

### Never do

- 외부 YAML 라이브러리 도입
