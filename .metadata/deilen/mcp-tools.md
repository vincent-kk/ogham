# MCP Tools

MCP 서버 이름 `tools`. 도구 4개. 모든 스키마는 `src/types/` 의 Zod 로 정의하고 도구 입력 검증에 재사용한다.

## `render_viewer`

문서를 렌더 세션으로 등록하고 뷰어를 띄운다. **즉시 반환(논블로킹).**

입력:

| 필드      | 타입             | 설명                                                            |
| --------- | ---------------- | --------------------------------------------------------------- |
| `content` | `string?`        | markdown 본문 (우선). `path` 와 택일.                           |
| `path`    | `string?`        | 로컬 markdown 파일 경로. `content` 없을 때 읽음.                |
| `title`   | `string?`        | 페이지 제목 (기본: 첫 H1 또는 파일명).                          |
| `options` | `RenderOptions?` | 테마 override, lazy 렌더러 토글 등 (config 기본값 위에 덮어씀). |

동작: 세션 ID 발급 → markdown 을 source-line 매핑 HTML 로 렌더 → HTTP 서버 기동(없으면) → `sessionStore` 등록 → config.auto_open 이면 브라우저 오픈.

반환: `{ session_id, url, status: "serving" }`.

`path` 정책: 호출자(Claude)는 신뢰 fs 주체 → **임의 readable 파일 허용**. canonicalize 후 일반 파일·utf8·크기 상한(`config.max_viewer_mb`=5MB) 검증, 위반 시 `read_error`. `content` 도 동일 크기 상한.

`content` 와 `path` 둘 다 없거나 둘 다 있으면 `invalid_input` 에러.

## `collect_feedback`

해당 세션의 피드백을 수거한다. **bounded long-poll.**

입력:

| 필드           | 타입      | 설명                                                                                                                               |
| -------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `session_id`   | `string`  | `render_viewer` 가 반환한 ID.                                                                                                      |
| `wait_seconds` | `number?` | 최대 대기 (기본 `config.collect_timeout_seconds`=45, 상한 55 — 클라이언트 `MCP_TIMEOUT` 미만, [mcp-runtime.md](./mcp-runtime.md)). |

동작:

- complete 버퍼 존재 → 즉시 반환.
- 없음 → `sessionStore` 에 resolver 등록 + 타이머. 브라우저가 `status:"complete"` POST 하면 resolver 가 깨워져 반환. 타임아웃 시 `pending`.

반환 (MCP content 배열):

- `status:"complete"`: 텍스트 블록(overall 노트들 + 라인 앵커별 코멘트 정리) + **이미지 content 블록**(첨부 이미지마다 `{ type:"image", data:<base64>, mimeType }`).
- `status:"pending"`: 텍스트 블록 `{ status:"pending", draft_count }` — `preview` 가 재호출.

알 수 없는 `session_id` → `unknown` 에러. `closed` 세션 → `closed` 에러.

settle 결과 매핑(상세 [mcp-runtime.md](./mcp-runtime.md)): `superseded`(동일 세션 collect 재등록 — `preview` 직렬이라 정상 미발생, 발생 시 `pending` 처럼 재호출) / `server_closing`(서버 종료 중 → `closed` 로 반환). 호출 취소(`extra.signal` abort) 시 resolver 정리 후 반환 중단.

## `open_settings`

설정 웹 UI 를 연다 (cennad `open_settings` 패턴).

입력: 없음.
동작: HTTP 서버 기동(없으면) → `/settings?token=` 브라우저 오픈.
반환: `{ url }`.

## `close_viewer`

렌더 세션을 종료한다 (선택적 — `preview` 가 수거 후 정리에 사용).

입력: `{ session_id: string }`.
동작: 세션을 `closed` 처리 + 미해결 resolver settle. 서버는 마지막 활동 후 idle 종료.
반환: `{ status: "closed" }`.

## 에러 코드

| 코드            | 의미                                |
| --------------- | ----------------------------------- |
| `invalid_input` | content/path 동시·부재, 스키마 위반 |
| `unknown`       | 존재하지 않는 session_id            |
| `closed`        | 이미 종료된 세션                    |
| `read_error`    | `path` 읽기 실패                    |
| `server_error`  | HTTP 서버 기동 실패                 |

## 세션 모델

- 세션은 `project_hash`(cwd 기반) 스코프. 다른 cwd 세션 ID 조회는 `unknown`.
- 보관: `complete` 수거 시 세션 디렉토리 즉시 정리. 미수거 세션은 `config.session_ttl_hours`(기본 72) 만료 후 다음 MCP 기동 시 정리(백스톱).
- HTTP 서버는 활성 세션이 있는 동안 유지, 마지막 활동 후 idle(기본 1분) 초과 시 자동 종료.
