# plugins FCA 준수화 — 진행 원장

> **이어서 작업하려면 [HANDOFF.md](./HANDOFF.md) 를 먼저 읽는다.** 다음 착수 지점, 확립된 처방 5가지, 실측으로 얻은 함정, 검증 절차가 거기 정리되어 있다.

계획: [PLAN.md](./PLAN.md). 기준 실측 792건 → **현재 413건, 전부 warning — error 0**.

한 줄에 하나: 무엇이 어디에 반영되었고 무엇으로 검증했는가.

## 현재 상태 (2026-07-30 재실측)

측정 기준은 `structure_validate(path=<저장소 루트>)` 6 스코프 전체다. 이 표 이전에 적혀 있던 총계 599 는 더 좁은 스코프 조합에서 나온 값이라 아래 숫자와 비교하지 않는다.

| 플러그인     | 착수 전 | error | warning | 상태 |
| ------------ | ------: | ----: | ------: | ---- |
| prawf        |       2 |     0 |       1 | 완료 |
| r-statistics |      20 |     0 |       2 | 완료 |
| deilen       |      33 |     0 |       1 | 완료 |
| entrez       |      47 |     0 |       3 | 완료 |
| seiri        |      47 |     0 |       2 | 완료 |
| atlassian    |      55 |     0 |       3 | 완료 |
| maencof-lens |      68 |     0 |      24 | 완료 |
| imbas        |     100 |     0 |      55 | 완료 |
| maencof      |     366 |     0 |     186 | 완료 |
| cennad       |      50 |     0 |       6 | 완료 |
| (plugins 밖) |       4 |     0 |     135 | 완료 |

**저장소 전체 error 0** — 413건 전부 warning 이다. 손댄 워크스페이스는 전부 `typecheck` + `test:run` 으로 기준선 불변을 확인했고, 저장소 전체도 돌렸다: `yarn typecheck` 14 workspaces clean, `yarn test:run` **601 files / 4985 tests 통과**(598 passed·3 skipped / 4965 passed·20 skipped).

`(plugins 밖)` 은 `plugins/` 아래가 아닌 모든 경로(`mcp-servers/`·`shared/`·`tools/`·`scripts/`)를 한 칸에 모은 것이다. 착수 전 칸의 4 는 더 좁은 루트 스코프만 센 값이라 같은 기준이 아니다.

## DETAIL 필수 여부 — 실측

`detail-document-contract` 는 **도구 기본값**이지 아키텍처 필연이 아니다.

- `filid/src/core/rules/ruleEngine/utils/checkDocumentContract.ts` 는 `node.type === 'fractal'` 이면 조건 없이 DETAIL 부재를 `error` 로 낸다(organ·pure-function·hybrid 만 제외).
- 그러나 `filid_module-documents.md §6` 은 면책을 설명하며 "a fractal that needs one and **has no DETAIL.md** adds the document for this purpose" 라고 써서, DETAIL 없는 fractal 의 존재를 전제한다. **산문과 도구 기본값이 어긋나 있다.**
- `RuleOverride`(`filid/src/types/rules.ts:86`)는 `enabled`·`severity`·`exempt[]` 를 받는다. 현재 `.filid/config.json` 의 `rules` 에 이 규칙 항목이 없어 기본값(error)이 걸린 것이다.

따라서 남은 플러그인의 DETAIL 190개는 **작성하든, severity 를 낮추든, 경로를 면제하든 선택 사항**이다. 결정 전까지 착수하지 않는다.

## 다음 착수 지점

**error 는 0 이 되었다.** 남은 것은 판단이 필요한 항목뿐이고, 착수 전에 사용자 결정을 받는다.

1. **cennad `open-settings` e2e 실패 2건 (이 작업과 무관한 선재 사항, 미해결)** — `GET /config` 응답에 `ratio` 키가 없어 layerA 는 undefined 접근, layerB 는 그 body 로 저장해 400 을 받는다. 두 번의 실측으로 갈라냈다: 이 브랜치의 `http-kit/guard` 변경을 되돌려도 동일, `plugins/cennad` 를 main 소스로 되돌려도 동일 — **main 에서도 깨져 있다**. `vitest.config.ts` 의 `exclude` 가 `src/__tests__/e2e/**` 를 기본 `test:run` 에서 빼기 때문에 드러나지 않았다(116개 중 18개가 e2e, 기본 실행은 98개). 원인은 설정 웹서버의 `/config` 핸들러 payload 이며 FCA 작업과 별개 과제다.
2. **`detail-document-contract` 203건** — 도구 기본값이 fractal 마다 DETAIL 을 요구하는 것이고 규칙 산문은 DETAIL 없는 fractal 을 전제한다(아래 절). 작성·severity 하향·경로 면제 중 무엇을 택할지 결정이 필요하다.
3. **`zero-peer-file` 126건 · `module-entry-point` 21건 · `entry-point-surface` 50건** — 전자 둘은 구현 파일을 organ 으로 옮기고 배럴을 두는 구조 작업, 후자는 wildcard 배럴을 named export 로 전개하는 작업이다.
4. **`test-record-case-cap` 7건** — 전부 dynamic table 로 `indeterminate` 다. 정적화하면 커버리지가 줄어 손대지 않았다.

