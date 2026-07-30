# viewer — Contract

## Requirements

- 뷰어는 서버가 만든 base HTML 을 받아 표시하고, 무거운 렌더러(highlight·mermaid·katex)는 표식을 만났을 때만 `public/assets/` 에서 동적 import 한다.
- 코멘트 앵커는 서버가 넣은 `data-source-line`/`data-source-end` 를 그대로 쓴다 — 클라이언트가 라인 번호를 다시 추정하지 않는다.
- 세션이 닫혔거나 이미 수거된 뒤에도 페이지는 읽을 수 있어야 한다. 새로고침 시 `/api/ping` 결과로 제출만 비활성화한다.
- heartbeat 는 30초 주기이며 서버의 idle 종료 임계(기본 1분)보다 짧아야 한다.
- 제출 의도(revise/discuss)는 마지막 사용값을 기본으로 노출한다.

## API Contracts

- 서버 주입 상태: `__DEILEN_STATE__`(세션 id, 토큰, 설정, `last_intent`).
- 소비 라우트: `GET /api/viewer`, `GET /api/image/<sid>/<index>`, `GET /assets/<chunk>`, `POST /api/ping`, `POST /api/feedback`, `POST /api/close`.
- lazy 렌더러 진입점: `renderers/highlight.entry.ts`, `renderers/mermaid.entry.ts`, `renderers/katex.entry.ts`.

## Acceptance Criteria

### AC-viewer-lazy-render — 지연 렌더

- 코드·mermaid·수식 표식이 있을 때만 해당 렌더러 자산을 내려받는다.

### AC-viewer-anchor-fidelity — 앵커 충실성

- 코멘트가 서버가 부여한 원본 라인 범위에 정확히 매핑된다.
- 표의 한 행에 코멘트를 달면 그 행의 셀들이 하이라이트된다.

### AC-viewer-post-submit-state — 제출 후 상태

- 수거·종료 후에도 페이지가 읽히고, 새로고침하면 제출이 비활성화된다.

## Last Updated

2026-07-30 — 뷰어 FE 계약을 문서화했다.
