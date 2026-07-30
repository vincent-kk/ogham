# configScope/layers — 레이어 좌표·읽기·쓰기·상태 조립

## Requirements

- user와 project 두 config 레이어 파일의 절대 경로를 정하고, 읽고, 한 레이어를
  원자적으로 교체하고, 소비자가 한 번에 조회할 `ConfigScopeState` 로 조립한다.
- 좌표 계산과 디스크 조회를 분리한다 — `resolveConfigLayers` 는 파일을 보지 않는다.
- 프로젝트 루트를 스스로 추측하지 않는다. 앵커 규칙(git root / repo root / 인자
  cwd)이 플러그인마다 다르므로 해석된 절대 경로를 호출자가 넘긴다.
- 형제 모듈은 진입점으로 소비한다: `../merge`, `../../paths`, `../../filesystem`.
- `node:fs` / `node:path` 를 직접 호출하지 않는다.

## API Contracts

외부 소비자는 `@ogham/cross-platform` 패키지 루트에서 이 API를 가져온다.

```ts
resolveConfigLayers(options: ResolveConfigLayersOptions): ConfigLayerPaths;
readConfigLayers(paths: ConfigLayerPaths): ConfigLayerDocuments;
writeConfigLayer(
  paths: ConfigLayerPaths,
  scope: ConfigScope,
  document: Record<string, unknown>,
  directoryMode?: number,
): string;
buildConfigScopeState(paths: ConfigLayerPaths): ConfigScopeState;
```

user 레이어는 `pluginCache(pluginName)/config.json`, project 레이어는
`<projectRoot>/.<pluginName>/config.json` 이다. `projectRoot` 를 넘기지 않으면
project 경로는 `null` 이고, 그 상태는 "이 워크스페이스에는 project 레이어를 둘
자리가 없다"는 뜻이다.

`writeConfigLayer` 는 쓴 파일의 절대 경로를 반환한다. `scope` 는 필수이며 기본값이
없다 — 두 레이어 모두 유효한 대상이라 조용한 기본값은 반대편 파일을 쓰게 만든다.

`buildConfigScopeState` 는 읽기 + 병합 + 재정의 목록을 한 번에 조립한다. 읽기와
병합 사이에 낄 단계가 없는 소비자는 이 함수 하나로 끝낸다.

## Acceptance Criteria

### LAYERS-1 — 좌표는 파일을 보지 않고 정해진다

- `resolveConfigLayers` 는 디스크를 조회하지 않고 두 경로를 낸다.
- 경로 조합은 `paths` 진입점의 portable 연산을 거친다. 리터럴 `/` 를 쓰면
  Windows에서만 깨진다.
- `projectRoot` 부재 시 `project` 는 `null`, `user` 는 언제나 값을 갖는다.

### LAYERS-2 — 읽기는 던지지 않고 부재와 손상을 구별한다

- 파일이 없으면 해당 레이어는 `null`, 경고는 없다.
- 파싱에 실패하면 해당 레이어는 `null` 이고 `warnings` 에 사유가 남는다.
  손상된 config 하나가 세션을 죽여서는 안 된다.
- 읽기는 원문을 정화하지 않는다. `FORBIDDEN_KEYS` 를 발견해도 `warnings` 에만
  남긴다 — 손편집으로 들어온 키를 UI가 감추면 파일 내용과 화면이 갈라진다.

### LAYERS-3 — 쓰기는 한 레이어만, 원자적으로

- `writeConfigLayer` 는 지목된 레이어만 교체하고 반대편은 손대지 않는다.
- 쓰기는 `ensureDirectorySync` 와 `writeFileAtomicallySync` 를 거친다.
- 쓰기 전에 `stripForbiddenKeys` 를 적용한다. 한번 파일에 들어가면 정상 경로로는
  빠져나올 길이 없다.
- `scope: "project"` 인데 project 경로가 `null` 이면 던진다. 조용히 user에 쓰지
  않는다.

### LAYERS-4 — 상태는 원문·병합·재정의를 함께 싣는다

- `ConfigScopeState` 는 두 레이어 원문(`layers`), 병합 결과(`effective`),
  project가 재정의한 dot path 목록, 두 레이어 경로(`paths`)를 담는다.
- 병합은 `../merge` 의 `mergeConfigLayers` 로만 한다. 런타임과 설정 페이지가
  다르게 합치면 "보이는 값"과 "먹는 값"이 갈라진다.

## Last Updated

2026-07-30 — 외부 공개 주소를 패키지 루트로 통합하면서 레이어 연산 계약을
그대로 유지했다.
