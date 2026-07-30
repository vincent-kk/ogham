# pages — Contract

## Requirements

- 이 노드는 TypeScript 번들이 아니라 **빌드 입력**이다. 빌드가 `public/settings.html` 정적 파일로 인라인한다.
- 런타임에 서버 코드가 여기의 파일을 import 하지 않는다 — `setup` 도구가 산출물을 디스크에서 읽는다.
- 외부 CDN 을 쓰지 않는다.

## API Contracts

- 빌드 산출: `settings/` → `public/settings.html`(마크업·스타일·스크립트 인라인).
- 서버 주입 상태 자리: `__ENTREZ_STATE__`.

## Acceptance Criteria

### AC-pages-build-output — 산출물 생성

- 빌드가 `public/settings.html` 하나를 만든다.

### AC-pages-no-external-host — 외부 의존 없음

- 페이지가 외부 호스트로 요청을 보내지 않는다.

## Last Updated

2026-07-30 — 설정 FE 빌드 입력 계약을 문서화했다.
