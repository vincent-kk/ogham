## Purpose

`src/` 는 `@ogham/http-kit` 패키지의 진입점 루트다. `index.ts` 는 `guard/`·`token/`·`body/`·`html/`·`response/` 서브 프랙탈의 공개 API만 재수출하는 순수 배럴이다.

## Structure

| Path        | Role                                                            |
| ----------- | --------------------------------------------------------------- |
| `index.ts`  | 다섯 서브 프랙탈의 공개 심볼 재수출                            |
| `guard/`    | 요청 host·token·Origin·Content-Type 검사 verdict               |
| `token/`    | 세션 토큰 발급·timing-safe 검증                                |
| `body/`     | 크기 상한 JSON 본문 파싱                                       |
| `html/`     | inline `<script>` 안전 JSON 직렬화                             |
| `response/` | JSON 응답 전송                                                  |

## Conventions

- `index.ts` 는 각 서브 프랙탈의 entry point(`index.ts`)에서만 재수출 — 내부 파일 직접 import 금지.
- 소비자는 서브패스(`@ogham/http-kit/body` 등)로 deep import; 루트 배럴은 편의용.
- 새 공개 심볼은 서브 프랙탈에 먼저 구현 후 `index.ts` 에 재수출 추가.

## Boundaries

### Always do

- `index.ts` 를 배럴 전용으로 유지 — 재수출 구문만.
- `guard/`, `token/`, `body/`, `html/`, `response/`의 entry point만 재수출.

### Ask first

- `index.ts` 재수출 목록(공개 계약) 변경 — 다수 소비자 영향.

### Never do

- `index.ts` 에 함수·상수·타입 직접 선언.
- 서브 프랙탈 내부 파일을 여기서 직접 import.

## Dependencies

- `./guard/index.js`, `./token/index.js`, `./body/index.js`, `./html/index.js`, `./response/index.js`.
