# hooks — Contract

## Requirements

- 호스트 훅의 실행 경계를 소유하며 이벤트별 진입을 호스트별 번들로 배송한다.
- 설정이 없으면 출력 없이 종료한다. 세션 시작에 불필요한 컨텍스트를 주입하지 않기 위함이다.
- 훅은 볼트에 쓰지 않는다. 세션 시작이 사용자 지식의 변경 계기가 되어서는 안 된다.

## API Contracts

- 훅 출력은 호스트가 읽는 JSON이다. 실행 진입은 배럴을 거치지 않고 concrete 구현을 참조하여 번들 크기 제한을 지킨다.

## Acceptance Criteria

### AC-hook-silent-without-config — 설정 부재 시 무출력

- 설정 파일이 없고 환경 진단 오류도 없으면 SessionStart 훅이 stdout 에 아무것도 쓰지 않는다.

### AC-hook-read-only — 쓰기 없음

- 훅 실행이 볼트 경로에 쓰기 호출을 하지 않는다.

## Last Updated

훅 출력·실행 번들·볼트 접근 경계의 내용이나 적용 범위가 바뀔 때 갱신한다.
