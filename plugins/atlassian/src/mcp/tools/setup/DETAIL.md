# setup — Contract

## Requirements

- 로컬 HTTP 서버로 인증 설정 UI 를 제공한다. `127.0.0.1` 에만 바인딩하고 5분 무활동에 자동 종료한다.
- 비밀은 브라우저 → 로컬 서버 → 자격증명 파일 경로로만 흐른다. 응답에서는 마스킹(`••••••••••`)만 보인다.
- **저장 전에 연결을 테스트한다** — 통과하지 못한 설정을 기록하지 않는다.
- 설정 HTML 은 런타임에 `public/settings.html` 에서 읽는다(번들 미포함).
- 도구 이름은 `setup` 으로 고정한다. 페이지·자산 계층만 `settings` 로 부르며, 도구 이름을 바꾸는 것은 공개 인터페이스 변경이다.
- 외부 HTTP 프레임워크를 쓰지 않고 `node:http` 로만 구성한다. 모듈 전역 가변 상태를 두지 않는다.
- MCP 성공은 서버 기동이 아니라 브라우저에서 선택한 scope의 config와 credentials 저장 완료를 뜻한다. 잘못된 제출은 수정 후 재시도할 수 있고 completion을 끝내지 않는다.

## API Contracts

- `handleSetup(...)` — 서버를 기동하고 브라우저를 연 뒤 저장 completion을 기다린다. 성공 결과는 `config_path`를 포함하며 시작 실패·명시적 종료·유휴 timeout·서버 오류는 경로 없는 실패다.
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

### AC-resolved-save-path — 저장 완료 경로

- user/project 중 제출이 선택한 scope의 `saveConfig` 반환 경로만 성공 응답과 MCP 결과의 `config_path`가 된다.
- 연결·검증·저장 제출 실패는 경로를 내보내지 않고 completion을 열어 두어 수정한 재제출이 성공할 수 있다.
- 실제 저장 전에 서버만 기동된 상태는 성공이나 저장 경로로 보고되지 않는다.

## Last Updated

2026-08-23 — 실제 scope 저장 completion과 resolver-owned config_path 계약을 추가했다.
