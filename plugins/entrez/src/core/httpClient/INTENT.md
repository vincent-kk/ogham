## Purpose

NCBI 외부 HTTP의 **유일한 통로**. fetch 래퍼 + 재시도 + 429 backoff + auto-POST 전환 + SSRF allowlist + tool/email/api_key 주입. atlassian httpClient 차용.

## Structure

| 파일                       | 역할                                                    |
| -------------------------- | ------------------------------------------------------- |
| `operations/request.ts`    | `httpRequest` — 주입·method 결정·SSRF·재시도 실행(메인) |
| `operations/ssrfGuard.ts`  | `validateUrl` — allowlist·사설IP·traversal 차단         |
| `operations/autoPost.ts`   | `decideMethod` — id>200 or URL>2000자 → POST            |
| `operations/backoff429.ts` | `computeBackoffMs`·`parseRetryAfterMs`                  |
| `operations/withRetry.ts`  | `withRetry` — 5xx/네트워크·429 별도 budget              |

## Conventions

- 의존성은 DI(`HttpDeps`: tool/email/apiKey·fetch·sleep·allowedHosts) — NCBI HTTP 모킹은 이 한 곳.
- 재시도 상수·임계값은 `constants/defaults`에서만.

## Boundaries

### Always do

- 모든 요청 전 `validateUrl`로 SSRF 검증. `redirect: "error"`로 우회 차단.
- api_key는 주입만 하고 응답·로그에 값 노출 금지(`apiKeyUsed` boolean만).

### Ask first

- 허용 프로토콜·SSRF 완화, 재시도/backoff 상수 조정.

### Never do

- 핸들러(mcp)에서 이 모듈을 우회해 `fetch` 직접 호출.
- 상위 레이어(mcp/adapters) import. api_key 값을 envelope에 포함.

## Dependencies

- `../../types/{http,enums}` — `HttpRequest`/`HttpDeps`/`HttpResponse`·`HttpMethod`/`ErrorCode`
- `../../constants/{defaults,messages}` — 재시도·임계·메시지
- `../../utils/ip` — `isPrivateIp` (ssrfGuard)
- `node:dns/promises` — DNS 해석(ssrfGuard)
