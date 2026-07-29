# configScope/merge — 계층 문서 순수 연산

## Requirements

- 두 config 레이어 문서를 합치고, project가 재정의한 자리를 열거하고, 지정한
  경로를 지우고, 쓰기 전 위험 키를 턴다.
- 값의 의미를 모른다. plain object와 그 밖만 구분하며, 스키마 검증은 호출자 몫이다.
- 모든 함수가 순수하다. 입력을 변형하지 않고 새 객체를 반환한다.
- node 내장 모듈을 import하지 않는다. 이 모듈은 브라우저 설정 페이지 번들과 훅
  번들에 동시에 들어가므로, 내장 하나가 브라우저 번들을 깨고 훅 번들을 불린다.

## API Contracts

`@ogham/cross-platform/config-scope/merge` 가 이 fractal의 진입점이다.

```ts
mergeConfigLayers(
  base: Record<string, unknown> | null,
  override: Record<string, unknown> | null,
): Record<string, unknown>;
listOverriddenPaths(
  override: Record<string, unknown> | null,
): readonly string[];
clearConfigPaths(
  source: Record<string, unknown>,
  paths: readonly string[],
): Record<string, unknown>;
stripForbiddenKeys(
  document: Record<string, unknown>,
): Record<string, unknown>;
FORBIDDEN_KEYS: readonly string[];
isPlainObject(value: unknown): value is Record<string, unknown>;
```

`FORBIDDEN_KEYS` 와 `isPlainObject` 는 이 진입점에서만 노출한다. 형제 fractal
`layers/` 가 소비하므로 정당하며, 상위 `config-scope` 나 패키지 루트 배럴로는
올리지 않는다 — 그 위에는 소비자가 없다.

`stripForbiddenKeys` 는 `layers/writeConfigLayer` 가 쓰기 직전에 부르는 단계다.
상위 `config-scope` subpath는 이 심볼을 노출하지 않는다.

병합 우선순위는 `user < project`. 배열·원시값·`null` 은 override가 통째로
교체한다 — 인덱스 단위로 병합하면 project 레이어가 목록을 줄일 수 없다.

병합은 얕은 복사 기반이라 override가 건드리지 않은 중첩 객체는 base와 참조를
공유한다. 반환값은 읽기 전용으로 쓴다.

## Acceptance Criteria

### MERGE-1 — project가 user를 재정의한다

- 두 레이어에 같은 키가 있으면 project 값이 남는다.
- project에만 있는 키는 결과에 더해지고, user에만 있는 키는 보존된다.
- 중첩 plain object는 재귀 병합하고, 배열·원시값·`null` 은 통째로 교체한다.
- 입력 두 문서 모두 호출 뒤에도 변형되지 않는다.

### MERGE-2 — 위험 키는 대입 전에 걸러진다

- `__proto__`·`constructor`·`prototype` 은 병합 결과에 들어가지 않는다.
  입력이 디스크의 JSON이고 `JSON.parse` 가 `__proto__` 를 own key로 만들기 때문에
  실제 벡터다.
- `stripForbiddenKeys` 와 `mergeConfigLayers` 의 재귀 범위가 같다: plain object
  안으로만 들어가고 배열은 건드리지 않는다. 범위가 갈리면 쓰기와 병합이
  "위험한 키"를 서로 다르게 정의하게 된다.
- own key 판정은 `Object.hasOwn` 을 쓴다. `in` 은 프로토타입 체인을 본다.

### MERGE-3 — 재정의 열거와 삭제가 dot path로 왕복한다

- `listOverriddenPaths` 는 override 문서의 리프만 dot path로 낸다. 중간 객체
  경로는 내지 않는다.
- `clearConfigPaths` 는 받은 경로를 지우고 빈 상위 객체를 함께 정리한다.
- `listOverriddenPaths` 결과를 `clearConfigPaths` 에 그대로 넘기면 override가
  더하기 전 상태가 된다.

### MERGE-4 — 번들 가능성이 회귀로 고정된다

- `__tests__/pureImports.test.ts` 가 `__tests__/` 를 제외한 모든 소스를 스캔해
  `node:` import가 하나도 없음을 확인한다.

## Last Updated

2026-07-29 — 공개 연산 4개를 `operations/` organ으로 내리고 이 문서를 신설.
