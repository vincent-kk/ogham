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
| 5 — seiri              | 완료    | vitest 131 pass, typecheck 0, lint 0 |
| 6 — filid              | 완료    | vitest 882 pass, 훅 번들 가드 통과   |
| 7 — cennad             | 완료    | vitest 735 pass, 훅 9768/10240       |
| 8 — imbas              | 완료    | vitest 301 pass, typecheck 0, lint 0 |
| 9 — atlassian          | 완료    | vitest 387 pass, typecheck 0, lint 0 |
| 10 — entrez            | 완료    | vitest 191 pass, typecheck 0, lint 0 |
| 11 — maencof-lens      | 완료    | vitest 73 pass, typecheck 0, lint 0  |
| 12 — r-statistics      | 범위 밖 | config 소비자 0건 — 아래 편차 14     |
| 13 — 문서·전역 검증    | 완료    | 전역 4834 pass, build:all OK         |

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

### 편차 3 — `writeConfigLayer`에 `directoryMode` 추가 (작업 2-3)

계획은 `fileMode`만 뚫어뒀는데, deilen이 상태 디렉터리를 `0o700`으로 만든다.
파일 mode만 통과시키면 공유 계층으로 옮기는 순간 디렉터리 권한이 조용히
넓어진다. 옵션에 `directoryMode`를 더하고 테스트 1건을 추가했다.

### 편차 4 — deilen `configLayers()`를 `core/configManager/utils/`에 배치 (작업 4-1)

계획은 `constants/paths.ts`를 지목했으나, 이 함수는 `tryProjectRoot()`로
환경을 읽으므로 상수가 아니다. `constants/`를 상수 organ으로 유지하려고
configManager 하위로 옮겼다.

### 편차 5 — deilen `loadConfig`가 `buildConfigScopeState`를 쓰지 않음 (작업 4-2)

마이그레이션이 **읽기와 병합 사이**에 들어가야 한다. 병합 결과를 마이그레이션해
되쓰면 project 재정의가 user 기준선에 구워진다. 그래서
`readConfigLayers` → `migrateUserLayer` → `mergeConfigLayers`로 조립했다.
공유 `INTENT.md`의 규약도 "병합은 언제나 `mergeConfigLayers`로 한다"로
정확히 고쳐 적었다 — 그것이 진짜 불변식이고, `buildConfigScopeState`는 중간
단계가 없는 소비자를 위한 편의다.

같은 이유로 `persistLastIntent`가 병합 결과 대신 user 레이어 원문만 되쓴다.

### 편차 6 — seiri는 레이어를 병합하지 않고 따로 읽는다 (작업 5)

dial은 한 키라 병합 결과가 `??` 체인과 다르지 않고, seiri의 렌더 계약은
"어느 레이어가 그 값을 줬는가"(`InterventionSource`)다. 병합은 그것을 말해줄
수 없다. 좌표 해석만 `resolveConfigLayers`를 쓰고, 읽기는 기존 `readDialFile`
per-layer를 유지했다.

### 편차 7 — seiri 설정 페이지에 재정의 해제 버튼 없음 (작업 5)

seiri의 project 레이어는 팀이 커밋으로 소유하는 파일이라, 없애는 일은 설정
클릭이 아니라 git 작업이다. 배지만 두고 해제 버튼은 뺐다. 이 예외를
`cross-platform/DETAIL.md`의 설정 페이지 계약에 명문화했다.

또한 seiri 설정 스크립트는 번들러를 거치지 않는 독립 스크립트라(그쪽
`INTENT.md` 규약) `config-scope/merge`를 import할 수 없다. dial이 한 키뿐이라
`clearConfigPaths`가 필요 없어 문제가 되지 않았다.

### 편차 8 — seiri에 `vitest.setup.ts` 신설 (작업 5)

계획에 없던 파일이다. seiri 테스트에는 상태 루트 샌드박스가 없어서, user
레이어를 읽기 시작하는 순간 개발자의 실제 `~/.claude`를 보게 된다. 거기 저장된
dial이 모든 테스트에 샌 것이다. `CLAUDE_CONFIG_DIR`만 임시 디렉터리로 돌린다 —
`HOME`은 그대로 둔다(이 테스트들은 실제 git을 호출한다).

### 편차 9 — filid도 `vitest.setup.ts` 신설 (작업 6)

seiri와 같은 이유다. filid 테스트에도 상태 루트 샌드박스가 없어서, user 레이어를
읽기 시작하면 개발자의 실제 `~/.claude/plugins/filid/config.json`이 모든 테스트에
섞인다. `CLAUDE_CONFIG_DIR`만 임시 디렉터리로 돌린다.

### 편차 10 — filid 설정 페이지는 섹션 단위 배지 (작업 6)

계획의 DOM 계약은 필드 단위 `data-config-path`를 상정했으나, filid config는
`rules[id].{enabled,severity,exempt}`처럼 깊게 중첩된다. 필드마다 dot path를
붙이는 것은 이번 범위를 넘어서므로 config를 소유한 세 섹션
(`rules`·`language`·`structure`)에만 붙였다. 배지 판정은 prefix 매칭이라
`rules.max-depth.enabled` 재정의가 `rules` 섹션에 표시된다.

