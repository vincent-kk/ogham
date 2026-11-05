# maencofRead

## Purpose

지식 문서 읽기 도구. frontmatter 파싱 포함.

## Conventions

읽을 수 있는 문서의 범위와 그래프 편입 자격은 다르므로 레이어 밖 경로도 검증해서 읽는다.

## Boundaries

### Always do

- 원문과 노드 메타 반환; 파싱 실패에도 원문 보존

### Ask first

- 입출력 스키마 변경

### Never do

- 파일 I/O 직접 수행 또는 SA 관련 문서 확장을 읽기에 추가
