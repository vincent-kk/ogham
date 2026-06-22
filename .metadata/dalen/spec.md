# Spec — Responsibilities & Data Flow

## 컴포넌트 책임

| 컴포넌트           | 역할                                                                | 위치                    |
| ------------------ | ------------------------------------------------------------------- | ----------------------- |
| Claude             | 보고서 생성 주체. `present` 스킬로 렌더 위임, 수거된 피드백 반영    | —                       |
| Skill `present`    | `render_report` 호출 → `collect_feedback` poll 루프 → 피드백 정리   | `skills/present/`       |
| Skill `setup`      | `open_settings` 호출 → 브라우저 안내                                | `skills/setup/`         |
| MCP Server `tools` | 렌더 세션 보유, HTTP 서버 호스팅, 피드백 수거 resolver 관리         | `src/mcp/`              |
| Render 파이프라인  | markdown → source-line 매핑 HTML (서버측 base 렌더)                 | `src/render/`           |
| HTTP Server        | 보고서 뷰어 + 피드백 API + 설정 UI 서빙 (127.0.0.1)                 | `src/mcp/httpServer/`   |
| Browser (뷰어)     | base HTML 표시, 확장 렌더러 lazy-load, 라인 코멘트·이미지 수집·제출 | `src/mcp/pages/report/` |

## 데이터 흐름

1. Claude 가 보고서 markdown 을 생성.
2. `present` 스킬이 `render_report({ content | path, title?, options? })` 호출.
3. MCP 가 렌더 세션 생성 → markdown 을 source-line 매핑 HTML 로 변환 → HTTP 서버 기동(없으면) → 브라우저 오픈.
4. `render_report` 는 `{ session_id, url, status: "serving" }` 를 **즉시 반환**(논블로킹).
5. `present` 가 `collect_feedback({ session_id, wait_seconds })` 를 호출 → 서버가 요청을 연 채 대기.
6. 사용자가 페이지에서 라인을 선택해 코멘트 + 이미지(파일/클립보드)를 추가 → 디바운스 auto-save(`status:"in_progress"`, 텍스트만 — 이미지 Blob 은 최종 제출 시 일괄).
7. 사용자가 **Submit** → 브라우저가 `multipart/form-data`(`status:"complete"`) POST.
8. 서버가 페이로드 파싱·이미지 저장 후 해당 세션의 **pending resolver 를 깨움** → `collect_feedback` 가 피드백+이미지를 반환.
9. 미제출 상태로 `wait_seconds` 경과 시 `{ status: "pending" }` 반환 → `present` 가 자동 재호출(루프).
10. Claude 가 라인 앵커별 코멘트 + 첨부 이미지를 받아 보고서를 수정.

## 수거 메커니즘 — bounded long-poll (자동 수거)

MCP 에서 데이터는 **도구 호출 반환**으로만 Claude 에 흐른다. 사용자가 별도로 말하지 않아도 받으려면 호출이 열린 채 대기해야 하므로, 무한 블로킹의 위험(클라이언트 타임아웃·대화 멈춤) 없이 자동 수거하려면 bounded long-poll 이 해답이다.

- MCP 서버는 세션별 `pendingResolver: (feedback) => void` 를 보유.
- `collect_feedback` 핸들러: 이미 complete 버퍼가 있으면 즉시 resolve; 없으면 resolver 등록 + `wait_seconds` 타이머 설치(타임아웃 시 `{status:"pending", draft_count}` resolve).
- `POST /api/feedback`(`status:"complete"`) 핸들러: 영속화 후 그 세션의 resolver 를 호출해 대기 중 요청을 깨움.
- `present` SKILL.md: `status:"complete"` 일 때까지 `collect_feedback` 재호출. M 라운드 초과 시 "준비되면 알려달라"로 수동 폴백.

기본 `wait_seconds` 는 config 의 `collect_timeout_seconds`(기본 60). 사용자 체감: **Submit = 즉시 반영**.

## 비채택 (명시)

- 무한 블로킹 단일 render 호출 (긴 리뷰 시 타임아웃·대화 멈춤 위험).
- 외부 CDN 의존 렌더러 로드 (로컬 자산 서빙으로 오프라인·프라이버시 확보).
- 다중 동시 보고서 세션의 단일 페이지 통합 (세션당 독립 URL).
- 서버측 Mermaid/수식 렌더 (클라이언트 lazy-load 로 서버 메모리 최소화).
- 피드백 영속본의 무기한 보관 (session TTL 정리).
- Hook 기반 자동 개입 (v1 — 명시적 `present` 호출만).
