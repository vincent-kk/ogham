# plugins FCA 준수화 — 핸드오프

이 문서만 읽고 이어갈 수 있게 쓴다. 배경과 플러그인별 조치 내역은 [LEDGER.md](./LEDGER.md), 원래 계획은 [PLAN.md](./PLAN.md).

## 현재 위치

- 브랜치: `refactor/plugins-fca-compliance` (main 에서 분기, 워킹트리 깨끗)
- **error 작업은 끝났다. 저장소 전체 FCA error 0** — 남은 413건은 전부 warning 이다.
- 기능은 바꾸지 않았다. 유일한 시그니처 변경은 cennad `createServer`/`startServer` 의 버전 주입이며 호스트에 보고되는 값은 특성 테스트로 고정했다.

### 상태 (`structure_validate(path=<저장소 루트>)` 6 스코프 실측)

| 스코프       | error | warning | 비고                                         |
| ------------ | ----: | ------: | -------------------------------------------- |
| plugins 10개 |     0 |     278 | 전부 완료                                    |
| (plugins 밖) |     0 |     135 | `shared/`·`mcp-servers/`·`tools/`·`scripts/` |

전체 검증: `yarn typecheck` 14 workspaces clean · `yarn test:run` **601 files / 4985 tests 통과**(598 passed·3 skipped / 4965 passed·20 skipped).

## 남은 일 — 전부 사용자 판단 항목

착수 전에 결정을 받는다. 실측 근거는 LEDGER 의 "다음 착수 지점"·"잔존" 절에 있다. **알려진 테스트 실패는 없다** — T12 검증 중 발견한 cennad `open-settings` e2e 선재 실패 2건은 T13 에서 해소했다.

1. **`detail-document-contract` 203건** — 작성 / severity 하향 / 경로 면제 중 선택.
2. **`zero-peer-file` 126건 · `module-entry-point` 21건** — 구현 파일을 organ 으로 옮기고 배럴을 두는 구조 작업.
3. **`entry-point-surface` 50건** — wildcard 배럴을 named export 로 전개.
4. **`test-record-case-cap` 7건** — 전부 dynamic table `indeterminate`. 정적화하면 커버리지가 줄어 손대지 않았다.
5. **cennad e2e 를 기본 `test:run` 에서 제외한 채 둘 것인가** — 이번에 계약 드리프트 2건을 숨긴 원인이다. 별도 config(`test:e2e:run`)로만 돌아가고 globalSetup 이 `yarn build:plugin` 을 실행한다.

## 확립된 처방

### A. 형제 배럴 경유로 import 교정 (문서 불필요)

`…/<name>/<file>.js` → `…/<name>/index.js`. **먼저 배럴이 그 심볼을 실제로 노출하는지 심볼 단위로 확인한다** — 모듈명 grep 은 오답을 준다(wildcard 배럴은 grep 에 안 잡히지만 해석되고, named 배럴은 파일명만 있고 심볼이 없을 수 있다). 없으면 배럴에 이름을 추가하는 것이 정석이다(외부 소비자가 이미 있다면 실질 공개 심볼이므로 `seiri_public-contract` §1 을 만족한다).

`src/hooks/**` 안의 importer 는 제외한다 — 처방 C 로 간다.

### B. 배럴에서 실행 진입점 재노출 제거 (순환 해소)

`src/index.ts` 나 `mcp/index.ts` 가 `mcp/`·`mcp/server/` 를 재노출하면 `server` 의 `version.ts` 참조와 맞물려 순환이 된다. **제거 전에 심볼별 소비자를 실측**한다:

```bash
grep -rn "createServer\|startServer" src --include="*.ts" | grep -v node_modules
grep -rn 'from ".*mcp/index\.js"' src --include="*.ts" | grep -v node_modules
```

실행 진입점(`serverEntry`)이 형제 배럴을 직접 쓰고 있으면 재노출 소비자는 0건이다. 제거 자리에 이유를 주석으로 남긴다.

### C. organ·concrete 직접 import 면책

