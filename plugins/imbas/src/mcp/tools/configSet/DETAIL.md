# configSet — Contract

## Requirements

- MCP 도구 `config_set` 의 핸들러다. 등록은 `mcp/server` 가 `wrapHandler` 로 감싸므로, 여기서 던진 예외는 MCP `isError: true` 응답이 된다.
- `scope` 는 기본값 없는 필수 입력이다. user·project 둘 다 유효한 기록 대상이라, 조용한 기본값은 프로젝트 결정을 사용자 파일에 넣거나 그 반대를 만든다.
- 업데이트는 **유효 설정**(두 계층 병합)에 적용한 뒤 지정 계층에 통째로 안착한다. 그래서 project 계층이 재정의 중인 필드를 `user` 로 쓰면 병합된 값이 user 파일에 기록된다 — 설정 페이지의 `/save` 와 같은 동작이다.
- 기록은 `configManager` 의 `saveConfig` 만 거친다. 계층 경로 해석과 원자적 쓰기를 여기서 다시 구현하지 않는다.
- 부분 갱신이지만 파일 단위로는 전체 교체다 — 갱신된 설정 전체가 대상 계층 문서가 된다.

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
- `applyConfigUpdates` 는 dot-path 마다 불변 갱신을 적용하고 없는 중간 객체를 만든다. 같은 호출의 여러 경로는 `updates` 의 키 순서대로 누적된다.
- 반환값은 기록된 문서와 같은 갱신 후 설정 전체다.
- `scope: 'project'` 는 `<project_root>/.imbas/config.json`, `'user'` 는 모든 워크스페이스가 상속하는 호스트 설정 파일에 기록한다.
- 기록 전에 `ImbasConfigSchema` 로 재검증하지 않는다 — `saveConfig` 는 문서를 그대로 원자적으로 쓴다. 스키마를 벗어난 값은 이 호출이 아니라 다음 `loadConfig` 파싱에서 드러난다.
- 배럴은 `handleConfigSet` 만 노출한다.

## Acceptance Criteria

### AC-scope-required — 기록 계층 명시

- `scope` 없는 호출은 MCP 스키마 검증에서 거부된다 — 핸들러가 임의 계층을 고르지 않는다.
- `scope` 가 지목한 파일만 바뀐다. 다른 계층 파일은 그대로다.

### AC-multi-path-updates — 다중 dot-path 적용

- 한 호출의 여러 dot-path 가 모두 반영된 설정이 반환되고 같은 내용이 파일에 남는다.
- 없는 중간 경로는 새 객체로 만들어진다.

### AC-effective-base — 병합값 기준 적용

- 업데이트는 병합된 유효 설정 위에 적용된다 — `user` 로 기록해도 결과 문서는 갱신 시점의 유효 설정 전체다.

## Last Updated

2026-07-30 — 계층 기록 계약과 유효 설정 기준 적용 규약을 문서화했다.
