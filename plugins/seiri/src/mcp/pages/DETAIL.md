# pages — Contract

## Requirements

- 설정 UI 의 정적 자산이다. 빌드가 `public/settings.html` 로 인라인하며, 런타임에 서버가 그 산출물을 읽어 서빙한다.
- 외부 CDN·폰트를 로드하지 않는다.
- 빌드 산출물을 직접 수정하지 않는다.

## API Contracts

페이지는 하나의 인라인 HTML로 배송되어 별도 정적 자산 라우트가 필요하지 않아야 한다. 원본과 산출물의 연결은 빌드 스크립트에서 확인한다.

## Acceptance Criteria

### AC-pages-inline-build — 단일 산출물

- 빌드가 `public/settings.html` 하나를 만들고 별도 정적 자산 라우트를 요구하지 않는다.

### AC-pages-no-external-host — 외부 의존 없음

- 페이지가 외부 호스트로 요청을 보내지 않는다.

## Last Updated

정적 자산의 빌드·배송 경계의 내용과 근거가 바뀔 때 갱신한다.