## 완료

### T0 — config allowed-peer 등록

- `.filid/config.json` `structure.additionalAllowedPeers` 에 `tsconfig.test.json`·`tsconfig.eslint.json` 추가, 훅 진입점 `paths` 를 실측 위치로 확장(imbas 4종, maencof 4종, maencof-lens 1종).
- 실측 근거: `find plugins -name "*.entry.ts"` 22개 중 zero-peer 로 잡힌 9개.
- 검증: 후속 플러그인 스캔에서 `*.entry.ts`·`tsconfig.*` zero-peer 항목 소멸 확인 예정(T4·T9·T10에서 확인).

### T1 — prawf (2 → 1)

- `plugins/prawf/DETAIL.md` 에 `## Acceptance Criteria` 4개 그룹 신설(AC-manifest-skills-only / AC-identifier-consistency / AC-verdict-gate-purity / AC-workdir-resolution), 기존 `Last Updated` 기록을 `## History` 로 이동.
- 검증: `structure_validate(prawf)` → 78 passed / 1 failed. 잔여 1건은 `module-entry-point`(warning, T12 이월).

### T2 — r-statistics (20 → 5, error 0)

- DETAIL.md 14개 신설: 루트, `src`, `src/core`(+ rRuntime·workspace·commandGate·jobStore), `src/mcp`(+ server·shared·tools), `tools/getRJob`·`cancelRJob`·`assertAnalysisPlan`.
- `src/mcp/tools/runR/DETAIL.md` 에 acceptance group 5개 추가, 이전 기록을 `## History` 로 이동.
- `src/DETAIL.md` 에 `version.ts` Boundary Exemption 선언(생성 상수, 경유할 진입점 없음).
- `src/index.ts`: `export * from "./types/index.js"` → named export 35개로 전개(표면 동일). `mcp/` 재노출 제거로 `src → mcp → server → src` 순환 해소.
- 검증: `yarn rStatistics typecheck` 무출력 통과 → `test:run` 16 files / 123 tests 통과 → `structure_validate` 562 passed / 5 failed(전부 warning).

### T3 — deilen (33 → 1, error 0)

- DETAIL.md 16개 신설: 루트, `src`, `mcp/{tools,server,shared,pages}`, `pages/{viewer,settings}`, `core/{configManager,sessionStore,feedbackStore,projectHash}`, `tools/{renderViewer,collectFeedback,closeViewer,openSettings}`.
- 기존 DETAIL 4개(`mcp`·`core`·`render`·`mcp/httpServer`) 형식 교정: `## Acceptance` → `## Acceptance Criteria` + AC 그룹, `## Last Updated` 추가, `mcp` 의 `## Tools` → `## API Contracts`. **내용은 그대로 옮겼다.**
- e2e spec 3개 첫 줄에 `// filid:contract <AC-id>` 마커 삽입, 대응 AC 그룹을 루트 DETAIL 에 정의.
- `src/index.ts`: `export *` → named export 29개, `mcp/` 재노출 제거로 순환 해소.
- `renderViewer/DETAIL.md` 에 개발 스크립트(`scripts/devViewer.ts`) 직접 import 면책 선언.
- 검증: `yarn deilen typecheck` 통과 → `test:run` 21 files / 159 tests 통과 → `structure_validate` 509 passed, 잔여 1건은 `module-entry-point`(warning).

### T4 — entrez (47 → 5, error 0)

