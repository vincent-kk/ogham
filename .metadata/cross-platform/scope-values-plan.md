# 레이어별 설정값 표시 — 계획

선행: [scope-header-plan.md](./scope-header-plan.md) · [rule-scope-plan.md](./rule-scope-plan.md)

## 요청

설정 페이지가 **두 레이어의 값을 모두 들고 열리고**, scope 토글을 움직이면 그
레이어에 실제로 설정된 값이 폼에 앉아야 한다. 값이 없는 필드는 기본값이다.
규칙 목록도 같다 — project에 배포된 규칙과 user에 배포된 규칙은 다른 목록이다.

지금은 폼 값이 위치에 의존하지 않는다. 토글을 눌러도 화면은 그대로라, 어느
파일을 고치는 중인지 화면이 말해주지 않는다.

## 사용자가 정한 의미 (2026-07-29)

| scope     | 폼에 앉는 문서                                          |
| --------- | ------------------------------------------------------- |
| `user`    | **user 레이어 단독** + 그 플러그인의 기본값             |
| `project` | **effective** (project를 user 위에 병합, 기본값이 바닥) |

project에서 그 레이어에 없는 필드는 **상속된 유효값**을 보여준다 — 지금 실제로
먹고 있는 값이 화면에 있고, `data-scope-state` 배지가 `inherited`/`overridden`
으로 출처를 말한다. 기본값으로 되돌려 보여주는 안은 기각됐다: 저장이 전체
문서를 쓰는 페이지에서 사용자 레이어 설정이 기본값으로 덮이는 길이 열린다.

바뀌는 것은 **user 쪽 화면**이다. 지금은 user를 골라도 project가 재정의한 값이
보인다 — 그것이 "위치에 의존하지 않는다"의 실체다.

## 이미 있는 것 (새로 만들지 않는다)

- `ConfigScopeState`는 처음부터 `layers.user` · `layers.project` **원문**과
  `effective`를 함께 싣는다. 7곳 모두 이미 받고 있다. wire를 새로 뚫지 않는다.
- `plugins/deilen/.../scripts/app.js`는 **이미 이 동작을 한다** —
  `renderScope()`가 `populate(scope === 'user' ? state.layers.user : state.effective)`
  를 부른다. 이 작업은 나머지 여섯 곳을 그 형태로 맞추는 일이다.
- seiri·filid의 **규칙 목록은 이미 레이어별**이다 (`ruleDocs.layers.{user,project}`,
  토글 change에서 재렌더). 이 작업에서 다시 만들지 않는다 — 무결성만 확인한다.
- 각 플러그인의 `loadConfig`는 **레이어 좌표를 인자로 받거나** 루트에서 좌표를
  만든다. user 단독 문서는 "project 레이어를 끈 채로 같은 경로를 태우는 것"으로
  얻는다. 새 파서·새 기본값 테이블을 만들지 않는다.

## 전역 제약 (모든 작업이 상속)

- `ConfigScopeState`의 필드를 **바꾸지 않는다**. `shared/cross-platform`
  INTENT의 "Ask first" 항목이고, 7곳의 wire 계약이다. 새 데이터는 각 플러그인의
  자기 설정 상태(`SettingsPageState` 등)에 실린다.
- 설정 페이지 7곳은 **번들러를 거치지 않는 독립 스크립트**다(deilen만 esbuild로
  번들된다). 공유 모듈 import 금지, 프레임워크 금지, `innerHTML` 금지.
- 사용자 노출 문자열은 **영문만** (`[filid:lang]` 무관).
- **저장 의미를 바꾸지 않는다.** 어느 레이어에 무엇을 쓰는지는 그대로다. 이
  작업은 화면에 앉는 값만 건드린다.
- 토글을 옮기면 떠나는 레이어의 **미저장 편집은 따라오지 않는다.** 그 편집은
  그 레이어의 것이고, deilen이 이미 그렇게 동작한다. 초안을 레이어별로 들고
  있게 만들지 않는다 — 요청에 없고, 상속 뷰와 어긋난다.
- 새 wire 필드 이름은 **`configByScope`** 하나로 통일한다:
  `{ user: <user 레이어 단독 정규화 문서>, project: <effective 정규화 문서> }`.
  값의 타입은 플러그인마다 자기 것이다(entrez·atlassian은 자기 prefill 뷰).
- 서버 함수 이름도 통일한다: **`loadConfigByScope`**. 기존 `loadConfig`는
  그 결과의 `project`를 돌려주도록 위임시켜 병합·검증 경로를 하나로 둔다.
