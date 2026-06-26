## Purpose

대량 검색 async job 레지스트리(디스크 영속). MCP 동기 타임아웃을 넘는 검색을 job으로 돌리고, 진행률·cursor 페이지네이션으로 결과를 조회한다.

## Structure

| 파일                        | 역할                                                          |
| --------------------------- | ------------------------------------------------------------- |
| `operations/createJob.ts`   | `createJob` — QUEUED 레코드 생성·0o600 기록                   |
| `operations/getJob.ts`      | `getJob` — id로 로드, 없으면 null                             |
| `operations/updateJob.ts`   | `updateJob` — 부분 패치·status 전이·updatedAt 갱신            |
| `operations/pollResults.ts` | `pollResults` — status/진행률 + `union.records` cursor 페이지 |

## Conventions

- 읽기·쓰기 모두 `JobRecordSchema`로 zod 검증. 기록은 항상 0o600.
- 경로(`path`)·시계(`nowMs`)·id는 주입 가능 — 결정적 테스트·재현용.
- `updatedAt`은 매 write마다 갱신, `jobId`는 기존 값으로 고정.

## Boundaries

### Always do

- write 전·read 후 스키마 검증. job 파일은 0o600 기록.
- 없는 job 접근은 null(getJob) 또는 `Messages.JOB_NOT_FOUND` throw.

### Ask first

- 레코드 포맷·저장 경로 변경(마이그레이션 영향), 페이지 기본 크기 변경.

### Never do

- adapters/mcp 직접 import(단방향: mcp → core). 인라인 문자열.
- 영속 레코드를 직접 변형(페이지네이션은 shallow-clone).

## Dependencies

- `../../types/{job,enums}` — `JobRecord`·`JobStatus`·`ErrorCode`
- `../../constants/{paths,defaults,messages}` — `jobPath`·`DEFAULT_BATCH_SIZE`·메시지
- `../../lib/fileIo` — `readJson`/`writeJson`
- `../../utils/{isoNow,randomId}` — 시계·id
