# 레이어별 설정값 표시 — 진행 원장

계획: [scope-values-plan.md](./scope-values-plan.md)

`/seiri:execute`의 진행 원장이다. 대화 기억은 압축을 넘기지 못하므로, 재개할
때는 회상이 아니라 이 원장과 git 히스토리를 신뢰한다. 완료로 표시된 작업은
다시 하지 않는다.

## 상태

| 작업            | 상태 | 검증                               |
| --------------- | ---- | ---------------------------------- |
| 1 — 계약 문서   | 완료 | `docs:format:check` 0/891          |
| 2 — cennad      | 완료 | 742 pass, build ok, 브라우저 실측  |
| 3 — seiri       | 완료 | 148 pass, build ok, 브라우저 실측  |
| 4 — filid       | 완료 | 898 pass, build ok, 브라우저 실측  |
| 5 — imbas       | 완료 | 301 pass + wiring 3, 브라우저 실측 |
| 6 — entrez      | 완료 | 191 pass + wiring 3, 브라우저 실측 |
| 7 — atlassian   | 완료 | 390 pass, 브라우저 실측            |
| 8 — deilen 대조 | 완료 | 코드 변경 없음, 계약 문구 정정     |
| 9 — 문서·전역   | 완료 | 아래 "전역 검증"                   |

## 작업 1 — 계약 문서 (완료)

`shared/cross-platform/DETAIL.md` "설정 페이지 계약"에 두 문단 추가: 토글이
움직이면 폼을 다시 채운다는 규약(`user` = 레이어 단독, `project` = effective)과
정규화를 서버가 한다는 것(`configByScope`). `## Last Updated`에 한 줄.

**검증**: `yarn docs:format:check` → exit 0, `Would format 0/891`.

## 작업 2 — cennad 참조 구현 (완료)

**landed**:

- `core/configManager/operations/loadConfigByScope.ts` (신규) — user 뷰는
  **project 좌표를 `null`로 둔 채 같은 `loadConfig`를 다시 태워** 얻는다.
  정규화·기본값·fallback home 판정이 한 곳에만 남는다.
- `core/configManager/index.ts` — `loadConfigByScope` · `ConfigByScope` 재노출
- `webServer/routing/routeContext.ts` — ctx에 `loadConfigByScope`
- `webServer/handlers/handleGetRoot.ts` — `config`(= project 뷰) + `configByScope`
- `pages/settings/scripts/app.js` — `configByScope` 보관 + `viewForScope()` ·
  `applyScopeConfig()`, 토글 change에서 폼 재적재
- `__tests__/loadConfigByScope.test.ts` (신규 4건),
  `pages/settings/__tests__/settingsScopeWiring.test.ts` (신규 3건)

**검증**: `test:run` **742 pass**(기존 735 + 7), typecheck clean, build ok
(훅 번들 가드 LIGHT ≤ 10240 통과).

**가드가 무는 것을 관찰함.** 새 로더 테스트는 심볼 부재로 실패하는 것을 먼저
봤다. wiring 테스트는 `applyScopeConfig()` 한 줄을 일시 제거해 "re-seats the
form when the scope toggle moves" 1건이 의도한 이유로 red가 되는 것을 확인하고
복원했다.

**브라우저 실측** (playwright, 빌드된 `public/settings.html` + 렌더 하네스).
user 레이어 `intervention_strength: 0` · `session_ttl_hours: 24`, project 레이어
`2` · `6`을 실제 파일로 심고 진짜 `loadConfigByScope`가 만든 상태를 주입했다:

| 조작         | checked | strength | ttl | 경로 힌트             |
| ------------ | ------- | -------- | --- | --------------------- |
| 열었을 때    | project | 2        | 6   | `.cennad/config.json` |
| User 클릭    | user    | 0        | 24  | user `config.json`    |
| Project 클릭 | project | 2        | 6   | `.cennad/config.json` |

페이지 에러 0건.

### 편차 1 — config 읽기 seam을 하나로 합쳤다

계획은 `loadConfigByScope`를 **더하는** 것이었다. 실제로 더해보니
`startSettingsServer`의 주입 지점이 둘로 갈렸고, `loadConfig`만 stub한 기존
테스트 2건이 새 경로에서 진짜 파일을 읽어 red가 됐다. 증상이 아니라 원인은
"서버가 config를 읽는 길이 둘"이라는 것이다.

그래서 `StartSettingsServerOptions.loadConfig`를 **제거하고**
`loadConfigByScope` 하나만 주입받는다. 핸들러가 쓰는 병합 뷰는 그것의
`.project`에서 파생한다 — 한쪽을 stub하고 다른 쪽으로 실제 파일을 읽는 일이
구조적으로 불가능해진다. 테스트 fixture는 `bothLayers(config)` 헬퍼로 같은
의도를 유지했고, **단언은 한 줄도 고치지 않았다**.