seiri와 같은 이유로 해제 버튼은 없다(커밋된 파일). 페이지가 minify만 거치고
번들되지 않아 `config-scope/merge`를 import할 수 없는 것도 seiri와 같다.

### 편차 11 — cennad `saveConfig`가 검증하지 않는다 (작업 7)

기존 INTENT는 "saveConfig 저장 전 ConfigSchema.parse 로 재검증"을 Always-do로
못박고 있었다. project 레이어는 재정의한 키만 담아 단독으로 스키마를 통과할 수
없으므로 이 계약을 뒤집었다. `saveConfig`는 검증하지 않는 영속 프리미티브가 되고,
유일한 호출자인 `/save` 핸들러가 병합 미리보기를 검증한다. INTENT를 그에 맞게
고쳤고, "잘못된 입력을 거부한다"던 테스트는 "부분 문서를 검증 없이 쓴다"로
계약을 바꿔 다시 썼다.

### 편차 12 — cennad 훅은 `process.cwd()`를 프로젝트 루트로 쓴다 (작업 7)

10 KB 번들 상한 때문이다. `tryProjectRoot()`를 쓰면 host-paths 그래프가 딸려온다.
호스트가 워크스페이스 안에서 훅을 띄우므로 cwd가 곧 워크스페이스다. 병합 추가
후 여유는 injectDynamic 472B(9768/10240), injectStatic 798B — 얇으니 다음 훅
변경 때 주시해야 한다.

### 편차 13 — cennad 설정 페이지는 필드 배지 없이 토글만 (작업 7)

cennad config는 레이어당 문서 전체를 편집하는 형태라 필드별 재정의 개념이
UI에 없다. 토글이 어느 파일을 쓰는지 이름과 경로로 말하고, 배지는 두지 않았다.

### 편차 14 — r-statistics 는 전환하지 않는다 (작업 12)

계획은 `src/constants/paths.ts` 의 `CONFIG_PATH` 상수를 보고 r-statistics 를
config 보유 플러그인으로 셌다. 실제로는 **그 상수의 참조가 0건**이다 — 저장소
전체에서 읽거나 쓰는 코드가 없고 `config.json` 을 언급하는 다른 파일도 없다.

```
$ grep -rn 'CONFIG_PATH' plugins/r-statistics --include='*.ts'
src/constants/paths.ts:9:export const CONFIG_PATH = join(R_STATISTICS_HOME, "config.json");
```

없는 설정에 네임스페이스를 붙이는 것은 아무도 읽지 않는 표면을 만드는
일이라(seiri_reuse-first §2) 전환하지 않았다. 이 상수는 이번 변경이 만든
dead code 가 아니므로 무관한 diff 에 묻어 지우지 않고 여기 적어둔다
(seiri_reuse-first §3). 정리하려면 별도 변경으로 다룬다.

**따라서 실제 적용 범위는 9개가 아니라 8개다.**

### 편차 15 — 설정 페이지 계약을 두 형태로 쪼갬 (작업 13)

계획의 DOM 규약은 모든 페이지가 필드별 배지를 갖는 것을 상정했다. 실제로는
플러그인이 두 부류로 갈린다.

| 형태         | 플러그인                                 | 규약                                            |
| ------------ | ---------------------------------------- | ----------------------------------------------- |
| A. 문서 단위 | `atlassian`, `cennad`, `entrez`, `imbas` | 토글 + 경로 힌트                                |
| B. 필드 단위 | `deilen`, `filid`, `seiri`               | 위에 더해 `data-config-path`·`data-scope-state` |

A 부류는 페이지가 레이어 하나의 문서 전체를 편집하므로 필드별 재정의 개념 자체가
없다. 없는 개념에 배지를 붙이면 "모든 필드가 재정의됨"으로 표시되어 거짓말이 된다.
`cross-platform/DETAIL.md` 의 계약을 두 형태로 나눠 적었다.

`data-config-path` 세밀도도 페이지가 정한다 — deilen 은 필드마다(23개), filid 는
config 를 소유한 섹션마다(3개, prefix 판정), seiri 는 dial 하나다.

## 최종 검증 (작업 13)

| 항목                | 결과                                                    |
| ------------------- | ------------------------------------------------------- |
| `yarn typecheck`    | 14 workspaces clean                                     |
| `yarn test:run`     | **4834 pass**, 20 skipped, 3 파일 실패(전부 기존 jsdom) |
| `yarn lint`         | 4 errors — 전부 기존 jsdom (stash 후 동일 확인)         |
| `yarn build:all`    | 전 워크스페이스 통과, 훅 번들 가드 전부 통과            |
| `docs:format:check` | exit 0                                                  |
| 설정 페이지 대조    | 7곳 전부 `config_scope` 토글 보유                       |

훅 번들 여유: filid pre-tool-use 25887/32768 · user-prompt-submit 12273/16384,
cennad injectDynamic **9768/10240** · injectStatic 9442/10240. cennad 쪽이 얇으니
다음 훅 변경 때 주시한다.

## 알려진 미결 사항

- ~~`plugins/deilen/public/settings.html`이 stale~~ — 작업 13의 `yarn build:all`
  이 저장소 공식 빌드로 재생성했다. 스코프 UI가 실제로 서빙된다.
- deilen viewer 테스트 3건은 `jsdom` 미설치로 **이번 변경 전부터** 실패한다
  (stash 후 동일 실패 확인). 범위 밖.