- 페이지는 채널 경로나 병합을 **조립하지 않는다.** 정규화는 스키마가 있는
  서버가 한다.

## 파일 지도

| 파일                                                                            | 책임                                        |
| ------------------------------------------------------------------------------- | ------------------------------------------- |
| `shared/cross-platform/DETAIL.md`                                               | 계약에 "레이어별 표시" 규약 추가            |
| `plugins/cennad/src/core/configManager/operations/loadConfigByScope.ts`         | 신규 — 두 뷰 조립 (참조 구현)               |
| `plugins/cennad/src/core/configManager/index.ts`                                | 이름 있는 재노출                            |
| `plugins/cennad/src/mcp/tools/openSettings/webServer/handlers/handleGetRoot.ts` | `configByScope` 주입                        |
| `plugins/cennad/src/mcp/tools/openSettings/webServer/routing/routeContext.ts`   | ctx에 loader 추가                           |
| `plugins/cennad/src/mcp/pages/settings/scripts/app.js`                          | 토글 change → `applyConfig`                 |
| `plugins/seiri/src/mcp/pages/settings/scripts/app.js`                           | 다이얼을 레이어에서 읽음 (서버 변경 없음)   |
| `plugins/filid/src/core/infra/configLoader/loaders/loadConfigByScope.ts`        | 신규                                        |
| `plugins/filid/src/mcp/tools/openSettings/utils/buildSettingsState.ts`          | `configByScope` 실음                        |
| `plugins/filid/src/mcp/pages/settings/scripts/app.js`                           | 재렌더 가능한 prefill                       |
| `plugins/imbas/src/core/configManager/configManager.ts`                         | `loadConfigByScope` 추가, `loadConfig` 위임 |
| `plugins/imbas/src/mcp/tools/openSettings/utils/buildSettingsState.ts`          | `configByScope` 실음                        |
| `plugins/imbas/src/mcp/pages/settings/scripts/app.js`                           | 재렌더 가능한 prefill                       |
| `plugins/entrez/src/core/config/operations/loadConfigByScope.ts`                | 신규                                        |
| `plugins/entrez/src/mcp/tools/setup/webServer/handlers/handleGetRoot.ts`        | `configByScope` 주입                        |
| `plugins/entrez/src/mcp/pages/settings/scripts/app.js`                          | 재렌더 가능한 prefill                       |
| `plugins/atlassian/src/core/configManager/configManager.ts`                     | `loadConfigByScope` 추가                    |
| `plugins/atlassian/src/mcp/tools/setup/webServer/utils/buildFormState.ts`       | 신규 — stateData 조립 추출                  |
| `plugins/atlassian/src/mcp/tools/setup/webServer/handlers/handleGetRoot.ts`     | 추출본 사용 + `configByScope`               |
| `plugins/atlassian/src/mcp/pages/settings/scripts/app.js`                       | 토글 change → `prefillForm`                 |
| 각 `INTENT.md`                                                                  | Conventions 한 줄                           |

deilen은 **변경 없음**. 작업 8이 무결성만 확인한다.

---

## 작업 1 — 계약 문서에 레이어별 표시를 적는다

**딜리버러블**: `shared/cross-platform/DETAIL.md`의 "설정 페이지 계약"이 무엇이
언제 폼에 앉는지 말하고, `yarn docs:format:check`가 통과한다.

### 1-1. "설정 페이지 계약" 절에 문단 추가

`선택된 레이어가 무엇을 뜻하는지와 그 절대 경로는 …` 문단 **뒤**에 넣는다:

```md
토글을 옮기면 폼은 그 레이어의 값으로 **다시 채워진다**. `user`는 user 레이어
단독을 그 플러그인의 기본값 위에 얹은 문서를, `project`는 effective(project를
user 위에 병합한 결과)를 보여준다. project에서 그 레이어가 말하지 않은 필드는
상속된 유효값이 앉고, 출처는 `data-scope-state`가 말한다 — 기본값으로 되돌리면
전체 문서를 쓰는 페이지에서 user 설정이 기본값으로 덮인다.

정규화는 서버가 한다. 페이지는 두 문서를 `configByScope: { user, project }`로
받아 고르기만 한다 — 레이어 원문을 페이지가 병합하면 스키마를 모르는 쪽이
기본값을 정하게 된다. 떠나는 레이어의 미저장 편집은 따라오지 않는다.
```

### 1-2. 검증

```
$ yarn docs:format:check
→ exit 0
```

---

