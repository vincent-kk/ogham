# pages — Contract

## Requirements

- 이 노드는 런타임 TypeScript export 가 없는 **빌드 입력**이다. `index.ts` 는 `export {}` 표식일 뿐이며, 산출물은 esbuild 가 `public/` 에 만든다.
- 서버 코드는 여기의 파일을 import 하지 않는다 — 런타임에 `mcp/httpServer` 가 `public/` 산출물을 디스크에서 읽어 서빙한다.
- 외부 CDN 과 동봉 폰트를 쓰지 않는다. 수식은 KaTeX 의 MathML 출력으로 처리한다.
- 페이지의 시각 언어는 `DESIGN.md` 를 정본으로 삼는다.

## API Contracts

- 브라우저 자산은 빌드 결과로만 서빙한다. 런타임 모듈 export를 추가하거나 서버 번들로 가져오지 않는다.
- 뷰어 상태는 서버의 HTML 주입 슬롯으로 전달한다. 산출물의 구체 목록은 빌드 스크립트를 읽는다.

## Acceptance Criteria

### AC-pages-build-output — 산출물 생성

- 빌드가 `public/viewer.html`·`public/settings.html` 과 `public/assets/` 렌더러 자산을 만든다.

### AC-pages-no-external-host — 외부 의존 없음

- 페이지가 외부 호스트로 요청을 보내지 않는다.
- MCP 서버 번들에 렌더러 라이브러리가 포함되지 않는다.

## Last Updated

FE 빌드 입력·디자인 정본·런타임 서빙 경계의 내용이나 적용 범위가 바뀔 때 갱신한다.
