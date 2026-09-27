# tools contract

## Requirements

- 정확히 5개 도구 sub-fractal을 노출한다: `projectSetup`, `fractalInspect`, `restructure`, `reviewState`, `facts`.
- 각 handler는 공통 `ToolPayload` 의미를 따르고 16 KiB inline 예산 안에서 응답한다. 초과분은 artifact로 나간다.
- 도구는 프로젝트 파일을 이동·수정하지 않는다. `restructure`는 계획과 사전·사후조건만 반환한다. `facts`는 프로젝트 트리 밖의 캐시에만 쓰고, 호출자가 준 경로는 열기 전에 절대성·프로젝트 밖·symlink·일반 파일·크기를 검사한다.
- `utils/` organ은 도구 간 공유 helper를 담으며 그 자체로 공개 표면이 아니다. snapshot 생성과, 좁은 질의에서 프로젝트 전체 diagnostics를 질의 범위로 줄이는 scoping이 여기 있다.
- snapshot 생성과 facts context 조립은 각각 요청 스코프 메모를 연다. 스코프는 도구 호출이 아니라 그 한 번의 조립에 묶인다 — 한 도구가 스냅샷 두 개 사이에 프로젝트에 쓰면 뒤 스냅샷은 쓴 뒤의 트리를 봐야 하기 때문이다.
- 모든 도구 진단은 `affects`를 싣는다(생성 측 필수). 소비자는 그 축에 영향을 선언한 진단만 결론을 흐리는 것으로 읽는다: structure 판정(`resolveFractalScanCertainty`)과 `fractal_inspect validate`의 status(`resolveProjectValidationStatus`)는 finding이 아니고 축을 하나라도 선언한 진단, verification 판정은 `verification`을 선언한 진단이다. `affects: []`는 어떤 판정도 indeterminate로 만들지 않는다.
- `config-warning` axes come from `constants/configWarningAxes.ts`. Invalid or unknown `ignore` entries affect all axes because dropping a requested exclusion changes the analyzed set. Only the declared loosen-only paths yield `[]`: `rules.*.exempt`, `rules.*.enabled`, `rules.*.severity`, `structure.allowedPeers`, and `review.generatedPaths`. Unknown keys, whole-config fallback, and other invalid paths affect all axes. A path joins the loosen-only list by its key path, never by the length of its value array. A diagnostic without `affects` can only be a stored legacy one and is read as affecting every axis.

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
