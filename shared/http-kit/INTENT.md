## Purpose

`@ogham/http-kit` 는 모노레포 내부 전용 워크스페이스로, 로컬 HTTP 서버(127.0.0.1)의 요청 방어와 런타임 도구를 한 곳에 모은다. loopback Host·POST Origin/Content-Type 검사, timing-safe 세션 토큰, 크기 상한 JSON 파싱, `<script>` 안전 JSON, Content-Length 명시 응답이 단일 진실 소스다. 여러 플러그인이 esbuild inline 으로 소비한다.

## Structure

| Path            | Role                                                         |
| --------------- | ------------------------------------------------------------ |
| `src/index.ts`  | barrel export                                                |
| `src/guard/`    | `inspectRequest` — host·token·Origin·Content-Type verdict    |
| `src/token/`    | `generateToken` / `verifyToken` — 세션 토큰 발급·검증        |
| `src/body/`     | `parseBody` + `describeBodyError` — 상한 파싱·거부 상태 매핑 |
| `src/html/`     | `escapeJsonForHtml` — inline `<script>` 안전 JSON 직렬화     |
| `src/response/` | `sendJson` — status + charset + Content-Length JSON 응답     |

## Conventions

- npm publish 금지 (`private: true`); 소비자 `devDependencies` 에 `workspace:^` 로만.
- esbuild inline 전제 → 소비자 `external` 배열에 본 패키지를 넣지 말 것.
- 소비자는 `@ogham/http-kit` 패키지 루트만 import한다.
- 검증 순서는 loopback host → token → POST origin → POST content-type.
- 토큰 비교는 항상 `verifyToken`의 timing-safe 비교를 사용.
- `parseBody` 는 선언 길이 + 수신 바이트를 검사하고 초과 시 배수 후 reject.
- Node builtin 만 의존 (외부 npm 런타임 의존 없음).

## Boundaries

### Always do

- 모든 로컬 서버 요청에서 loopback Host를 먼저 검증하고 토큰은 `verifyToken`으로 비교.
- 요청 본문은 항상 크기 상한(`maxBytes`, 기본 1MB) 안에서 파싱.
- 상태 주입 문자열은 `escapeJsonForHtml` 경유, 거부 상태는 `describeBodyError` 경유.

### Ask first

- guard 검증 순서·상태코드·verdict, 토큰 형식, 본문·응답 계약 변경.
- 새 외부 npm 의존성 추가 (현재 Node builtin 만).

### Never do

- `inspectRequest` 안에서 응답 전송, CORS 와일드카드, 평문 토큰 비교.
- 상한 없는 본문 버퍼링.
- `dist/` 커밋, npm 게시.

## Dependencies

- `node:http`, `node:crypto`, `node:buffer`.
- **개발**: `typescript ^5.7`, `vitest 4.1`, `@types/node` — Node.js ≥ 20, Yarn 4.12 workspaces.
