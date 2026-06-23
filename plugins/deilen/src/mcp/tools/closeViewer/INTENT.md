## Purpose

`close_viewer` 도구 핸들러. 세션을 닫고 대기 중인 long-poll resolver 를 정리하며, 서버 refcount 를 release(마지막 serving 세션이면 서버 즉시 회수)한다.

## Structure

| File             | Role                                                                   |
| ---------------- | ---------------------------------------------------------------------- |
| `closeViewer.ts` | 핸들러 — 세션 검증 → `closeResolver` → `closeSession` → 서버 `release` |
| `index.ts`       | barrel — `handleCloseViewer`, 입출력 타입                              |

## Conventions

- 세션은 `getSession` 으로 cwd 스코프 검증; 부재는 `unknown` throw
- `closeResolver` 로 대기 waiter 를 `closing` 으로 settle + buffer 비움 후 meta status `closed` 갱신
- `closeSession` 후 `getHttpServer()?.release(id)` — 마지막 serving 세션이면 서버 grace reap
- 반환은 `{ status: 'closed' }` 고정

## Boundaries

### Always do

- 세션 스코프(`project_hash`) 일치 확인
- resolver 정리 후 세션 상태 갱신

### Ask first

- 닫기 시 부수효과(예: 디스크 정리) 추가

### Never do

- 대기 resolver 를 settle 하지 않고 세션만 닫기
- 다른 cwd 세션 닫기 허용

## Dependencies

- `../../../core` (projectHash·sessionStore), `../../httpServer` (getHttpServer→release)
