## Purpose

deilen 의 영속·런타임 상태를 관리하는 core fractal. config 로드/저장, 렌더 세션(meta.json·viewer.md) 영속과 long-poll resolver 레지스트리(Phase 3), one-time token, project 스코프 해시를 담당한다. 디스크 루트는 `~/.claude/plugins/deilen/` ([constants/paths](../constants/paths.ts)).

## Structure

| Path             | Role                                                    |
| ---------------- | ------------------------------------------------------- |
| `configManager/` | `loadConfig` / `saveConfig` (organ)                     |
| `sessionStore/`  | 세션 영속 + pendingResolver 레지스트리(Phase 3) (organ) |
| `authToken/`     | one-time token 생성·검증 (organ)                        |
| `projectHash/`   | cwd → 12-hex 스코프 해시 (organ)                        |
| `feedbackStore/` | 피드백·이미지 영속 (Phase 3, organ)                     |
| `index.ts`       | barrel                                                  |

## Conventions

- 모든 디스크 쓰기는 `lib/atomicWrite` (temp → rename)
- 세션은 `project_hash` 스코프 — 다른 cwd 조회는 null(→ 도구는 `unknown`)
- 디스크 JSON 키는 snake_case (외부 인터페이스)

## Boundaries

### Always do

- 세션 조회 시 `project_hash` 일치 확인
- config 영속 전 `ConfigSchema` 검증

### Ask first

- 디스크 레이아웃(`constants/paths`) 변경
- `SessionMeta` 스키마 변경

### Never do

- 네트워크 I/O (core 는 디스크·메모리 순수 — HTTP 는 `mcp/httpServer`)
- pendingResolver 를 `settle()` 우회해 직접 resolve (Phase 3)

## Dependencies

- `../types`, `../constants`, `../lib`, `../utils`
- `node:crypto`, `node:fs/promises`