- DETAIL.md 26개 신설(루트·src·core 8개·adapters 2개·mcp 12개).
- `skills/search/references/intent.md` → `intent-classification.md` 로 rename. 대소문자를 구분하지 않는 파일시스템에서 이 이름이 `INTENT.md` 로 인식되어 organ 이 fractal 로 분류되고 있었다(`organ-no-intentmd`·`module-entry-point`·`zero-peer-file` 3종의 공통 원인). SKILL.md 참조 1곳 갱신.
- `src/adapters/eutils/` 의 구현 7개(`efetch`·`elink`·`esearch`·`espell`·`esummary`·`idconv`·`oaService`)를 `operations/` organ 으로 이동. 배럴·테스트·INTENT 표 갱신.
- `serverEntry.ts` 가 형제 fractal 의 organ 을 직접 참조하던 것을 배럴 경유로 교정(`../server/lifecycle/startServer.js` → `../server/index.js`), INTENT Dependencies 동기화.
- `src/adapters/index.ts`: `export *` → named export 21개. `src/index.ts`: `mcp/` 재노출 제거로 순환 해소.
- 검증: `yarn entrez typecheck` 통과 → `test:run` 28 files / 194 tests 통과 → `structure_validate` 618 passed / 5 failed(전부 warning).

### T5 — seiri (47 → 2, error 0)

- DETAIL.md 21개 신설(src·core 4개·hooks 6개·mcp 9개·templates), 루트 DETAIL 에 acceptance group 5개 추가.
- 훅 배럴 6개 신설(`src/hooks/index.ts` + 훅별 `index.ts`) — filid 선례를 따라 `organ-no-intentmd` 1건과 `module-entry-point` 6건을 해소했다. 배럴은 훅 밖 소비자 전용이며 진입점은 여전히 concrete 파일을 직접 import 한다.
- 훅·테스트의 organ 직접 import 15건을 Boundary Exemption 으로 선언(`core`·`core/infra/configLoader`·`core/ruleDocs`·`core/sessionSignals`). **코드는 한 줄도 바꾸지 않았다** — 훅 번들 크기 가드가 배럴 경유를 빌드 실패로 막기 때문이다.
- 기존 `sessionSignals/DETAIL.md` 의 면책이 glob 없이 작성돼 실제로는 적용되지 않고 있던 것을 교정.
- 사실 오류 교정: `loadIntervention` 은 2계층이 아니라 3계층(`runtime > project > user > default`)이다. 코드로 확인한 뒤 루트 DETAIL·`core/INTENT.md`·`core/infra/INTENT.md`·`src/INTENT.md` 네 곳의 표현을 맞췄다.
- 검증: `yarn seiri typecheck` 통과 → `test:run` 23 files / 159 tests 통과 → `build:hooks` 번들 가드 통과(각 ≤16384 bytes, 금지 모듈 없음, `bridge/` 산출물 무변화) → `structure_validate` 661 passed / 2 failed(전부 warning).

### T6 — cennad (50 → 7, error 1 잔존)

- DETAIL.md 28개 신설(루트·src·core 6개·dispatcher 3개·hooks 3개·mcp 12개·hooks 매핑 노드), 기존 4개(`youtubeMcp`·`claude`·`antigravity`·`artifactWriter`)에 누락 섹션 추가.
- e2e 헬퍼의 organ·concrete 직접 import 5건을 Boundary Exemption 으로 선언(`hooks/shared`, `injectStatic`, `injectDynamic`+`utils`). 코드 무변경.
- `src/index.ts` 에서 `mcp/` 재노출 제거 — 배럴을 import 하는 파일이 0건이고 npm 배송도 없음을 실측한 뒤 진행했다. 이로써 `src → mcp → server → src` 순환이 `src → mcp/server → src` 로 줄었다.
- `src/dispatcher/__tests__/fakeBinary.ts` → `src/__tests__/fixtures/fakeBinary.ts` 이동(소비자 10곳 경로 갱신). 언더스코어 organ 은 면책 target 으로 표기할 수 없어(prettier 훼손 + 파서 미인식) 공통 조상으로 옮기는 정석을 택했다. `boundaries` 스코프가 0건이 되었다.
- 검증: `yarn cennad typecheck` 통과 → `test:run` 98 files / 742 tests 통과(이동 전후 동일) → `structure_validate` 1008 passed / 7 failed.

**정정**: 처음에 `main: dist/index.js` 와 `files: ["dist"]` 를 근거로 "cennad 배럴은 npm 공개 API 이므로 재노출을 뺄 수 없다" 고 판단했는데, 실측하니 이 저장소의 플러그인은 npm 으로 배송되지 않는다. 그 오독으로 `src/DETAIL.md` 에 잘못된 계약을 한 번 써 넣었고 함께 고쳤다.

