# cross-platform source contract

## Requirements

- `index.ts`는 공개 표면을 한곳에서 열거하고 내부 구현과 분리하기 위해 선언 구현 없이 이름 있는 재노출만 유지한다.
- 환경, 경로, EOL, 프로세스 및 shim API는 Windows와 POSIX의 차이를 보존하거나 정규화하고 필요한 차이는 명시적 옵션으로 드러낸다.
- 프로세스 실행은 timeout, abort, spawn 실패를 결과로 구분하고 Windows shim 쓰기 오류는 예외로 전파한다.

## API Contracts

- 일반 라이브러리 소비자는 패키지 루트에서 공개 심볼을 가져오며, 새 심볼은 wildcard가 아닌 명시적 재노출로 추가한다.

## Acceptance Criteria

### CP-SRC-BOUNDARY — 루트 공개 경계

- 루트 진입점에는 선언 구현이나 wildcard export가 없다.
- 별도 실행 진입점을 제외한 라이브러리 소비자는 구현 파일 대신 패키지 루트 경계를 사용한다.

### CP-SRC-PORTABILITY — 플랫폼 중립 결과

- 플랫폼 전용 시스템 호출은 해당 어댑터 내부에 머문다.

## Last Updated

공개 소스 경계·플랫폼 호환성 또는 프로세스 실패 보장의 범위가 바뀔 때 갱신한다.
