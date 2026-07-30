# setup — Contract

## Requirements

- 로컬 HTTP 서버로 인증 설정 UI 를 제공한다. `127.0.0.1` 에만 바인딩하고 5분 무활동에 자동 종료한다.
- 비밀은 브라우저 → 로컬 서버 → 자격증명 파일 경로로만 흐른다. 응답에서는 마스킹(`••••••••••`)만 보인다.
- **저장 전에 연결을 테스트한다** — 통과하지 못한 설정을 기록하지 않는다.
- 설정 HTML 은 런타임에 `public/settings.html` 에서 읽는다(번들 미포함).
- 도구 이름은 `setup` 으로 고정한다. 페이지·자산 계층만 `settings` 로 부르며, 도구 이름을 바꾸는 것은 공개 인터페이스 변경이다.
- 외부 HTTP 프레임워크를 쓰지 않고 `node:http` 로만 구성한다. 모듈 전역 가변 상태를 두지 않는다.

## API Contracts

- `handleSetup(...)` — 서버를 기동하고 접속 URL 을 돌려준다. 서버 핸들은 closure 반환값(`{ url, close }`)으로만 노출한다.
- `utils/loadSettingsHtml` — 런타임에 `public/settings.html` 을 읽는다.
- `webServer/` — 라우팅과 가드.

## Acceptance Criteria

### AC-loopback-only — 바인딩 격리

- 서버가 `127.0.0.1` 외 주소에서 접근 가능하지 않다.

### AC-test-before-save — 저장 전 검증

- 연결 테스트를 통과하지 못한 설정이 기록되지 않는다.

### AC-secret-masking — 비밀 마스킹

- 응답에 자격증명 원문이 없고 마스킹된 형태만 나타난다.

### AC-idle-shutdown — 유휴 종료

- 5분 무활동에서 서버가 스스로 닫힌다.

## Last Updated

2026-07-30 — 설정 도구의 비밀 경로와 수명주기 계약을 문서화했다.
