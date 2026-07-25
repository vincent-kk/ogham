# http-kit Public Contract

## Requirements

- `@ogham/http-kit`은 로컬 HTTP 서버의 요청 검사, 세션 토큰, 제한된 JSON 본문 파싱, HTML-safe JSON 직렬화, JSON 응답 전송을 단일 workspace에서 제공한다.
- 공개 서브패스는 `guard`, `token`, `body`, `html`, `response`이며 소비자는 각 서브패스 entry point를 사용한다.
- `guard`는 loopback host → token → POST origin → POST content-type 순서로 검사하고 응답을 직접 보내지 않는다.
- `token`은 16바이트 난수의 32자 hex 토큰을 발급하고 같은 길이의 UTF-8 버퍼를 timing-safe 방식으로 비교한다.
- `body`는 기본 1MB 상한을 선언 길이와 실제 수신 바이트 모두에 적용하고, 초과 요청을 배수한 뒤 거부한다.
- `html`은 `<`, `>`, `&`, U+2028, U+2029를 이스케이프하며 `response`는 UTF-8 JSON의 정확한 byte length를 전송한다.
- 제거된 이전 workspace의 호환 경로는 제공하지 않는다.

## API Contracts

### `@ogham/http-kit/guard`

```ts
inspectRequest(options: GuardOptions): GuardVerdict;
type GuardOptions;
type GuardVerdict;
type GuardRejectionCode;
```

거부 verdict는 `ok: false`, HTTP `status`, machine-readable `code`, `message`를 함께 제공한다.

### `@ogham/http-kit/token`

```ts
generateToken(): string;
verifyToken(expected: string, provided: string): boolean;
```

### `@ogham/http-kit/body`

```ts
parseBody(req: IncomingMessage, maxBytes?: number): Promise<unknown>;
describeBodyError(error: unknown): { status: number; message: string };
const MAX_BODY_BYTES: number;
class RequestTooLargeError extends Error;
```

### `@ogham/http-kit/html` and `@ogham/http-kit/response`

```ts
escapeJsonForHtml(value: unknown): string;
sendJson(res: ServerResponse, status: number, body: unknown): void;
```

루트 `@ogham/http-kit` entry point는 모든 서브패스의 공개 심볼을 재수출한다.

## Last Updated

2026-07-26 — `http-guard`의 guard/token 계약을 동작 변경 없이 `http-kit`으로 통합.
