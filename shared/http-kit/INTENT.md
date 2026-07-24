## Purpose

`@ogham/http-kit` 는 모노레포 내부 전용 워크스페이스로, 로컬 HTTP 서버(127.0.0.1)의 요청 본문 처리 런타임을 한 곳에 모은다. 크기 상한 JSON 파싱(DoS 방어), `<script>` 안전 JSON 이스케이프(브레이크아웃 방어), Content-Length 명시 JSON 응답이 단일 진실 소스다. 방어 판정 로직인 `@ogham/http-guard` 와 짝을 이루는 공용 런타임 계층이며, 여러 플러그인이 esbuild inline 으로 소비한다.

## Structure

| Path            | Role                                                           |
| --------------- | -------------------------------------------------------------- |
| `src/index.ts`  | barrel export                                                  |
| `src/body/`     | `parseBody` + `describeBodyError` — 상한 파싱 · 거부 상태 매핑 |
| `src/html/`     | `escapeJsonForHtml` — inline `<script>` 안전 JSON 직렬화       |
| `src/response/` | `sendJson` — status + charset + Content-Length JSON 응답       |

## Conventions

- npm publish 금지 (`private: true`); 소비자 `devDependencies` 에 `workspace:^` 로만.
- esbuild inline 전제 → 소비자 `external` 배열에 본 패키지를 넣지 말 것.
- 소비는 서브패스 deep import (`@ogham/http-kit/body` 등), 루트 배럴 경유 지양.
- `parseBody` 는 Content-Length 선검사 + 수신 누적 이중 방어, 초과 시 배수 후 reject (destroy 금지 — 413 이 전달돼야 한다).
- Node builtin 만 의존 (외부 npm 런타임 의존 없음).

## Boundaries

### Always do

- 요청 본문은 항상 크기 상한(`maxBytes`, 기본 1MB) 안에서 파싱.
- 상태 주입 문자열은 `escapeJsonForHtml` 경유, 거부 상태는 `describeBodyError` 경유.

### Ask first

- `parseBody` 반환·거부 계약, `sendJson` 헤더 형태 변경 (다중 소비자 계약).
- 새 외부 npm 의존성 추가 (현재 Node builtin 만).

### Never do

- 도달성·CORS 판정 (본 패키지는 런타임 헬퍼일 뿐; 방어 판정은 `@ogham/http-guard`).
- `dist/` 커밋, npm 게시.

## Dependencies

- `node:http` (`IncomingMessage`, `ServerResponse`), `node:buffer` (`Buffer`).
- **개발**: `typescript ^5.7`, `vitest 4.1`, `@types/node` — Node.js ≥ 20, Yarn 4.12 workspaces.