### T7 — atlassian (55 → 3, error 0)

- `zero-peer-file` 19건 — 구현 파일을 organ 으로 이동: converter 5개 fractal → `operations/`, `converter/convert.ts` → `operations/`, `mcp/shared` → `helpers/`, `core/httpClient/ssrfGuard.ts` → `operations/`. import specifier 40개는 해석해서 재작성했고 INTENT 구조 표 8개를 맞췄다.
- `circular-dependency` 2건 · `external-import-boundary` 3건 — 형제 fractal 을 부모 배럴 대신 각자의 배럴로 건너게 교정(`connectionTester` → environmentResolver·httpClient, `serverEntry` → `../server/index.js`), `src/index.ts` 의 `mcp` 재노출 제거.
- `test-record-case-cap` 2건 — 두 테스트 파일을 describe 경계로 4개로 나눴다. **36 files/392 tests → 38 files/392 tests, 케이스 수 동일.**
- DETAIL.md 26개 신설.
- 검증: `yarn atlassian typecheck` 통과 → `test:run` 392 tests 통과(모든 단계에서 동일) → `structure_validate` 780 passed / 3 failed(전부 warning).

**연쇄 수정 1건**: 형제 배럴 교정이 `setup/__tests__/connectionTester.test.ts` 10건을 깨뜨렸다. 이 테스트가 core **부모 배럴**을 모킹해 그 경유라는 구현 세부에 결합돼 있었기 때문이다. **assertion 은 건드리지 않고 모킹 대상 경로만** 실제 의존으로 옮겼다.

### T8 — maencof-lens (66 → 19, error 0)

- 형제 fractal 의 eponymous 파일 직접 참조 28건을 배럴 경유로 교정(`rewrite-to-barrel.mjs`, `hooks/` 제외).
- `src/index.ts` 의 `createLensServer` 재노출 제거로 `src → mcp/server → src` 순환 해소(배럴 소비자 0건 확인 후).
- DETAIL.md 5개 신설: `src`(version.ts 면책), `config/configSchema`(guard organ 면책), `config/configLoader`·`vault/staleDetector`(훅 면책), `hooks/sessionStart`.
- spec 4개에 `filid:contract` 마커. 형제 spec 이 같은 그룹을 주장하지 않도록 `staleDetector` 에 `AC-marker-priority` 를 분리 정의했다.
- 검증: typecheck 통과 → 13 files / 73 tests 통과(변경 전과 동일) → `structure_validate` boundaries·dag·verification 0 failed.

### T9 — imbas (100 → error 0, warning 55)

- 형제 배럴 교정(`rewrite-to-barrel.mjs`, 20개 파일). 검증: typecheck 통과 → 32 files / 304 tests 통과(변경 전과 동일).
- `src/index.ts` 의 `mcp/` 재노출 제거로 `src → mcp → mcp/server → src` 순환 해소. 배럴 소비자가 워크스페이스에 0건임을 실측한 뒤 진행했고(`@ogham/imbas` importer 없음, `src` 안에서 루트 배럴을 import 하는 파일 없음), 이유를 파일 헤더에 남겼다.
- DETAIL 2개 신설 — `src`(생성된 `version.ts` 직접 참조 면책 + 배럴 표면 계약), `src/core/paths`(세그먼트 거부 계약 + `utils` organ 훅 면책). `contextInjector` 는 17KB 번들 가드를 받아 배럴 경유가 빌드 실패이므로 면책이 유일한 해법이다.
- `src/__tests__/schemas.test.ts`(46 케이스, 상한 32)를 검증 대상 `types/` 모듈별로 4개로 분할 — state 12 · config 13 · manifest 17 · cache 4. 원본 삭제 전 `it()` 46→46 · `describe` 11→11 을 기계적으로 대조했다.
- 검증: typecheck 무출력 통과 → **35 files / 304 tests** 통과(파일만 +3, 케이스 수 동일) → `build:plugin` 훅 번들 가드 통과(`mcp-server.cjs` 312903 bytes 불변) → `structure_validate` boundaries·dag 116 passed / 0 failed, documents·nodes·entry-points 54건 전부 warning, verification 4건 전부 indeterminate.

### T10 — maencof (366 → error 0, warning 186)

여섯 배치로 끊었다. 매 배치 `typecheck` → `test:run` 을 돌렸고 케이스 수는 처음부터 끝까지 1265 로 같다(파일 수만 143 → 144).

