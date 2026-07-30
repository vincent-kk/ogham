# manifestSave — Contract

## Requirements

- MCP 도구 `manifest_save` 의 핸들러다. 등록은 `mcp/server` 가 `wrapHandler` 로 감싸므로, 여기서 던진 예외는 MCP `isError: true` 응답이 된다.
- 저장은 전체 교체다. 기존 매니페스트와 병합하지 않으므로 호출자는 완결된 문서를 넘겨야 한다.
- `manifest` 는 MCP 경계에서 optional 이지만 계약상 필수다. 검증 스키마가 `type` 에 따라 달라져 단일 `inputSchema` 로는 조건부 검증을 표현할 수 없기에 열어 둔 자리이며, 누락 검사와 타입별 검증을 핸들러가 맡는다.
- 디스크에 닿는 것은 스키마를 통과한 값뿐이다 — 검증 실패는 파일을 남기지 않는다.
- 요약 계산은 `manifestParser` 가 소유한다.

## API Contracts

```typescript
export function handleManifestSave(input: ManifestSaveInput): Promise<{
  path: string;
  summary: ManifestSummary | ImplementPlanSummary;
}>;

interface ManifestSaveInput {
  project_ref: string;
  run_id: string;
  type: 'stories' | 'devplan' | 'implement-plan';
  manifest?: unknown; // 계약상 필수 — 누락 시 throw
  project_root?: string;
}
```

- MCP `inputSchema` 에서 `project_ref`·`run_id`·`type` 은 필수, `manifest` 는 `z.unknown().optional()` 이다.
- `type` 이 검증 스키마와 기록 파일을 함께 결정한다 — `stories` → `StoriesManifestSchema` / `stories-manifest.json`, `devplan` → `DevplanManifestSchema` / `devplan-manifest.json`, `implement-plan` → `ImplementPlanManifestSchema` / `implement-plan.json`.
- 기록되는 값은 `parse` 결과다. 스키마 기본값이 채워진 문서가 디스크에 남으므로, 저장된 내용이 입력과 글자 그대로 같지 않을 수 있다.
- `summary` — `stories`·`devplan` 은 `ManifestSummary { total, pending, created, failed }`, `implement-plan` 은 `ImplementPlanSummary { total_groups, total_items, max_level, unresolved, cycles_broken, degraded }`.
- 쓰기는 `writeJson` 의 temp → rename 이라 중간 상태가 보이지 않는다. 실행 디렉터리가 없으면 만들어진다.
- 실패 — `manifest` 누락은 `manifest is required`, 스키마 불일치는 Zod 오류, 부적격 `run_id` 는 경로 조립 단계에서 거부된다.
- 배럴은 `handleManifestSave` 만 노출한다.

## Acceptance Criteria

### AC-manifest-required — manifest 누락 거부

- `manifest` 없이 호출하면 `manifest is required` 로 거부하고 어떤 파일도 쓰지 않는다.

### AC-validate-before-write — 검증 후 기록

- 스키마를 벗어난 매니페스트는 오류 응답이 되고, 대상 파일은 생성되거나 변경되지 않는다.

### AC-full-replace — 전체 교체

- 저장 후 파일 내용은 넘긴 문서(스키마 기본값 적용본)와 일치한다 — 이전 내용의 잔재가 남지 않는다.

### AC-summary-matches-saved — 요약은 저장본 기준

- 응답의 `summary` 는 디스크에 기록된 문서에서 계산된 값이며, 형태는 `type` 이 결정한다.

## Last Updated

2026-07-30 — 매니페스트 저장 계약과 타입별 검증·요약 규약을 문서화했다.