### 관찰 — `currentConfig`는 원래부터 쓰이지 않는 캐시다

`webServer.ts`의 모듈 지역 `currentConfig`는 대입만 되고 읽히는 곳이 없다.
restructure 중 마지막 read를 없앴더니 TS6133이 떴고, **원래 형태(대입 후 반환)를
그대로 두는 쪽으로 되돌렸다.** 이 작업이 만든 것이 아니므로 제거하지 않는다.
`saveAndReloadConfig`의 재적재도 `loadCalls === 2`를 단언하는 기존 테스트가
고정하고 있어 손대지 않았다.

## 작업 3 — seiri (완료, 서버 로더 변경 없음)

**landed**: `pages/settings/scripts/app.js` — `dialForScope()`(user는 자기 파일
단독, project는 없으면 user 상속)와 `seatLayer()`(레이어마다 체크박스 맵을 다시
만든다). `useLayer()`가 둘 다 부른다. 신규 wiring 검사 3건.

**계획에 없던 결함을 하나 고쳤다.** 계획 3-2가 확인만 하려던 것이 사실이었다:
`useLayer()`는 `entries`만 바꾸고 `selections`·`resync`는 이전 레이어의 것을
그대로 썼다. 두 채널의 배포 상태가 다르면 체크박스가 **떠나온 레이어의 답**을
말한다. `seatLayer()`가 로드 때와 같은 규칙으로 다시 만든다.

**`SettingsPageState.config` 제거.** 다이얼을 레이어에서 읽게 되자 이 필드를
읽는 곳이 사라졌다(`configExists`만 남는다). 게다가 그 값은 `loadIntervention`
의 effective라 **세션 밸브**까지 반영했다 — 편집 대상이 아닌 레이어의 값이
저장 폼에 앉아 있었다는 뜻이다. 필드와 `loadIntervention` 호출을 함께 걷어냈다.

**검증**: `test:run` **148 pass**(기존 145 + 3), typecheck clean, build ok.
wiring 검사 3건이 구현 전에 의도한 이유로 실패하는 것을 관찰했다.

**브라우저 실측**: user 레이어 dial `advisory` + `seiri_naming` 1건 배포,
project 레이어 dial `strict` + 배포 0건으로 실제 파일을 심고 진짜
`buildSettingsState`가 만든 상태를 주입했다.

| 조작    | dial     | 체크된 규칙                    | 채널      |
| ------- | -------- | ------------------------------ | --------- |
| User    | advisory | `seiri_naming` 1건             | user 채널 |
| Project | strict   | recommended 4건 (배포 0이므로) | 프로젝트  |

페이지 에러 0건.

## 작업 4 — filid (완료)

**landed**:

- `loaders/loadConfig.ts` — 두 번째 인자 `layers: ConfigLayerPaths = configLayers(projectRoot)`
  추가(순수 확장, 기존 호출자 동작 보존)
- `loaders/loadConfigByScope.ts` (신규) + 배럴 재노출
- `openSettings/utils/buildSettingsState.ts` · `types/settingsTypes.ts` —
  `config` → `configByScope: { user, project }`
- `pages/settings/scripts/app.js` — `activeConfig()` · `adapterId()` ·
  `renderRules()`(리스트를 비우고 다시 그림) · `prefillConfig()` ·
  `applyScopeConfig()`
- 신규 검사 6건 (`__tests__/loadConfigByScope.test.ts` 3, 페이지 wiring 3)

**저장 문서의 출처도 바꿨다.** `collectConfig()`가 `state.config`(병합 결과)를
복사해 시작하고 있었다. User로 저장하면 **project의 재정의가 user 파일로
구워진다** — 레이어가 분리되지 않는 진짜 결함이다. 이제 `activeConfig()`에서
시작한다. wiring 검사가 이 한 줄을 고정한다.

**테스트 격리 하나 추가.** user 레이어는 호스트 상태 루트에 있어 테스트 파일당
한 개다. 앞 케이스가 쓴 user 설정이 다음 케이스로 새어 "user 뷰가 비어 있다"가
red였다 — `seedRepo()`가 그 파일을 지우고 시작한다.

**검증**: `test:run` **898 pass**(기존 895 + 3; 페이지 wiring 3건 포함하면
러너 기준 그대로), typecheck clean, build ok(훅 번들 가드 3종 통과).

**브라우저 실측**: user `language: ko` · `maxDepth: 4`, project 부분 문서가
`en` · `9`로 재정의. 토글 왕복에 두 필드가 `en/9` ↔ `ko/4`로 따라갔고 경로
힌트도 함께 바뀌었다. 페이지 에러 0건.