- **T10a 배럴 교정(14건)** — 형제 fractal 의 concrete 파일 직접 참조를 배럴 경유로. 심볼 8종 중 7종은 이미 배럴에 있었고 `resolveSectionText` 만 `core/turnContext` 배럴에 이름을 추가했다(외부 소비자 존재 → 실질 공개 심볼). `core/turnContext/INTENT.md` Structure 누락 2줄도 채웠다.
- **T10b organ·version(10건)** — organ-reach 8건은 전부 소유자 배럴 경유로 풀렸다(면책 0건). `createProjectInstructionManager` 만 `core/claudeMdMerger` 배럴에 추가(외부 소비자 4곳). `version.ts` 2건은 `src/DETAIL.md` 면책.
- **T10c 훅 면책(113건)** — 소유 fractal 30곳의 DETAIL 에 Boundary Exemption 선언, 코드 무변경. 신설 DETAIL 25개(core 12 + hooks 13), 기존 DETAIL 5개에 누락 섹션 보완. `hooks/index.ts` 4건은 자녀 배럴 경유로 교정(이 배럴은 훅 번들 진입점이 아니므로 번들 제약 없음).
- **T10d 순환 2건** — `graphCache ↔ middlewares` 는 `ensureFreshGraph` 라는 **소비자 0건 pass-through 래퍼**가 닫고 있었고 제거로 해소. `src → mcp → mcp/server → src` 는 `mcp/index.ts` 의 `export * from './server/index.js'` 를 빼서 해소했다 — `mcp/server` 는 실행 진입점이고 `serverEntry` 가 형제 배럴을 직접 쓰므로 소비자가 없다. maencof-lens 는 도구 핸들러만 가져가므로 무영향(typecheck + 13 files / 73 tests 로 확인).
- **T10e INTENT 3건** — `core/graphBuilder/builders`·`mcp/server/registrations`·`hooks/sessionStart/helpers/remindExpiredBuffer`. 셋 다 `index.ts` 때문에 fractal 로 분류되는데 부모 INTENT 는 organ 이라 부르고 있었다. 부모 표현도 하위 fractal 로 고쳤다.
- **T10f 검증 계약** — `vaultCommitter.test.ts`(38 케이스)를 관심사 경계로 23/15 로 분할. spec 3개를 검증 대상 fractal 의 `__tests__` 로 이동하고 `core/yamlParser/DETAIL.md` 를 신설해 형제 spec 이 서로 다른 acceptance group 을 주장하게 했다.

**면책 위치를 두 번 틀렸다.** ① 파일 target 을 import specifier 의 `.js` 로 적어 10건이 무시되었다 — 파서는 디스크 경로와 비교하므로 `.ts` 여야 한다. ② `remindExpiredBuffer` 는 INTENT 가 없어 organ 으로 보이지만 `index.ts` 가 있어 fractal 이다. 부모 DETAIL 에 쓴 면책이 인식되지 않아 자기 DETAIL 로 옮겼다.

### T11 — `plugins/` 밖 (error 17 → 0)

17건 전부 `shared/cross-platform`(16)과 `shared/http-kit`(1)의 `external-import-boundary` 였다.

- **코드 2건.** `readModeIfExists` 는 `filesystem/locking/helpers/` 에 있었지만 소비자가 `filesystem/mutation/writeFileAtomicallySync.ts` 하나뿐이었다 — 배치 규칙대로 소비자 쪽 `filesystem/helpers/` 로 옮겨 경계를 없앴다. `http-kit` 의 `guard/inspectRequest.ts` 는 형제 배럴 경유로 교정(토큰 배럴은 함수 2개, 둘 다 이미 `node:crypto` 사용 → 번들 비용 0).
- **면책 14건.** `paths`(state) · `paths/compat`(operations·portableResolve·portableRelative) · `instructions`(구간 연산 5개) · `hostRegistry`(registry·resolveHostDescriptor). 배럴 경유가 문법적으로 가능해도 면책이 맞다 — 이 패키지의 `exports` 맵이 concrete 파일을 서브패스로 노출하고 각 INTENT 가 이미 "hook 은 목적별 단일 entry 만 import 한다" 를 선언한다. `instructions/read`·`write` 는 부모 배럴이 자신을 재노출하므로 경유하면 순환도 된다.
- `paths/compat/INTENT.md` 의 Structure 파일명이 kebab-case 로 적혀 실제 camelCase 와 어긋난 이름 함정도 고쳤다.
- 검증: `yarn crossPlatform test:run` 52 files / 376 tests(불변), `@ogham/http-kit` 7 files / 47 tests, `yarn typecheck` 14 workspaces clean.

