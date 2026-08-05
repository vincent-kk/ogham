# configManager — Contract

## Requirements

- 설정은 `user` 와 `project` 두 계층이다. `project` 는 `<cwd>/.imbas/config.json`, `user` 는 호스트 상태 루트에 있으며 `project` 가 `user` 를 재정의한다.
- 스키마 검증은 **병합 결과에만** 건다. `project` 계층은 재정의한 키만 담으므로 단독으로는 스키마를 통과할 수 없다.
- 저장 대상 계층은 호출자가 지목한다. 기본값을 두지 않는다 — 둘 다 유효한 대상이라 조용한 기본값은 잘못된 파일을 덮어쓴다.
- 두 계층이 모두 없는 상태는 오류가 아니라 정상이다. 검증된 기본값을 돌려준다.
- 병합 결과를 어느 한 계층에 되쓰지 않는다. 되쓰면 `project` 재정의가 `user` 기본값으로 구워진다.

## API Contracts

```typescript
export interface ConfigByScope {
  /* 계층별 원본 값 */
}

export async function loadConfig(cwd: string): Promise<ImbasConfig>;
export async function loadConfigByScope(cwd: string): Promise<ConfigByScope>;
export function loadConfigScope(cwd: string): ConfigScopeState;
export async function saveConfig(/* scope 필수 */): Promise<void>;
export async function updateConfigLayer(/* 계층 원본에 dot-path 적용 */): Promise<ImbasConfig>;
export function getConfigValue(config: ImbasConfig, dotPath: string): unknown;
```

- `loadConfig` 는 병합된 유효 설정 하나를 준다.
- `updateConfigLayer` 는 지목한 계층의 **원본 문서**에 dot-path 업데이트를 적용해 그 계층만 다시 쓰고, 새 유효 설정을 반환한다 — 병합-되쓰기 금지를 지키는 계층 부분 갱신 경로다. 쓰기 전에 갱신이 만들 병합 결과를 스키마로 검증하며, 벗어나면 파일을 바꾸지 않고 거부한다.
- `loadConfigByScope` 는 계층별 원본 값을, `loadConfigScope` 는 계층 문서 경로와 재정의 상태를 준다. 설정 페이지는 이 둘을 쓴다.
- 계층 좌표 해석은 `utils/configLayers.ts` 가 담당하는 organ 이며 배럴로 나가지 않는다. 경로 해석·병합 규칙 자체는 `@ogham/cross-platform` 이 소유하고 여기서 재구현하지 않는다.

## Acceptance Criteria

### AC-config-merge-only-validation — 병합 결과만 검증

- `project` 계층 파일 하나만 있고 필수 키가 빠져 있어도 `loadConfig` 가 병합 후 성공한다.
- `project` 계층 파일 단독으로 스키마 검증을 수행하는 경로가 없다.

### AC-config-explicit-scope — 저장 계층 명시

- `saveConfig` 의 scope 인자에 기본값이 없다.
- scope 없이 호출하면 타입 검사에서 실패한다.

### AC-config-absent-layers-ok — 계층 부재 허용

- 두 계층 파일이 모두 없는 디렉터리에서 `loadConfig` 가 throw 하지 않고 검증된 기본값을 반환한다.

### AC-config-no-merged-writeback — 병합 결과 되쓰기 금지

- `saveConfig` 가 쓰는 내용이 `loadConfig` 의 병합 결과가 아니라 지목된 계층의 값이다.

### AC-config-no-direct-fs — 직접 파일 I/O 부재

- `configManager/**` 에 `fs.writeFileSync` 직접 호출이 없다.

### AC-config-layer-sparse-update — 계층 부분 갱신

- `updateConfigLayer('project', …)` 뒤 프로젝트 파일에는 기존 project 키와 갱신 키만 있다 — user 계층에서 오던 값이 배어들지 않고, 이후 user 계층 변경이 병합 결과에 계속 반영된다.
- 갱신이 만들 병합 결과가 스키마를 벗어나면 거부되고 대상 파일은 그대로다.

## History

- 2026-08-06 — 동작 테스트 관찰: `config_set` 이 병합 유효 설정을 계층에 통째로 기록해 user 계층 값(v1 잔존 `github.repo` 등)이 프로젝트 파일에 구워졌다. 되쓰기 금지 계약(AC-config-no-merged-writeback)에 맞는 계층 부분 갱신 경로로 `updateConfigLayer` 를 추가하고, 소비자를 잃은 `setConfigValue`·`applyConfigUpdates` 를 표면에서 내렸다.

## Last Updated

2026-08-06 — 계층 부분 갱신 경로(`updateConfigLayer`)와 병합 사전 검증 계약을 추가했다.
