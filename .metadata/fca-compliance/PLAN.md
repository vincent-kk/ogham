# plugins FCA 준수화 계획

`plugins/` 전 플러그인을 filid FCA 규칙에 맞춘다. **동작은 바꾸지 않는다.** 형식(문서·경계·배치)만 정렬한다.

## 기준 실측

2026-07-30, `structure_validate(path=/Users/Vincent/Workspace/ogham/plugins, mode=project)` 기준 위반 792건.
snapshot `c2973a9e7b7f623da8d0ce1dc4797cf8366831c6e8f260a71766abb868265c17`.

| 규칙                       | 건수 | 등급    | 해소 수단                                             |
| -------------------------- | ---: | ------- | ----------------------------------------------------- |
| `detail-document-contract` |  340 | error   | DETAIL.md 신규 작성                                   |
| `external-import-boundary` |  238 | error   | DETAIL.md `## Boundary Exemptions` 선언 (코드 무변경) |
| `zero-peer-file`           |  100 | warning | organ 하위 이동, 또는 설정 파일은 config allowed-peer |
| `entry-point-surface`      |   52 | warning | 배럴 `export *` → named export                        |
| `module-entry-point`       |   24 | warning | 배럴 신설, 또는 플러그인 루트는 config exempt         |
| `circular-dependency`      |   10 | error   | 배럴 역참조 → concrete import                         |
| `spec-contract-link`       |   10 | error   | spec 파일에 `filid:contract <AC-id>` 마커             |
| `organ-no-intentmd`        |    4 | warning | organ의 INTENT.md 제거 또는 fractal 승격              |
| `test-record-case-cap`     |    7 | 혼합    | 동적 테이블 → 정적 케이스, 또는 파일 분할             |
| `intent-document-contract` |    3 | error   | INTENT.md 신규 작성                                   |
| 기타 (root 스코프)         |    4 | 혼합    | 최종 태스크에서 처리                                  |

플러그인별 총량: maencof 366 · imbas 100 · maencof-lens 68 · atlassian 55 · cennad 50 · entrez 47 · seiri 47 · deilen 33 · r-statistics 20 · prawf 2 · (root) 4.

`plugins/filid`는 위반 0건이다. **모든 형식 판단의 정본 참조는 filid 트리다.**

## 전역 제약 (모든 태스크가 상속)

- **동작 불변**: 런타임 심볼의 값·시그니처·부수효과를 바꾸지 않는다. 바뀌는 것은 파일 위치, import 경로, 배럴 재노출 형태, 문서뿐이다.
- **생성물 손편집 금지**: `bridge/`, `public/`, `.codex-plugin/`, 루트 `plugin.json`, `mcp_config.json`, `hooks.json`, `src/version.ts`. 빌드 산출물은 검증용으로만 생성하고 커밋하지 않는다(사용자 소관).
- **훅 도달 코드의 concrete import는 의도된 설계다.** 배럴로 되돌리지 않는다. `src/hooks/**` 하위 importer가 일으킨 `external-import-boundary`는 전부 소유 fractal DETAIL.md의 `## Boundary Exemptions`로 해소한다.
- **문서 언어**: 섹션 헤딩(`Requirements`, `API Contracts`, `Acceptance Criteria`, `Boundary Exemptions`, `History`, `Last Updated`)은 영어 고정, 본문은 한국어(`[filid:lang] ko`). SKILL.md·agent `.md`·CLAUDE.md는 영어 유지.
- **INTENT.md는 50줄 이하**. 정확히 50줄인 파일은 라인 중립 편집도 차단되므로 손댈 때 49줄 이하로 줄인다.
- **config 면제 범위**: `.filid/config.json`의 `additionalAllowedPeers`에 **명백한 설정 파일만** 추가한다(`tsconfig.*.json`, `<name>.entry.ts`). 소스 파일은 config로 덮지 않는다.
- **검증 명령** (플러그인 `<w>` = `yarn <workspace-alias>`):
  - `yarn <w> typecheck`
  - `yarn <w> test:run`
  - `yarn <w> build:plugin` (훅 번들 크기·금지 모듈 가드. 스크립트가 있는 플러그인만)
  - `mcp__plugin_filid_tools__structure_validate(path=<플러그인 절대경로>)`
  - typecheck와 test는 **동시 실행하지 않는다**.
