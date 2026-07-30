# manifestGet — Contract

## Requirements

- MCP 도구 `manifest_get` 의 핸들러다. 등록은 `mcp/server` 가 `wrapHandler` 로 감싸므로, 여기서 던진 예외는 MCP `isError: true` 응답이 된다.
- 매니페스트는 항상 실행 디렉터리 안에서만 읽는다 — `getRunDir(cwd, project_ref, run_id)` 가 유일한 경로 출처다.
- 로드와 요약은 `manifestParser` 가 소유한다. 파일명 매핑·Zod 파싱·요약 계산을 여기서 다시 구현하지 않는다.
- 부재나 스키마 불일치는 결과가 아니라 오류다 — 이 도구는 "매니페스트가 이미 있다"는 전제 위에서 읽는다. 유효성 판정이 필요하면 `manifest_validate` 를 쓴다.
- 읽기 전용이다(`readOnlyHint: true`).

## API Contracts

```typescript
export function handleManifestGet(
  input: ManifestGetInput,
): Promise<
  | { manifest: StoriesManifest | DevplanManifest; summary: ManifestSummary }
  | { manifest: ImplementPlanManifest; summary: ImplementPlanSummary }
>;

interface ManifestGetInput {
  project_ref: string;
  run_id: string;
  type: 'stories' | 'devplan' | 'implement-plan';
  project_root?: string;
}
```

- MCP `inputSchema` 의 세 필드는 모두 필수이고 `type` 은 세 값의 enum 이다. `project_root` 만 optional 이다.
- 요약 형태는 `type` 이 결정한다.
  - `stories`·`devplan` → `ManifestSummary { total, pending, created, failed }` — 항목 상태를 세어 만든다. devplan 은 task·task subtask·story subtask·feedback comment 를 모두 센다.
  - `implement-plan` → `ImplementPlanSummary { total_groups, total_items, max_level, unresolved, cycles_broken, degraded }`. group 이 없으면 `max_level` 은 0 이다.
- 읽는 파일은 `MANIFEST_FILE_MAP` 이 정한다 — `stories-manifest.json`, `devplan-manifest.json`, `implement-plan.json`.
- 실패 — 파일 부재·JSON 오류·스키마 불일치는 `readJson` 이 파일 경로를 담은 메시지로 throw 한다. `run_id` 가 단일 경로 세그먼트를 만들지 못하면 `Invalid run_id: "<값>"` 으로 그 전에 거부된다.
- 배럴은 `handleManifestGet` 만 노출한다.

## Acceptance Criteria

### AC-summary-by-type — 타입별 요약 형태

- `stories`·`devplan` 응답의 `summary` 는 상태 카운트 네 개(`total`·`pending`·`created`·`failed`)를 담는다.
- `implement-plan` 응답의 `summary` 는 그룹·레벨·degraded 를 담는 별개 형태다 — 두 형태를 섞지 않는다.

### AC-missing-manifest-errors — 부재는 오류

- 매니페스트 파일이 없으면 파일 경로를 담은 오류 응답이 된다 — 빈 매니페스트로 대체하지 않는다.

### AC-run-scoped-read — 실행 스코프 준수

- 읽기는 `<root>/.imbas/<segment>/runs/<run_id>/` 안으로 한정된다. 경로 세그먼트를 벗어나는 `run_id` 는 파일 접근 전에 거부된다.

## Last Updated

2026-07-30 — 매니페스트 조회 계약과 타입별 요약 형태를 문서화했다.
