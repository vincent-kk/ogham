# plugins FCA 준수화 — 핸드오프

이 문서만 읽고 이어갈 수 있게 쓴다. 배경과 플러그인별 조치 내역은 [LEDGER.md](./LEDGER.md), 원래 계획은 [PLAN.md](./PLAN.md).

## 현재 위치

- 브랜치: `refactor/plugins-fca-compliance` (main 에서 분기, 워킹트리 깨끗)
- 커밋 13개. 마지막: `36704f47 refactor(imbas): cross fractals through barrels`
- 목표: `plugins/` 전 플러그인의 FCA **error 0**. 기능은 바꾸지 않는다 — 바뀌는 것은 파일 위치, import 경로, 배럴 재노출 형태, 문서뿐이다.

### 플러그인 상태 (error 기준)

| 플러그인      | error | 비고                                                    |
| ------------- | ----: | ------------------------------------------------------- |
| prawf         |     0 | 완료                                                    |
| r-statistics  |     0 | 완료                                                    |
| deilen        |     0 | 완료                                                    |
| entrez        |     0 | 완료                                                    |
| seiri         |     0 | 완료                                                    |
| atlassian     |     0 | 완료                                                    |
| maencof-lens  |     0 | 완료                                                    |
| cennad        |     1 | 순환 1 — e2e 하네스가 닫는 것, 배송 그래프엔 없음(잔존) |
| **imbas**     | **5** | **다음 차례 — 아래 목록이 전부다**                      |
| **maencof**   |  ~146 | 최대 작업량. 서브배치 필요                              |
| (root 스코프) |     4 | 마지막                                                  |

`detail-document-contract` 는 **warning 으로 낮췄다**(`.filid/config.json`). 도구 기본값이 fractal 마다 DETAIL 을 error 로 요구했지만 `filid_module-documents.md §6` 은 DETAIL 없는 fractal 을 전제한다 — 산문과 기본값이 어긋난 것이었다. 그래서 DETAIL 은 **면책을 선언해야 할 때만** 만든다.

## T9 — imbas: 남은 error 5건 (전부)

1. **순환 1** — `src → src/mcp → …`. 원인은 `src/index.ts` 의 `mcp` 재노출과 `mcp/server/server.ts` 의 `version.ts` 참조가 맞물린 것. 처방: 배럴에서 `mcp` 재노출 제거(아래 "처방 B").
2. **organ-reach 1** — `src/hooks/contextInjector/contextInjector.ts` → `../../core/paths/utils/projectDirName.js`. 처방: `src/core/paths/DETAIL.md` 에 `utils` 훅 면책(처방 C).
3. **version 2** — `src/mcp/server/server.ts`, `src/mcp/tools/imbasPing/imbasPing.ts` 의 `version.js` 참조. 처방: `src/DETAIL.md` 에 `version.ts` 면책(처방 D).
4. **테스트 상한 1** — `src/__tests__/schemas.test.ts` 가 46 케이스(상한 32). 처방: describe 경계로 분할(처방 E).

기준선: `yarn imbas test:run` → **32 files / 304 tests**. 어떤 단계 뒤에도 이 숫자가 그대로여야 한다.

## T10 — maencof (최대 작업량, 서브배치로)

실측 분포(배럴 교정 전 기준):

- `external-import-boundary` 137 — 갈래별로 처방이 다르다:
  - **hook 56** — importer 가 `src/hooks/**`. 배럴로 바꾸면 번들 캡 위반이다. **면책 선언만**(처방 C).
  - **organ-reach 68** — 소유 fractal 15곳에 DETAIL + 면책이 필요하다. 목록은 `scratchpad/exemption-owners.mjs` 를 다시 돌려 얻는다.
  - **barrel 14** — 배럴 경유 교정(처방 A).
  - **version 1** — `src/DETAIL.md` 면책(처방 D).
- `circular-dependency` 2 · `intent-document-contract` 3 · `spec-contract-link` 3 · `test-record-case-cap` 1

