# markdownToWiki

## Purpose

Markdown 텍스트를 Jira Wiki Markup 문자열로 변환하는 순수 함수 모듈. Jira Server/DC v2 REST API의 본문 포맷으로 사용된다.

## Conventions

리터럴 이스케이프와 link·image 원문 보존을 구별해 링크 파싱 손상을 막는다.

## Boundaries

### Always do

- 빈 입력에 대해 빈 문자열을 반환한다
- 블록 파싱은 `../markdownParsing/`에 위임한다
- 알 수 없는 토큰은 throw 없이 raw text로 fallback 처리한다
- text·code·strong·em·strike 토큰의 wiki 특수문자(`[]{}|*_-+^~!`)를 `\`로 이스케이프한다 — 기존 `\X`는 통과, link/image 본문은 원문 유지 (`\` 이스케이프가 링크 파싱을 깨거나 alt에 노출됨)

### Ask first

- 새 Markdown 구문 지원 추가
- Jira Wiki Markup 매핑 규칙 변경

### Never do

- 인증·설정 기반 계층이나 MCP 계층에서 임포트하지 않는다
- HTTP 호출, 파일 I/O, 인증 로직을 포함하지 않는다
- Markdown 토큰화/파싱 로직을 이 모듈 내부에 직접 구현하지 않는다
