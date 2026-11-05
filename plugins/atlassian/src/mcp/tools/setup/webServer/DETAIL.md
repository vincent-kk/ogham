# webServer — Contract

## Requirements

- setup 제출에서 `scope`가 생략되면 `project`에 저장한다. `user` 저장은 명시적 선택에 한하며, 인증정보는 기존 별도 저장 계약을 따른다.

- `127.0.0.1` 에만 바인딩하고 5분 무활동에 자동 종료한다.
- 가드는 공유 `@ogham/http-kit` 을 쓴다: loopback Host(DNS rebinding 차단) → 토큰 → POST Origin(CSRF) → Content-Type 순서다. 이 검증을 여기서 재구현하지 않는다.
- 상태 주입은 XSS 방어를 거친다.
- 서버 수명주기는 closure 반환값으로만 노출한다 — 모듈 전역 가변 상태를 두지 않는다.
- 외부 HTTP 프레임워크를 쓰지 않고 `node:http` 로만 구성한다.
- 개발 전용 코드(mock-api)는 배포 빌드에 포함하지 않는다.
- completion은 config와 credentials가 모두 저장된 뒤 성공한다. 재시도 가능한 제출 오류는 HTTP 실패로만 답하고, 종료·timeout·server error만 terminal 실패로 completion을 끝낸다.

## API Contracts

HTTP 제출 오류와 서버 completion은 별개의 수명주기다. 수정 가능한 제출 실패는 재시도를 허용하고 실제 저장 성공만 resolver가 확정한 경로로 completion을 끝낸다.

## Acceptance Criteria

### AC-guard-order — 가드 순서

- loopback 이 아닌 Host, 토큰 없는 요청, 비-loopback Origin 의 POST, 지원하지 않는 Content-Type 이 각각 거부된다.

### AC-idle-shutdown — 유휴 종료

- 요청마다 타이머가 리셋되고 5분 후 서버가 닫힌다.

### AC-no-global-state — 전역 상태 부재

- 서버 상태가 모듈 전역이 아니라 closure 안에 있어, 두 번 기동해도 서로 간섭하지 않는다.

## Last Updated

제출 scope·보안 가드와 completion 수명주기가 바뀔 때 갱신한다.