- **포매팅**: 커밋 전 `yarn docs:format` (Stop 훅이 prettier를 돌리므로 미리 정렬).
- **커밋**: 플러그인 단위로 끊는다. co-author 라인 없음.

## 태스크 간 인터페이스 (T1에서 확정, 이후 전부 소비)

### I-1. DETAIL.md 템플릿

```md
# <노드명> — Contract

## Requirements

- (이 fractal이 지켜야 할 불변식. INTENT의 Purpose/Conventions를 근거로, 소스에서 확인한 실제 제약)

## API Contracts

- `symbol(arg: T): R` — (진입점이 노출하는 심볼과 그 의미. 시그니처 나열이 아니라 계약)

## Acceptance Criteria

### AC-<kebab-slug> — <한국어 제목>

- (검증 가능한 기준. 기존 `__tests__` 케이스를 근거로 서술)

## Last Updated

2026-07-30 — 계약 문서를 신설했다.
```

- `Requirements` / `API Contracts` / `Acceptance Criteria` / `Last Updated` 4개 섹션은 필수. `Boundary Exemptions`는 면제가 실제로 있을 때만.
- AC 그룹 ID는 문서 내 유일. `AC-` 접두 + kebab-case.
- **`## History`는 신설 문서에 넣지 않는다.** 이번 작업 자체는 역사가 아니다.

### I-2. Boundary Exemption 항목 템플릿

```md
## Boundary Exemptions

### <대상 경로> — <짧은 제목>

- **Consumers**: `**/src/hooks/**`
- **Direct import**: allowed
- **Reason**: 훅 번들은 배럴을 import할 수 없다 — esbuild가 배럴이 재노출하는 모듈 전체를 번들로 끌어오고, 빌드 스크립트의 바이트 캡이 이를 빌드 실패로 막는다.
```

- `Reason`이 비면 면제가 아니다. 훅 번들 외의 사유(생성 상수, npm barrel 부재 등)는 그 사유를 그대로 쓴다.
- 정본 예시: `plugins/filid/src/DETAIL.md`(version.ts), `plugins/filid/src/core/tree/organClassifier/DETAIL.md`(훅 번들).

### I-3. zero-peer 이동 규칙

- fractal 루트의 구현 파일은 그 루트의 organ 하위로 내린다. organ 이름은 파일이 하는 일에서 나온다(`grab-bag` 금지: `common`, `misc`, `utils2`).
- 파일 1개짜리 이동은 함수명과 같은 이름의 organ을 새로 만들지 말고, **이미 있는 형제 organ 중 책임이 맞는 곳**에 넣는다. 맞는 곳이 없을 때만 새 organ을 만든다.
- `<name>.entry.ts`(훅 진입점)와 `tsconfig.*.json`은 이동하지 않는다 — T0에서 config allowed-peer로 등록한다.
- 이동 후 참조 갱신은 상대경로 유지 원칙을 따른다: 도메인 경계를 넘을 때만 `@/`, intra-domain은 상대경로.

## 태스크

작은 플러그인부터 간다. T1이 템플릿을 확정하고, 이후는 같은 절차의 반복이다.

### T0 — config allowed-peer 등록 (선행)

**파일**: `.filid/config.json`

`structure.additionalAllowedPeers`에 아래를 추가한다(기존 배열 끝에 append, 기존 항목 수정 금지):

```json
{ "basename": "tsconfig.test.json" },
{ "basename": "tsconfig.eslint.json" },
{ "basename": "sessionStart.entry.ts", "paths": ["**/plugins/maencof/src/hooks/sessionStart", "**/plugins/imbas/src/hooks/sessionStart"] },
{ "basename": "contextInjector.entry.ts", "paths": ["**/plugins/maencof/src/hooks/contextInjector"] },
{ "basename": "setup.entry.ts", "paths": ["**/plugins/imbas/src/hooks/setup"] },
{ "basename": "preToolUse.entry.ts", "paths": ["**/plugins/maencof/src/hooks/preToolUse", "**/plugins/imbas/src/hooks/preToolUse"] },
{ "basename": "postToolUse.entry.ts", "paths": ["**/plugins/maencof/src/hooks/postToolUse"] },
{ "basename": "userPromptSubmit.entry.ts", "paths": ["**/plugins/maencof/src/hooks/userPromptSubmit", "**/plugins/imbas/src/hooks/userPromptSubmit"] },
{ "basename": "agentEnforcer.entry.ts", "paths": ["**/plugins/maencof/src/hooks/agentEnforcer"] }
```

**주의**: 위 `paths`는 T1 착수 전에 실제 존재를 확인하고 확정한다 — 존재하지 않는 경로를 등록하면 죽은 설정이 된다. 확인 명령:

```bash
find plugins -name "*.entry.ts" -not -path "*/node_modules/*" | sort
```

`module-entry-point`의 플러그인 루트 경고(24건 중 10건)는 **T12에서 사용자 확인 후** 결정한다 — filid는 이미 `rules.module-entry-point.exempt`로 처리되어 있으나, 이는 "설정 파일" 면제가 아니므로 임의로 확장하지 않는다.

**완료 기준**: `structure_validate` 재실행에서 `zero-peer-file` 중 `tsconfig.*`·`*.entry.ts` 항목이 사라진다.

### T1 — prawf (2건, 템플릿 확정)

- `plugins/prawf/DETAIL.md`에 `## Acceptance Criteria` 섹션 추가 (누락된 유일한 섹션).
- `module-entry-point` 경고는 T12로 이월.
- **이 태스크의 산출물이 I-1 템플릿의 실물 기준이 된다.**
- 검증: `structure_validate(path=plugins/prawf)` → `detail-document-contract` 0건.

