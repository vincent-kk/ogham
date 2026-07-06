# mcp SPEC

## Purpose

MCP 서버 구현. 20개 도구를 stdio 전송으로 제공. vault 경로는 `MAENCOF_VAULT_PATH` 환경변수 또는 CWD에서 읽음.

## Tools (20)

| Group         | Tools                                                   |
| ------------- | ------------------------------------------------------- |
| CRUD (5)      | `create`, `read`, `update`, `delete`, `move`            |
| Insight (1)   | `capture_insight`                                       |
| Graph (5)     | kg_search, kg_navigate, kg_context, kg_status, kg_build |
| Boundary (1)  | boundary_create                                         |
| Link (1)      | kg_suggest_links                                        |
| INTENT.md (3) | claudemd_merge, claudemd_read, claudemd_remove          |
| Companion (1) | companion_edit                                          |
| Activity (1)  | activity_read                                           |
| Work hist (1) | work_history                                            |
| Cache (1)     | context_cache_manage                                    |

## Graph Cache

- `ensureFreshGraph`: read-path 자동 증분 리빌드 (stale 노드 감지 시)
- `loadGraphIfNeeded`: kg_status 전용 (진단 도구, 자동 리빌드 없음)
- 캐시 무효화 트리거: `create`/`update`/`delete`/`move`, `capture_insight`, `boundary_create`, `kg_build`
- `companion_edit`는 KG 그래프와 무관하므로 캐시를 무효화하지 않는다(read 래퍼로 등록, preview 순수 유지)
- 리빌드 뮤텍스로 중복 동시 리빌드 방지

## Security

- `~/.claude`, `~/.config` 경로 접근 차단 (BLOCKED_PREFIXES)

## Invariants

- 모든 도구 입력은 Zod 스키마 검증 필수
- 도구 핸들러는 파일 I/O를 직접 수행하지 않고 core/ 모듈에 위임
- serverEntry.ts는 esbuild 번들 진입점 — startServer 전 `runCompanionMigration` 1회(best-effort, 멱등)만 허용하고 서버 로직은 추가 금지

> 도구별 출력 계약(rendering convention 포함)은 각 tool 디렉토리의 DETAIL.md에 둔다 (예: `tools/activityRead/DETAIL.md`).
