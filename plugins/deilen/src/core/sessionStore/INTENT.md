## Purpose

렌더 세션 영속(meta.json·report.md)과 long-poll resolver 레지스트리를 담당하는 모듈. 세션은 `project_hash` 로 스코프된다.

## Structure

| File                    | Role                                                         |
| ----------------------- | ------------------------------------------------------------ |
| `createSession.ts`      | report.md + meta.json 영속 (status `serving`)                |
| `getSession.ts`         | meta.json 로드, `project_hash` 스코프 검증, 불일치 시 `null` |
| `readReportMarkdown.ts` | report.md 원본 읽기, 부재 시 `null`                          |
| `pruneExpired.ts`       | `ttlHours` 초과 세션 디렉토리 제거, 제거 수 반환             |
| `closeSession.ts`       | meta.json status 를 `closed` 로 갱신                         |
| `feedbackResolver.ts`   | process-global long-poll 레지스트리 (멱등 `settle`)          |
| `index.ts`              | barrel                                                       |

## Conventions

- 디스크 쓰기는 모두 `lib/atomicWrite`; 디스크 JSON 키는 snake_case
- 세션 조회는 항상 `project_hash` 일치 확인 (다른 cwd 는 `null`)
- resolver 의 모든 해소 경로는 단일 멱등 `settle()` 통과 — timer·abort 리스너 항상 짝지어 해제

## Boundaries

### Always do

- 세션 조회 시 `project_hash` 일치 확인
- resolver 해소는 `settle()` 경유 (timer unref)

### Ask first

- `SessionMeta` 스키마 변경
- long-poll buffer/superseded 의미 변경

### Never do

- 네트워크 I/O (디스크·메모리 순수)
- resolver 를 `settle()` 우회해 직접 resolve

## Dependencies

- `../../types/session`, `../../types/feedback`, `../../constants`, `../../lib`, `../../utils`
- `node:fs/promises`
