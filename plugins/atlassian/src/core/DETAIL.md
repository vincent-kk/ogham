# core — Contract

## Requirements

- MCP 도구들이 공유하는 기반 계층이다: 설정, 인증, 환경 판별, HTTP 클라이언트.
- 의존 방향은 `mcp → core` 한 방향이다. core 는 `mcp/` 를 import 하지 않는다.
- 형제 fractal 은 서로의 배럴을 직접 경유한다. **부모 배럴(`core/index.ts`)을 경유하지 않는다** — 그 배럴이 형제를 재노출하므로 의존 순환이 된다.
- 자격증명은 응답·로그에 노출하지 않는다.
- 외부 Atlassian REST 호출은 `httpClient` 한 곳만 수행한다.

## API Contracts

- `configManager` — 설정 로드·저장·병합(user·project 두 레이어).
- `authManager` — 자격증명 저장·로드와 인증 헤더 조립.
- `environmentResolver` — Cloud/Server 판별과 API 버전 선택.
- `httpClient` — 인증 주입·재시도·SSRF 방어를 갖춘 유일한 HTTP 진입점.
- `connectionTester` — 실제 요청으로 연결·인증 검증.

## Acceptance Criteria

### AC-core-layer-direction — 단방향 의존

- `core/` 에서 `mcp/` 를 참조하는 import 가 0건이다.

### AC-sibling-barrel-crossing — 형제 경계 통과

- core 하위 fractal 이 `../index.js`(부모 배럴)를 import 하지 않는다.

### AC-credential-secrecy — 자격증명 비노출

- 자격증명 원문이 도구 응답과 로그에 나타나지 않는다.

## Last Updated

2026-07-30 — 기반 계층의 의존 방향과 형제 경계 통과 규칙을 문서화했다.
