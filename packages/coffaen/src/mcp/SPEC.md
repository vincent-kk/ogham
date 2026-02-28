# mcp SPEC

## Purpose
MCP 서버 구현. 10개 도구를 stdio 전송으로 제공.

## Tools
- CRUD: coffaen_create, coffaen_read, coffaen_update, coffaen_delete, coffaen_move
- Graph: kg_build, kg_search, kg_navigate, kg_context, kg_status

## Invariants
- 모든 도구 입력은 Zod 스키마 검증 필수
- 그래프 캐시는 coffaen_create/update/delete/move 후 무효화
- server-entry.ts는 esbuild 번들 진입점으로 수정 금지
