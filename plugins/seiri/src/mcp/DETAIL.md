# mcp — Contract

## Requirements

- 이 계층에서 나가는 것은 도구 스키마가 아니라 **상태의 렌더**다 — 어떤 규칙이 배포됐고 다이얼이 어디 있는지.
- 등록된 도구는 settings, gates, workflow 세 개다. workflow는 호스트가 제공하지 않는 명시적 조건부 참여 계약이다.
- 코드에 대해서는 아무것도 하지 않는다 — 읽기·검색·분석은 하니스가 이미 제공한다.
- 복잡성은 코드 안에 격리하고 컨텍스트로 내보내지 않는다.

## API Contracts

- `server/` — MCP 서버 조립과 도구 등록.
- `serverEntry/` — stdio 진입점(`bridge/mcp-server.cjs` 번들 대상).
- settings는 설정 표면, gates는 작업 증거, workflow는 명시적 참여 요청을 소유합니다. accepted 응답은 hook ACK를 대신하지 않습니다.
- `pages/` — 설정 UI 정적 자산. 빌드가 `public/settings.html` 로 인라인한다.

## Acceptance Criteria

### AC-tool-surface-fixed — 고정된 표면

- 등록 도구가 정확히 3개다. workflow는 입력 검증만 하며 호스트 세션을 추측하거나 상태를 직접 활성화하지 않는다.

### AC-mcp-no-code-tools — 코드 도구 부재

- 어떤 도구도 파일 읽기·검색·분석 기능을 노출하지 않는다.

## Last Updated

2026-09-26 — 명시적 조건부 참여와 비차단 호스트 계약을 반영했습니다.
