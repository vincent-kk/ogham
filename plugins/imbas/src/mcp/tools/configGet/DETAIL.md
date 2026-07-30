# configGet — Contract

## Requirements

- MCP 도구 `config_get` 의 핸들러다. 등록은 `mcp/server` 가 `wrapHandler` 로 감싸므로, 여기서 던진 예외는 MCP `isError: true` 응답이 된다.
- 이 도구가 보는 것은 **유효 설정** 하나다 — `loadConfig` 가 user 계층 위에 project 계층을 얹어 만든 값이며, 어느 계층이 그 값을 말했는지는 구분하지 않는다. 계층별 값이 필요한 소비자는 설정 페이지(`open_settings`)의 `configByScope` 를 쓴다.
- 설정 파일이 두 계층 모두 없어도 실패가 아니다 — 스키마 기본값으로 채운 설정을 반환한다. 이는 첫 실행의 정상 상태다.
- 읽기 전용이다. 조회가 설정 파일을 만들거나 고치지 않는다(`readOnlyHint: true`).

## API Contracts

```typescript
export function handleConfigGet(
  input: ConfigGetInput,
): Promise<ImbasConfig | { field: string; value: unknown }>;

interface ConfigGetInput {
  field?: string; // dot-path, 예: "defaults.project_ref"
  project_root?: string;
}
```

- MCP `inputSchema` 는 `{ field?: string, project_root?: string }` 다.
- `field` 없음 — 유효 설정 객체 전체를 그대로 반환한다.
- `field` 있음 — `{ field, value }` 를 반환한다. `value` 는 `getConfigValue` 의 dot-path 조회 결과이며, 경로 중간이 객체가 아니거나 키가 없으면 `undefined` 다. `undefined` 는 MCP 응답 JSON 직렬화에서 `value` 키 자체가 빠지는 형태로 나타난다.
- dot-path 는 세그먼트 문자열 분해만 한다 — 배열 인덱스 표기나 와일드카드를 해석하지 않는다.
- 실패 — 두 계층을 병합한 문서가 `ImbasConfigSchema` 를 벗어나면 `loadConfig` 의 파싱 오류가 그대로 올라온다. 손편집되거나 `config_set` 이 검증 없이 남긴 값이 여기서 드러난다.
- 배럴은 `handleConfigGet` 만 노출한다.

## Acceptance Criteria

### AC-effective-config — 유효 설정 반환

- `field` 없이 호출하면 두 계층을 병합한 설정 전체가 반환된다.
- 설정 파일이 하나도 없는 워크스페이스에서도 스키마 기본값으로 채운 설정이 반환된다 — throw 하지 않는다.

### AC-dot-path-lookup — dot-path 조회

- `field` 가 존재하는 경로면 `{ field, value }` 로 그 값을 반환한다.
- 존재하지 않는 경로면 `value` 가 `undefined` 다 — throw 하지 않는다.

## Last Updated

2026-07-30 — 유효 설정 조회 계약과 dot-path 규약을 문서화했다.