**서브배치 권장**: ① barrel 교정 → ② version·organ 면책 → ③ hook 면책 → ④ INTENT 3건 → ⑤ spec 링크·테스트 상한. 배치마다 커밋한다.

**maencof 전용 주의**: `@ogham/maencof` 는 워크스페이스 내부 소비자가 있는 **유일한** 배럴이다. maencof-lens 의 `src/tools/lens{Navigate,Search,Read,Context}/` 가 `handleKgNavigate`·`handleKgSearch`·`handleMaencofRead`·`handleKgContext` 와 타입을 가져가고, alias 가 `../maencof/src` 로 해석되어 **src 배럴을 직접** 경유한다. **이 배럴에서 심볼을 빼면 maencof-lens 가 깨진다.** 순환을 풀 때 `mcp` 재노출만 건드리고 위 4개 핸들러는 유지할 것.

또한 maencof 훅은 번들 캡이 있다(`start 56KB / end 40KB`). 훅 관련 변경 뒤 `yarn maencof build:plugin` 으로 가드를 확인한다.

## 확립된 처방 5가지

### A. 형제 배럴 경유로 import 교정 (문서 불필요)

`…/<name>/<name>.js` → `…/<name>/index.js`. 스크립트가 있다:

```bash
node <scratch>/rewrite-to-barrel.mjs /Users/Vincent/Workspace/ogham/plugins/<plugin>/src
```

`src/hooks/**` 는 자동 제외한다(번들 캡). 실행 후 typecheck → test.

### B. 배럴에서 `mcp` 재노출 제거 (순환 해소)

`src/index.ts` 가 `mcp/` 를 재노출하면 `mcp/server` 의 `version.ts` 참조와 맞물려 순환이 된다. **제거 전에 배럴 소비자를 확인**한다:

```bash
grep -rn 'from "\(\.\./\)*index\.js"' src --include="*.ts" | grep -v node_modules
```

자기 모듈 배럴(`../index.js` = 그 fractal 의 배럴)만 나오면 루트 배럴 소비자는 0건이다. 제거 자리에 이유를 주석으로 남긴다.

### C. organ·concrete 직접 import 면책

소유 fractal 의 `DETAIL.md` 에 선언한다:

```md
## Boundary Exemptions

### utils — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`
- **Direct import**: allowed
- **Reason**: 훅은 esbuild 번들로 배송되고 크기 가드를 받는다. 배럴을 거치면 재노출 그래프 전체가 번들에 끌려 들어와 가드를 넘긴다 — 배럴 경유는 선택지가 아니라 빌드 실패다.
```

### D. `version.ts` 면책 (`src/DETAIL.md`)

```md
### version.ts — Generated version constant has no entry point

