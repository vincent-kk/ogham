# configSet — Contract

## Requirements

- MCP 도구 `config_set` 의 핸들러다. 등록은 `mcp/server` 가 `wrapHandler` 로 감싸므로, 여기서 던진 예외는 MCP `isError: true` 응답이 된다.
- `scope` 는 기본값 없는 필수 입력이다. user·project 둘 다 유효한 기록 대상이라, 조용한 기본값은 프로젝트 결정을 사용자 파일에 넣거나 그 반대를 만든다.
- 업데이트는 지정 계층의 **원본 문서**에 적용되어 그 계층만 다시 쓴다. 병합 결과를 계층에 되쓰지 않는다 — `configManager` 의 되쓰기 금지 계약(AC-config-no-merged-writeback)이며, 어기면 user 값이 프로젝트 파일에 구워져 이후 user 기본값 변경이 그 워크스페이스로 흐르지 않는다.
- 기록은 `configManager` 의 `updateConfigLayer` 만 거친다. 계층 경로 해석·부분 갱신·병합 검증·원자적 쓰기를 여기서 다시 구현하지 않는다.
- 반환값은 기록 후의 병합된 유효 설정이다 — 호출자는 자기 갱신이 유효 설정에 어떻게 반영됐는지를 본다.

## API Contracts

```typescript
export function handleConfigSet(input: ConfigSetInput): Promise<ImbasConfig>;

interface ConfigSetInput {
  updates: Record<string, unknown>; // dot-path → 값
  scope: 'user' | 'project'; // 필수, 기본값 없음
  project_root?: string;
}
```

- MCP `inputSchema` 는 `{ updates: Record<string, unknown>, scope: 'user' | 'project', project_root?: string }` 다. `updates` 의 값이 이질적(문자열·숫자·객체)이라 `z.unknown()` 으로 열려 있다.
- `updateConfigLayer` 가 dot-path 마다 대상 계층 문서에 불변 갱신을 적용하고 없는 중간 객체를 만든다. 같은 호출의 여러 경로는 `updates` 의 키 순서대로 누적된다.
- 반환값은 기록 후의 병합된 유효 설정이다. 기록된 계층 문서와 다를 수 있다 — 계층 문서는 그 계층이 결정한 키만 담는다.
- `scope: 'project'` 는 `<project_root>/.imbas/config.json`, `'user'` 는 모든 워크스페이스가 상속하는 호스트 설정 파일에 기록한다.
- 기록 전에 갱신이 만들 **병합 결과**를 `ImbasConfigSchema` 로 검증한다. 스키마를 벗어난 값은 Zod 오류로 거부되고 파일을 바꾸지 못한다 — 잘못된 set 이 다음 `loadConfig` 를 망가뜨리는 경로를 막는다.
- 배럴은 `handleConfigSet` 만 노출한다.

## Acceptance Criteria

### AC-scope-required — 기록 계층 명시

- `scope` 없는 호출은 MCP 스키마 검증에서 거부된다 — 핸들러가 임의 계층을 고르지 않는다.
- `scope` 가 지목한 파일만 바뀐다. 다른 계층 파일은 그대로다.

### AC-multi-path-updates — 다중 dot-path 적용

- 한 호출의 여러 dot-path 가 모두 대상 계층 문서에 반영되고, 반환된 유효 설정에서도 보인다.
- 없는 중간 경로는 새 객체로 만들어진다.

### AC-sparse-layer-write — 계층 부분 기록

- `scope: 'project'` 로 갱신해도 user 계층에서 상속되던 다른 키는 프로젝트 파일에 나타나지 않는다 — 이후 user 계층 변경이 병합 결과에 계속 반영된다.

### AC-invalid-update-rejected — 병합 사전 검증

- 병합 결과가 스키마를 벗어나는 업데이트는 거부되고 대상 파일은 그대로다.

## History

- 2026-08-06 — 동작 테스트 관찰: 병합 유효 설정을 계층에 통째로 기록해 user 계층 값(v1 잔존 `github.repo` 등)이 프로젝트 파일에 구워졌고, 이후 user 기본값 변경이 그 워크스페이스로 흐르지 않았다. `configManager` 의 되쓰기 금지 계약에 맞춰 계층 부분 갱신(`updateConfigLayer`)으로 전환했다. 설정 페이지의 project 저장은 아직 편집 뷰(병합 스냅샷)를 통째로 쓴다 — 필드별 재정의 UI 가 필요한 별도 결정 대상이다.

## Last Updated

2026-08-06 — 계층 부분 기록과 병합 사전 검증으로 계약을 재정의했다.
