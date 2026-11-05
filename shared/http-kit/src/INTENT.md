## Purpose

`@ogham/http-kit`의 소스 공개 경계를 소유한다. 하위 모듈의 공개 API를 이름으로 재수출하며 요청 처리 구현은 소유 모듈에 남긴다.

## Conventions

- `index.ts` 는 공개 심볼의 구체 소유 파일에서 이름으로 재수출한다.
- 소비자는 `@ogham/http-kit` 루트만 import한다.
- 새 공개 심볼은 서브 프랙탈에 먼저 구현 후 `index.ts` 에 재수출 추가.

## Boundaries

### Always do

- `index.ts` 를 배럴 전용으로 유지 — 재수출 구문만.
- 하위 모듈의 공개 심볼만 재수출해 내부 구현이 외부 계약이 되는 것을 막는다.

### Ask first

- `index.ts` 재수출 목록(공개 계약) 변경 — 다수 소비자 영향.

### Never do

- `index.ts` 에 함수·상수·타입 직접 선언.
- 패키지 외부 소비자가 서브 프랙탈 파일을 deep import.