### T12 — cennad 순환 (error 1 → 0, 저장소 전체 error 0)

순환은 `src → mcp/server → src` 였다. 두 엣지를 갈라 보면 닫는 엣지는 e2e Layer A 하네스이고 되돌아오는 엣지는 `lifecycle/createServer.ts → version.ts` 였다. 하네스 쪽은 지울 수 없고(케이스가 없어 어댑터가 검증 파일로 인식하지 않는다), `version.ts` 도 내릴 수 없다(공유 생성기가 `src/` 루트에 고정). 그래서 되돌아오는 엣지를 없앴다.

- `createServer(version)`·`startServer(version)` 이 버전을 인자로 받고, 주입은 `mcp/serverEntry`(실행)와 하네스(테스트)가 한다. `seiri_function-boundaries` §1 이 그대로 처방하는 형태다. 호스트에 보고되는 name·version 값은 불변.
- **공개 API 가 아님을 실측한 뒤 진행했다** — `src/index.ts` 가 `mcp/` 를 노출하지 않고 `mcp/index.js` 소비자도, `@ogham/cennad` 외부 소비자도 0건이다. `mcp/server/INTENT.md` 의 "Ask first: 공개 API 시그니처 변경" 은 걸리지 않는다.
- 리팩터이므로 특성 테스트를 먼저 세웠다: `e2e/mcp/server-info.layerA.test.ts` 가 클라이언트가 보는 `{name:'tools', version:VERSION}` 을 고정한다. 변경 전 통과 → 변경 후 통과(주입이 배선되지 않으면 깨진다).
- 문서를 코드보다 먼저 맞췄다: `src/DETAIL.md`(순환 잔존 문단 → identity 주입 계약), `mcp/server/INTENT.md`(Structure 경로를 `lifecycle/` 로 교정 + 주입 규약), `mcp/serverEntry/INTENT.md`, `src/index.ts` 주석.
- 검증: typecheck 통과 → `test:run` 98 files / 742 tests(불변) → `test:e2e:run` 61 passed / 3 skipped → `build:plugin` 가드 통과, MCP 번들 371112 → 371116(+4 bytes) → `structure_validate(cennad)` **status ok, 128 passed / 0 failed** → 저장소 루트 전 스코프 **error 0**.

## 재사용할 사실

