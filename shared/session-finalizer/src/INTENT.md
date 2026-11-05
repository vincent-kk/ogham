# session-finalizer

## Purpose

세션 종료 런타임의 공개 배럴과 종료 등록·디스패치 구현을 소유한다. 스폰측과 디스패치측은 같은 finalize flag를 공유해 자식이 정상 서버로 기동되는 것을 막는다.

## Conventions

- 패키지 외부 소비자는 `@ogham/session-finalizer` 루트만 import한다.
- `operations/` 파일은 1함수/파일(one-function-per-file) 원칙 준수
- once 보장은 모듈 스코프 등록 가드와 종료 실행 가드로 유지 — 클래스·싱글턴 객체 도입 금지
- `operations/` → `constants/` 는 상대경로 직접 import (배럴 우회)

## Boundaries

### Always do

- 공개 배럴은 종료 연산과 공유 상수의 재노출만 유지한다.
- 새 operations 파일도 1함수/파일 패턴을 따름

### Ask first

- `registered`/`ran` 가드 로직 변경 (once 보장이 깨지면 소비처 쪽 중복 실행 위험)
- `constants/` 에 새 공유 상수 추가

### Never do

- `operations/` 에서 `child_process` 직접 사용 (`spawnDetached` 경유는 `registerShutdownFinalizer` 전담)
- 검증 organ에 독립 경계 문서를 만들어 소유권을 오인하게 하지 않는다.