### T2 — r-statistics (20건)

1. `src/index.ts`의 `export * from "./types/index.js"` → named export로 전환.
2. `src/mcp/server/lifecycle/createServer.ts`의 `../../../version.js` import → `src/DETAIL.md`에 Boundary Exemption 선언(코드 무변경). 이것이 `circular-dependency` 1건의 원인이기도 하므로 재스캔으로 순환 해소 여부를 확인하고, 남으면 T12로 이월한다.
3. DETAIL.md 14개 신설: `r-statistics`, `src`, `src/mcp`, `src/core`, `src/mcp/tools`, `src/mcp/server`, `src/mcp/shared`, `src/core/jobStore`, `src/core/rRuntime`, `src/core/workspace`, `src/core/commandGate`, `src/mcp/tools/getRJob`, `src/mcp/tools/cancelRJob`, `src/mcp/tools/assertAnalysisPlan`.
4. `src/mcp/tools/runR/DETAIL.md`에 `## Acceptance Criteria` 추가.
5. `test-record-case-cap` 1건(`assertAnalysisPlan/__tests__/rulesetMetaSync.test.ts` 동적 테이블) — indeterminate이며 커버리지를 줄이지 않고는 해소 불가. **손대지 않고 T12 잔존 목록에 기록**한다.
6. 검증: `yarn rStatistics typecheck` → `yarn rStatistics test:run` → `structure_validate`.

### T3 — deilen (33건)

- DETAIL.md 24개 신설 + `spec-contract-link` 3건: `e2e/*.spec.ts`에 `filid:contract <AC-id>` 마커를 넣고, 대응 AC 그룹을 `plugins/deilen/DETAIL.md`에 정의한다.
- `src/mcp/pages/**`는 독립 스크립트다 — 서버 모듈 import 금지 원칙을 깨지 않는다. 해당 경계는 문서로만 선언한다.
- 검증: `yarn deilen typecheck` → `yarn deilen test:run` → `structure_validate`.

### T4 — entrez (47건)

- DETAIL.md 27개, zero-peer 10건(`efetch.ts`, `elink.ts`, `esearch.ts`, `espell.ts`, `esummary.ts`, `idconv.ts` 등 → 소속 organ으로), `organ-no-intentmd` 1건, `module-entry-point` 4건.
- 검증: `yarn entrez typecheck` → `yarn entrez test:run` → `structure_validate`.

### T5 — seiri (47건)

- DETAIL.md 22개, `external-import-boundary` 16건(대부분 훅 → Boundary Exemption), `module-entry-point` 8건, `organ-no-intentmd` 1건.
- **주의**: seiri 훅은 이 세션에서 동작 중이다. `src`만 고치고 `bridge/`는 재빌드하지 않는다(검증용 빌드는 실행하되 산출물은 커밋 제외).
- 검증: `yarn seiri typecheck` → `yarn seiri test:run` → `yarn seiri build:plugin`(번들 가드) → `structure_validate`.

### T6 — cennad (50건)

- DETAIL.md 34개, `entry-point-surface` 4건, `external-import-boundary` 7건, `zero-peer-file` 1건, `organ-no-intentmd` 1건, `circular-dependency` 1건.
- 웹 UI(`index.html`, `app.js`)는 영어 유지.
- 검증: `yarn cennad typecheck` → `yarn cennad test:run` → `yarn cennad build:plugin` → `structure_validate`.