## 작업 2 — cennad를 참조 구현으로 만든다

**딜리버러블**: cennad 설정 페이지가 토글에 따라 폼 전체를 다시 채우고,
`yarn workspace @ogham/cennad test:run`이 통과하며, 브라우저에서 확인된다.

cennad를 먼저 하는 이유: 폼이 가장 크고(`applyConfig` 하나로 전체를 채운다),
로더가 `ConfigLayerPaths`를 인자로 받아 "project 레이어를 끈다"가 그대로 된다.

### 2-1. `plugins/cennad/src/core/configManager/operations/loadConfigByScope.ts` (신규)

```ts
import type { ConfigLayerPaths } from "@ogham/cross-platform/config-scope";

import type { Config } from "../../../types/index.js";
import { configLayers } from "../utils/configLayers.js";

import { loadConfig } from "./loadConfig.js";

/** 설정 페이지가 scope마다 폼에 앉히는 두 문서. */
export interface ConfigByScope {
  /** user 레이어 단독이 정하는 config. project 파일은 읽지 않는다. */
  readonly user: Config;
  /** 지금 실제로 먹는 config — project를 user 위에 병합한 결과. */
  readonly project: Config;
}

/**
 * 각 레이어가 스스로 정하는 config 두 벌.
 *
 * user 뷰는 project 좌표를 `null`로 둔 채 **같은 로더를 다시 태워** 얻는다.
 * 정규화·기본값·fallback home 판정이 한 곳에만 있어야 화면의 값과 먹는 값이
 * 갈라지지 않는다.
 *
 * @param layers 두 레이어 파일의 절대 경로. 생략하면 기본 좌표.
 * @returns scope별 문서. `project`는 `loadConfig`와 같은 결과다.
 */
export async function loadConfigByScope(
  layers: ConfigLayerPaths = configLayers(),
): Promise<ConfigByScope> {
  const [user, project] = await Promise.all([
    loadConfig({ user: layers.user, project: null }),
    loadConfig(layers),
  ]);
  return { user, project };
}
```

### 2-2. `plugins/cennad/src/core/configManager/index.ts`

`loadConfigByScope`와 `ConfigByScope` 타입을 **이름으로** 재노출한다
(seiri_public-contract §2).

### 2-3. `routeContext.ts` · `handleGetRoot.ts`

`RouteContext`에 `loadConfigByScope: () => Promise<ConfigByScope>`를 더하고,
`handleGetRoot`가 주입 상태를 이렇게 만든다:

```ts
const [configByScope, scope] = await Promise.all([
  ctx.loadConfigByScope(),
  Promise.resolve(ctx.loadConfigState()),
]);
const inlineState = escapeJsonForHtml({
  config: configByScope.project,
  configByScope,
  scope,
});
```

`config`는 **남긴다** — `/config` 라우트와 페이지의 기존 hydrate 경로가 쓰고,
project 뷰와 같은 문서다. 이름이 둘이 되므로 handler 문서주석에 어느 쪽이
정본인지 한 줄 적는다 (seiri_agent-legible §2).

`setup.ts`(ctx 조립처)에 `loadConfigByScope`를 물린다.

### 2-4. `plugins/cennad/src/mcp/pages/settings/scripts/app.js`

`scopeState` 옆에 뷰를 들고, 토글 change에서 폼을 다시 채운다:

```js
// 두 레이어의 문서가 함께 주입되므로 토글은 왕복 없이 폼을 다시 채운다.
// 정규화는 서버가 한다 — 이 페이지는 스키마도 기본값도 모른다.
var configByScope = null;

function applyScopeConfig() {
  if (configByScope === null) return;
  var next = configByScope[scope];
  if (next) applyConfig(next);
}
```

`renderScope()`의 radio change 핸들러를 다음으로 바꾼다:

```js
radio.addEventListener("change", function () {
  scope = option[0];
  applyScopeConfig();
  renderScope();
});
```

`tryInlineState()`가 `raw.configByScope`를 `configByScope`에 담고, 기존
`applyConfig(config)` 호출은 `applyScopeConfig()` 뒤에 둔다 —
`adoptScopeState`가 `scope`를 먼저 정해야 어느 뷰를 앉힐지 정해진다.

`loadConfig()`의 fetch 경로(`body.state.effective`)도 같은 판정을 쓰도록
`applyConfig(body.state.effective)`를 유지하되, 그 경로는 `configByScope`가
없으므로 **project 뷰만** 가능하다는 것을 한 줄 주석으로 적는다.

