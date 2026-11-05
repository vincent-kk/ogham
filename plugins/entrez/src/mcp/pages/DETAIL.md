# pages — Contract

## Requirements

- 이 노드는 TypeScript 번들이 아니라 **빌드 입력**이다. 빌드가 `public/settings.html` 정적 파일로 인라인한다.
- 런타임에 서버 코드가 여기의 파일을 import 하지 않는다 — `setup` 도구가 산출물을 디스크에서 읽는다.
- 외부 CDN 을 쓰지 않는다.

## API Contracts

상태 주입 자리 `__ENTREZ_STATE__`는 서버와 정적 페이지의 결합점이다. 소스는 빌드 시 인라인되며 런타임에는 디스크의 산출물을 읽는다.

## Acceptance Criteria

### AC-pages-build-output — 산출물 생성

- 빌드가 `public/settings.html` 하나를 만든다.

### AC-pages-no-external-host — 외부 의존 없음

- 페이지가 외부 호스트로 요청을 보내지 않는다.

## Last Updated

정적 UI 빌드·상태 주입과 외부 자산 정책이 바뀔 때 갱신한다.
