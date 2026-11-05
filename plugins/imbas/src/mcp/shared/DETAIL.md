# shared — Contract

## Requirements

- 모든 MCP 도구 핸들러의 응답 형식을 한 곳에서 정한다. 핸들러가 각자 응답을 조립하면 성공·실패 형태가 도구마다 갈라진다.
- 직렬화는 `Map` 과 `Set` 을 각각 plain object 와 배열로 낮춘다. 기본 `JSON.stringify` 는 둘 다 `{}` 로 만들어 내용을 조용히 버린다.
- 핸들러는 `toolResult` · `toolError` 를 직접 부르지 않는다. `wrapHandler` 가 try/catch 와 형식 변환을 모두 처리한다.
- MCP request extra 를 핸들러에 그대로 전달한다. long-polling 핸들러가 호출의 `AbortSignal` 을 관찰해야 하며, 단일 인자 핸들러는 무시하면 된다.
- 순환 의존성을 만들지 않는다 — 이 fractal 은 `mcp/` 안의 모든 도구가 참조하는 잎이다.

## API Contracts

checkErrorField를 선택한 핸들러의 error 필드는 프로토콜 예외와 구분하여 text로 돌려준다. 정상 직렬화와 throw 변환의 구체 형태는 공통 구현·테스트에서 확인한다.

## Acceptance Criteria

### AC-shared-extra-forwarded — extra 전달

- `wrapHandler` 로 감싼 핸들러가 두 번째 인자로 받은 `extra` 가 호출 시 넘긴 객체와 같다.

### AC-shared-leaf-node — 잎 의존성

- `shared/**` 가 `mcp/` 의 다른 하위 디렉터리를 import 하지 않는다.

## Last Updated

응답 직렬화·오류 구분·취소 전달 계약의 내용과 근거가 바뀔 때 갱신한다.