- **배럴 경유 교정은 번들을 거의 늘리지 않는다 — esbuild 가 재노출 배럴을 tree-shake 하기 때문이다.** 커밋된 `bridge/`·`public/` 50개를 기준선으로 전 플러그인을 재빌드해 비교한 결과: **훅 번들 22개는 전부 바이트 동일**, MCP 번들은 9/10 바이트 동일, maencof 만 490613 → 490623(**+10 bytes**, +0.002%)였다. 이 +10 이 실제 변경분임을 갈라내는 절차는 ① 3회 연속 빌드가 바이트 동일(결정적) ② main 소스로 빌드하면 커밋된 490613 을 정확히 재현(커밋 산출물이 stale 하지 않음) ③ HEAD 소스는 490623. 내용 확인은 `require()` 수 190개 동일 + 문자열 집합 diff 가 minifier 식별자 리네임(`Cr`→`Tr` 등)뿐이었다.
- **훅 번들이 바이트 동일한 이유는 훅 처방이 문서 전용이었기 때문이다.** 면책 선언은 코드를 건드리지 않으므로 훅 그래프가 그대로다. 이 선택은 숫자로도 정당화된다 — maencof `user-prompt-submit.mjs` 는 42428 / 43008 bytes 로 **여유가 580 bytes 뿐**이다(session-start 45056/57344, post-tool-use 8108/12288, pre-tool-use 9056/12288). 이 번들을 배럴 경유로 바꿨다면 가드가 깨졌을 것이다.
- **`bridge/run-hook.cmd` 는 커밋본이 LF, 빌드 산출물이 CRLF 라 재빌드마다 +2 bytes 로 보인다.** 손대지 않은 플러그인에서도 같으므로 선재 사항이며 코드 변화가 아니다.
- **공유 패키지의 `exports` 맵이 concrete 파일을 서브패스로 노출하면 그 패키지 안의 배럴 경유는 설계 위반이다.** 훅 크기 가드를 받는 소비자를 위해 일부러 lean 진입점을 만든 것이므로, 내부 소비자도 같은 이유로 concrete 경로를 쓴다 — 이때 처방은 배럴 교정이 아니라 면책이다. `package.json` 의 `exports` 와 대상 fractal 의 INTENT 를 근거로 확인한다.
- **면책 heading 의 파일 target 은 디스크의 실제 확장자(`.ts`)여야 한다.** import specifier 의 `.js` 를 그대로 옮기면 파서가 경로를 찾지 못하고 조용히 무시된다. organ target(`operations` 등)은 확장자가 없어 영향이 없으므로, 같은 배치에서 organ 면책만 통하고 파일 면책만 남는 증상으로 나타난다.
- **`INTENT.md`·`DETAIL.md` 가 없어도 `index.ts` 가 있으면 module index 로 fractal 로 분류된다.** 면책은 그 디렉터리 자신의 DETAIL 에 써야 하고 부모 DETAIL 에 쓰면 인식되지 않는다(maencof `remindExpiredBuffer`).
- **면책 target·consumer·verdict 은 코드 스팬으로 쓴다** — 현행 `filid_module-documents` §6 이 그렇게 요구하고, 스팬이 있으면 prettier 가 `__tests__` 를 `**tests**` 로 바꾸는 훼손도 막힌다. bare 값도 읽히지만 스팬이 안전한 기본값이다.
- **`spec-contract-link` 은 spec 파일의 소유 fractal DETAIL 에서 acceptance group 을 찾는다.** 위반 메시지가 어느 문서를 봤는지 그대로 알려 준다. spec 을 `src/__tests__/` 에 모아 두면 `src/DETAIL.md` 가 하위 도메인 계약까지 들고 있어야 하므로, 검증 대상 fractal 의 `__tests__` 에 두는 편이 맞다(vitest include 가 `__tests__` 스코프인지 먼저 확인할 것).
- **pass-through 래퍼가 순환을 닫는 흔한 패턴.** `A` 가 `B` 의 함수를 그대로 넘기는 얇은 래퍼를 노출하고 `B` 는 `A` 를 쓰면 순환이다. 래퍼 소비자가 0건이면 제거가 정답이고(maencof `graphCache.ensureFreshGraph`), 소비자가 있으면 호출자를 `B` 로 직접 보낸다.
- **컨테이너 배럴에서 실행 진입점을 빼면 순환이 풀린다.** `mcp/index.ts` 가 `server/` 를 재노출하면 `server.ts → version.ts` 와 맞물려 순환이 되는데, `server/` 는 실행 진입점이지 라이브러리 API 가 아니고 `serverEntry` 가 형제 배럴을 직접 쓰므로 재노출 소비자가 애초에 없다. 배럴에서 무엇을 뺄 수 있는지는 **심볼별 소비자 실측**으로 판단한다.
- **Boundary Exemption 의 `Consumers` 는 `**/` 접두 glob 이어야 인식된다.** `scripts/devViewer.ts` 로 적으면 면책이 적용되지 않고, `**/scripts/devViewer.ts` 로 적어야 통과한다. 훅 면책은 `**/src/hooks/**`, 테스트 면책은 `**/__tests__/**`.
- **면책 헤딩의 target 은 trailing slash 없는 단일 경로여야 한다.** `### loaders/ · utils/ — ...` 처럼 둘을 묶거나 `### record/ —` 처럼 슬래시를 붙이면 경로로 해석되지 않는다. organ 이 둘이면 헤딩을 둘로 나눈다: `### loaders — ...`, `### utils — ...`.
- **fractal 컨테이너의 배럴은 하위 fractal 의 배럴을 재노출해야 한다.** `export { x } from './setup/setup.js'` 는 하위 모듈 경계를 넘는 위반이고, `'./setup/index.js'` 가 맞다.
- **`src/index.ts` 배럴을 손대도 되는지는 `main`·`files` 가 아니라 실제 소비자로 판단한다.** 플러그인 10개 전부 `publish:npm` 스크립트가 없어 npm 으로 배송되지 않으므로(`publish:all` 은 그 스크립트를 실행한다), `main: dist/index.js` 와 `files: ["dist"]` 는 배포 사실이 아니라 남은 선언이다. 워크스페이스 내부 소비자는 실측 결과 **`@ogham/maencof` 하나뿐**이다 — maencof-lens 의 `src/tools/lens{Navigate,Search,Read,Context}/` 가 `handleKgNavigate`·`handleKgSearch`·`handleMaencofRead`·`handleKgContext` 와 타입들을 가져가고, alias 가 `../maencof/src` 로 해석되어 **src 배럴을 직접** 경유한다. `atlassian/src imports @ogham/atlassian` 처럼 보이는 것들은 전부 파일 헤더 주석이다.
- **prettier 가 마크다운 헤딩의 `__tests__` 를 `**tests**` 로 바꿔 면책 target 을 훼손한다.** 백틱으로 감싸도 filid 파서가 target 으로 읽지 못한다. 언더스코어를 가진 organ 은 면책으로 풀지 말고 **소비자들의 공통 조상으로 옮긴다** — 규칙이 먼저 제시하는 해법이기도 하다.
- **`.test.ts` 는 검증 파일로 인식되어 경계 규칙에서 면제되지만, 케이스 없는 테스트 헬퍼는 일반 소스로 취급된다.** 같은 organ 을 9개 `.test.ts` 가 참조해도 위반이 아닌데 헬퍼 하나가 참조하면 위반으로 잡히는 이유이고, e2e 하네스가 DAG 순환을 닫는 이유이기도 하다.
- `src → mcp → server → src` 순환은 `createServer.ts` 의 `version.ts` 참조와 배럴의 `mcp` 재노출이 맞물려 생긴다. Boundary Exemption 은 boundary 규칙만 면제하고 **DAG 규칙은 별개로 남는다** — 순환을 지우려면 엣지 자체를 없애야 한다.
- 플러그인 루트의 `src/index.ts` 가 `mcp/` 를 재노출하면 `createServer → version.ts` 참조와 맞물려 `src → mcp → server → src` 순환이 된다. r-statistics·deilen 모두 같은 원인이었고, 같은 처방(재노출 제거)으로 풀렸다.

