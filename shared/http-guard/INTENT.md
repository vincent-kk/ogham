## Purpose

`@ogham/http-guard` 는 모노레포 내부 전용 워크스페이스로, 로컬 HTTP 서버(127.0.0.1)의 브라우저 도달 공격 방어를 한 곳에 모은다. loopback Host 검증(DNS rebinding 차단), POST Origin + Content-Type 검증(CSRF), timing-safe 세션 토큰이 단일 진실 소스다. 여러 플러그인이 esbuild inline 으로 소비한다.

## Structure

| Path           | Role                                                                   |
| -------------- | ---------------------------------------------------------------------- |
| `src/index.ts` | barrel export                                                          |
| `src/guard/`   | `inspectRequest` — 요청을 검사해 verdict 반환(응답 미전송) + 패턴/타입 |
| `src/token/`   | `generateToken` / `verifyToken` — 세션 베어러 토큰 발급·검증           |

## Conventions

- npm publish 금지 (`private: true`); 각 소비자의 `devDependencies` 에 `workspace:^` 로만 사용.
- esbuild inline 전제 → 소비자 `external` 배열에 본 패키지를 넣지 말 것.
- `inspectRequest` 는 응답을 보내지 않는다 — verdict 만 반환, 호출자가 자기 envelope(`{ok}` / `{success}`)로 매핑.
- 검증 순서는 deilen 정본: loopback host → token → POST origin → POST content-type.
- 토큰 비교는 항상 `timingSafeEqual` (길이 불일치 시 즉시 false).

## Boundaries

### Always do

- 모든 로컬 서버 요청에서 loopback Host 를 먼저 검증.
- 토큰 비교는 `verifyToken`(timing-safe)만 사용.

### Ask first

- 검증 순서·상태코드·verdict 형태 변경(다중 소비자 계약).
- 새 외부 npm 의존성 추가(현재 Node builtin 만).

### Never do

- 본 패키지 내부에서 `ServerResponse` 에 직접 쓰기(응답은 호출자 책임).
- CORS 와일드카드 허용, 평문 `===` 토큰 비교.
- `dist/` 커밋, npm 게시.

## Dependencies

- `node:crypto` (`randomBytes`, `timingSafeEqual`), `node:buffer` (`Buffer`).
- **개발**: `typescript ^5.7`, `vitest 4.1`, `@types/node` — Node.js ≥ 20, Yarn 4.12 workspaces.
