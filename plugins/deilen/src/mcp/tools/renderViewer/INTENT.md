## Purpose

`render_viewer` 도구 핸들러. markdown 을 렌더 세션으로 등록하고 뷰어 서버를 기동한 뒤 URL 을 즉시(논블로킹) 반환한다.

## Structure

| File                            | Role                                                        |
| ------------------------------- | ----------------------------------------------------------- |
| `renderViewer.ts`               | 핸들러 — markdown 해석 → 세션 생성 → 서버 기동 → URL 반환   |
| `operations/resolveMarkdown.ts` | `content`/`path` 정확히 하나(XOR) + `max_viewer_mb` 캡 적용 |
| `operations/deriveTitle.ts`     | 명시 title > 첫 ATX H1 > 파일 base name > `"Document"`      |
| `index.ts`                      | barrel — `handleRenderViewer`, 입출력 타입                  |

## Conventions

- 핸들러 최초 단계에서 `projectRoot(input.project_root)` 해석 — 세션 해시·`ensureHttpServer`·`resolveMarkdown` 이 같은 루트를 쓰도록 강제
- `content`/`path` 는 정확히 하나만 — 둘 다·둘 다 아님은 `invalid_input` throw
- `path` 는 `resolve(workspace, path)` — 상대경로는 워크스페이스 기준, 절대경로는 그대로; regular file 만 읽고 크기 초과는 `read_error`
- 세션 id 는 `randomId('rs_')`, status `serving`; `config.auto_open` 이면 브라우저 오픈
- 반환은 즉시 — 피드백 대기는 `collect_feedback` 의 책임

## Boundaries

### Always do

- `content`/`path` XOR 검증 + `max_viewer_mb` 캡 적용
- 세션 생성 전 뷰어 서버 `ensureHttpServer(workspace)` — 해석된 루트를 넘겨 기동

### Ask first

- 입력 스키마(title/options) 변경
- title 도출 우선순위 변경

### Never do

- 렌더 완료까지 블로킹 (URL 즉시 반환)
- 캡 초과 본문·파일 수용

## Dependencies

- `../../../core` (config·projectHash·sessionStore), `../../httpServer`, `../../../utils`, `../../../types`
- `node:fs/promises`, `node:path`, `@ogham/cross-platform/host-paths` (projectRoot)
