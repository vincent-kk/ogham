# tools — Contract

## Requirements

- 이 fractal 은 21개 MCP 도구 핸들러의 집합을 소유하고, `index.ts` 배럴 하나로 상위 `mcp/` 에 공개한다.
- 도구 이름의 정본은 `constants/mcpToolNames.ts` 의 `McpToolName` 이고, 등록 배치는 `mcp/server/registrations/` 가 소유한다. 이 문서는 그 목록을 복제하지 않는다.
- 도구별 입출력 계약과 rendering convention 은 각 도구 자식 fractal 의 `DETAIL.md` 가 소유한다. 이 문서는 배럴의 표면과 자식 구성만 진술한다.
- 배럴은 이름 지정 재노출만 쓴다. `export *` 는 공개 표면을 열거 불가능하게 만들어 표면 확대·축소가 계약 변경으로 드러나지 않는다.
- 자식 fractal 을 더하거나 빼는 것은 이 배럴의 공개 계약 변경이다.

## API Contracts

### Entry point (`index.ts`)

값 28개와 타입 6개를 이름으로 재노출한다.

| 묶음             | 심볼                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 도구 핸들러 (21) | `handleClaudeMdMerge` · `handleClaudeMdRead` · `handleClaudeMdRemove` · `handleCompanionEdit` · `handleActivityRead` · `handleContextCacheManage` · `handleKgBuild` · `handleKgContext` · `handleKgNavigate` · `handleKgSearch` · `handleKgStatus` · `handleKgSuggestLinks` · `handleKgTimeline` · `handleCaptureInsight` · `handleMaencofCreate` · `handleMaencofDelete` · `handleMaencofMove` · `handleMaencofRead` · `handleMaencofUpdate` · `handlePersonalContextCapture` · `handleWorkHistory` |
| 입력 스키마 (3)  | `captureInsightInputSchema` · `contextCacheManageInputSchema` · `personalContextCaptureInputSchema`                                                                                                                                                                                                                                                                                                                                                                                                  |
| 보조 유틸 (4)    | `buildStemIndex` · `resolveAndAttachLinks` · `selectContextCandidates` · `InsightCategoryEnum`                                                                                                                                                                                                                                                                                                                                                                                                       |
| 타입 (6)         | `CaptureInsightArgs` · `InsightCategory` · `KgBuildInput` · `KgBuildParseFailure` · `KgBuildResult` · `PersonalContextCaptureArgs`                                                                                                                                                                                                                                                                                                                                                                   |

핸들러 21개와 도구 이름 21개는 1:1 이 아니다 — `capture_insight` 는 `handleCaptureInsight`, `claudemd_*` 3개는 각각 대응하며, 도구 이름 대조의 정본은 `constants/mcpToolNames.ts` 다.

### 자식 fractal

각 도구는 자기 디렉토리를 갖고 자체 `index.ts` 로 이 배럴에 붙는다. 도구를 지우는 변경은 그 디렉토리 삭제와 이 배럴의 재노출 행 삭제가 함께 일어나야 한다.

## Acceptance Criteria

### AC-named-reexports-only — 이름 지정 재노출 한정

- `index.ts` 에 `export *` 가 없어 공개 표면이 어댑터로 열거된다(`entry-point-surface` 가 `exact`).

### AC-surface-matches-consumer — 소비자 표면 일치

- 배럴이 재노출하는 이름의 집합이 소비자 `mcp/index.ts` 가 가져가는 이름의 집합과 일치한다 — 쓰이지 않는 재노출도, 빠진 재노출도 없다.

### AC-child-removal-is-contract-change — 자식 제거의 계약성

- 도구 자식 fractal 이 사라지면 이 배럴의 재노출 행도 함께 사라지고, 상위 `mcp/DETAIL.md` 의 도구 표면 수가 같은 변경에서 갱신된다.

### AC-tool-names-not-duplicated — 도구 이름 비복제

- 이 문서와 배럴이 `McpToolName` 의 도구 이름 목록을 자체 정의하지 않는다.

## History

- 2026-08-04 — L5 재정의로 `boundaryCreate/` 자식 fractal 이 삭제되어 도구 표면이 22 에서 21 로 줄었다. 같은 정리에서 배럴을 `export *` 21행에서 이름 지정 재노출로 바꿔, 공개 표면 축소가 열거 가능한 계약 변경으로 드러나게 했다.

## Last Updated

2026-08-04 — 도구 배럴의 공개 표면과 자식 구성 계약을 문서로 만들었다.
