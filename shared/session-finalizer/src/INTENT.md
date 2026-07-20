# session-finalizer

## Purpose

이 디렉터리는 `@ogham/session-finalizer` 패키지의 구현 루트(`src/`)이다. 패키지 공개 계약(런타임 목적·Type C/Type P 구분)은 상위 `../INTENT.md` 참조 — 여기서는 barrel·operations·constants 의 내부 배치만 다룬다.

## Structure

- `index.ts` — barrel: `registerShutdownFinalizer`, `ShutdownFinalizerOptions`(type), `runFinalizer` 재노출
- `operations/registerShutdownFinalizer.ts` — exit/SIGINT/SIGTERM 1회 등록; 모듈 스코프 `registered`(중복 등록 가드)·`ran`(onShutdown 1회 가드) 로 once 보장
- `operations/runFinalizer.ts` — argv `<flag> <ctx>` 매치 시 task(ctx) 디스패치; `Promise.resolve().finally(exit(0))` + try/catch 로 동기 throw 에도 exit(0) 보장
- `constants/finalizeFlag.ts` — `DEFAULT_FINALIZE_FLAG` 단일 상수; 스폰측(registerShutdownFinalizer)·디스패치측(runFinalizer) 계약 공유
- `__tests__/` — `registerShutdownFinalizer.test.ts`, `runFinalizer.test.ts` (organ, 문서화 대상 아님)

## Conventions

- `operations/` 파일은 1함수/파일(one-function-per-file) 원칙 준수
- once 보장은 모듈 스코프 변수(`registered`, `ran`)로 구현 — 클래스·싱글턴 객체 도입 금지
- `operations/` → `constants/` 는 상대경로 직접 import (배럴 우회)

## Boundaries

### Always do

- `index.ts` 는 `operations/`·`constants/` 재노출만 유지 (index-barrel-pattern)
- 새 operations 파일도 1함수/파일 패턴을 따름

### Ask first

- `registered`/`ran` 가드 로직 변경 (once 보장이 깨지면 소비처 쪽 중복 실행 위험)
- `constants/` 에 새 공유 상수 추가

### Never do

- `operations/` 에서 `child_process` 직접 사용 (`spawnDetached` 경유는 `registerShutdownFinalizer` 전담)
- `__tests__/` 에 INTENT.md 생성 (organ)

## Dependencies

- 내부: `constants/finalizeFlag.ts` (`operations/` → `constants/`)
- 외부: `@ogham/cross-platform/spawn` (`registerShutdownFinalizer` 만 사용)