### T7 — atlassian (55건)

- DETAIL.md 26개, `zero-peer-file` 19건, `circular-dependency` 2건(`src → src/mcp → src/mcp/server → src`, `src/core → src/core/connectionTester → src/core`), `external-import-boundary` 3건, `test-record-case-cap` 2건.
- 순환 2건은 `../index.js` 배럴 역참조가 원인 — concrete import로 바꾼다(심볼 동일, 동작 불변).
- 검증: `yarn atlassian typecheck` → `yarn atlassian test:run` → `structure_validate`.

### T8 — maencof-lens (68건)

- DETAIL.md 24개, `external-import-boundary` 32건, `zero-peer-file` 6건, `spec-contract-link` 4건.
- **주의**: `@ogham/maencof`의 handler/타입을 공유하며 esbuild가 `../maencof/src`를 직접 번들한다. 이 경계는 additive 유지 — 이동·재노출 형태를 바꾸지 않고 문서로 선언한다.
- 검증: `yarn maencof-lens typecheck` → `yarn maencof-lens test:run` → `structure_validate`.

### T9 — imbas (100건)

- DETAIL.md 49개, `external-import-boundary` 37건(대부분 훅), `zero-peer-file` 7건, `test-record-case-cap` 2건, `module-entry-point` 2건, `organ-no-intentmd` 1건.
- `_shared` organ 관련 경고는 기존 판단(루트 config `additional-route-patterns` 면제 / entry-point 경고 의도적 잔존)을 유지한다.
- 검증: `yarn imbas typecheck` → `yarn imbas test:run` → `yarn imbas build:plugin` → `structure_validate`.

### T10 — maencof (366건)

가장 큰 태스크다. **서브배치로 쪼개 커밋한다**:

- T10a: `src/hooks/**` — `external-import-boundary` 137건 중 훅 유래분을 Boundary Exemption으로 일괄 선언. 훅 번들 캡(start 56KB / end 40KB) 재검증.
- T10b: `zero-peer-file` 57건 — personalContext·turnContext·builders 계열. **재분해 금지 디렉터리**(`middlewares`, `turnContext`, `personalContext`, `shared`, `builders`)는 이동 대상에서 제외하고 잔존으로 기록한다.
- T10c: DETAIL.md 117개 — depth 1~5. leaf에서 root 방향으로 작성.
- T10d: `entry-point-surface` 43건 — 배럴 named export 전환.
- T10e: `intent-document-contract` 3건, `circular-dependency` 2건, `spec-contract-link` 3건, `test-record-case-cap` 2건.
- 검증: 각 서브배치마다 `yarn maencof typecheck` → `yarn maencof test:run` → `yarn maencof build:plugin`.

### T11 — 루트 스코프 (4건)

- `plugins` 스코프에서 잡힌 `circular-dependency` 1(indeterminate), `external-import-boundary` 1(indeterminate), `spec-document-case-cap` 1, `spec-fragmentation` 1.
- indeterminate 2건은 미해결 증거이지 위반이 아니다 — 원인(미해결 의존)을 기록하고 해소 가능한 경우만 처리한다.

### T12 — 전체 재검증 및 잔존 보고

1. `structure_validate(path=/Users/Vincent/Workspace/ogham/plugins)` 전체 재실행.
2. `yarn typecheck` → `yarn test:run` → `yarn lint` (전 워크스페이스).
3. 남은 위반을 등급별로 정리하고, 각 항목에 **잔존 사유**를 붙인다. 사유 없는 잔존은 없다.
4. `module-entry-point` 플러그인 루트 경고 처리 방식(config exempt 확장 여부)을 사용자에게 확인한다.

## 검증 가능한 완료 조건

- `structure_validate(plugins)`의 `error` 등급 위반이 0건이거나, 남은 각 건이 T12 보고서에 사유와 함께 기록되어 있다.
- 전 워크스페이스 `typecheck` / `test:run` / `lint`가 작업 전과 동일하게 통과한다.
- `git diff`에 `bridge/`, `public/`, `.codex-plugin/`, `version.ts` 변경이 없다.
- 런타임 심볼의 export 이름 집합이 작업 전후 동일하다(배럴 형태만 바뀌고 표면은 불변).
