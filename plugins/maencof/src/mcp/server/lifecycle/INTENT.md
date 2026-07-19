# lifecycle

## Purpose

MCP server-process session lifecycle — the replacement for the removed SessionEnd hook. `bootSweep` is the guaranteed path (finalize the previous session's leftovers at boot); `registerShutdown` is the best-effort fast path (close this session precisely at exit). Every step is idempotent, so double execution (shutdown + next boot, or two concurrent sessions) is harmless. `registerShutdown` delegates to the shared `@ogham/session-finalizer` runtime — a synchronous precise-close plus, on SIGINT/SIGTERM, a detached `--finalize` spawn that runs `finalizeSession` (bootSweep + one index rebuild) off the ~400ms grace window without waiting for the next boot; `bootSweep` stays the idempotent fallback.

## Structure

- `index.ts` — barrel (operations/ 재노출)
- `operations/bootSweep.ts` — turn-context 폐기 → stale 세션 sweep(+digest) → personal-context prune → changelogDebt → archiveExpired → vaultCommitter(마지막)
- `operations/registerShutdown.ts` — shared `@ogham/session-finalizer` 의 registerShutdownFinalizer 에 위임 (guard=isMaencofVault, 동기 onShutdown=turn-context+env session_id 정밀 마감·캐시 삭제, detached=true 로 SIGINT/SIGTERM 시 `--finalize` 스폰)
- `operations/finalizeSession.ts` — detached `--finalize` 자식 태스크: bootSweep 완결 후 handleKgBuild(증분) 1회로 최종 문서 상태를 인덱스에 반영 (정상 부팅의 vaultWalk→triggerBootRebuildIfStale 대체 — 자식엔 실행 중 서버 캐시 없음)

## Conventions

- import 는 대상 fractal 의 **배럴(index.js) 경유** — MCP 서버 코드 규약(루트 CLAUDE.md: MCP 서버 코드는 배럴 경유가 정상). 완결 로직(changelogDebt·archiveExpired·vaultCommitter) 소유권은 hooks/utils, 서버 수명주기는 실행 트리거만 (결합 방향 유지, import 는 배럴). organ(`constants/`)만 concrete
- shutdown 은 async 금지 (SIGKILL grace ~400ms 실측; git 절단은 index.lock 잔존 위험)
- 무거운 완결은 shutdown 인라인 대신 detached `node <mcp-server> --finalize <vault>` 스폰으로 grace 밖 위임 — git 은 자식에서만, 부모 shutdown 은 여전히 동기·no-git
- `CLAUDE_CODE_SESSION_ID` 는 미문서화 env — 있으면 정밀 경로, 없으면 조용히 skip (boot sweep 이 폴백)

## Boundaries

### Always do

- bootSweep 순서 불변식 유지 (vaultCommitter 마지막 — 앞 산출물이 커밋에 포함)
- 전 단계 실패 흡수 (`appendErrorLogSafe`) — 서버 부팅·종료를 절대 차단하지 않음

### Ask first

- sweep 임계(STALE_SESSION_THRESHOLD_MS)·순서 변경
- shutdown 에 관심사 추가

### Never do

- shutdown 핸들러에서 직접 async·git 실행·모델 호출 (detached `--finalize` 스폰은 예외 — 자식이 off-grace 처리)
- boot sweep 을 await 하여 서버 기동 차단
