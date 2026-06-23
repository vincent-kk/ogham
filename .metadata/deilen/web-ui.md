# Web UI — Viewer & Settings Server

`render_viewer`/`open_settings` 가 공유하는 단일 로컬 HTTP 서버(127.0.0.1). cennad `openSettings/webServer/` 의 보안·기동 패턴을 일반화하고, 세션 내내 유지되는 점이 다르다.

## 서버 사양

- 바인딩: `127.0.0.1` 전용. 포트: `config.preferred_port`(기본 0=동적, `server.listen(0,'127.0.0.1')`).
- 생애: 첫 `render_viewer`/`open_settings` 에서 1회 기동. **세션 생존 = 뷰어 탭 heartbeat**(`POST /api/ping`); 마지막 도구 호출·heartbeat 가 모두 `idle_shutdown_minutes` 동안 단절되면 세션 상태 무관 **폴백 종료**(Claude 비정상 종료·`close_viewer` 누락 누수 방지). MCP 종료 시 동반 종료.
- one-time token: 기동 시 `crypto.randomBytes(16).toString('hex')` 1개 발급. `/r`·API 라우트에서 검증. **정적 `/assets` 는 면제**(비민감 공개 라이브러리 — 동적 import·폰트 하위요청을 무토큰 허용).
- CSRF: POST 는 `application/json` 또는 `multipart/form-data` 만 허용.
- CORS: 와일드카드 금지(동일 origin).
- Headless: 브라우저 오픈 실패해도 URL 을 도구 반환에 포함.

## 라우트

| 메서드 | 경로                          | 동작                                                                                               |
| ------ | ----------------------------- | -------------------------------------------------------------------------------------------------- |
| GET    | `/r/<session>?token=`         | 뷰어 HTML(`viewerHtml`). `__DEILEN_STATE__` 에 session_id·token·title·렌더 HTML·raw markdown 주입. |
| GET    | `/api/viewer?session=&token=` | 렌더 HTML+메타 재조회. `&format=md` → raw markdown(원본 복사용).                                   |
| GET    | `/assets/<chunk>`             | lazy 렌더러 chunk/css/폰트(highlight/mermaid/katex). **토큰 면제**, allowlist 서빙.                |
| POST   | `/api/feedback?token=`        | multipart 피드백 제출 → 영속화 + resolver 발화([feedback-protocol.md](./feedback-protocol.md)).    |
| POST   | `/api/ping?token=`            | 뷰어 탭 heartbeat(`{ session_id }`) → 세션 생존 갱신.                                              |
| GET    | `/settings?token=`            | 설정 HTML(`settingsHtml`). `__DEILEN_STATE__` 에 현재 Config 주입.                                 |
| GET    | `/api/config?token=`          | 현재 `Config` JSON.                                                                                |
| POST   | `/api/config?token=`          | body=`Config`. 검증 후 저장.                                                                       |
| POST   | `/api/close?token=`           | body=`{ session_id }`(필수). 해당 세션만 종료(서버 종료는 idle/MCP-exit 내부 처리).                |

## 뷰어 페이지 (`pages/viewer/`)

```
pages/viewer/
├── index.html               # 헤더 + 본문 컨테이너 + 코멘트 사이드바 + 제출 바
├── styles/styles.css        # CSS 변수 테마 토큰
├── scripts/
│   ├── app.js               # 상태 주입 해석, 본문 마운트, /api/viewer 재조회
│   ├── enhance.js           # lazy 렌더러 감지·동적 import
│   ├── comments.js          # 라인 선택 → 코멘트 popover, 사이드바 관리
│   ├── images.js            # paste/drop → Blob 첨부·썸네일
│   └── submit.js            # FormData 구성 → POST /api/feedback
└── renderers/               # *.entry.ts (buildRenderers.mjs → bridge/assets/)
```

