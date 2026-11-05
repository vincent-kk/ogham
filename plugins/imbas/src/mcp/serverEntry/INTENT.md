# serverEntry

## Purpose

MCP 서버 stdio 전송 진입점. esbuild 번들 엔트리.

## Conventions

기동 실패는 stderr와 실패 종료로 드러낸다. stdout 진단은 MCP 프레임을 깨뜨린다.

## Boundaries

### Always do

- server 모듈의 startServer()만 호출

### Ask first

- 전송 방식 변경

### Never do

- 비즈니스 로직 직접 구현
