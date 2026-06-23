# Storage — Disk Layout & Config

루트: `~/.claude/plugins/deilen/`. 경로 상수는 `src/constants/paths.ts`.

## 레이아웃

```
~/.claude/plugins/deilen/
├── config.json                         # 사용자 설정 (설정 UI 가 저장)
└── runtime/
    ├── server.json                     # HTTP 서버 { pid, port, token, started_at }
    └── sessions/
        └── <session_id>/               # 렌더 세션 (project_hash 스코프)
            ├── meta.json               # { session_id, project_hash, title, url, created_at, status }
            ├── viewer.md               # 렌더 원본 markdown
            ├── feedback.json           # 누적 피드백 (FeedbackPayload + 이미지 메타)
            └── images/
                └── <image_id>.<ext>    # 제출된 파일/클립보드 이미지
```

- `server.json` 은 단일 서버 인스턴스 핸들. 기동 시 갱신, 종료 시 삭제.
- `complete` 수거 시 `feedback.json` 과 `images/` 는 즉시 정리하고 `meta.json`/`viewer.md` 는 닫힌 viewer 새로고침용으로 보존한다. 세션 디렉토리 전체 정리는 `session_ttl_hours` 만료 후 다음 MCP 기동 시 수행한다(백스톱).
- 이미지 파일명은 서버 생성 `image_id` 만 사용(클라이언트 filename 은 `feedback.json` 메타로만).

## Config 스키마 (`types/config.ts`)

| 필드                      | 타입                      | 기본   | 범위/비고                                   |
| ------------------------- | ------------------------- | ------ | ------------------------------------------- |
| `theme`                   | `'light'\|'dark'\|'auto'` | `auto` |                                             |
| `auto_open`               | `boolean`                 | `true` | 렌더 시 브라우저 자동 오픈                  |
| `collect_timeout_seconds` | `number`                  | `45`   | 1–55, 클라이언트 MCP_TIMEOUT 미만           |
| `session_ttl_hours`       | `number`                  | `72`   | 1–720                                       |
| `idle_shutdown_minutes`   | `number`                  | `1`    | 1–120, idle 폴백 종료(refcount reap 백스톱) |
| `preferred_port`          | `number`                  | `0`    | 0=동적, 그 외 1024–65535                    |
| `content_width_px`        | `number`                  | `820`  | 480–1600                                    |
| `font_family`             | `string`                  | 시스템 |                                             |
| `renderers.mermaid`       | `boolean`                 | `true` | false=강제 비활성                           |
| `renderers.highlight`     | `boolean`                 | `true` |                                             |
| `renderers.math`          | `boolean`                 | `true` |                                             |
| `max_image_mb`            | `number`                  | `10`   | 1–100, part 당 상한                         |
| `max_payload_mb`          | `number`                  | `50`   | 1–200, `≥ max_image_mb`                     |
| `max_viewer_mb`           | `number`                  | `5`    | 1–50, render content/path                   |

- 모든 디스크 쓰기는 `lib/atomicWrite.ts`(temp→rename).
- config 부재 시 `constants/defaults.ts` 로 부팅, 첫 저장 시 파일 생성.
- 키는 외부 인터페이스이므로 snake_case 유지(코드 식별자 camelCase 와 별개).
- 뷰어 heartbeat 주기는 상수(~30s); 서버 idle 판정은 max(마지막 도구호출, 마지막 ping) 기준 `idle_shutdown_minutes`(폴백). 마지막 serving 세션이 명시적으로 닫히면(submit/`close_viewer`) grace 후 즉시 reap.
