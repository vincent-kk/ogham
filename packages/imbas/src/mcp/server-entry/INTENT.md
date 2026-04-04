# server-entry

## Purpose
MCP 서버 stdio 전송 진입점. esbuild 번들 엔트리.

## Boundaries
### Always do
- server 모듈의 startServer()만 호출
### Ask first
- 전송 방식 변경
### Never do
- 비즈니스 로직 직접 구현
