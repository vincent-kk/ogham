# cross-platform source contract

## Requirements

- `index.ts`는 공개 표면을 한곳에서 열거하고 내부 구현과 분리하기 위해 선언 구현 없이 이름 있는 재노출만 유지한다.
- 환경, 경로, EOL, 프로세스 및 shim API는 Windows와 POSIX의 차이를 보존하거나 정규화하고 필요한 차이는 명시적 옵션으로 드러낸다.
- 프로세스 실행은 timeout, abort, spawn 실패를 결과로 구분하고 Windows shim 쓰기 오류는 예외로 전파한다.

## API Contracts

- 일반 라이브러리 소비자는 패키지 루트에서 공개 심볼을 가져오며, 새 심볼은 wildcard가 아닌 명시적 재노출로 추가한다.
- `env`는 홈 디렉터리 fallback과 현재 OS의 경로 구분자 및 EOL을 일관되게 제공한다.
- `normalizeEol()`은 선두 BOM과 CRLF만 정규화하며 단독 CR은 보존한다. `spawnCli()`는 별도 요청이 없으면 stdout과 stderr에 이 규칙을 적용한다.
- `spawnCli()`는 종료 코드, 출력, spawn 오류, wall/idle timeout, 호출자 abort를 구분 가능한 결과로 반환하고 출력 상한을 넘으면 마지막 부분을 보존한다.
- Windows command shim은 자신의 디렉터리를 기준으로 Node와 script를 실행하고 모든 호출 인자를 전달하며, 파일시스템 오류는 호출자에게 전파한다.

## Acceptance Criteria

### CP-SRC-BOUNDARY — 루트 공개 경계

- 루트 진입점에는 선언 구현이나 wildcard export가 없다.
- 별도 실행 진입점을 제외한 라이브러리 소비자는 구현 파일 대신 패키지 루트 경계를 사용한다.

### CP-SRC-PORTABILITY — 플랫폼 중립 결과

- 환경, EOL, portable path, Windows shim 동작은 지원 OS의 표현 차이를 보존하거나 정규화한다.
- 플랫폼 전용 시스템 호출은 해당 어댑터 내부에 머문다.

### CP-SRC-PROCESS — 프로세스 실패 신호

- 정상 종료, spawn 실패, wall/idle timeout, 호출자 abort를 서로 구별할 수 있다.
- 기본 출력 정규화와 출력 상한 동작은 플랫폼에 관계없이 같은 결과 형태를 유지한다.

## Last Updated

2026-08-23 — 실제 공개 진입점과 대표 구현을 기준으로 소스 루트 계약을 기록했다.
