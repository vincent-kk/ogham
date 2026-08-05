# manifestSave — Contract

## Requirements

- MCP 도구 `manifest_save` 의 핸들러다. 등록은 `mcp/server` 가 `wrapHandler` 로 감싸므로, 여기서 던진 예외는 MCP `isError: true` 응답이 된다.
- 저장은 전체 교체다. 기존 매니페스트와 병합하지 않으므로 호출자는 완결된 문서를 넘겨야 한다.
- `manifest` 는 MCP 경계에서 optional 이지만 계약상 필수다. 검증 스키마가 `type` 에 따라 달라져 단일 `inputSchema` 로는 조건부 검증을 표현할 수 없기에 열어 둔 자리이며, 누락 검사와 타입별 검증을 핸들러가 맡는다.
- `manifest` 는 객체 또는 그 JSON 문자열 인코딩을 받는다. MCP 클라이언트는 스키마가 object 타입을 선언하지 않으면 객체 인자를 문자열로 직렬화할 수 있으므로, `inputSchema` 가 object|string 을 선언하고 핸들러가 문자열을 JSON 으로 해독한 뒤 같은 검증을 태운다.
- 디스크에 닿는 것은 스키마를 통과한 값뿐이다 — 검증 실패는 파일을 남기지 않는다.
- 요약 계산은 `manifestParser` 가 소유한다.

## API Contracts

```typescript
export function handleManifestSave(input: ManifestSaveInput): Promise<{
  path: string;
  summary: ManifestSummary | EstimationSummary;
}>;

interface ManifestSaveInput {
  project_ref: string;
  run_id: string;
  type: 'stories' | 'estimation';
  manifest?: unknown; // 계약상 필수 — 누락 시 throw
  project_root?: string;
}
```

- MCP `inputSchema` 에서 `project_ref`·`run_id`·`type` 은 필수, `manifest` 는 `z.union([z.record(z.string(), z.unknown()), z.string()]).optional()` 이다. 방출 JSON Schema 가 object 타입을 선언해야 클라이언트가 객체로 보낸다 — `z.unknown()` 은 `{}` 로 방출되어 문자열 직렬화를 유발한다.
- `type` 이 검증 스키마와 기록 파일을 함께 결정한다 — `stories` → `StoriesManifestSchema` / `stories-manifest.json`, `estimation` → `EstimationManifestSchema` / `estimation.json`.
- 기록되는 값은 `parse` 결과다. 스키마 기본값이 채워진 문서가 디스크에 남으므로, 저장된 내용이 입력과 글자 그대로 같지 않을 수 있다.
- `summary` — `stories` 는 `ManifestSummary { total, pending, created, failed }`, `estimation` 은 `EstimationSummary { units, sum_expected, buffered_total, total_weeks }`.
- 쓰기는 `writeJson` 의 temp → rename 이라 중간 상태가 보이지 않는다. 실행 디렉터리가 없으면 만들어진다.
- 실패 — `manifest` 누락은 `manifest is required`, JSON 이 아닌 문자열은 `manifest string is not valid JSON`, 스키마 불일치는 Zod 오류, 부적격 `run_id` 는 경로 조립 단계에서 거부된다.
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

### AC-string-encoded-manifest — 문자열 인코딩 관용

- JSON 문자열로 넘긴 `manifest` 가 객체로 넘긴 것과 같은 파일과 요약을 만든다 — MCP 전송 계층을 지나는 호출로도 성립한다.
- JSON 이 아닌 문자열은 `manifest string is not valid JSON` 로 거부되고 파일을 남기지 않는다.

### AC-object-schema-advertised — object 타입 광고

- `manifest_save` 가 방출하는 JSON Schema 에서 `manifest` 는 object 를 포함한 타입 선언을 갖는다 — 빈 스키마(`{}`)로 방출되지 않으며, 여전히 `$ref` 0건이다.

## History

- 2026-08-06 — 동작 테스트 D-2: `z.unknown()` 이 JSON Schema `{}` 로 방출되자 클라이언트가 `manifest` 를 문자열로 직렬화했고, 핸들러의 최상위 타입 검증이 모든 실호출을 거부했다. 핸들러 직접 호출 테스트는 이 계층을 지나지 않아 잡지 못했다. inputSchema 를 object|string union 으로 바꾸고 핸들러에 문자열 해독을 더했으며, 실제 SDK 전송을 지나는 회귀 테스트를 신설했다.

## Last Updated

2026-08-06 — manifest 인자에 문자열 인코딩 관용과 object 타입 광고 계약을 추가했다.