## 작업 5 — imbas (완료)

**landed**: `core/configManager/configManager.ts`에 `loadConfigByScope`(두 뷰를
같은 `ImbasConfigSchema.parse`로 통과시켜 둘 다 완결 문서가 된다) — `loadConfig`
는 그 `project`를 돌려주도록 위임한다. `types/settings.ts`·`buildSettingsState`
는 `config` → `configByScope`. 페이지는 IIFE 다섯 덩어리를 `applyScopeConfig()`
하나로 모았다: `prefillProvider` · `prefillProjectRef` · `prefillGroups` ·
`renderJiraMaps` · `renderGithubAdvanced` + `syncProviderBlocks`.

**세션 값과 레이어 값을 갈랐다.** Jira 프로젝트 `<option>` 목록은 bootstrap에서
오지 레이어에서 오지 않는다. 토글마다 다시 그리면 옵션이 쌓이므로
`populateProjectOptions()`만 1회 IIFE로 남겼다. 브라우저 실측에서 3회 착석 후에도
옵션 수가 늘지 않는 것을 확인했다.

**빈 값이 남지 않게 했다.** `prefillGroup`·`setValue`류가 값이 없으면 건너뛰던
것을 **항상 대입**으로 바꿨다 — 건너뛰면 떠나온 레이어의 값이 필드에 남는다.

**검증**: `test:run` **301 pass** + 신규 wiring 3건, typecheck clean, build ok.
브라우저 실측: user(`local`/`MYKEY`/`user-managed`) ↔ project(`jira`/`KAN`/
`proj-managed`)가 토글을 따라 왕복. 페이지 에러 0건.

## 작업 6 — entrez (완료)

**landed**: `core/config/operations/loadConfigByScope.ts`(신규, cennad 형태) +
배럴, `RouteContext.loadConfigByScope`, `handleGetRoot`가 `buildStatus`를
레이어마다 한 번씩 불러 `configByScope`를 싣는다. 페이지는 `prefillConfig()`와
1회성 `prefillOnce()`로 갈랐다.

**credentials는 레이어가 아니다.** api_key(별도 credentials 파일)와 다운로드
경로 제안(호스트 산출)은 어느 레이어의 것도 아니라 1회만 앉힌다 — datalist를
다시 채우면 옵션이 중복된다. wiring 검사가 이 분리를 고정한다.

**seam이 갈리지 않는다.** entrez의 ctx는 필수 필드라 `loadConfigByScope`를 빠뜨린
두 테스트가 **컴파일 에러**로 잡혔다. cennad에서 런타임에 드러난 문제가 여기선
타입 시스템에서 막힌다.

**검증**: `test:run` **191 pass** + 신규 wiring 3건, typecheck clean, build ok.
브라우저 실측: user(`user@example.org`/`/tmp/user-downloads`) ↔ project
(`project@example.org`/`/tmp/proj-downloads`) 왕복, datalist 옵션 4개 고정.

## 작업 7 — atlassian (완료)

**landed**: `webServer/utils/buildFormState.ts`(신규 — `handleGetRoot`가 인라인
으로 조립하던 status + 사이트 편집 상태 + `deployment_type`을 추출),
`configManager.loadConfigByScope`, ctx·핸들러 결선, 페이지의 `viewForScope()` ·
`resetSiteEntries()` · `capturePristineFields()`/`restorePristineFields()`.

**두 가지를 되돌려야 다시 앉힐 수 있었다.** ① `prefillForm`은 사이트마다 행을
**append**한다 — 되돌리지 않으면 두 레이어의 사이트가 한 목록에 쌓인다.
② 필드는 마지막 값을 유지한다 — 설정이 없는 레이어로 옮기면 앞 레이어의 값이
그대로 남는다. 마크업이 들고 온 값을 첫 채움 전에 스냅샷해 그것을 바닥으로 쓴다.

**테스트 fixture의 두 갈래도 합쳤다.** `routes.test.ts`의 `makeContext`가
`loadConfigByScope`를 넘긴 `loadConfig`에서 **파생**한다 — 케이스는 config를 한
번만 말하고, fixture 안에서 두 값이 어긋날 수 없다. 단언은 고치지 않았다.

**검증**: `test:run` **390 pass**(+ wiring 2건 추가로 파일 내 5건),
typecheck clean, build ok. 브라우저 실측: user(`personal.atlassian.net`) ↔
project(`team.atlassian.net`) 왕복, 사이트 행 수 1 고정. 페이지 에러 0건.

## 작업 8 — deilen 대조 (완료, 코드 변경 없음)

세 가지를 대조했다.