`save()` 응답의 `adoptScopeState(body.state)` 뒤에도 `applyScopeConfig()`를
부르지 않는다 — 저장 직후 폼을 다시 그리면 사용자가 방금 친 값이 서버 왕복
결과로 덮이는 것처럼 보인다. 저장은 성공 메시지로 끝난다.

### 2-5. 테스트

`plugins/cennad/src/core/configManager/__tests__/loadConfigByScope.test.ts` (신규):

- user 레이어만 있을 때 두 뷰가 같다
- project가 `ratio.codex.value`를 재정의하면 `project` 뷰만 그 값을 갖고
  `user` 뷰는 user 파일 값을 유지한다
- 두 레이어 모두 없으면 두 뷰 모두 `DEFAULT_CONFIG`

`plugins/cennad/src/mcp/pages/settings/__tests__/settingsPage.test.ts`에 wiring
2건 추가 — 페이지가 `configByScope`를 읽고, 토글 change가 `applyScopeConfig`를
부른다.

### 2-6. 검증

```
$ yarn workspace @ogham/cennad test:run
→ 735 + 신규 (실패 0)

$ yarn workspace @ogham/cennad build
→ 성공, public/settings.html 재생성
```

브라우저 실측(playwright, 렌더 하네스): user 레이어에 `intervention_strength: 1`,
project 레이어에 `2`를 둔 상태를 주입하고 토글을 눌러 슬라이더 값이 실제로
바뀌는지 본다. 실행 중 MCP 도구는 stale bridge 번들을 쓰므로 src가 반영되지
않는다 — 빌드 산출물을 하네스로 띄운다.

---

## 작업 3 — seiri (서버 변경 없음)

**딜리버러블**: seiri 다이얼이 토글을 따라 바뀌고, `test:run`이 통과한다.

seiri의 `scopeState.layers`는 이미 `{ intervention } | null` 두 벌이다. 서버는
건드리지 않는다.

### 3-1. `plugins/seiri/src/mcp/pages/settings/scripts/app.js`

`var intervention = (state.config && state.config.intervention) || DIAL_STANDARD;`
를 레이어에서 읽는 함수로 바꾼다:

```js
/**
 * 선택된 레이어가 정하는 다이얼. user는 자기 파일만 보고, project는 자기
 * 파일이 말하지 않으면 user에서 상속받는다 — 세션 밸브는 편집 대상이
 * 아니므로 여기서 보이지 않는다.
 *
 * @returns {string} 다이얼 값. 어느 레이어도 정하지 않았으면 기본값.
 */
function dialForScope() {
  var own = scopeState.layers[scope];
  if (own && own.intervention) return own.intervention;
  if (scope === "user") return DIAL_STANDARD;
  var user = scopeState.layers.user;
  return (user && user.intervention) || DIAL_STANDARD;
}

var intervention = dialForScope();
```

`renderScope()`의 change 핸들러에 `intervention = dialForScope(); renderDial();`
를 `useLayer()` 앞에 더한다.

`applyScopeBadges()`는 그대로다 — `overridden`은 서버가 준다.

### 3-2. 규칙 목록 무결성 확인 (변경 없음이 기대값)

`useLayer()`가 이미 `entries`·`selections`·`resync`를 다시 만드는지 확인한다.
**현재 `useLayer()`는 `entries`만 바꾸고 `selections`·`resync`는 이전 레이어의
것을 그대로 쓴다** — 두 레이어의 규칙 배포 상태가 다르면 체크박스가 떠나온
레이어의 상태를 말한다. 이것이 사실이면 `useLayer()` 안에서 두 맵을 레이어
기준으로 다시 만든다(로드 시의 `anyDeployed` 규칙 그대로).

### 3-3. 검증

```
$ yarn workspace @ogham/seiri test:run
```

`plugins/seiri/src/mcp/pages/settings/__tests__/settingsScopeWiring.test.ts`
(신규): 다이얼이 `state.config`가 아니라 `scopeState.layers`에서 온다는 것과,
`useLayer()`가 선택 맵을 다시 만든다는 것을 고정한다.

브라우저 실측: user에 `advisory`, project에 `strict`를 두고 토글로 왕복.

---

## 작업 4 — filid

**딜리버러블**: filid 폼(language·structure·rules)이 토글을 따라 다시 채워지고,
`test:run`이 통과한다.

### 4-1. `loadConfigByScope.ts` (신규, `core/infra/configLoader/loaders/`)

