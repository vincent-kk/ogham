# tools contract

## Requirements

- 정확히 4개 도구 sub-fractal을 노출한다: `projectSetup`, `fractalInspect`, `restructure`, `reviewState`.
- 각 handler는 공통 `ToolPayload` 의미를 따르고 16 KiB inline 예산 안에서 응답한다. 초과분은 artifact로 나간다.
- 도구는 프로젝트 파일을 이동·수정하지 않는다. `restructure`는 계획과 사전·사후조건만 반환한다.
- `utils/` organ은 도구 간 공유 helper를 담으며 그 자체로 공개 표면이 아니다. snapshot 생성과, 좁은 질의에서 프로젝트 전체 diagnostics를 질의 범위로 줄이는 scoping이 여기 있다.

## API Contracts

- `handleProjectSetup`, `handleFractalInspect`, `handleRestructure`, `handleReviewState` — 각각 action-discriminated 입력 DTO를 받아 `ToolResultEnvelope`를 반환한다.

## Acceptance Criteria

### AC-tools-count — 정확히 넷

- 진입점이 export하는 handler가 4개이며 제거된 도구의 handler가 없다.

### AC-tools-envelope — 공통 봉투

- 모든 handler 반환이 `status`/`summary`/`diagnostics`를 갖고 inline 예산을 넘으면 `data` 대신 `artifact`를 싣는다.

### AC-tools-readonly — 계획만, 실행 없음

- 어떤 handler도 프로젝트 트리를 수정하지 않는다.

## History

- 2026-09-05 — 상시 MCP schema 비용을 줄이고 같은 lifecycle의 기능을 한 action union으로 표현하기 위해 9개 도구를 4개 dispatcher로 병합했다.
- 2026-07-28 — 9개 도구 계약을 문서화했다.

## Last Updated

2026-09-05
