# shared — Contract

## Requirements

- 모든 MCP 도구 핸들러의 응답 형식을 한 곳에서 정한다. 핸들러가 각자 응답을 조립하면 성공·실패 형태가 도구마다 갈라진다.
- 직렬화는 `Map` 과 `Set` 을 각각 plain object 와 배열로 낮춘다. 기본 `JSON.stringify` 는 둘 다 `{}` 로 만들어 내용을 조용히 버린다.
- 핸들러는 `toolResult` · `toolError` 를 직접 부르지 않는다. `wrapHandler` 가 try/catch 와 형식 변환을 모두 처리한다.
- MCP request extra 를 핸들러에 그대로 전달한다. long-polling 핸들러가 호출의 `AbortSignal` 을 관찰해야 하며, 단일 인자 핸들러는 무시하면 된다.
- 순환 의존성을 만들지 않는다 — 이 fractal 은 `mcp/` 안의 모든 도구가 참조하는 잎이다.

## API Contracts

```typescript
export function mapReplacer(_key: string, value: unknown): unknown;
export function toolResult(result: unknown): {
  content: [{ type: 'text'; text: string }];
};
export function toolError(error: unknown): {
  content: [{ type: 'text'; text: string }];
  isError: true;
};

export interface HandlerExtra {
  signal?: AbortSignal;
}

export function wrapHandler<T>(
  fn: (args: T, extra?: HandlerExtra) => unknown | Promise<unknown>,
  options?: { checkErrorField?: boolean },
): (args: T, extra?: HandlerExtra) => Promise<unknown>;
```

- `toolResult` 는 `JSON.stringify(result, mapReplacer, 2)` 로 직렬화한 단일 text content 를 반환한다.
- `toolError` 는 `Error` 면 `message` 를, 아니면 `String(error)` 를 써서 `Error: <message>` text 와 `isError: true` 를 반환한다.
- `wrapHandler` 는 throw 를 `toolError` 로, 정상 반환을 `toolResult` 로 변환한다.
- `options.checkErrorField` 가 켜진 경우, 반환값이 객체이고 `error` 키를 가지면 `isError` 없이 그 값만 text 로 돌려준다 — 도구가 스스로 판정한 실패를 프로토콜 오류와 구분하기 위한 경로다.

## Acceptance Criteria

### AC-shared-map-set-serialization — Map/Set 직렬화

- `toolResult(new Map([['a', 1]]))` 의 text 를 파싱하면 `{ a: 1 }` 이다.
- `toolResult(new Set([1, 2]))` 의 text 를 파싱하면 `[1, 2]` 다.

### AC-shared-error-shape — 오류 응답 형태

- `wrapHandler` 로 감싼 핸들러가 throw 하면 결과의 `isError` 가 `true` 이고 text 가 `Error: ` 로 시작한다.
- `Error` 가 아닌 값을 throw 해도 형태가 같다.

### AC-shared-error-field — checkErrorField 경로

- `checkErrorField: true` 이고 핸들러가 `{ error: 'x' }` 를 반환하면 결과 text 가 `'x'` 이고 `isError` 가 없다.
- `checkErrorField` 가 꺼져 있으면 같은 반환값이 `toolResult` 로 직렬화된다.

### AC-shared-extra-forwarded — extra 전달

- `wrapHandler` 로 감싼 핸들러가 두 번째 인자로 받은 `extra` 가 호출 시 넘긴 객체와 같다.

### AC-shared-leaf-node — 잎 의존성

- `shared/**` 가 `mcp/` 의 다른 하위 디렉터리를 import 하지 않는다.

## Last Updated

2026-08-06 — 응답 형식·오류 변환·AbortSignal 전달 계약을 최초 문서화했다.
