# pages — Contract

## Requirements

- MCP 도구가 서비스하는 브라우저 UI 의 컨테이너다. 각 페이지는 독립 fractal 로 관리한다.
- 서버 코드는 여기에 두지 않는다 — 이 트리는 정적 자산이고 서빙은 도구의 로컬 HTTP 서버가 한다.
- 런타임에 디스크에서 읽어 서빙하므로 MCP 번들에 포함되지 않는다.

## API Contracts

- `settings/` — 인증 설정 UI. `public/settings.html` 로 빌드되어 `setup` 도구가 서빙한다.

## Acceptance Criteria

### AC-static-only — 정적 자산 전용

- `pages/` 아래에 서버 로직이 없다.

### AC-runtime-served — 런타임 서빙

- 페이지가 MCP 번들에 인라인되지 않고 디스크에서 읽힌다.

## Last Updated

2026-07-30 — 브라우저 UI 컨테이너 계약을 문서화했다.
