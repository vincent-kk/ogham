# markdownToStorage

## Purpose

Markdown 텍스트를 Confluence Storage Format XHTML 문자열로 변환하는 순수 함수 모듈. 코드 블록은 `ac:structured-macro`, 이미지는 `ac:image` 태그로 출력한다.

## Conventions

Confluence가 저장 후 렌더할 수 있는 매크로 형태와 XML 이스케이프를 함께 유지한다.

## Boundaries

### Always do

- XML 특수문자(`&`, `<`, `>`, `"`)를 항상 이스케이프 처리한다
- 코드 블록은 `ac:structured-macro` + `CDATA` 래퍼로 출력한다
- 블록 파싱은 `../markdownParsing/`에 위임한다

### Ask first

- 새 Confluence 매크로 타입 지원 추가
- Storage Format 스키마 버전 변경

### Never do

- 인증·설정 기반 계층이나 MCP 계층에서 임포트하지 않는다
- HTTP 호출, 파일 I/O, 인증 로직을 포함하지 않는다
- XML 이스케이프를 생략하거나 우회하지 않는다