filid의 `loadConfig(projectRoot)`는 좌표가 아니라 루트를 받는다. user 뷰는
`configLayers(projectRoot)`의 project를 `null`로 둔 좌표로 같은 파이프라인을
태워 얻는다. `loadConfig`가 좌표를 받지 않으므로, 이 작업에서 `loadConfig`가
내부적으로 좌표를 받는 형태를 노출하게 한다 — **읽기·마이그레이션·병합·검증
경로를 복제하지 않는다.**

user 뷰가 `null`(단독으로 스키마를 못 넘김)이면 `createDefaultConfig()`로
떨어뜨린다 — 지금 `buildSettingsState`가 병합 결과에 하는 것과 같은 처리다.

### 4-2. `buildSettingsState.ts`

`config`(effective) 옆에 `configByScope: { user, project }`를 싣는다.
`SettingsPageState` 타입도 같이 넓힌다.

### 4-3. `scripts/app.js`

지금 prefill은 IIFE 두 개(`renderRules`, `prefill`)라 다시 부를 수 없다. 이름
있는 함수로 바꾸고, `renderRules`는 `#rules-list`를 비우고 시작하게 한다.
토글 change 핸들러에 `applyScopeConfig()`를 더한다(기존 `renderRuleDocs()` 유지).

`state.structureAdapterId`는 effective 기준 한 값이다 — 레이어마다 다를 수
있으므로 `configByScope[scope].adapters.enabled[0]`에서 파생시킨다.

### 4-4. 검증

```
$ yarn workspace @ogham/filid test:run
$ yarn workspace @ogham/filid build
```

브라우저 실측: project에 `structure.maxDepth` 재정의를 두고 토글 왕복.

---

## 작업 5 — imbas

**딜리버러블**: imbas 폼이 토글을 따라 다시 채워지고 `test:run`이 통과한다.

### 5-1. `configManager.ts`

```ts
export async function loadConfigByScope(
  cwd: string,
): Promise<{ user: ImbasConfig; project: ImbasConfig }>;
```

