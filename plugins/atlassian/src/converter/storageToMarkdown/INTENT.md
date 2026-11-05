# storageToMarkdown

## Purpose

Confluence Storage Format XHTML을 Markdown 텍스트로 변환하는 순수 함수 모듈. 자체 HTML 파서를 사용하며, 파싱 실패 시 태그 제거 폴백으로 안전하게 복원한다.

## Conventions

깨진 문서도 조회할 수 있도록 파싱 실패를 예외 대신 태그 제거 폴백으로 흡수한다.

## Boundaries

### Always do

- 파싱 오류 발생 시 `stripTagsFallback`으로 안전하게 폴백한다
- `ac:structured-macro`는 blockquote 형태로 표현한다
- 연속 3개 이상 개행을 2개로 정규화한다

### Ask first

- 외부 HTML 파싱 라이브러리(예: `node-html-parser`) 도입
- 새 Confluence 전용 태그(`ac:`, `ri:`) 처리 규칙 추가

### Never do

- 인증·설정 기반 계층이나 MCP 계층에서 임포트하지 않는다
- HTTP 호출, 파일 I/O, 인증 로직을 포함하지 않는다
- 파싱 실패를 예외로 전파하지 않는다 (반드시 폴백 처리)
