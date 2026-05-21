## Purpose

`sessions/<projectHash>/<sessionId>.json` CRUD + TTL 기반 prune. `sha256(cwd).slice(0,12)` project-hash 로 세션을 격리하여 다른 프로젝트의 세션을 참조·오염하지 않음.

## Structure

| 파일                         | 역할                                                                   |
| ---------------------------- | ---------------------------------------------------------------------- |
| `createSession.ts`           | 디렉토리 생성 + `SessionMeta` 초기화 + `atomicWrite`                   |
| `getSession.ts`              | `projectHash` 일치 시만 반환; 불일치 시 `null`                         |
| `updateSession.ts`           | `turn_count` 증가 + `last_used_at` 갱신 + `atomicWrite`                |
| `pruneExpired.ts`            | TTL 초과 항목 삭제; cogair 생성 디렉토리만 대상                        |
| `utils/ensureProjectMeta.ts` | project-hash 디렉토리 존재 보장                                        |
| `index.ts`                   | barrel: `createSession`, `getSession`, `updateSession`, `pruneExpired` |

## Conventions

- 디스크 JSON 키는 snake_case (`session_id`, `project_hash`, `turn_count`, `last_used_at`)
- `getSession` 은 `projectHash` 불일치 시 항상 `null` — fallback 검색 금지
- TTL 기준은 `constants/defaults.ts` 의 `SESSION_TTL_MS` 단독 신뢰
- 모든 write 는 `atomicWrite` 경유; `sessionId` 는 `node:crypto` `randomUUID`

## Boundaries

### Always do

- `getSession` 은 `projectHash` 불일치 시 `null` 반환 (교차 프로젝트 검색 금지)
- `pruneExpired` 는 cogair 가 생성한 세션 파일·디렉토리만 삭제

### Ask first

- TTL 또는 prune 정책 변경 (`SESSION_TTL_MS` 조정 포함)
- `SessionMeta` 스키마 필드 추가·제거

### Never do

- 다른 `cwd` 세션 정정·수정·삭제
- cogair 가 만들지 않은 디렉토리 prune
- `atomicWrite` 우회하여 직접 `fs.writeFile` 호출

## Dependencies

- `node:fs/promises`, `node:path`
- `node:crypto` (`randomUUID`)
- `../../lib/atomicWrite`
- `../../constants/paths` (`SESSIONS_DIR`)
- `../../constants/defaults` (`SESSION_TTL_MS`)
- `../../types` (`SessionMeta`)
