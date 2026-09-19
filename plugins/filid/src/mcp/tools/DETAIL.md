# tools contract

## Requirements

- 정확히 5개 도구 sub-fractal을 노출한다: `projectSetup`, `fractalInspect`, `restructure`, `reviewState`, `facts`.
- 각 handler는 공통 `ToolPayload` 의미를 따르고 16 KiB inline 예산 안에서 응답한다. 초과분은 artifact로 나간다.
- 도구는 프로젝트 파일을 이동·수정하지 않는다. `restructure`는 계획과 사전·사후조건만 반환한다. `facts`는 프로젝트 트리 밖의 캐시에만 쓰고, 호출자가 준 경로는 열기 전에 절대성·프로젝트 밖·symlink·일반 파일·크기를 검사한다.
- `utils/` organ은 도구 간 공유 helper를 담으며 그 자체로 공개 표면이 아니다. snapshot 생성과, 좁은 질의에서 프로젝트 전체 diagnostics를 질의 범위로 줄이는 scoping이 여기 있다.
- 모든 도구 진단은 `affects`를 싣는다(생성 측 필수). 소비자는 그 축에 영향을 선언한 진단만 결론을 흐리는 것으로 읽는다: structure 판정(`resolveFractalScanCertainty`)과 `fractal_inspect validate`의 status(`resolveProjectValidationStatus`)는 finding이 아니고 축을 하나라도 선언한 진단, verification 판정은 `verification`을 선언한 진단이다. `affects: []`는 어떤 판정도 indeterminate로 만들지 않는다.
- `config-warning`의 `affects`는 버린 config 경로로 정하며, 그 표는 `constants/configWarningAxes.ts` 한 곳에 있다. 버려도 분석이 같거나 더 엄격해지기만 하는 경로만 `[]`다. 그 밖의 잘못된 값, 모든 모르는 key(소유자가 조이려던 것일 수 있다), config 전체 fallback은 세 축 전부다. `[]` 경로는 `rules.*.exempt`, `rules.*.enabled`, `rules.*.severity`, `structure.additionalAllowedPeers`, `structure.generatedPaths`다. 근거: builtin 규칙은 모두 기본 활성이고 기본 severity에 `info`가 없다. peer 허용 목록과 생성물 경로가 비면 더 많은 것을 검사한다. `structure.additionalExcludedDirectories`는 빠지면 스캔되는 노드가 늘어 결론이 어느 방향으로든 바뀔 수 있어 목록에 없다. `review.lockfiles`는 빠지면 기본 lockfile 목록이 더 많은 파일을 건너뛸 수 있어 목록에 없다. 판별은 배열 길이가 아니라 key의 존재로 한다. `affects`가 없는 진단은 저장된 옛 진단뿐이며 모든 축으로 읽는다.

## API Contracts

- `handleProjectSetup`, `handleFractalInspect`, `handleRestructure`, `handleReviewState`, `handleFacts` — 각각 action-discriminated 입력 DTO를 받아 `ToolResultEnvelope`를 반환한다.

## Acceptance Criteria

### AC-tools-count — 정확히 다섯

- 진입점이 export하는 handler가 5개이며 제거된 도구의 handler가 없다.

### AC-tools-envelope — 공통 봉투

- 모든 handler 반환이 `status`/`summary`/`diagnostics`를 갖고 inline 예산을 넘으면 `data` 대신 `artifact`를 싣는다.

### AC-tools-readonly — 계획만, 실행 없음

- 어떤 handler도 프로젝트 트리를 수정하지 않는다.

## History

- 2026-09-20 — 사실을 서버가 추출하지 않고 에이전트가 제출하는 계약으로 옮기면서 `facts` 도구를 더해 다섯이 되었다.
- 2026-09-05 — 상시 MCP schema 비용을 줄이고 같은 lifecycle의 기능을 한 action union으로 표현하기 위해 9개 도구를 4개 dispatcher로 병합했다.
- 2026-07-28 — 9개 도구 계약을 문서화했다.

## Last Updated

2026-09-20
