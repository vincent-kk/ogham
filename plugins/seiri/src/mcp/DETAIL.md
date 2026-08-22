# mcp — Contract

## Requirements

- 이 계층에서 나가는 것은 도구 스키마가 아니라 **상태의 렌더**다 — 어떤 규칙이 배포됐고 다이얼이 어디 있는지.
- 등록된 도구 스키마는 호출 여부와 무관하게 매 턴 컨텍스트로 나간다. 그래서 표면을 도구 3개로 고정한다.
- 코드에 대해서는 아무것도 하지 않는다 — 읽기·검색·분석은 하니스가 이미 제공한다.
- 복잡성은 코드 안에 격리하고 컨텍스트로 내보내지 않는다.

## API Contracts

- `server/` — MCP 서버 조립과 도구 등록.
- `serverEntry/` — stdio 진입점(`bridge/mcp-server.cjs` 번들 대상).
- `tools/` — `openSettings`(대화형 정본), `ruleDocsSync`(헤드리스 폴백), `gates`(작업 원장 상태).
- `pages/` — 설정 UI 정적 자산. 빌드가 `public/settings.html` 로 인라인한다.

## Acceptance Criteria

### AC-tool-surface-fixed — 고정된 표면

- 등록 도구가 정확히 3개다.

### AC-mcp-no-code-tools — 코드 도구 부재

- 어떤 도구도 파일 읽기·검색·분석 기능을 노출하지 않는다.

## Last Updated

2026-08-22 — MCP 계층의 도구 3개 표면 예산 계약을 문서화했다.
