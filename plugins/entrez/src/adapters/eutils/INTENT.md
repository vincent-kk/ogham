## Purpose

E-utility 함수별 어댑터(1함수 1파일). 각 어댑터는 `core/httpClient`로 호출하고 응답을 파싱해 도메인 타입으로 변환한다. 파싱 함수는 별도 export해 fixture로 테스트.

## Conventions

- 모든 HTTP는 `httpRequest`(DI deps) 경유 — 직접 `fetch` 금지.
- `fn(args, deps)` 형태(fetch+parse) + `parseXxx(text)` 순수 파서 동반 export.
- idconv/oa는 PMC utils 호스트·`injectAuth:false`(api_key 미전송).

## Boundaries

### Always do

- 파서는 결측 필드·단일/배열 변형을 안전 처리(`asArray`). 저자는 구조화 유지.
- 에러 응답은 도메인 타입으로 표현(oa 비OA 등).

### Ask first

- 새 E-utility 추가, 응답 스키마 가정 변경(live 검증 후).

### Never do

- core 외 레이어 import. 핸들러가 이 모듈 우회해 fetch. 인라인 호스트 문자열.
