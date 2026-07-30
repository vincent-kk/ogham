# manifestValidate — Contract

## Requirements

- MCP 도구 `manifest_validate` 의 핸들러다. 등록은 `mcp/server` 가 `wrapHandler` 로 감싸므로, 여기서 던진 예외는 MCP `isError: true` 응답이 된다.
- 얇은 위임이다. 실행 디렉터리 해석과 `core/manifestValidator` 호출 외에 아무것도 하지 않으며, 검증 규칙을 여기서 구현하거나 결과를 재해석하지 않는다.
- 매니페스트 부재·스키마 불일치는 오류 응답이 아니라 `valid: false` **결과**다 — 검증 도구에게 "없음"은 답이지 사고가 아니다. 매니페스트를 전제로 읽는 `manifest_get` 과 갈라지는 지점이다.
- 읽기 전용이다(`readOnlyHint: true`). 검증이 매니페스트를 고치지 않는다.

## API Contracts

```typescript
export function handleManifestValidate(
  input: ManifestValidateInput,
): Promise<ValidationResult>;

interface ManifestValidateInput {
  project_ref: string;
  run_id: string;
  type: 'stories' | 'devplan' | 'implement-plan';
  project_root?: string;
}

interface ValidationResult {
  valid: boolean; // errors.length === 0
  errors: string[];
  warnings: string[];
}
```

- MCP `inputSchema` 의 세 필드는 모두 필수이고 `type` 은 세 값의 enum 이다.
- 반환값은 `validateManifest(run_dir, type)` 의 결과 그대로다 — 필드 이름·의미가 `core/manifestValidator` 의 계약이며, 타입별 error/warning 분류는 그 문서가 정본이다.
- `warnings` 만 있는 매니페스트는 `valid: true` 다. 호출자가 경고를 차단 사유로 쓰려면 스스로 판단해야 한다.
- 실패 — 이 도구가 실제로 throw 하는 경로는 경로 조립뿐이다. `run_id` 나 `project_ref` 가 단일 안전 세그먼트를 만들지 못하면 검증 전에 거부된다.
- 배럴은 `handleManifestValidate` 만 노출한다.

## Acceptance Criteria

### AC-missing-file-is-a-result — 부재는 결과다

- 매니페스트 파일이 없으면 오류 응답이 아니라 `valid: false` 와 `Schema validation failed: …` 한 건을 담은 결과가 돌아온다.

### AC-result-passthrough — 결과 무가공 전달

- 응답의 `valid`·`errors`·`warnings` 는 `validateManifest` 가 만든 값과 동일하다 — 이 핸들러가 항목을 더하거나 걸러내지 않는다.

### AC-path-guard-precedes — 경로 가드 선행

- 경로 세그먼트를 벗어나는 `run_id` 는 검증 실행 전에 거부된다.

## Last Updated

2026-07-30 — 검증 도구의 위임 계약과 "부재는 결과" 규약을 문서화했다.
