# Config Scope 진행 원장 (issue #103)

계획: [config-scope-implementation-plan.md](./config-scope-implementation-plan.md)

이 파일은 `/seiri:execute`의 진행 원장이다. 대화 기억은 압축을 넘기지 못하므로,
재개할 때는 회상이 아니라 이 원장과 git 히스토리를 신뢰한다. 완료로 표시된
작업은 다시 하지 않는다.

## 상태

| 작업                   | 상태    | 검증                                 |
| ---------------------- | ------- | ------------------------------------ |
| 1 — configScope/merge  | 완료    | vitest 43 pass                       |
| 2 — configScope/layers | 완료    | vitest 71 pass (누적), typecheck 0   |
| 3 — 배럴·subpath·문서  | 완료    | build ok, 전체 362 pass, 런타임 확인 |
| 4 — deilen (정본)      | 완료    | vitest 143 pass, typecheck 0, lint 0 |
| 5 — seiri              | 진행 중 | —                                    |
| 6 — filid              | 대기    | —                                    |
| 7 — cennad             | 대기    | —                                    |
| 8 — imbas              | 대기    | —                                    |
| 9 — atlassian          | 대기    | —                                    |
| 10 — entrez            | 대기    | —                                    |
| 11 — maencof-lens      | 대기    | —                                    |
| 12 — r-statistics      | 대기    | —                                    |
| 13 — 문서·전역 검증    | 대기    | —                                    |

## 작업 1 — `configScope/merge` 순수 원시 함수 (완료)

**landed**: `shared/cross-platform/src/configScope/`

- `types/types.ts` — 5개 타입 (`ConfigScope`, `ConfigLayerPaths`,
  `ConfigLayerDocuments`, `ConfigScopeState`, `ResolveConfigLayersOptions`)
- `merge/mergeConfigLayers.ts` — 재귀 병합, 배열 통째 교체, 불변, 키 차단
- `merge/listOverriddenPaths.ts` — project 리프의 dot path
- `merge/clearConfigPaths.ts` — dot path 삭제
- `merge/utils/{isPlainObject,forbiddenKeys,removePath}.ts`
- `merge/index.ts`, `merge/INTENT.md`
- `merge/__tests__/` 5개 스펙

**검증**: `yarn vitest run src/configScope` → 5 files, **43 pass**.

**가드가 실제로 물리는지 확인함.** `FORBIDDEN_KEYS` 차단 3곳을 일시 제거하고
실행해 **6건이 의도한 이유로 실패**하는 것을 관찰한 뒤 복원했다.

- `expected { polluted: 'x' } to be { …(12) }` — `Object.getPrototypeOf(merged)`가
  `Object.prototype` 대신 오염된 객체를 반환
- `expected true to be false` — `constructor`가 own key로 생존
- `expected [ '__proto__.polluted', …(2) ] to deeply equal [ 'theme' ]` —
  `listOverriddenPaths`가 금지 키를 열거
- `expected { a: 1 } to be { __proto__: {…}, a: 1 }` — `removePath`가 건드리면
  안 되는 own `__proto__`를 삭제

## 계획 대비 편차

### 편차 1 — `pureImports.test.ts`가 `__tests__/`를 스캔에서 제외 (작업 1-8)

계획은 "`merge/` 아래 모든 `.ts`"라고 적었으나, 그 테스트 자신이 소스를 읽기
위해 `node:fs`를 쓴다. `__tests__/`를 제외하지 않으면 자기 자신을 위반으로
보고한다. 테스트는 번들에 들어가지 않으므로 금지 대상이 아니다.

### 편차 2 — 오염 테스트 단언 강화 (작업 1-8)

계획의 단언(`({}).polluted === undefined`, `hasOwn(merged,"polluted") === false`,
`toEqual`)은 **이 구현에서 가드를 빼도 통과한다.** 계획은 참조 구현처럼
in-place 병합일 때의 전역 `Object.prototype` 오염을 상정했는데, 이 구현은
불변이라 오염이 **결과 객체의 프로토타입**으로 나타난다. `toEqual`은 상속
속성을 세지 않아 차이를 못 본다.

그래서 단언에 `Object.getPrototypeOf(merged)).toBe(Object.prototype)`와 상속
조회(`merged.polluted`)를 추가했다. `clearConfigPaths`의 `__proto__` 케이스도
리터럴 대신 `JSON.parse`로 own key를 만들도록 바꿨다 — 리터럴은
`Object.hasOwn`이 먼저 걸러 가드를 검증하지 못한다.
