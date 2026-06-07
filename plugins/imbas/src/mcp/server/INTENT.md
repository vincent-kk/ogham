# server

## Purpose
MCP 서버 생성 및 16개 도구 등록. registerTool 패턴 사용.

## Boundaries
### Always do
- 모든 도구 등록에 server.registerTool() 사용
### Ask first
- 새 도구 추가
### Never do
- server.tool() 4-arg 패턴으로 도구 등록
