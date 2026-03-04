# mcp SPEC

## Purpose
MCP 서버 구현. 17개 도구를 stdio 전송으로 제공. vault 경로는 `MAENCOF_VAULT_PATH` 환경변수 또는 CWD에서 읽음.

## Tools (17)

| Group | Tools |
|-------|-------|
| CRUD (5) | maencof_create, maencof_read, maencof_update, maencof_delete, maencof_move |
| Insight (1) | maencof_capture_insight |
| Graph (5) | kg_search, kg_navigate, kg_context, kg_status, kg_build |
| Boundary (1) | boundary_create |
| Link (1) | kg_suggest_links |
| CLAUDE.md (3) | claudemd_merge, claudemd_read, claudemd_remove |
| Dailynote (1) | dailynote_read |

## Graph Cache

- `ensureFreshGraph`: read-path 자동 증분 리빌드 (stale 노드 감지 시)
- `loadGraphIfNeeded`: kg_status 전용 (진단 도구, 자동 리빌드 없음)
- 캐시 무효화 트리거: maencof_create/update/delete/move, maencof_capture_insight, boundary_create, kg_build
- 리빌드 뮤텍스로 중복 동시 리빌드 방지

## Security

- `~/.claude`, `~/.config` 경로 접근 차단 (BLOCKED_PREFIXES)

## Invariants
- 모든 도구 입력은 Zod 스키마 검증 필수
- 도구 핸들러는 파일 I/O를 직접 수행하지 않고 core/ 모듈에 위임
- server-entry.ts는 esbuild 번들 진입점으로 수정 금지
