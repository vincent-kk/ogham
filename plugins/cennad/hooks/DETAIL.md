# hooks — Contract

## Requirements

- Claude Code 플러그인의 Layer 1 자동 실행 계층이다. 2개 lifecycle 이벤트를 `bridge/*.mjs` 스크립트에 매핑하는 정적 설정 노드다.
- 로직을 담지 않는다 — 매핑만 있다. 구현은 `src/hooks/` 소관이다.
- 등록된 스크립트 이름은 빌드 산출물 이름과 일치해야 한다. 어긋나면 훅이 조용히 실행되지 않는다.

## API Contracts

- `hooks.json` — SessionStart → `bridge/inject-static.mjs`, UserPromptSubmit → `bridge/inject-dynamic.mjs` 매핑.

## Acceptance Criteria

### AC-hook-wiring — 매핑 일치

- 등록된 각 스크립트 경로가 빌드 산출물로 실제 존재한다.
- 등록 이벤트가 구현된 훅과 1:1로 대응한다.

## Last Updated

2026-07-30 — 훅 등록 매핑 계약을 문서화했다.
