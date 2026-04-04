# server

## Purpose

MCP 서버 설정 및 도구 등록. stdio 전송으로 Claude Code와 통신.

## Boundaries

### Always do

- 모든 도구 핸들러를 tools/에서 import
- shared.ts의 toolResult/toolError 사용

### Ask first

- 새 도구 등록 시 스키마 정의 필요

### Never do

- 도구 로직을 server.ts에 직접 구현
