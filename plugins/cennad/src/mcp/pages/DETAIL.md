# pages — Contract

## Requirements

- `open_settings` 가 기동하는 로컬 웹 UI 의 프런트엔드 소스다. 빌드가 CSS·JS 를 inline·minify 해 `public/settings.html` 로 만들고, 런타임에 서버가 디스크에서 읽어 서빙한다(번들 미포함).
- 외부 CDN·폰트를 로드하지 않는다.
- 서버 모듈을 import 하지 않는 독립 스크립트다.

## API Contracts

- 빌드 산출: `settings/` → `public/settings.html`.
- 서버 주입 슬롯: `__CENNAD_STATE__`.

## Acceptance Criteria

### AC-single-inline-output — 단일 산출물

- 빌드가 `public/settings.html` 하나를 만들고 별도 정적 라우트를 요구하지 않는다.

### AC-no-external-assets — 외부 자산 없음

- 페이지가 외부 호스트로 요청을 보내지 않는다.

## Last Updated

2026-07-30 — 설정 UI 빌드 입력 계약을 문서화했다.
