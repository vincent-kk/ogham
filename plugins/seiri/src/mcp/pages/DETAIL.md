# pages — Contract

## Requirements

- 설정 UI 의 정적 자산이다. 빌드가 `public/settings.html` 로 인라인하며, 런타임에 서버가 그 산출물을 읽어 서빙한다.
- 외부 CDN·폰트를 로드하지 않는다.
- 빌드 산출물을 직접 수정하지 않는다.

## API Contracts

- 빌드 산출: `settings/` → `public/settings.html`(마크업·스타일·스크립트 인라인).

## Acceptance Criteria

### AC-pages-inline-build — 단일 산출물

- 빌드가 `public/settings.html` 하나를 만들고 별도 정적 자산 라우트를 요구하지 않는다.

### AC-pages-no-external-host — 외부 의존 없음

- 페이지가 외부 호스트로 요청을 보내지 않는다.

## Last Updated

2026-07-30 — 설정 UI 빌드 입력 계약을 문서화했다.
