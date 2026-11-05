# sessionStart — Contract

## Requirements

- 세션 시작에는 등록된 볼트와 쓸 수 있는 스킬만 알린다. 문서 본문을 자동 주입하면 사용자가 선택하지 않은 지식이 컨텍스트에 들어간다.
- 설정 부재·볼트 미준비·환경 진단 실패로 세션을 차단하지 않는다.
- concrete 파일을 직접 참조하여 배럴 재노출 그래프가 훅 번들 크기 가드를 넘기지 않게 한다.
- 볼트와 설정에는 쓰지 않는다. 재색인은 maencof 세션이 소유한다.

## API Contracts

- 환경 진단은 process·env만 읽고 외부 프로세스를 띄우지 않는다. 실패는 경고로 알리되 주입이나 세션 진행을 막지 않는다.

## Acceptance Criteria

### AC-session-never-blocked — 비차단

- 설정이 없거나 볼트가 준비되지 않아도 세션이 진행된다.
- 환경 탐지 실패가 주입을 막지 않는다.

### AC-vault-content-not-injected — 볼트 내용 비주입

- 주입 문자열에 볼트 문서 본문이 없다.

### AC-probe-environment — 환경 탐지

- 탐지 결과가 주입 내용(준비 상태·경로 표기)에 반영된다.

## Last Updated

세션 주입·환경 진단·비차단 계약의 내용이나 적용 범위가 바뀔 때 갱신한다.
