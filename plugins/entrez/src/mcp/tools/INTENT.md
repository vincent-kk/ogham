## Purpose

MCP 도구 5종(1도구 1디렉토리). core/adapters를 얇게 오케스트레이션하는 결정론 계약 레이어. setup은 Phase 6(web UI)에서 추가.

## Structure

| 디렉토리         | 도구                                          |
| ---------------- | --------------------------------------------- |
| `paperSearch/`   | `paper_search` (+ async start/status/results) |
| `meshLookup/`    | `mesh_lookup`                                 |
| `fetchFulltext/` | `fetch_fulltext`                              |
| `authCheck/`     | `auth_check`                                  |
| `setup/`         | `setup`                                       |

## Conventions

- 핸들러는 `buildToolContext()`로 ctx 조립 후 run 함수 호출. `wrapHandler` 래핑.
- 입력 검증은 `types/tool.ts`의 zod 스키마(registerTool inputSchema 재사용).

## Boundaries

### Always do

- 도구는 core/adapters를 호출만 — 도메인 하드 규칙은 core 소관.
- annotations(readOnly·idempotent·destructive)를 정확히 표기.

### Ask first

- 새 도구 추가, 도구 I/O 계약 변경.

### Never do

- 핸들러에서 `fetch` 직접 호출. api_key 노출.

## Dependencies

- `../shared` (buildToolContext·wrapHandler) · `../../core` · `../../adapters/eutils`
- `../../types/tool` · `../../constants`
