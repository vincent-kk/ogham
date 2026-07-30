## Purpose

`src/` 는 `@ogham/http-kit` 패키지의 진입점 루트다. `index.ts` 는 `guard/`·`token/`·`body/`·`html/`·`response/` 소유 파일의 공개 API만 재수출하는 순수 배럴이다.

## Structure

| Path        | Role                                             |
| ----------- | ------------------------------------------------ |
| `index.ts`  | 다섯 서브 프랙탈의 공개 심볼 재수출              |
| `guard/`    | 요청 host·token·Origin·Content-Type 검사 verdict |
| `token/`    | 세션 토큰 발급·timing-safe 검증                  |
| `body/`     | 크기 상한 JSON 본문 파싱                         |
| `html/`     | inline `<script>` 안전 JSON 직렬화               |
| `response/` | JSON 응답 전송                                   |

## Conventions

- `index.ts` 는 공개 심볼의 구체 소유 파일에서 이름으로 재수출한다.
- 소비자는 `@ogham/http-kit` 루트만 import한다.
- 새 공개 심볼은 서브 프랙탈에 먼저 구현 후 `index.ts` 에 재수출 추가.

## Boundaries

### Always do

- `index.ts` 를 배럴 전용으로 유지 — 재수출 구문만.
- `guard/`, `token/`, `body/`, `html/`, `response/`의 공개 심볼만 재수출.

### Ask first

- `index.ts` 재수출 목록(공개 계약) 변경 — 다수 소비자 영향.

### Never do

- `index.ts` 에 함수·상수·타입 직접 선언.
- 패키지 외부 소비자가 서브 프랙탈 파일을 deep import.

## Dependencies

- 다섯 하위 프랙탈의 공개 심볼 소유 파일.