## 계획에서 벗어난 판단

- **r-statistics `src/index.ts` 를 삭제하지 않았다.** 이 배럴은 소비자가 0이고(빌드 진입점은 `mcp/serverEntry/`, `package.json:files` 에 `src`·`dist` 없음) filid 선례대로면 삭제가 정석이지만, 사용자 지시가 "기능 수정 금지·형식만"이므로 파일 삭제 대신 순환의 원인인 `mcp` 재노출만 제거했다. 삭제 여부는 T12에서 사용자 판단 항목으로 올린다.
- **`src/mcp/server/INTENT.md` 의 사실 오류를 고쳤다.** "도구 등록명 kebab-case" → 실제 등록명은 snake_case(`constants/mcpToolNames.ts` 실측). 형제 INTENT 두 곳과도 모순이었다. 코드 무변경.

## 잔존 (사유 포함)

| 플러그인     | 규칙                   | 건수 | 사유                                                                                                                                                                                                                                      |
| ------------ | ---------------------- | ---: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| prawf        | `module-entry-point`   |    1 | 플러그인 루트에 어댑터 진입점이 없음. filid 는 config exempt 로 처리 — T12 사용자 확인                                                                                                                                                    |
| r-statistics | `module-entry-point`   |    1 | 위와 동일                                                                                                                                                                                                                                 |
| r-statistics | `test-record-case-cap` |    1 | `rulesetMetaSync.test.ts` 가 동적 테이블 사용. 정적화하면 커버리지가 줄어 손대지 않음                                                                                                                                                     |
| r-statistics | spec 계열 3건          |    3 | `indeterminate` — 증거 부족이지 위반 아님. 규칙상 pass 로 바꾸지 않는다                                                                                                                                                                   |
| seiri        | `module-entry-point`   |    2 | 플러그인 루트와 `templates/`(마크다운 자산). 후자는 index 를 둘 성질이 아니다                                                                                                                                                             |
| cennad       | `open-settings` e2e    |    2 | **FCA 와 무관한 선재 실패, 미해결.** `GET /config` 응답에 `ratio` 키가 없다. main 소스로 되돌려도 동일하게 실패하고, `vitest.config.ts` 의 `exclude` 가 e2e 를 기본 `test:run` 에서 빼기 때문에 드러나지 않았다 — 위 "다음 착수 지점" 1번 |
| cennad       | `entry-point-surface`  |    4 | wildcard 배럴 4개. named 전개로 해소 가능하나 심볼 수가 많아 별도 배치로 미룸                                                                                                                                                             |
| cennad       | `module-entry-point`   |    2 | 플러그인 루트와 `hooks/`(훅 매핑 설정 노드)                                                                                                                                                                                               |