`readConfigLayers` 한 번으로 두 문서를 만든다 — `ImbasConfigSchema.parse`는
빈 객체에서 기본값을 낸다(현재 `loadConfig`의 "both absent → validated
defaults" 계약이 그 증거다). `loadConfig`는 이 함수의 `project`를 돌려주도록
위임한다.

### 5-2. `buildSettingsState.ts` · `scripts/app.js`

state에 `configByScope`를 싣고, 페이지의 prefill IIFE들을 `applyConfig(config)`
하나로 모아 토글 change에서 다시 부른다. `bootstrap` 기반 값(jira 프로젝트
목록·`suggestedLocalKey`)은 레이어와 무관하므로 **다시 그리지 않는다** —
`<select>` 옵션을 재주입하면 중복된다.

### 5-3. 검증

```
$ yarn workspace @ogham/imbas test:run
```

---

## 작업 6 — entrez

**딜리버러블**: entrez 폼이 토글을 따라 다시 채워지고 `test:run`이 통과한다.

### 6-1. `loadConfigByScope.ts` (신규, `core/config/operations/`)

`loadConfig`가 이미 `ConfigLayerPaths`를 받는다. cennad와 같은 형태:
`loadConfig({ user: layers.user, project: null })`와 `loadConfig(layers)`.

### 6-2. `handleGetRoot.ts`

`buildStatus`를 scope마다 한 번씩 부른다:

```ts
const byScope = await ctx.loadConfigByScope();
const status = {
  ...buildStatus(byScope.project, credentials),
  scope: ctx.loadConfigScope(),
  configByScope: {
    user: buildStatus(byScope.user, credentials),
    project: buildStatus(byScope.project, credentials),
  },
};
```

`path_suggestions`·`rateLimit`은 레이어와 무관하다 — 두 뷰에 같은 값이 들어가고
페이지는 그것을 **다시 그리지 않는다**(datalist 중복 방지).

### 6-3. `scripts/app.js`

`prefill` IIFE를 `prefill(view)`로 바꾸되 `fillPathSuggestions`는 밖으로 빼
한 번만 부른다. `api_key`는 credentials에서 오므로 레이어 전환에 반응하지
않는다 — 마스크 값을 덮어쓰지 않게 지킨다.

### 6-4. 검증

```
$ yarn workspace @ogham/entrez test:run
```

---

## 작업 7 — atlassian

**딜리버러블**: atlassian 폼이 토글을 따라 다시 채워지고 `test:run`이 통과한다.

### 7-1. `buildFormState.ts` (신규)

`handleGetRoot`가 인라인으로 만드는 `stateData`(status + jira/confluence
편집 상태 + `deployment_type`)를 `buildFormState(config, credentials)`로
추출한다. `scope`는 포함하지 않는다 — 레이어와 무관한 축이다.

### 7-2. `configManager.ts` · `handleGetRoot.ts`

`loadConfigByScope(layers)`를 더하고(cennad 형태), handler는
`configByScope: { user: buildFormState(user, creds), project: buildFormState(project, creds) }`
를 싣는다. 최상위 필드는 `project` 뷰를 그대로 펼친다(기존 계약 유지).

### 7-3. `scripts/app.js`

`prefillForm(data)`가 이미 함수다. 토글 change 핸들러에
`prefillForm(injected.configByScope[configScope])`를 더한다.

**주의**: `prefillForm`은 사이트 행을 append하는 경로가 있다. 다시 부르기 전에
그 컨테이너를 비우는지 확인하고, 아니면 비운다 — 중복 행은 이 작업이 만드는
결함이 된다.

### 7-4. 검증

```
$ yarn workspace @ogham/atlassian test:run
```

---

## 작업 8 — deilen 무결성 확인 (변경 기대값: 없음)

**딜리버러블**: deilen이 이 계약을 이미 만족한다는 관찰 기록, 또는 어긋난
지점의 수정.

확인 항목:

1. `renderScope()`가 `populate(scope === 'user' ? layers.user : effective)`를
   부른다 — 계약과 일치.
2. `populate()`의 필드별 `??` 기본값이 **실제 기본값과 같은지** — 서버 스키마의
   기본값과 페이지 리터럴이 두 벌로 존재한다. 어긋나면 그것이 결함이다.
3. 저장 응답의 `adoptState`가 `overridden`을 다시 만들고 폼을 다시 채우는데,
   그 시점에 사용자가 친 값이 서버 왕복 결과로 덮이지 않는지.

어긋나는 것이 없으면 **아무것도 바꾸지 않고** 원장에 관찰만 적는다.

---

## 작업 9 — 문서와 전역 검증

**딜리버러블**: 각 INTENT가 새 동작을 말하고, 전역 검증이 통과한다.

### 9-1. INTENT 갱신

`configByScope`를 받아 폼을 다시 채운다는 한 줄을 각 설정 페이지 INTENT의
Conventions에 더한다 (cennad·filid·imbas·seiri·entrez·atlassian). INTENT는
50줄 상한이므로 줄이 늘면 같은 편집에서 다른 줄을 압축한다.

서버 쪽 `loadConfigByScope`를 더한 모듈의 INTENT Structure 표에도 한 줄.

### 9-2. 전역 검증

```
$ yarn typecheck        → 14 workspaces clean
$ yarn test:run         → 4889 이상, 실패 0
$ yarn lint             → exit 0
$ yarn build:all        → exit 0, 훅 번들 가드 6종 통과
$ yarn docs:format:check → exit 0
```

기준선은 [rule-scope-progress.md](./rule-scope-progress.md)의 **4889 pass /
20 skipped / 실패 0**이다.

### 9-3. 원장

`.metadata/cross-platform/scope-values-progress.md`에 작업별 결과·편차·브라우저
실측을 적는다.

---

## 작업 간 인터페이스

| 작업 | 소비                 | 생산                                        |
| ---- | -------------------- | ------------------------------------------- |
| 1    | —                    | 계약 문단 (레이어별 표시 + `configByScope`) |
| 2    | 작업 1               | `loadConfigByScope` 형태 · 페이지 패턴      |
| 3    | 작업 2의 페이지 패턴 | seiri 적용본 (서버 무변경)                  |
| 4–7  | 작업 2의 두 형태     | filid·imbas·entrez·atlassian 적용본         |
| 8    | 작업 1의 계약        | deilen 대조 기록                            |
| 9    | 작업 2–8             | 갱신된 INTENT · 전역 검증 기록              |

작업 2가 이름과 형태를 확정하므로 **2를 끝내고 브라우저로 확인한 뒤** 3–7로
확산한다. 3–7은 서로 독립이다.

고정 이름 (모든 작업이 같은 것을 쓴다):

- `configByScope` — 주입 상태의 필드 이름, `{ user, project }`
- `loadConfigByScope` — 서버 로더 이름
- `applyScopeConfig()` — 페이지에서 뷰를 폼에 앉히는 함수 이름
- `#config_scope` · `.scope-option` · `data-scope-state` — 헤더 작업의 계약 그대로
