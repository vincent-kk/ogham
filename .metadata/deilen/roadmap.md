# Roadmap — 구현 순서

cennad/filid 동일 패키지 골격 위에서 단계적으로 구현한다. 각 단계는 독립 검증 가능(테스트 + 수동 확인).

## Phase 0 — 스캐폴드

- `plugins/deilen/` 골격(package.json, tsconfig, vitest, .claude-plugin/plugin.json, .mcp.json, libs/run.cjs).
- `scripts/inject-version.mjs` 연동, `src/version.ts`.
- marketplace.json + README 에 `deilen` 엔트리 등록.

## Phase 1 — 렌더 코어

- `types/`(config, session, feedback, renderOptions Zod).
- `render/`(markdown-it + source-line ruler + sanitize). 단위 테스트: 표/코드/mermaid/수식 표식 + data-source-line.
- `constants/paths.ts`, `defaults.ts`.

## Phase 2 — HTTP 서버 + 뷰어(읽기)

- `mcp/httpServer/`(기동·라우팅·token·idle 종료).
- `pages/report/`(base 표시 + lazy enhance). `buildReportHtml.mjs` + `buildRenderers.mjs`(독립 엔트리 → bridge/assets).
- `render_report` 도구(논블로킹) + `open` 흐름. 수동 확인: 브라우저에서 보고서 가독 표시 + lazy 렌더러 동작.

## Phase 3 — 피드백 수집·수거

- `pages/report/`(comments/images/submit) — 라인 코멘트 + 클립보드/파일 이미지.
- `handlePostFeedback` + `parseMultipart`(busboy) + `feedbackStore`.
- `sessionStore` resolver + `collect_feedback`(long-poll) + MCP image 반환.
- 테스트: multipart 파싱, 한도/mime, resolver 랑데부, pending 타임아웃.

## Phase 4 — 스킬

- `skills/present/SKILL.md`(렌더→poll 루프→반영), `skills/setup/SKILL.md`.

## Phase 5 — 설정 UI

- `pages/settings/` + `buildSettingsHtml.mjs` + config 라우트. `open_settings` 도구.

## Phase 6 — 마감

- `close_report`, 세션 TTL 정리, idle 종료 검증.
- README / README-ko_kr, INTENT.md/DETAIL.md(필요 노드), `/filid:scan` 통과.
- Changeset.

## 잠정 확정 (아키텍처 반영 — 변경 시 재논의)

- 하이라이터: **`highlight.js`** 잠정 채택(대안 `shiki` — 번들 크기·테마 품질 트레이드오프).
- multipart 파서: **`busboy`** 잠정 채택(대안 경량 자작 — 로컬·자체 클라이언트라 포맷 통제 가능).
- 뷰어 자산 서빙: 로컬 chunk 확정(외부 CDN 미사용).