소유 fractal 의 `DETAIL.md` 에 선언한다. **target·consumer·verdict 은 코드 스팬으로 쓴다.**

```md
## Boundary Exemptions

### `operations` — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`
- **Direct import**: `allowed`
- **Reason**: 훅은 esbuild 번들로 배송되고 이벤트별 크기 가드를 받는다. 배럴을 거치면 재노출 그래프 전체가 번들에 끌려 들어와 가드를 넘긴다 — 배럴 경유는 선택지가 아니라 빌드 실패다.
```

### D. `version.ts` 면책 (`src/DETAIL.md`)

생성기가 만드는 단일 상수라 경유할 진입점이 없다. 소비자를 배럴로 돌리면 하위 fractal 이 조상 배럴 표면 전체에 의존하고, 훅 소비자는 크기 가드에 걸린다.

### E. 검증 파일 상한 초과 분할

**커버리지를 줄이지 않는다.** 기존 `describe` 경계로 가르고 케이스 본문은 그대로 옮긴다. 파일명은 검증 대상에서 가져온다. `vi.mock` 은 파일 단위라 프리앰블은 공유 헬퍼로 빼지 말고 각 파일이 필요한 만큼만 든다(케이스 없는 헬퍼 파일은 일반 소스로 취급돼 경계 위반을 만든다). 확인: **케이스 총수 불변** + 상한 규칙 소멸.

## 함정 (실측으로 얻은 것)

- **면책 파일 target 은 디스크의 실제 확장자(`.ts`)다.** import specifier 의 `.js` 를 옮기면 조용히 무시된다. organ target 은 확장자가 없어 영향이 없으므로 "organ 면책만 통하고 파일 면책만 남는" 증상으로 드러난다.
- **`INTENT.md`·`DETAIL.md` 가 없어도 `index.ts` 가 있으면 module index 로 fractal 이다.** 면책은 부모가 아니라 그 디렉터리 자신의 DETAIL 에 써야 한다.
- **면책 `Consumers` 는 `**/` 접두 glob 이어야 인식된다.** `scripts/devViewer.ts` 는 무시되고 `**/scripts/devViewer.ts` 는 통과한다.
- **면책 헤딩 target 은 단일 경로.** 둘을 묶거나 trailing slash 를 붙이면 경로로 해석되지 않는다. 헤딩을 나눈다.
- **코드 스팬을 쓰면 prettier 가 `__tests__` 를 `**tests**` 로 훼손하는 것도 막힌다.** bare 값도 읽히지만 스팬이 안전한 기본값이다.
- **`spec-contract-link` 은 spec 파일 소유 fractal 의 DETAIL 에서 acceptance group 을 찾는다.** 위반 메시지가 어느 문서를 봤는지 알려 준다. spec 은 검증 대상 fractal 의 `__tests__` 에 두는 편이 맞다(vitest include 가 `__tests__` 스코프인지 먼저 확인).
- **공유 패키지의 `exports` 맵이 concrete 파일을 서브패스로 노출하면 배럴 경유가 설계 위반이다.** 처방은 A 가 아니라 C 다.
- **pass-through 래퍼가 순환을 닫는다.** `A` 가 `B` 의 함수를 그대로 넘기고 `B` 가 `A` 를 쓰면 순환이다. 래퍼 소비자가 0건이면 제거가 정답.
- **fractal 컨테이너 배럴은 하위 fractal 의 배럴을 재노출해야 한다.** `'./setup/setup.js'` 는 위반, `'./setup/index.js'` 가 맞다.
- **`.test.ts` 는 검증 파일로 인식돼 경계·DAG 규칙에서 면제되지만, 케이스 없는 테스트 헬퍼는 일반 소스다.** e2e 하네스가 DAG 순환을 닫는 이유다.
- **부모 배럴을 모킹한 테스트는 배럴 교정에 깨진다.** assertion 은 건드리지 말고 모킹 대상 경로만 실제 의존으로 옮긴다.
- **파일 이동은 기본 `test:run` 에 없는 참조를 깨뜨릴 수 있다.** 이동 뒤 `structure_validate` 의 `unresolved-local-dependency` 진단을 확인한다.
- **plugins 는 npm 으로 배송되지 않는다**(`publish:npm` 없음). `main`·`files` 는 남은 선언이므로 배럴 수정 가능 여부는 **실제 소비자**로 판단한다. 워크스페이스 내부 소비자는 `@ogham/maencof` 하나뿐이고, maencof-lens 가 도구 핸들러 5종·`MetadataStore`·`READ_REINDEX_CAP`·`CACHE_FILES`·타입을 가져간다 — **이 심볼들은 배럴에서 빼면 안 된다**(서버 팩토리는 안 쓰므로 빼도 된다는 것을 실측으로 확인했다).
- **maencof 훅 번들 캡은 이벤트별이다**(session-start 56KB / user-prompt-submit 42KB / post-tool-use·pre-tool-use 12KB). 훅 관련 변경 뒤 `yarn maencof build:plugin`.

## 검증 절차 (작업마다)

```bash
yarn <workspace> typecheck        # 예: yarn imbas typecheck
yarn <workspace> test:run         # 케이스 수가 기준선과 같아야 한다
yarn <workspace> build:plugin     # 훅이 있는 플러그인만 (번들 캡 가드)
```

그리고 `mcp__plugin_filid_tools__structure_validate(path=<절대경로>)`. 스코프를 좁히면 빠르다: `["boundaries","dag"]`.

공유 패키지(`shared/*`)를 건드리면 `yarn typecheck`(전 워크스페이스)를 돌린다. 전체 마감은 `yarn test:run`(루트 vitest 가 14 프로젝트를 묶는다).

typecheck 와 test 는 **동시 실행하지 않는다**. `bridge/`·`public/`·`dist/` 변경은 커밋하지 않는다(사용자 소관) — 검증용 빌드 뒤 `git checkout -- <plugin>/bridge` 로 되돌린다.

## 커밋 규약

- 작업 단위(대상 × 처방)로 끊는다. co-author 라인 없음.
- 메시지에 **무엇이 왜 바뀌었고, 어떤 명령으로 확인했는지**(테스트 파일·케이스 수 포함) 적는다.
- 커밋 전 `npx prettier --write` 로 변경한 `.md` 를 정렬한다. 저장소에는 기존부터 prettier 미적용인 `.ts` 가 있으므로 **내가 바꾸지 않은 파일은 포매팅하지 않는다**. 단 내가 건드린 파일에 선재 미정렬이 있으면 함께 정렬하고 커밋 메시지에 밝힌다(Stop 훅이 손댄 파일을 포매팅한다).

## 재사용 스크립트

세션 스크래치패드에 있던 것들이다. 다음 세션에는 없으므로 필요하면 아래 설명대로 다시 만든다. `structure_validate` 는 큰 결과를 아티팩트 JSON 으로 남기고 경로를 돌려준다 — 집계 스크립트는 그 경로를 인자로 받는다.

| 스크립트              | 용도                                                                                                                                            |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `errors-only.mjs`     | 아티팩트를 severity·규칙별 집계. `--list` 로 error 경로, `--messages` 로 메시지까지                                                             |
| `by-plugin.mjs`       | 같은 아티팩트를 플러그인별 error/warning 집계. 인자로 한 플러그인의 규칙별 분포                                                                 |
| `classify-bypass.mjs` | boundary error 를 hook / version / organ-reach / barrel 로 분류하고 소유 fractal 별 그룹 출력. 3번째 인자로 갈래 이름을 주면 그 갈래의 raw 목록 |
| `rewrite-imports.mjs` | `[{file, from, to}]` 테이블로 exact-string 재작성. 매칭 0건이면 실패로 끝난다                                                                   |
| `split-tests.mjs`     | 처방 E. 프리앰블 파일 + 소스 라인 범위로 분할하고 `it(` 총수 보존을 검증                                                                        |
