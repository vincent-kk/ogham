# lifecycle

## Purpose

MCP server-process session lifecycle — the replacement for the removed SessionEnd hook. `bootSweep` is the guaranteed path (finalize the previous session's leftovers at boot); `registerShutdown` is the best-effort fast path (close this session precisely at exit). Every step is idempotent, so double execution (shutdown + next boot, or two concurrent sessions) is harmless.

## Structure

- `bootSweep.ts` — turn-context 폐기 → stale 세션 sweep(+digest) → personal-context prune → changelogDebt → archiveExpired → vaultCommitter(마지막)
- `registerShutdown.ts` — exit/SIGINT/SIGTERM 1회 등록; 동기 경량만 (turn-context + env session_id 정밀 마감·캐시 삭제)

## Conventions

- import 는 대상 fractal 의 **배럴(index.js) 경유** — MCP 서버 코드 규약(루트 CLAUDE.md: MCP 서버 코드는 배럴 경유가 정상). 완결 로직(changelogDebt·archiveExpired·vaultCommitter) 소유권은 hooks/utils, 서버 수명주기는 실행 트리거만 (결합 방향 유지, import 는 배럴). organ(`constants/`)만 concrete
- shutdown 은 async 금지 (SIGKILL grace ~400ms 실측; git 절단은 index.lock 잔존 위험)
- `CLAUDE_CODE_SESSION_ID` 는 미문서화 env — 있으면 정밀 경로, 없으면 조용히 skip (boot sweep 이 폴백)

## Boundaries

### Always do

- bootSweep 순서 불변식 유지 (vaultCommitter 마지막 — 앞 산출물이 커밋에 포함)
- 전 단계 실패 흡수 (`appendErrorLogSafe`) — 서버 부팅·종료를 절대 차단하지 않음

### Ask first

- sweep 임계(STALE_SESSION_THRESHOLD_MS)·순서 변경
- shutdown 에 관심사 추가

### Never do

- shutdown 경로에 async 작업·git spawn·모델 호출 추가
- boot sweep 을 await 하여 서버 기동 차단