- 본문은 서버 렌더 HTML(라인 앵커 포함)을 그대로 마운트. 무거운 렌더러만 클라이언트 lazy.
- 코멘트: 텍스트 선택 또는 라인 거터 클릭 → popover(텍스트 + 이미지 첨부) → 사이드바 누적. 디바운스 auto-save(`in_progress`).
- 제출: "Submit feedback" → multipart POST(`complete`) → "Claude 로 돌아가세요" 오버레이(skill-creator UX 차용).

### 원본 복사 (server parse + raw 동봉)

서버는 sanitize+line-map HTML 을 렌더하되 **raw markdown 도 함께 노출**한다(세션 `viewer.md` 기반: `__DEILEN_STATE__` 동봉 또는 `GET /api/viewer?session=&format=md`). 파싱을 클라이언트로 옮기지 않는다.

- **전체 복사**: raw markdown 전체를 클립보드로.
- **섹션 복사**: 블록의 `data-source-line`/`data-source-end` 범위로 raw 를 슬라이스해 해당 섹션 원문만 복사(line-map 재활용).
- **코드블록 복사**: 코드펜스마다 복사 버튼(원문).
- `scripts/copy.js` 담당, `navigator.clipboard.writeText`.

### 코멘트 편집 · 삭제 · 전체 코멘트

- 사이드바 각 코멘트 항목에 **편집 / 삭제**(+ 선택적 resolve 토글). 변경은 in-memory map 갱신 후 디바운스 auto-save 반영(삭제는 다음 payload `comments[]` 에서 제외).
- 사이드바 상단 **"전체 코멘트" 작성 영역** → `anchor: null` 코멘트로 저장(라인 무관, 다중 허용).
- 상세 스키마·생애주기는 [feedback-protocol.md](./feedback-protocol.md).

## 설정 페이지 (`pages/settings/`)

cennad settings 구조 차용. `Config` 폼 매핑:

| Config 필드                          | UI 컴포넌트                           |
| ------------------------------------ | ------------------------------------- |
| `theme`                              | radio `light`/`dark`/`auto`           |
| `auto_open`                          | toggle                                |
| `collect_timeout_seconds`            | number 1–300                          |
| `session_ttl_hours`                  | number 1–720                          |
| `idle_shutdown_minutes`              | number                                |
| `preferred_port`                     | number(0=동적)                        |
| `content_width_px` / `font_family`   | number / select                       |
| `renderers.{mermaid,highlight,math}` | toggle (감지에 더해 강제 비활성 옵션) |
| `max_image_mb` / `max_payload_mb`    | number                                |

## FE 빌드

`buildViewerHtml.mjs` / `buildSettingsHtml.mjs` 가 각 페이지 html+css+js 를 esbuild 로 minify·inline → `bridge/viewer.html`, `bridge/settings.html`(런타임 `loadViewerHtml`/`loadSettingsHtml` 로 `fs` 로드, 번들 미포함). 뷰어의 무거운 렌더러는 `buildRenderers.mjs` 가 독립 브라우저 엔트리로 `bridge/assets/` 에 빌드, `handleGetAsset` 가 서빙(번들 비포함).

## 보안

- token 미검증 → 401 `{ ok:false, message:'Invalid token' }`.
- `__DEILEN_STATE__` 주입은 `escapeJsonForHtml`(`<`,`>`,`&`,U+2028,U+2029).
- 렌더 HTML 은 서버 sanitize 후 주입([rendering.md](./rendering.md)).
- Config 검증 실패 400 + `errors[]`, 저장 실패 500. multipart 한도는 [feedback-protocol.md](./feedback-protocol.md).
- `/assets/<chunk>`: 빌드 매니페스트 allowlist 만 서빙 — 경로 구분자·`..`·인코딩 traversal·`bridge/assets` 외부 심링크 거부, 알려진 확장자만.
- `session_id`: `^[A-Za-z0-9_-]+$` 검증 + sessionStore 등록분만 허용(경로 traversal 차단).
