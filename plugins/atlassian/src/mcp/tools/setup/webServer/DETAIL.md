# webServer — Contract

## Requirements

- `127.0.0.1` 에만 바인딩하고 5분 무활동에 자동 종료한다.
- 가드는 공유 `@ogham/http-kit` 을 쓴다: loopback Host(DNS rebinding 차단) → 토큰 → POST Origin(CSRF) → Content-Type 순서다. 이 검증을 여기서 재구현하지 않는다.
- 상태 주입은 XSS 방어를 거친다.
- 서버 수명주기는 closure 반환값으로만 노출한다 — 모듈 전역 가변 상태를 두지 않는다.
- 외부 HTTP 프레임워크를 쓰지 않고 `node:http` 로만 구성한다.
- 개발 전용 코드(mock-api)는 배포 빌드에 포함하지 않는다.

## API Contracts

- 서버 기동 — 토큰 발급, 라우트 등록, idle 타이머 결선 후 `{ url, close }` 반환.
- 라우트 — 설정 폼 조회, 연결 테스트, 저장.

## Acceptance Criteria

### AC-guard-order — 가드 순서

- loopback 이 아닌 Host, 토큰 없는 요청, 비-loopback Origin 의 POST, 지원하지 않는 Content-Type 이 각각 거부된다.

### AC-idle-shutdown — 유휴 종료

- 요청마다 타이머가 리셋되고 5분 후 서버가 닫힌다.

### AC-no-global-state — 전역 상태 부재

- 서버 상태가 모듈 전역이 아니라 closure 안에 있어, 두 번 기동해도 서로 간섭하지 않는다.

## Last Updated

2026-07-30 — 설정 서버의 가드·수명주기 계약을 문서화했다.
