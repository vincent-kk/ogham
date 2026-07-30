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

외부 소비자는 `@ogham/cross-platform` 패키지 루트 하나에서 이 fractal의 공개
심볼을 가져온다. `index.ts`, `merge/`, `layers/`의 중간 배럴은 패키지 내부 조직과
루트 재노출을 위해 남아 있으며 `package.json`의 별도 공개 주소가 아니다.

- 레이어 4종 — `resolveConfigLayers`·`readConfigLayers`·`writeConfigLayer`·`buildConfigScopeState`
- 병합 6종 — `mergeConfigLayers`·`listOverriddenPaths`·`clearConfigPaths`·
  `stripForbiddenKeys`·`FORBIDDEN_KEYS`·`isPlainObject`
- 타입 5종 — `ConfigScope`·`ConfigLayerPaths`·`ConfigLayerDocuments`·
  `ConfigScopeState`·`ResolveConfigLayersOptions`

`stripForbiddenKeys`·`FORBIDDEN_KEYS`·`isPlainObject` 는 기존 공개 계약을 유지하기
위해 패키지 루트에서도 재노출한다. 소비처 없는 export 정리는 별도 후속 작업이다.

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

### SCOPE-2 — 루트 import가 번들 경계를 지킨다

- 브라우저 설정 페이지와 훅은 패키지 루트에서 필요한 심볼만 import한다.
- 패키지의 `sideEffects: false`와 emitted-byte·출력 금지 패턴 가드가 비기여
  재노출 그래프가 최종 번들에 남지 않음을 확인한다.
- `merge` 하위에는 node 내장 import가 없다. `merge/__tests__/pureImports.test.ts`
  가 이를 회귀로 고정한다.

### SCOPE-3 — 저장 대상 레이어는 언제나 명시된다

- 쓰기 표면(`writeConfigLayer`, 각 플러그인의 save 경로, `config_set` 도구)은
  `scope` 를 필수로 받는다. 기본값을 두면 프로젝트 결정이 사용자 파일에
  들어가거나 그 반대가 된다.
- 저장 문서는 고른 레이어에서 출발한다. 병합 결과에서 출발하면 `user` 저장이
  project 재정의를 user 파일에 구워 넣는다.

## Last Updated

2026-07-30 — 외부 공개 주소를 패키지 루트로 통합하고 기존 병합 심볼 계약을
그 루트에서 유지했다.
