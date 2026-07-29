# configScope — user·project 두 계층 설정

## Requirements

- 플러그인 설정을 `user`(사용자 전역)와 `project`(프로젝트 로컬) 두 네임스페이스로
  나눠 각각 읽고 쓰게 하고, 소비자에게는 project가 user를 재정의한 단일 병합
  결과를 준다.
- 레이어 우선순위는 `user < project` 로 고정한다. 세션 밸브 같은 상위 레이어를
  더 얹는 것은 각 플러그인의 몫이다.
- 스키마를 모른다. 소비자는 병합 결과만 검증한다 — project는 재정의된 키만 담은
  부분 문서라 단독으로는 strict 스키마를 통과할 수 없다.
- 프로젝트 루트는 호출자가 해석해 넘긴다. 앵커 규칙이 플러그인마다 다르다.
- 위험 키를 거르는 지점은 병합 한 곳이다. 레이어 원문을 정화하지 않는다.

## API Contracts

세 개의 진입점을 `package.json` `exports` 로 낸다. 소비자는 필요한 표면만 잡는다.

| Subpath                              | 노출                                                                                                                                                        |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@ogham/cross-platform/config-scope` | `resolveConfigLayers`·`readConfigLayers`·`writeConfigLayer`·`buildConfigScopeState`·`mergeConfigLayers`·`listOverriddenPaths`·`clearConfigPaths` + 타입 5종 |
| `.../config-scope/merge`             | 위 병합 3종 + `stripForbiddenKeys`·`FORBIDDEN_KEYS`·`isPlainObject` (자세한 계약은 `merge/DETAIL.md`)                                                       |
| `.../config-scope/layers`            | 위 레이어 4종 (자세한 계약은 `layers/DETAIL.md`)                                                                                                            |

`stripForbiddenKeys`·`FORBIDDEN_KEYS`·`isPlainObject` 는 `merge` subpath에만
있다. 형제 fractal `layers/` 가 소비하므로 그 자리에 정당하며, 이 배럴이나 패키지
루트로는 올리지 않는다 — 그 위에는 소비자가 없다.

```ts
type ConfigScope = "user" | "project";
type ConfigLayerPaths = { user: string; project: string | null };
type ConfigLayerDocuments = {
  user: Record<string, unknown> | null;
  project: Record<string, unknown> | null;
  warnings: readonly string[];
};
type ConfigScopeState = {
  paths: ConfigLayerPaths;
  layers: ConfigLayerDocuments;
  effective: Record<string, unknown>;
  overridden: readonly string[];
};
```

`ConfigScopeState` 는 설정 페이지 7곳의 wire 계약이다. 필드를 바꾸면 그 7곳을
함께 본다. 형태별 허용 범위는 `shared/cross-platform/DETAIL.md` 의 "설정 페이지
계약" 절이 정본이다.

## Acceptance Criteria

### SCOPE-1 — 병합은 한 곳에서만 일어난다

- 런타임과 설정 페이지가 같은 `mergeConfigLayers` 를 거친다. 다르게 합치면
  "보이는 값"과 "먹는 값"이 갈라진다.
- 읽기와 병합 사이에 낄 단계가 없는 소비자는 `buildConfigScopeState` 하나를
  부른다.

### SCOPE-2 — 번들 경계가 subpath로 갈린다

- 브라우저 설정 페이지 번들과 훅 번들은 `config-scope/merge` 만 import한다.
  루트 배럴은 파일 I/O와 `env-paths` 그래프를 끌어온다.
- `merge` 하위에는 node 내장 import가 없다. `merge/__tests__/pureImports.test.ts`
  가 이를 회귀로 고정한다.

### SCOPE-3 — 저장 대상 레이어는 언제나 명시된다

- 쓰기 표면(`writeConfigLayer`, 각 플러그인의 save 경로, `config_set` 도구)은
  `scope` 를 필수로 받는다. 기본값을 두면 프로젝트 결정이 사용자 파일에
  들어가거나 그 반대가 된다.
- 저장 문서는 고른 레이어에서 출발한다. 병합 결과에서 출발하면 `user` 저장이
  project 재정의를 user 파일에 구워 넣는다.

## Last Updated

2026-07-29 — 세 subpath의 공개 표면을 이 문서로 확정하고,
`FORBIDDEN_KEYS`·`isPlainObject` 를 `merge` subpath 전용으로 되돌렸다.
