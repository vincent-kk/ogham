# http-guard

## Purpose

`src/` 는 `@ogham/http-guard` 패키지의 진입점 루트다. `index.ts` 는 `guard/`·`token/` 두 서브 프랙탈의 공개 API 만 재수출하는 순수 배럴이며, 직접 로직을 담지 않는다.

## Structure

| Path       | Role                                                                    |
| ---------- | ----------------------------------------------------------------------- |
| `index.ts` | 배럴 — `inspectRequest`, 타입 3종, `generateToken`/`verifyToken` 재수출 |
| `guard/`   | 요청을 검사해 verdict 반환(`inspectRequest`) — 응답 미전송 순수 함수    |
| `token/`   | 세션 베어러 토큰 발급(`generateToken`)·timing-safe 검증(`verifyToken`)  |

## Conventions

- `index.ts` 는 각 서브 프랙탈의 entry point(`index.ts`)에서만 재수출한다 — 내부 파일(`inspectRequest.ts`, `generateToken.ts` 등) 직접 import 금지.
- 새 공개 심볼은 서브 프랙탈에 먼저 구현 후 `index.ts` 에 재수출을 추가한다.

## Boundaries

### Always do

- `index.ts` 를 배럴 전용으로 유지 — 재수출 구문만 작성.
- `guard/`, `token/` 각각의 entry point(`index.ts`)를 통해서만 import.

### Ask first

- `index.ts` 재수출 목록(공개 계약) 변경 — 소비자(deilen/cennad/entrez/atlassian) 다수 영향.

### Never do

- `index.ts` 에 함수·상수·타입을 직접 선언.
- `guard/inspectRequest.ts`, `token/generateToken.ts` 등 서브 프랙탈 내부 파일을 여기서 직접 import.

## Dependencies

- `./guard/index.js` (`inspectRequest`, `GuardOptions`, `GuardVerdict`, `GuardRejectionCode`).
- `./token/index.js` (`generateToken`, `verifyToken`).
