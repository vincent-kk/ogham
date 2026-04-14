# server

## Purpose

MCP 서버 설정 및 도구 등록. stdio 전송으로 Claude Code와 통신.

## Structure

- `server.ts` — createServer 오케스트레이터 + startServer
- `graph-cache.ts` — 그래프 캐시 상태, mutex, load/invalidate
- `register-crud-tools.ts` — CRUD 6개 도구 등록
- `register-kg-tools.ts` — KG 7개 도구 등록
- `register-metadata-tools.ts` — CLAUDE.md/dailynote/cache 5개 도구 등록

## Boundaries

### Always do

- 도구 등록은 register-*.ts에 위임, server.ts는 오케스트레이션만
- 모든 도구 핸들러를 tools/ barrel에서 import
- shared의 toolResult/toolError 사용
- graph-cache.ts가 그래프 상태와 mutex를 단독 관리

### Ask first

- 새 도구 등록 시 해당 register-*.ts 파일과 Zod 스키마 정의 필요

### Never do

- 도구 로직을 server.ts 또는 register-*.ts에 직접 구현
- graph-cache.ts 외부에서 캐시 상태 직접 조작
