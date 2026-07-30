# manifestImplementPlan — Contract

## Requirements

- MCP 도구 `manifest_implement_plan` 의 핸들러다. 등록은 `mcp/server` 가 `wrapHandler` 로 감싸므로, 여기서 던진 예외는 MCP `isError: true` 응답이 된다.
- DAG 계산은 `core/implementPlanner` 의 `buildImplementPlan` 이, 리포트 렌더링은 같은 모듈의 `renderImplementPlanReport` 가 소유한다. 이 핸들러는 로드·조립·영속만 한다.
- stories 매니페스트는 `source` 와 무관하게 항상 로드한다 — 노드 집합의 기준이 stories 이기 때문이다. devplan 은 `source: 'devplan'` 일 때만 로드하고, `'stories'` 면 `null` 로 넘겨 계획을 degraded 로 표시한다.
- 산출물 두 개를 같은 실행 디렉터리에 남긴다: 매니페스트 JSON 과 사람이 읽는 마크다운 리포트. 리포트는 매니페스트의 파생물이며 별도 입력이 아니다.
- 기존 `implement-plan.json` 과 리포트는 전체 교체된다 — 부분 병합하지 않는다.

## API Contracts

```typescript
export function handleManifestImplementPlan(
  input: ManifestImplementPlanInput,
): Promise<{
  manifest_path: string;
  report_path: string;
  manifest: ImplementPlanManifest;
  summary: {
    total_groups: number;
    total_items: number;
    max_level: number;
    unresolved: number;
    cycles_broken: number;
    degraded: boolean;
  };
}>;

interface ManifestImplementPlanInput {
  project_ref: string;
  run_id: string;
  batch?: string; // 생략 시 stories 매니페스트의 batch
  source?: 'stories' | 'devplan'; // 생략 시 'devplan'
  max_parallel?: number; // 양의 정수, 생략 시 무제한
  project_root?: string;
}
```

- MCP `inputSchema` 에서 `project_ref`·`run_id` 는 필수, `source` 는 두 값의 enum, `max_parallel` 은 양의 정수다.
- 기록 경로는 `MANIFEST_FILE_MAP['implement-plan']` = `<run_dir>/implement-plan.json`, `REPORT_FILE_MAP['implement-plan']` = `<run_dir>/implement-plan-report.md` 다.
- 매니페스트는 `writeJson` 으로 원자적으로 쓰고, 리포트는 `writeFileSync` 로 직접 쓴다 — 리포트는 재생성 가능한 파생물이라 원자성을 요구하지 않는다.
- `summary` 는 응답용으로 이 핸들러가 매니페스트에서 직접 계산한다. `groups` 가 비면 `max_level` 은 0 이다.
- 실패 — stories 매니페스트 부재(또는 `source: 'devplan'` 에서 devplan 부재)는 `readJson` 오류로 올라온다. `run_id` 가 단일 경로 세그먼트를 만들지 못하면 그 전에 거부된다.
- 배럴은 `handleManifestImplementPlan` 만 노출한다.

## Acceptance Criteria

### AC-source-mode — source 별 로드 대상

- `source: 'devplan'`(기본)은 stories 와 devplan 을 모두 로드한다.
- `source: 'stories'` 는 devplan 을 읽지 않고 `null` 로 계획을 만든다 — 결과 매니페스트의 `degraded` 가 `true` 다.

### AC-artifacts-written — 두 산출물 기록

- 호출 후 `<run_dir>/implement-plan.json` 과 `<run_dir>/implement-plan-report.md` 가 모두 존재하고, 응답의 `manifest_path`·`report_path` 가 그 경로를 가리킨다.

### AC-batch-default — batch 승계

- `batch` 를 생략하면 stories 매니페스트의 `batch` 가 결과 매니페스트에 실린다.

### AC-empty-plan-summary — 빈 계획 요약

- `groups` 가 비어 있으면 `summary.max_level` 은 0 이다 — 음수나 `-Infinity` 가 아니다.

## Last Updated

2026-07-30 — 계획 생성·영속 계약과 source 별 로드 규약을 문서화했다.
