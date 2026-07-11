## Purpose

`@ogham/session-finalizer` — MCP 서버 수명주기의 세션종료 완결을 위한 모노레포 내부 공유 런타임. maencof 레퍼런스(detached finalizer + boot-sweep 폴백)를 일반화한다. 두 형태 지원: Type C(동기 cleanup 만 — filid/imbas), Type P(동기 + detached 비동기 완결 — maencof). 소비처는 shutdown 등록·finalizer 디스패치를 재구현하지 않고 이 런타임을 경유한다.

## Structure

- `src/index.ts` — barrel (operations 재노출)
- `src/operations/registerShutdownFinalizer.ts` — exit/SIGINT/SIGTERM 1회 등록; exit→onShutdown(동기), signal→onShutdown+(detached면)spawnDetached+exit(0)
- `src/operations/runFinalizer.ts` — 서버 엔트리 디스패치; argv `<flag> <ctx>` 매치 시 task(ctx) 1회 후 exit(0), true 반환
- `src/constants/finalizeFlag.ts` — DEFAULT_FINALIZE_FLAG('--finalize'); 스폰측·디스패치측 공유 계약

## Conventions

- onShutdown 은 동기·경량만 (SIGKILL grace ~400ms 실측; git·async 절단은 index.lock 잔존 위험) — 무거운 완결은 detached finalizer 로 grace 밖 위임
- detached 스폰은 `@ogham/cross-platform/spawn` 의 spawnDetached 경유 (child_process 직접 금지)
- registerShutdownFinalizer 는 프로세스당 1회 (once 가드) — 이중 등록 무시
- runFinalizer 의 task 는 self-absorbing (내부 흡수, throw 금지) — exit(0) 은 항상 실행

## Boundaries

### Always do

- 모든 detached 스폰은 spawnDetached 경유 (fire-and-forget, no-throw)
- onShutdown 실패 흡수는 소비처 책임 — 런타임은 exit 경로를 차단하지 않음

### Ask first

- 시그널 목록(SIGINT/SIGTERM) 변경, exit 외 이벤트 추가
- 관리형(awaited) finalizer 등 새 실행 모드 추가

### Never do

- onShutdown 핸들러에서 async·git·모델 호출 (detached finalizer 스폰은 예외 — 자식이 off-grace 처리)
- child_process 직접 사용 (spawnDetached 경유)
- dist/ 커밋 (미추적, 로컬 재빌드만)

## Dependencies

- 내부: `@ogham/cross-platform/spawn` (spawnDetached).
