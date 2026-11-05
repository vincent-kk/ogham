# http-kit Public Contract

## Requirements

- `@ogham/http-kit`은 로컬 HTTP 서버의 요청 검사, 세션 토큰, 제한된 JSON 본문 파싱, HTML-safe JSON 직렬화, JSON 응답 전송을 단일 workspace에서 제공한다.
- 공개 주소는 `@ogham/http-kit` 루트 하나이며 공개 심볼을 이름으로 재수출한다.
- `guard`는 loopback host → token → POST origin → POST content-type 순서로 검사하고 응답을 직접 보내지 않는다.
- 세션 토큰의 비교는 timing-safe 연산으로 통일해 소비자별 비교 방식이 갈라지지 않게 한다.
- 본문은 선언 길이와 실제 수신량 모두를 제한하고 초과 요청을 끝까지 배수해 호출자가 거부 응답을 전송할 수 있게 한다.
- HTML 상태 주입과 UTF-8 응답 길이는 공유 연산을 사용해 script 탈출과 멀티바이트 길이 오류를 막는다.
- 다른 workspace 이름의 호환 경로는 제공하지 않는다.

## API Contracts

거부 verdict와 본문 오류는 호출자가 자신의 응답 envelope로 전송한다. 요청 검사와 응답 전송의 책임을 섞지 않는다.

루트 entry point는 공개 심볼을 구체 소유 파일에서 이름으로 재수출하며,
`sideEffects: false`를 유지해 소비자 번들에서 비기여 모듈을 제거한다.

## Acceptance Criteria

동작별 결과는 각 모듈의 테스트에서 확인한다.

## Last Updated

로컬 요청 방어·본문 제한 또는 공개 패키지 정책의 범위가 바뀔 때 갱신한다.