- **Consumers**: `**/src/**`
- **Direct import**: allowed
- **Reason**: 생성기가 만드는 단일 상수 파일이고 아무것도 import 하지 않는다. 배럴을 경유시키면 `src → mcp → server → src` 순환이 생긴다.
```

### E. 테스트 상한 초과 파일 분할

**커버리지를 줄이지 않는다.** 기존 `describe` 경계로 파일을 가르고 케이스 본문은 그대로 옮긴다. 파일명은 검증 대상에서 가져온다. `scratchpad/split-tests.mjs` 가 atlassian 사례의 참고 구현이다. 확인: `verification_scan` 의 `violationCount: 0` 과 **케이스 총수 불변**.

## 함정 (실측으로 얻은 것)

- **면책 `Consumers` 는 `**/` 접두 glob 이어야 인식된다.** `scripts/devViewer.ts` 는 무시되고 `**/scripts/devViewer.ts` 는 통과한다.
- **면책 헤딩 target 은 trailing slash 없는 단일 경로.** `### loaders/ · utils/ —` 처럼 둘을 묶거나 `### record/ —` 처럼 슬래시를 붙이면 경로로 해석되지 않는다.
- **prettier 가 헤딩의 `__tests__` 를 `**tests**` 로 바꾼다.** 백틱으로 감싸도 파서가 target 으로 읽지 못한다. 언더스코어 organ 은 면책이 아니라 **소비자들의 공통 조상으로 이동**해 푼다(cennad `fakeBinary.ts` 사례).
- **fractal 컨테이너 배럴은 하위 fractal 의 배럴을 재노출해야 한다.** `'./setup/setup.js'` 는 위반, `'./setup/index.js'` 가 맞다.
- **`.test.ts` 는 검증 파일로 인식돼 경계 규칙에서 면제되지만, 케이스 없는 테스트 헬퍼는 일반 소스로 취급된다.** 같은 organ 을 9개 `.test.ts` 가 참조해도 위반이 아닌데 헬퍼 하나가 참조하면 잡히는 이유다. e2e 하네스가 DAG 순환을 닫는 이유이기도 하다.
- **부모 배럴을 모킹한 테스트는 배럴 교정에 깨진다.** atlassian `setup/__tests__/connectionTester.test.ts` 10건이 그랬다. **assertion 은 건드리지 말고 모킹 대상 경로만** 실제 의존으로 옮긴다.
- **파일 이동은 기본 `test:run` 에 없는 참조를 깨뜨릴 수 있다.** entrez 에서 live 스모크 테스트가 그랬다. 이동 뒤 `structure_validate` 의 `unresolved-local-dependency` 진단을 확인한다.
- 플러그인은 npm 으로 배송되지 않는다(`publish:npm` 스크립트 없음). `main`·`files` 는 남은 선언이므로 배럴 수정 가능 여부는 **실제 소비자**로 판단한다.

## 검증 절차 (작업마다)

```bash
yarn <workspace> typecheck        # 예: yarn imbas typecheck
yarn <workspace> test:run         # 케이스 수가 기준선과 같아야 한다
yarn <workspace> build:plugin     # 훅이 있는 플러그인만 (번들 캡 가드)
```

그리고 `mcp__plugin_filid_tools__structure_validate(path=<플러그인 절대경로>)`. 스코프를 좁히면 빠르다: `["boundaries","dag","verification"]`.

typecheck 와 test 는 **동시 실행하지 않는다**. `bridge/`·`public/`·`dist/` 변경은 커밋하지 않는다(사용자 소관) — 검증용 빌드 뒤 `git status` 로 확인할 것.

## 커밋 규약

- 작업 단위(플러그인 × 처방)로 끊는다. co-author 라인 없음.
- 메시지에 **무엇이 왜 바뀌었고, 어떤 명령으로 확인했는지**(테스트 파일·케이스 수 포함) 적는다.
- 커밋 전 `npx prettier --write` 로 변경한 `.md` 를 정렬한다. 저장소에는 기존부터 prettier 미적용인 `.ts` 가 39개 있으므로 **내가 바꾸지 않은 파일은 포매팅하지 않는다**(무관한 diff 방지).

## 재사용 스크립트

세션 스크래치패드에 있던 것들이다. 다음 세션에서는 없으므로 필요하면 이 문서의 설명대로 다시 만든다.

| 스크립트                | 용도                                                        |
| ----------------------- | ----------------------------------------------------------- |
| `rewrite-to-barrel.mjs` | 처방 A. eponymous 참조 → 배럴 참조, `hooks/` 제외           |
| `move-into-organ.mjs`   | fractal 루트 구현 파일 → organ 이동 + specifier 해석 재작성 |
| `split-tests.mjs`       | 처방 E. describe 경계로 테스트 파일 분할                    |
| `errors-only.mjs`       | 스캔 아티팩트에서 error 만 플러그인·규칙별 집계             |
| `classify-bypass.mjs`   | boundary error 를 hook / version / barrel 갈래로 분류       |
| `exemption-owners.mjs`  | organ-reach error 에서 DETAIL 이 필요한 소유 fractal 목록   |

`structure_validate` 는 큰 결과를 아티팩트 JSON 으로 남기고 경로를 돌려준다. 위 집계 스크립트는 그 경로를 인자로 받는다.