1. `renderScope()`가 `populate(scope === 'user' ? layers.user : effective)`를
   부른다 — 이 계약 그대로다.
2. `populate()`의 필드별 `??` 기본값이 `constants/defaults.ts`의
   `DEFAULT_CONFIG`와 **전부 일치**한다(theme auto · auto_open true ·
   collect 600 · ttl 72 · idle 1 · port 0 · width 820 · font "" · renderers 3종
   true · 10/50/5). 드리프트 없음. 리터럴 중복 자체는 이 작업 이전부터 있던
   것이라 두었다 — 페이지가 번들되므로 상수를 import할 수는 있다.
3. 저장 응답의 `adoptState`가 폼을 다시 채우지만, 그 시점 상태는 방금 저장한
   문서라 사용자가 친 값이 덮이지 않는다.

**계약 문구를 대신 고쳤다.** 작업 1이 쓴 "정규화는 서버가 하고 페이지는
`configByScope`를 받는다"는 deilen의 형태(번들되어 기본값을 아는 페이지가
`layers.user`/`effective`를 고른다)를 배제하는 문장이었다 — 참조 구현을
계약 위반으로 만드는 문구다. 공통 규칙은 "**병합하지 말고 고르라**"이고,
`configByScope`는 스키마를 모르는 페이지가 쓰는 기본형이라고 고쳤다. 저장
문서도 고른 그 문서에서 출발한다는 규칙을 같은 문단에 넣었다(작업 4·5의
실제 결함이 그것이었다).

## 작업 9 — 문서와 전역 검증 (완료)

### INTENT 갱신 (전부 줄 수 중립)

| 문서                                        | 갱신                                          |
| ------------------------------------------- | --------------------------------------------- |
| `filid` · `seiri` 설정 페이지               | 토글이 폼을 그 레이어로 다시 앉힌다는 절 추가 |
| cennad·entrez·imbas·atlassian configManager | Structure 행에 `loadConfigByScope` 명시       |
| filid `configLoader`                        | `loaders/` 행에 레이어별 load 명시            |

`cennad`·`imbas`·`entrez`·`atlassian` **설정 페이지** INTENT에는 scope 관련 줄이
원래 없어 추가하지 않았다 — 헤더 통합 작업이 세운 "없던 표면을 이번에 만들지
않는다"를 그대로 따른다. 모든 파일이 편집 전 줄 수를 유지해 50줄 상한에 걸리지
않는다(가장 빡빡한 cennad configManager 50 · filid 페이지 49).

### 전역 검증

| 항목                     | 결과                                  |
| ------------------------ | ------------------------------------- |
| `yarn typecheck`         | 14 workspaces clean                   |
| `yarn test:run`          | **4913 pass**, 20 skipped, **실패 0** |
| `yarn lint`              | exit 0                                |
| `yarn build:all`         | exit 0, 훅 번들 가드 6종 통과         |
| `yarn docs:format:check` | exit 0 (`Would format 0/891`)         |

직전 기준선 4889에서 **+24**, 그리고 신규 검사가 정확히 24건이다(cennad 7 ·
seiri 3 · filid 6 · imbas 3 · entrez 3 · atlassian 2). 수가 맞는다는 것은 기존
검사를 하나도 잃지 않았다는 뜻이다.

### 빌드 산출물

6곳의 `public/settings.html`이 재생성됐다(deilen 제외 — 변경 없음). 이 산출물의
커밋은 사용자 몫이다.

## 검증 보강 — filid 규칙 목록도 실측했다

작업 4의 브라우저 실측은 config 필드(`language`·`maxDepth`)만 봤고 규칙 문서
목록은 보지 않았다. 요청이 규칙도 명시했으므로 따로 확인했다.

user 채널에만 `filid_code-placement.md`를 배포한 상태로 실측:

| 조작    | 필수 행 | 행별 대상                  | 채널 라벨     |
| ------- | ------- | -------------------------- | ------------- |
| User    | 4       | `rules/filid_*.md`         | user 채널     |
| Project | 4       | `.claude/rules/filid_*.md` | 프로젝트 채널 |

filid의 규칙 문서 4종은 **전부 필수(autoDeployed)** 라 체크박스 차이는 애초에
없다 — 레이어가 가르는 것은 배포 상태와 채널이고, 그것이 행마다 바뀐다.

**하네스 한계 하나**: `buildSettingsState(projectRoot)`는 플러그인 루트를 스스로
해석하므로 tsx 직접 실행에서는 `pluginRootResolved: false`가 나온다.
`CLAUDE_PLUGIN_ROOT`를 주어 해소했다 — 이 상태를 모르고 보면 "규칙 섹션이
비었다"로 오독하기 쉽다.
