# filid 경량화 계획 — MCP 도구 정리 및 네이티브 의존성 제거

> **문서 상태: 대체됨.** 이 문서는 v0.8.2 구현을 분석한 역사적 참고 자료다.
> 승인된 Filid 1.0 설계와 실행 순서는
> [`vnext-redesign-plan.md`](./vnext-redesign-plan.md)를 따른다. 특히 이 문서의
> LCA 제거, 3+12/test promotion, 부분적 도구 정리 결론은 1.0 규범이 아니다.
>
> 이 계획은 `/seiri:execute` 로 실행한다. 각 작업 전에 `/seiri:implement` 를,
> 완료를 주장하기 전에 `/seiri:verify` 를 로드한다.
> 작성 시점 기준 `@ogham/filid` v0.8.2.

## 목표

`@ogham/filid` 의 MCP 표면을 19개 도구에서 13개로 줄이고, 런타임 의존성
`@ast-grep/napi` 와 `fast-glob` 을 제거한다. 동시에 **도구 입력 규약을
`content` 에서 `path` 로 전환**하여 스킬이 파일을 컨텍스트에 올리지 않고도
결정론적 판정을 받게 한다.

경량화의 목적은 도구 개수를 줄이는 것이 아니라 **토큰당 판정 밀도를 높이는
것**이다. 따라서 이 계획은 도구 6개 삭제와 도구 1개 신설·2개 개편을 함께
포함한다.

---

## 전역 제약 (모든 작업이 상속)

- Node.js `>=20.0.0`. `fs.globSync` / `fs.glob` 은 Node 22+ 이므로 **사용 금지**.
  `fs.readdirSync(dir, { withFileTypes: true })` 재귀만 사용한다.
- TypeScript `^5.7`, ESM, Yarn 4.12 workspaces. 패키지 명령은 `yarn filid <script>`.
- 훅 도달 코드는 배럴(`index.js`) import 금지 — 구체 파일 경로 직접 import.
  `scripts/buildHooks.mjs` 의 바이트 캡(session-start 48KB / heavy 32KB /
  light 16KB / run-agy 12KB)과 금지 모듈 가드가 최종 방어선이다.
- 빌드 파이프라인:
  `clean → version:sync → build:rules → build:pages → build:compile → build:mcp → build:hooks → build:compile-plugin`.
  훅·MCP 만 빠르게 재빌드하려면 `yarn filid build:plugin`.
- `bridge/` · `public/` 는 커밋 대상 산출물. `dist/` 는 미커밋.
- 루트 `AGENTS.md` 는 **생성물이다**. 원본은
  `plugins/filid/templates/rules/filid_fca-policy.md` 이며 해시가
  `templates/rules/manifest.json` 에 `scripts/syncRuleHashes.mjs`
  (`yarn filid build:rules`) 로 기록된다. **`AGENTS.md` 를 직접 편집하지 말 것.**
- FCA 자체 규약 준수: 새 fractal 모듈에는 `INTENT.md`(≤50줄, 3-tier 경계) +
  배럴 `index.ts` 동반. organ 디렉터리에는 `INTENT.md` 금지.
- `.codex-plugin/` · 루트 `plugin.json` · `mcp_config.json` · `hooks.json` 은
  `build:compile-plugin`(plugin-compiler) 이 재생성한다. **손편집 금지.**

---

## 배경: 왜 이 도구들인가

### 관찰 1 — 네이티브 모듈은 대다수 사용자에게 부재한다

플러그인은 캐시 디렉터리로 클론될 뿐 `npm install` 이 돌지 않는다
(`~/.cursor/plugins/cache/ogham/filid/<sha>/` 에 `node_modules` 없음).
`@ast-grep/napi` 는 `scripts/buildMcpServer.mjs:74` 에서 `external` 이고,
번들 배너(`buildMcpServer.mjs:29-57`)가 `process.execPath → ../lib/node_modules`
또는 `npm root -g` 로 전역 설치본을 찾아 `NODE_PATH` 에 주입한다.
사용자가 손수 `npm i -g @ast-grep/napi` 를 하지 않으면 `ast_analyze` /
`ast_grep_search` / `ast_grep_replace` 는 항상 다음을 반환한다.

```
@ast-grep/napi is not available. Install it with: npm install -g @ast-grep/napi
```

`skills/ast-fallback/`(398줄)이 그 대비책으로 문서화되어 있으나 **이를 호출하는
스킬·에이전트·훅이 하나도 없다.** `skills/setup/SKILL.md:65-76` 은 실패 시
INFO 한 줄만 출력하고 계속 진행한다.

### 관찰 2 — 입력이 `content` 인 도구는 토큰을 아끼지 못한다

`ast_analyze(source)`, `test_metrics(files: [{filePath, content}])`,
`doc_compress(content)`, `fractal_navigate(entries[])` 는 호출자가 데이터를
이미 컨텍스트에 올린 뒤에야 호출할 수 있다. 왕복 한 번을 더할 뿐 컨텍스트를
절약하지 않는다.

반대로 `fractal_scan(path)`, `structure_validate(path)`,
`coverage_verify(projectRoot, targetPath)` 는 디스크를 직접 읽고 압축된 판정만
돌려준다. **이 차이가 도구의 존재 이유를 가른다.**

### 관찰 3 — LCOM4 는 이 코드베이스에서 사실상 공집합이다

`src/mcp/tools/astAnalyze/astAnalyze.ts:60` 이 `className` 을 필수로 요구하고,
구현이 `class_declaration` 만 다룬다. filid 자신은 598개 TS 파일 중 클래스
보유 파일이 10개(1.7%)다. 그럼에도
`skills/cross-review/phases/evidence.md:44-48` 은 변경된 모든 파일에 대해
lcom4 호출을 강제한다.

### 관찰 4 — 판정 semantics 는 `.filid/config.json` 에 의존한다

`AGENTS.md` 에 실린 분류 우선순위·organ 목록·허용 peer 파일은 **기본값**일
뿐이다. 프로젝트별로 다음 키가 그 semantics 를 덮어쓴다
(`src/core/infra/configLoader/loaders/configSchemas.ts:39-55`).

| 키                                     | 영향                                        |
| -------------------------------------- | ------------------------------------------- |
| `additional-organ-names`               | 노드 분류(organ 판정)                       |
| `additional-entry-points`              | `module-entry-point` 충족 조건              |
| `additional-allowed`                   | `zero-peer-file` 허용 목록 (경로 glob 포함) |
| `additional-route-patterns`            | `naming-convention`                         |
| `rules.<id>.{enabled,severity,exempt}` | 규칙 on/off · 심각도 · 경로 면제            |
| `scan.maxDepth` · `language`           | 스캔 범위 · 문서 언어                       |

이 값을 읽는 도구는 `fractal_scan`(`fractalScan.ts:44`),
`drift_detect`(`driftDetect.ts:61-74`), `rule_query`(`ruleQuery.ts:66-122`),
`structure_validate`(`structureValidate.ts:47-48`) 넷뿐이다.
훅은 zod 를 번들에 넣지 않기 위해 `src/hooks/utils/readHookConfig.ts` 로 별도
경량 리더를 쓴다.

**따라서 config 로 덮어써지는 판정은 절대로 스킬 지시문으로 내리지 않는다.**
이것이 이 계획의 1급 제약이다.

### 관찰 4 의 귀결 — `fractal_navigate` 는 config 를 읽지 않는다

`fractal_navigate` 는 호출자가 넘긴 `entries[]` 에 기본 `classifyNode` 를
적용할 뿐 config 를 로드하지 않는다. 즉 `additional-organ-names` 가 설정된
프로젝트에서 **`fractal_scan` 과 서로 다른 분류를 내놓을 수 있다.**
이 도구의 제거는 중복 해소이자 잠재 정합성 결함의 제거다.

### 관찰 5 — 이미 존재하는 결정론적 로직이 MCP 로 노출되지 않았다

`src/core/rules/documentValidator/` 의 `validateIntentMd` ·
`validateDetailMd` · `countLines` 는 구현되어 있고 preToolUse 훅
(`src/hooks/preToolUse/helpers/preToolValidator/preToolValidator.ts:140,172`)
이 사용한다. 그러나 **MCP 도구로 노출되어 있지 않고, 룰 엔진의 8개 builtin
rule 에도 포함되지 않는다**(`src/constants/builtinRuleIds.ts` 는 구조 규칙만).

그 결과 `skills/scan/SKILL.md:80` 은 LLM 에게 이렇게 지시한다.

> Phase 2 — Read each INTENT.md (parallel Read calls) and check line count + boundary sections

노드 60개 프로젝트라면 두 개의 boolean 을 얻기 위해 INTENT.md 60개를 통째로
컨텍스트에 올린다. 동일한 낭비가
`skills/structure-review/reference.md:28-31`,
`skills/cross-review/phases/evidence.md:71-77`, `skills/enrich-docs/` 에 있다.
**이 계획에서 회수하는 토큰의 대부분이 여기서 나온다.**

---

### 관찰 6 — 에이전트는 모두 파일을 직접 읽을 수 있다

14개 에이전트 전원이 `tools:` 에 `Read`·`Glob`·`Grep` 을 갖는다 (확인:
`rg -m1 "^tools:" plugins/filid/agents/*.md`). `qa-reviewer.md:86-88` 은 그
탈출구를 이미 명문화하고 있다 — "If a required metric is missing, record the
gap and approximate via `Read`/`Grep` only as a fallback."

따라서 **도구를 제거해도 에이전트가 무력해지지는 않는다.** 퇴화는 능력이
아니라 다음 셋에서 발생한다.

1. **팬아웃 배수** — `cross-review` 는 위원회 페르소나 최대 8명 + 의장을
   띄운다. 각자가 같은 파일을 읽으면 토큰을 N배 지불한다. 주입 설계는 능력
   제약이 아니라 토큰 최적화다.
2. **판정 일관성** — 페르소나 A 가 "복잡하다", B 가 "괜찮다" 고 하면 의장에게
   기준점이 없다. 측정값 하나가 있으면 사실에 대한 이견이 원천 차단되고
   불일치가 판단 영역에만 남는다.
3. **감사 가능성** — evidence 단계는 `verification.md` 에 수치를 적고 PR
   코멘트가 이를 인용한다. "에이전트가 읽고 그렇게 생각함" 은 인용 가능한
   산출물이 아니다.

**따라서 도구 존폐의 기준은 "에이전트가 할 수 있는가" 가 아니다** (거의 항상
할 수 있다). 올바른 기준은 **팬아웃**이다 — 이 판정이 몇 번 수행되며, 그
결과들이 서로 일치해야 하는가.

| 팬아웃                                     | 처리                                 |
| ------------------------------------------ | ------------------------------------ |
| 1회 수행, 1명이 소비                       | 에이전트가 직접 읽는다 (도구 불필요) |
| N회 수행 또는 N명이 인용, 답이 일치해야 함 | 도구로 측정한다                      |

이 기준으로 보면 `lca_resolve`(재분류 1건당 1회, 1명이 소비) 와
`ast_analyze` 의 tree-diff(파일당 1회) 는 삭제가 타당하고,
`doc_validate`(INTENT.md N개 × 다수 인용) 와 `test_metrics`(evidence·
qa-reviewer·의장이 함께 인용) 는 도구여야 한다.

#### 예외 — `drift-analyzer` 는 탈출구가 없다

`qa-reviewer` 와 달리 `agents/drift-analyzer.md:47-51` 은 Read 대체를
허용하지 않는다.

> - NEVER infer drift from file names alone — always rely on injected
>   `drift_detect` results.
> - NEVER recommend reclassification without an `lca_resolve` result.

T7 이 `lca_resolve` 를 지우면 이 hard rule 이 **충족 불가능해진다.** 규칙
자체를 함께 고쳐야 하며, 단순 문구 치환으로 끝내지 말 것.

---

## 판정 기준

도구는 다음 중 하나 이상을 제공할 때만 존재 가치가 있다.

1. **결정성** — LLM 이 환각하는 영역 (해시, 스키마 검증, config 병합 결과)
2. **컨텍스트 경제** — LLM 이 아직 읽지 않은 데이터를 압축해 판정만 반환
3. **토큰 경제** — LLM 이 할 수는 있으나 반복 추론 비용이 큰 판정을 상수 비용으로 대체
4. **영속 상태** — 세션 간 유지되는 디스크 기록
5. **호스트 통합** — 브라우저 기동, 호스트별 경로, git plumbing

기준 3 은 기준 2 와 다르다. 데이터가 이미 컨텍스트에 있어도, 그 위에서 규칙
N개를 노드 M개에 적용하는 추론은 O(N×M) 출력 토큰을 쓴다. 그런 판정은 도구로
내린다.

---

## 도구별 판정

### 삭제 (6개 도구 + 스킬 1개)

| 도구                   | 근거                                                                                                                                                                                                                              |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ast_grep_search`      | 네이티브 부재 시 무동작. Grep 이 대체.                                                                                                                                                                                            |
| `ast_grep_replace`     | 네이티브 부재 시 무동작. Edit 이 대체. `dry_run=false` 경로는 정규식 수준 치환으로 파일을 직접 써서 위험.                                                                                                                         |
| `ast_analyze`          | `source` 입력 → 컨텍스트 절약 0. lcom4 는 관찰 3. dependency-graph 는 이미 읽은 파일의 import 목록. tree-diff 는 `git diff` 가 우위. **단 CC 는 미해결 설계 항목 D-1 참조.**                                                      |
| `doc_compress`         | "압축" 이 아니라 `[REF]/[EXPORTS]/[LINES]` 3줄 생성 (`src/compress/reversibleCompactor/reversibleCompactor.ts:43-73`). lossy 모드는 툴콜 집계. 실제 재작성은 `context-manager` 가 Edit 로 수행.                                   |
| `lca_resolve`          | LCA 를 구하려고 프로젝트 전체 스캔을 돌린다. 스캔 트리를 이미 가진 호출자에게는 부모 링크 탐색일 뿐. **제약: 스킬은 raw 경로가 아니라 `fractal_scan` 노드 집합 위에서 LCA 를 구해야 한다 — fractal 여부가 config 의존이기 때문.** |
| `fractal_navigate`     | `entries[]` 입력 → 컨텍스트 절약 0. `fractal_scan` 과 중복이며 config 를 읽지 않아 불일치 가능 (관찰 4의 귀결).                                                                                                                   |
| `skills/ast-fallback/` | 호출자 0. 대체 대상 도구가 사라지면 존재 이유 소멸.                                                                                                                                                                               |

### 유지하되 개편 (3개)

| 도구                 | 개편 내용                                                                                                                                                                                                      |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `coverage_verify`    | **판정 번복.** 입력이 이미 path 이고 서브트리 전체를 훑으므로 LLM 대안은 export 별 Grep 다발 — 토큰 비용이 가장 큰 축. `ast/dependencyExtractor` 의존만 정규식 import 스캐너로 교체해 존치한다.                |
| `test_metrics`       | 입력을 `files: [{filePath, content}]` → `paths: string[]` 로 전환. 스펙 파일을 컨텍스트에 올리지 않게 된다. 카운터의 `it.each` 테이블 행 미전개 문제(`src/metrics/testCounter/testCounter.ts:41`)도 함께 수정. |
| `structure_validate` | 문서 검증(`doc_validate`, 아래)을 흡수할지 별도 도구로 둘지는 T5 에서 결정.                                                                                                                                    |

### 신설 (1개)

`doc_validate` — 입력 `{ projectRoot, paths: string[] }`, 출력은 파일별
`{ path, lineCount, withinCap, missingSections: string[], appendOnlyDetected }`.
`src/core/rules/documentValidator/` 를 그대로 재사용하며 파일은 도구가 읽는다.
관찰 5 의 낭비를 제거한다.

> D-1 에서 (a)안을 채택하면 같은 형태의 `code_metrics(projectRoot, paths[])`
> 가 하나 더 신설된다 — 폐지되는 CC·LCOM4 게이트의 대체물이며 T4 에 속한다.

### 그대로 유지 (10개)

`fractal_scan`, `drift_detect`, `rule_query`, `cache_manage`,
`config_patch_validate`, `project_init`, `rule_docs_sync`, `open_settings`,
`review_manage`, `debt_manage`.

> 2차 정리 후보(이번 범위 밖): `drift_detect` · `structure_validate` ·
> `rule_query(check)` 는 같은 룰 엔진을 같은 트리에 돌리는 중복이 크다.
> `review_manage` 의 `format-pr-comment` · `generate-human-summary` ·
> `normalize-branch` 는 LLM 이 하는 편이 낫다.

---

## 미해결 설계 항목

코드 작업 전에 결론이 필요한 항목이다. **D-1 은 T4 를 막는다.**

### D-1 (blocking T4) — Cyclomatic Complexity 게이트 대체

표면적으로 `ast_analyze` 를 지우면 두 계약이 무너진다.

- `templates/rules/filid_fca-policy.md` 의 Quality Thresholds:
  `Cyclomatic Complexity > 15 → Compress`, `LCOM4 >= 2 → Split`,
  그리고 "Metrics are computed by `/filid:scan` — do not estimate them by inspection."
- `skills/cross-review/` 의 거버넌스 원칙: "personas and the chairperson never
  measure" — evidence 에이전트가 측정한 수치만 인용한다
  (`skills/cross-review/phases/evidence.md:18-21`).

**그러나 현행 CC 구현을 검증한 결과, 이 게이트는 문서가 말하는 것을 재고 있지
않다.** 아래 세 가지는 소스로 확인된 사실이다.

#### 결함 1 — 반환되는 `value` 는 파일 전체 합계다

```113:116:plugins/filid/src/ast/cyclomaticComplexity/cyclomaticComplexity.ts
  let fileTotal = 0;
  for (const cc of perFunction.values()) fileTotal += cc;

  return { value: fileTotal, perFunction, fileTotal };
```

`value === fileTotal === Σ(함수별 CC)` 다. 반면 문서는 일관되게 **함수 단위**를
말한다 — `cyclomaticComplexity.ts:4` ("per function"),
`skills/structure-review/reference.md:64,73` ("functions with CC > 15"),
`skills/cross-review/phases/evidence.md:48` ("CC > 15 → FAIL").

결과적으로 게이트가 뒤집혀 있다. CC=2 짜리 작은 함수 8개를 가진 건강한 파일은
합계 16 으로 **FAIL**, CC=14 짜리 괴물 함수 하나만 있는 파일은 **PASS** 다.
FCA 가 장려하는 잘게 쪼개기를 이 지표가 벌하고 있다. 스칼라로 노출되는 값은
`value` 뿐이며 함수별 최댓값은 어디에도 노출되지 않는다.

#### 결함 2 — 최상위 선언만 열거한다

`cyclomaticComplexity.ts:25-109` 는 `root.children()` 만 순회한다. 블록 안,
IIFE 안, 객체 리터럴 메서드, 콜백으로 넘긴 화살표 함수는 자기 항목을 갖지
못한다. 매칭이 하나도 없으면 `perFunction.set('(file)', 1)` (L111) 이라
최상위 문장만으로 이루어진 파일은 내용과 무관하게 CC=1 이다.

#### 결함 3 — 유일한 판정 소비 경로에서 CC 입력이 상수다

CC 를 실제로 소비하는 곳은 `decide()` 하나인데, 그 첫 분기가 이렇다.

```29:34:plugins/filid/src/metrics/decisionTree/decisionTree.ts
  if (testCount <= MAX_TEST_CASES)
    return {
      action: 'ok',
      reason: `Test count (${testCount}) is within the test-case gate.`,
      metrics,
    };
```

즉 이 결정 트리는 **스펙 파일이 15케이스를 넘었을 때만** 도달한다. 그런데
`.spec.ts` 의 최상위는 `describe(...)` 호출식이라 결함 2 에 의해
`perFunction` 이 비고 CC=1 로 고정된다. 따라서 `CC > 15` 분기는 스펙 파일에
대해 **도달 불가**이며, `decide()` 는 사실상 언제나 `parameterize` 를 반환한다.

#### 이 게이트의 실제 목적 — 코드 품질이 아니라 감별 진단

`decide()` 를 목적 기준으로 다시 읽으면 이것은 코드 품질 게이트가 아니다.
**"스펙 파일이 15케이스를 넘었다 — 원인이 무엇인가"에 답하는 감별 진단**이다.

| 분기       | 진단                             | 처방                             |
| ---------- | -------------------------------- | -------------------------------- |
| LCOM4 >= 2 | 모듈이 여러 책임을 가짐          | 모듈을 쪼갠다 (`split`)          |
| CC > 15    | 응집도는 좋으나 제어 흐름이 복잡 | 코드를 쪼갠다 (`compress`)       |
| 나머지     | 코드는 건강, 테스트가 중복       | 테스트를 합친다 (`parameterize`) |

즉 묻는 것은 "테스트가 늘어난 게 **코드 탓인가 테스트 탓인가**" 이고, 코드
탓이라면 "책임이 많아서인가 분기가 많아서인가" 다. 트리거(15케이스)는
`test_metrics` 가 결정론적으로 판정하므로 무관하며, 대체가 필요한 것은
**진단부**뿐이다.

#### 귀결

"측정 도구를 지우면 거버넌스가 감각적 판단으로 퇴화한다"는 우려는 대체로
성립하지 않는다. 지금 흐르는 신호는 측정이라기보다 잡음에 가깝고, 일부는
아키텍처 의도와 반대로 작동한다. 특히 결함 1 은 진단부를 정확히 반대로
망가뜨린다 — 함수가 많은 모듈일수록 합계가 커져 `compress`(코드 쪼개기) 로
가는데, 정작 그 상황의 올바른 처방은 `split`(모듈 쪼개기) 이다.

**따라서 대체안은 현행보다 열등할 수 없다.** 후보:

| 안                    | 내용                                                                      | 트레이드오프                                                                               |
| --------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| (a) 게이트 교체       | CC·LCOM4 를 버리고 함수 길이·파일 길이·중첩 깊이 등 세기 쉬운 지표로 대체 | 의존성 0. 대신 규칙 문서 개정과 기존 판례와의 불연속                                       |
| (b) TS 컴파일러 API   | `typescript` 는 이미 devDependency — CC 만 재구현                         | 정확도 유지. 단 esbuild 번들에 TS 를 포함하면 458KB 번들이 크게 늘어남                     |
| (c) 선택적 바이너리   | PATH 에 `ast-grep` 이 있으면 사용, 없으면 SKIP                            | 런타임 의존 0. 대신 판정이 환경 의존적 — 거버넌스가 "환경에 따라 다른 결론" 을 허용하게 됨 |
| (d) 순수 JS 파서 번들 | 경량 파서를 esbuild 로 번들                                               | 번들 증가 + 새 의존성 — 이번 목표와 정면 충돌                                              |

**권장은 (a), 단 하이브리드 형태로.** 결함 1-3 을 동시에 해소하는 유일한
안이며 의존성을 늘리지 않는다. 다만 감별 진단을 보존하려면 설계를 두 층으로
나눠야 한다.

**층 1 — 사실 (도구).** T5 의 `doc_validate` 와 같은 형태로
`code_metrics(projectRoot, paths[])` 를 신설한다. 반환은 파일별로:

| 필드                                   | 대체하는 축                          |
| -------------------------------------- | ------------------------------------ |
| `exportCount` · `topLevelDeclCount`    | LCOM4 의 "책임이 여러 개인가"        |
| `maxNestingDepth` · `maxFunctionLines` | CC 의 "제어 흐름이 복잡한가"         |
| `lineCount`                            | 기존 500줄 advisory 를 실측 가능하게 |

중괄호 깊이 추적만으로 계산되므로 파서가 필요 없다. 문자열·주석·템플릿
리터럴 안의 중괄호 오탐을 어디까지 막을지(임계값을 여유 있게 잡고 "대략 맞음"
을 수용할지, 미니 렉서를 작성할지)는 구현 시 결정한다.

**중요**: 이 수치는 **스펙 파일이 아니라 대상 모듈**에서 뽑아야 한다.
현행 스킬 문서가 어느 파일을 재는지 모호한 것이 결함 3 의 원인이므로,
새 계약에서는 이를 명시할 것.

**층 2 — 판단 (에이전트).** 세 갈래 선택은 도구가 아니라 에이전트가 한다.
근거는 관찰 6 의 팬아웃 기준이다 — 이 진단은 스펙 하나가 상한을 넘었을 때만,
그것도 고치는 사람 한 명이 소비한다. 팬아웃이 1 이므로 도구화 이득이 없다.
반대로 "이 20개 케이스가 입력만 다른 사실상 같은 케이스인가" 는 어떤 프록시
지표보다 LLM 이 정확히 판단한다.

따라서 `test_metrics(action: 'decide')` 는 제거하고
(`src/metrics/decisionTree/decisionTree.ts` 포함), 규칙 문서에 판단 루브릭을
문장으로 싣는다. 이는 D-2 의 "채널 이동" 과 정확히 같은 처방이다 — 도구는
사실을, 에이전트는 판단을.

**결정 전에는 T4 를 시작하지 않는다.** (a) 채택 시 같은 커밋에서 고쳐야 할 것:
`templates/rules/filid_fca-policy.md` 의 Quality Thresholds 표,
`skills/structure-review/reference.md:57-76`,
`skills/cross-review/phases/evidence.md:42-48,118-125`
(frontmatter 카운터 `lcom4_failures` · `cc_failures` 포함),
`skills/revalidate/`,
`src/constants/qualityThresholds.ts` 의 `CC_THRESHOLD` · `LCOM4_SPLIT_THRESHOLD`,
`src/metrics/decisionTree/decisionTree.ts`.

### D-2 (blocking T4) — LCOM4 폐지의 거버넌스 영향

관찰 3(클래스 보유 파일 1.7%) 에 더해, LCOM4 의 구조적 소비처 역시
`decide()` 하나뿐이고 그 경로는 D-1 결함 3 대로 스펙 파일 전용이며 도달성이
낮다. `cross-review` 가 집계하는 `lcom4_failures` 카운터는 거의 항상 0 이다.
**폐지 비용은 실질적으로 없다.**

대신 정직한 재배치가 필요하다. 응집도 판단("이 모듈이 서로 무관한 책임 군집을
2개 이상 갖는가")은 LLM 이 실제로 잘 하는 판단이지만, 이를 evidence 채널에
남겨두면 "측정값" 인 척하게 된다. 권장은 **채널 이동**이다.

- evidence 에이전트: 구조적 사실만 보고 (파일 길이, 함수 최대 길이, 중첩 깊이,
  export 개수, 규칙 위반 목록)
- 페르소나: 그 사실 위에서 응집도를 **판단**하고, 판단임을 명시

이렇게 하면 "personas never measure" 원칙은 유지되면서 측정할 수 없는 것을
측정한 척하지 않게 된다. `skills/cross-review/contracts.md` 와 관련 에이전트
정의를 함께 고쳐야 한다.

### D-1·D-2 검증 이력

독립 검증을 위해 codex 에 반론을 요청했으나 CLI 가 약 600초 매달린 뒤
네트워크 오류로 실패했다 (세션 `c351e478-da89-4b16-9caa-63550a9f4d55`,
사용 가능한 응답 없음). 위 결함 1-3 은 외부 검증 없이 이 저장소 소스를 직접
읽어 확인한 것이다. **T4 착수 전 제3자 검토를 다시 시도할 가치가 있다** —
특히 (a) 채택 시 규칙 문서 개정 범위가 넓기 때문이다.

### D-3 (non-blocking) — 정규식 import 스캐너의 정확도 한계

T3 에서 `extractDependencies`(AST) 를 정규식으로 대체할 때 다음이 미지원으로
남는다: 동적 `import()` 표현식, `export * from` 의 전이 해석, 주석 안의
import 문자열. `coverage_verify` 는 WARN 만 내므로 오탐·미탐이 치명적이지
않다는 전제하에 진행한다. 이 전제를 T3 의 DETAIL.md 에 명시할 것.

### D-4 (non-blocking) — `fast-glob` ignore semantics 축소

`discoverDirectories` 는 fast-glob 의 `ignore` 로 순회를 가지치기하고, 그
결과에 `shouldExclude` 를 **한 번 더** 적용한다
(`src/core/tree/fractalTree/scanner/discoverDirectories.ts:16-30`).
즉 필터의 최종 권한은 이미 `shouldExclude` 에 있다. 자체 워커는 순회 중
`shouldExclude` 로 가지치기하면 동등해지지만, `opts.exclude` 가 fast-glob 의
확장 glob 문법(extglob 등)을 쓰고 있었다면 미세한 차이가 생길 수 있다.
T1 의 특성화 테스트로 실제 차이 유무를 먼저 확인한다.

---

## 작업 순서

```
T1 (fast-glob)            독립
T2 (ast-grep 검색/치환)    독립
T3 (coverage_verify 이관) → T4
D-1·D-2 결정              → T4
T4 (ast_analyze + src/ast 삭제)
T5 (doc_compress → doc_validate)   독립
T6 (fractal_navigate)     독립
T7 (lca_resolve)          독립
T8 (test_metrics path 전환) 독립
T9 (사장 코드 정리)        T4 이후
T10 (문서 동기화)          전 작업 이후
```

---

## 작업 1 — `fast-glob` 제거

**산출물**: `fast-glob` 이 `package.json` 에서 사라지고 전체 테스트가 통과한다.

### 1-1. 특성화 테스트 먼저

교체 전에 현재 동작을 고정한다. 신규 파일
`src/__tests__/unit/core/discoverDirectories.test.ts` 에 최소 3 케이스:
중첩 디렉터리 열거, `maxDepth` 절단, `exclude` 패턴 적용
(`node_modules`, `dist`, 그리고 `.filid/config.json` 의 `rules.*.exempt` 에
쓰이는 형태의 확장 glob 하나). D-4 의 차이 유무를 여기서 확정한다.

### 1-2. 공용 워커 organ 신설

`src/core/tree/fractalTree/scanner/walkDirectories.ts` (organ 내 파일이므로
INTENT.md 불필요). `src/ast/astGrepShared/utils/getFilesForLanguage.ts:20-41`
의 재귀 패턴을 일반화한다.

```ts
import { readdirSync } from "node:fs";
import { join } from "node:path";

export interface WalkOptions {
  maxDepth: number;
  followSymlinks: boolean;
  /** 순회 가지치기 판정. rootPath 기준 상대 경로를 받는다. */
  prune: (relPath: string) => boolean;
}

/** rootPath 하위 디렉터리의 상대 경로를 반환한다 (root 자신은 미포함). */
export function walkDirectories(rootPath: string, opts: WalkOptions): string[] {
  const out: string[] = [];

  function walk(relDir: string, depth: number): void {
    if (depth > opts.maxDepth) return;
    let entries;
    try {
      entries = readdirSync(join(rootPath, relDir), { withFileTypes: true });
    } catch {
      return; // 권한 오류 무시 — fast-glob 의 기본 동작과 동일
    }
    for (const entry of entries) {
      const isDir =
        entry.isDirectory() || (opts.followSymlinks && entry.isSymbolicLink());
      if (!isDir) continue;
      if (entry.name.startsWith(".")) continue; // fast-glob `dot: false`
      const rel = relDir === "" ? entry.name : `${relDir}/${entry.name}`;
      if (opts.prune(rel)) continue;
      out.push(rel);
      walk(rel, depth + 1);
    }
  }

  walk("", 1);
  return out;
}
```

`followSymlinks` 가 true 일 때 순환 심링크 방어가 필요하다 — 방문한
`realpathSync` 집합을 유지하거나, 기본값이 false 라면 true 경로에만 depth
상한으로 방어한다. 구현자는 `ScanOptions.followSymlinks` 의 기본값을 먼저
확인할 것 (`src/types/scan.ts`).

### 1-3. `discoverDirectories` 교체

`src/core/tree/fractalTree/scanner/discoverDirectories.ts` 를 다음으로 대체.
시그니처(`async`, `Promise<string[]>`, 절대 경로 + root 포함)는 **유지**한다 —
호출자 `scanProject` 를 건드리지 않기 위함이다.

```ts
import { join } from "node:path";

import type { ScanOptions } from "../../../../types/scan.js";

import { shouldExclude } from "./shouldExclude.js";
import { walkDirectories } from "./walkDirectories.js";

export async function discoverDirectories(
  rootPath: string,
  opts: Required<ScanOptions>,
): Promise<string[]> {
  const rels = walkDirectories(rootPath, {
    maxDepth: opts.maxDepth,
    followSymlinks: opts.followSymlinks,
    prune: (rel) => shouldExclude(rel, opts),
  });
  return [rootPath, ...rels.map((rel) => join(rootPath, rel))];
}
```

`async` 를 유지하되 내부는 동기다. 시그니처 변경을 원하면 `scanProject` 까지
함께 고쳐야 하므로 이번 작업 범위에서는 유지한다.

### 1-4. `projectHash` 교체

`src/core/infra/projectHash/projectHash.ts:5` 의 `import fg from 'fast-glob'`
제거. 현재 패턴은 `**/*.{ts,tsx,js,jsx,md}`, `ignore` 는
`['**/node_modules/**','**/dist/**','**/.git/**','**/.filid/review/**']`,
`absolute: false`, 이후 정렬 + mtime 결합이다.

`walkDirectories` 로 디렉터리를 얻고 각 디렉터리에서 `readdirSync` 로 파일을
필터하거나, 파일까지 반환하는 자매 함수 `walkFiles(rootPath, { extensions,
prune })` 를 같은 organ 에 추가한다. **해시 입력 순서가 바뀌면 모든 캐시가
무효화되므로, 기존과 동일하게 상대 경로를 `sort()` 한 뒤 결합할 것.**

검증: 동일 트리에서 교체 전후 해시가 같아야 한다. 특성화 테스트에 이 비교를
남긴다.

### 1-5. `isExempt` 교체

`src/core/rules/ruleEngine/utils/isExempt.ts:14` 의 `import fg from 'fast-glob'`
제거. 쓰이는 것은 `fg.isDynamicPattern(pattern)` 하나뿐이며, 실제 매칭은
로컬 `src/lib/globToRegexp.ts` 가 담당한다.

`isDynamicPattern` 을 `src/lib/globToRegexp.ts` **옆에 함께 둔다**. 두 함수가
같은 glob 문법을 전제해야 하므로 물리적으로 붙여두는 것이 정합적이다.
판정 기준은 `globToRegExp` 가 실제로 해석하는 메타문자와 일치시킬 것 —
구현자는 `globToRegexp.ts` 를 먼저 읽고 지원 문자 집합을 확인한 뒤
`isDynamicPattern` 을 작성한다. 이스케이프(`\*`)를 dynamic 으로 오판하지 않도록
주의.

`src/__tests__/unit/core/isExempt.test.ts` 에 이스케이프 케이스를 추가한다.

### 1-6. 의존성 및 가드 정리

- `plugins/filid/package.json:75` 에서 `"fast-glob": "^3.0.0"` 삭제
- `src/__tests__/unit/core/cacheManager.test.ts:31,225` 의 fast-glob 목 제거
- `scripts/buildHooks.mjs` 의 금지 모듈 목록에서 `/\bfast-glob\b/` 는 **유지**
  (회귀 방지 가드로 계속 유용)
- `plugins/filid/INTENT.md:48` 의 Dependencies 줄 갱신

### 검증

```bash
yarn filid typecheck && yarn filid test:run
yarn filid build && ls -la plugins/filid/bridge/mcp-server.cjs
rg -n "fast-glob" plugins/filid/src plugins/filid/package.json
# 기대: src/ 와 package.json 에서 매치 0, 번들 크기 감소
```

---

## 작업 2 — `ast_grep_search` / `ast_grep_replace` / `ast-fallback` 제거

**산출물**: MCP 도구 2개와 스킬 1개가 사라지고, 남은 문서에 죽은 참조가 없다.

`src/ast/` 자체는 T4 에서 지운다 — 이 작업은 도구·스킬 층만 걷어낸다.

### 2-1. 도구 제거

- 디렉터리 삭제: `src/mcp/tools/astGrepSearch/`, `src/mcp/tools/astGrepReplace/`
- `src/mcp/tools/index.ts` 에서 두 배럴 export 제거
- `src/constants/mcpToolNames.ts` 에서 `AST_GREP_SEARCH`, `AST_GREP_REPLACE` 제거
- `src/mcp/server/createServer.ts` L380-410 의 `registerTool` 두 블록 제거
- `src/index.ts:156-157` 의 `handleAstGrepSearch` / `handleAstGrepReplace` export 제거
- 테스트 삭제: `src/__tests__/unit/mcp/astGrepSearch.test.ts`,
  `src/__tests__/unit/mcp/astGrepReplace.test.ts`

### 2-2. 스킬 제거

- `plugins/filid/skills/ast-fallback/` 삭제 (`SKILL.md` + `reference.md`)
- `.codex-plugin/skills/ast-fallback/` 는 `build:compile-plugin` 이 재생성하므로
  **손으로 지우지 말고** 빌드로 반영되는지 확인한다. 남아 있으면 plugin-compiler
  가 삭제를 반영하지 못하는 것이므로 별도 이슈로 보고할 것.

### 2-3. `setup` 프로브 제거

`skills/setup/SKILL.md:65-76` 의 `ast_grep_search` 가용성 프로브와
`npm install -g @ast-grep/napi` INFO 메시지를 삭제한다.
`skills/setup/SKILL.md:172` 의 MCP 도구 표에서도 해당 행을 제거한다.

### 검증

```bash
rg -n "ast_grep_search|ast_grep_replace|ast-fallback|ast_fallback" plugins/filid
# 기대: src/ast/ 내부(T4 에서 처리) 외 매치 0
yarn filid typecheck && yarn filid test:run && yarn filid build
```

---

## 작업 3 — `coverage_verify` 를 AST 에서 분리

**산출물**: `coverage_verify` 가 `@ast-grep/napi` 없이 동일한 계약으로 동작한다.
**T4 는 이 작업에 의존한다.**

### 3-1. 정규식 import 스캐너 신설

`src/core/coverageVerify/` 하위에 `extractImportsLite.ts` 를 추가한다
(기존 organ 구조를 먼저 확인하고 맞출 것).

`coverage_verify` 가 `ast/dependencyExtractor` 에서 실제로 필요로 하는 것은
"이 파일이 어떤 모듈 경로에서 무엇을 import 하는가" 뿐이다 (export/call 정보는
불필요). 따라서 다음만 인식하면 된다.

- `import { a, b as c } from '...'`
- `import d from '...'` · `import * as e from '...'`
- `import '...'` (부작용 전용)
- `export { x } from '...'` · `export * from '...'`
- 위 각각의 여러 줄 형태

동적 `import()`, 주석 내 import, 전이 재export 해석은 **미지원**으로 둔다
(D-3). 반환 타입은 기존 `extractDependencies` 의 `imports` 부분과 호환되게
맞춰 호출부 수정을 최소화한다.

### 3-2. 호출부 교체

`src/mcp/tools/coverageVerify/coverageVerify.ts` 와
`src/core/coverageVerify/` 내 `usageTracker` 계열에서
`extractDependencies` import 를 새 스캐너로 교체한다.
정확한 지점은 구현 전에 다음으로 확인한다.

```bash
rg -n "extractDependencies" plugins/filid/src --type ts
```

### 3-3. 테스트

`src/__tests__/unit/mcp/coverageVerify.test.ts` 와
`usageTracker.test.ts` 는 현재 `dependencyExtractor` 를 목킹한다. 목을 새
스캐너로 바꾸고, **스캐너 자체의 단위 테스트를 신설**한다 (여러 줄 import,
`export * from`, 부작용 전용 import, 주석 내 문자열 오탐 여부).
FCA 15-case 상한을 지킬 것.

### 3-4. 문서

`src/mcp/tools/coverageVerify/INTENT.md` 와 해당 DETAIL.md 에 D-3 의 한계를
명시한다. 이것이 도구 계약의 일부가 된다.

### 검증

```bash
rg -n "@ast-grep|dependencyExtractor" plugins/filid/src/mcp/tools/coverageVerify plugins/filid/src/core/coverageVerify
# 기대: 매치 0
yarn filid test:run
```

---

## 작업 4 — `ast_analyze` 및 `src/ast/` 제거 (D-1·D-2 결정 후)

**산출물**: `@ast-grep/napi` 가 `package.json` 과 번들 배너에서 사라진다.

**선행 조건**: D-1(CC 게이트 대체)과 D-2(LCOM4 폐지 대체 근거)의 결론.
결론에 따라 이 작업의 범위가 달라진다.

- **(a) 채택 시** — `code_metrics` 도구 신설 + 규칙 문서·스킬 임계값 개정이
  T10 이 아니라 이 작업에 포함된다. D-1 말미의 파일 목록이 곧 체크리스트다.
- (b) 채택 시 — TS 컴파일러 API 기반 CC 재구현 서브태스크가 추가되고,
  번들 크기 목표를 재설정해야 한다.
- (c) 채택 시 — 바이너리 탐지·SKIP 경로와 "환경에 따라 판정이 달라짐" 을
  거버넌스 문서에 명시하는 서브태스크가 추가된다.

### 4-1. 도구 제거

- `src/mcp/tools/astAnalyze/` 삭제
- `src/mcp/tools/index.ts` · `src/constants/mcpToolNames.ts` ·
  `src/mcp/server/createServer.ts` L35-55 에서 등록 제거
- `src/index.ts:169` 의 `handleAstAnalyze` export 제거
- `src/__tests__/unit/mcp/astAnalyze.test.ts` 삭제

### 4-2. `src/ast/` 트리 삭제

`src/ast/` 전체(1017줄) 삭제. 단 **`getFilesForLanguage` 의 재귀 패턴은 T1 에서
이미 `walkDirectories` 로 일반화되어 있어야 한다** — T1 을 먼저 끝낼 것.

동반 삭제:

- `src/types/ast.ts` (95줄)
- `src/constants/astLanguages.ts` (80줄)
- `src/__tests__/unit/ast/` 전체 (parser, lcom4, cyclomaticComplexity,
  dependencyExtractor, treeDiff)
- `src/__tests__/unit/mcp/astGrepShared*.test.ts` 3개
- `src/index.ts:142-146, 155-166` 의 AST export 블록

`src/__tests__/integration/syncPipeline.test.ts` 는 LCOM4/CC/deps/treeDiff 를
사용하므로 해당 단계를 제거하거나 대체 지표로 재작성해야 한다 — D-1 결론에 따라
결정한다.

### 4-3. 번들 배너 및 의존성 제거

- `scripts/buildMcpServer.mjs:29-57` 의 전역 npm 해석 배너 전체 삭제
- 같은 파일 L74 의 `external: ['@ast-grep/napi']` 삭제
- `plugins/filid/package.json:73` 의 `"@ast-grep/napi": "^0.42.0"` 삭제
- `scripts/buildHooks.mjs` 의 금지 모듈 `/@ast-grep\/napi/` 는 **유지**
- `plugins/filid/INTENT.md:48` · `plugins/filid/CLAUDE.md:40`
  ("AST 엔진: `@ast-grep/napi` 단일 엔진") 갱신

> `plugins/imbas` 도 `@ast-grep/napi ^0.42.0` 를 독립적으로 의존한다.
> 이번 작업은 filid 만 다루며 imbas 는 건드리지 않는다. yarn.lock 에서 패키지가
> 완전히 사라지지 않는 것이 정상이다.

### 검증

```bash
rg -n "@ast-grep" plugins/filid --glob '!yarn.lock'
# 기대: scripts/buildHooks.mjs 의 금지 가드 1건만
yarn filid typecheck && yarn filid test:run && yarn filid build
node -e "const s=require('fs').statSync('plugins/filid/bridge/mcp-server.cjs');console.log(s.size)"
# 기대: 458711 대비 유의미한 감소
```

---

## 작업 5 — `doc_compress` 제거, `doc_validate` 신설

**산출물**: 스킬이 INTENT.md 를 컨텍스트에 올리지 않고 준수 판정을 받는다.
이 작업이 이 계획의 **최대 토큰 회수 지점**이다 (관찰 5).

### 5-1. `doc_validate` 도구 신설

`src/mcp/tools/docValidate/` (INTENT.md + `index.ts` 배럴 + `docValidate.ts`).

입력 스키마:

```ts
z.object({
  projectRoot: z.string(),
  paths: z.array(z.string()).min(1), // INTENT.md / DETAIL.md 경로
  baseRef: z.string().optional(), // DETAIL.md append-only 비교 기준
});
```

출력: 파일별
`{ path, kind: 'intent' | 'detail', lineCount, withinCap, missingSections: string[], appendOnlyDetected: boolean, error?: string }`.

구현은 `src/core/rules/documentValidator/` 의 `validateIntentMd` ·
`validateDetailMd` · `countLines` 를 그대로 호출하고, **파일 읽기는 도구가
수행한다.** 개별 파일 실패는 throw 하지 말고 `error` 필드로 내려 나머지
결과를 보존할 것.

`baseRef` 가 주어지면 `git show <baseRef>:<path>` 로 이전 내용을 얻어
`validateDetailMd(content, oldContent)` 에 넘긴다. 부재는 정상 처리
(신규 파일).

50줄 상한은 하드코딩하지 말고 `documentValidator` 가 이미 쓰는 상수를
재사용한다.

### 5-2. `doc_compress` 제거

- `src/mcp/tools/docCompress/` 삭제
- `src/compress/` 전체(182줄) 삭제 여부 확인 — `src/index.ts:135-139` 의
  `compactReversible` / `restoreFromCompacted` / `summarizeLossy` export 가
  라이브러리 소비자에게 노출되어 있다. 외부 소비자가 없음을 확인한 뒤 삭제한다.

```bash
rg -n "compactReversible|restoreFromCompacted|summarizeLossy" --glob '!plugins/filid/src/compress/**'
```

- 등록·상수·배럴에서 `doc_compress` 제거 (`createServer.ts` L92-114 등)

### 5-3. 스킬 전환

`doc_compress` 를 참조하는 모든 지점을 `doc_validate` 로 바꾸되, **단순 치환이
아니라 워크플로를 바꾼다.** 예를 들어 `skills/scan/SKILL.md:80` 의

> Phase 2 — Read each INTENT.md (parallel Read calls) and check line count + boundary sections

는 다음이 된다.

> Phase 2 — Phase 1 이 반환한 노드 중 `hasIntentMd: true` 인 경로 전체를
> `doc_validate` 에 한 번에 넘긴다. INTENT.md 를 Read 하지 말 것 —
> 위반 파일을 실제로 고칠 때만 읽는다.

대상: `skills/scan/{SKILL.md,reference.md}`,
`skills/structure-review/{SKILL.md,reference.md}`,
`skills/enrich-docs/{SKILL.md,reference.md,tables.md}`,
`skills/context-query/{SKILL.md,reference.md}`,
`skills/update/{SKILL.md,reference.md}`, `skills/revalidate/reference.md`,
`skills/cross-review/phases/evidence.md`(Stage 5),
`agents/context-manager.md`, `agents/knowledge-manager.md`.

### 검증

```bash
rg -n "doc_compress" plugins/filid   # 기대: 매치 0
rg -n "Read each INTENT.md" plugins/filid/skills   # 기대: 매치 0
yarn filid test:run
```

---

## 작업 6 — `fractal_navigate` 제거

**산출물**: 모든 분류가 config 를 읽는 `fractal_scan` 단일 경로로 흐른다.

`fractal_scan` 이 이미 노드별 `type` 을 config 반영해서 반환하므로, 호출부는
스캔 결과의 조회로 대체된다.

- `src/mcp/tools/fractalNavigate/` 삭제, 등록·상수·배럴·`src/index.ts:171` 정리
- 스킬 전환 대상: `skills/setup/SKILL.md:133,171`,
  `skills/setup/sections/section-2-node-classification.md`,
  `skills/setup/sections/section-1-directory-scan.md:21`,
  `skills/context-query/{SKILL.md,reference.md}`,
  `skills/structure-review/{SKILL.md,reference.md}`,
  `skills/update/SKILL.md:105`,
  `agents/{context-manager,fractal-architect,qa-reviewer}.md`

전환 문구는 "분류가 모호하면 `fractal_navigate` 로 확인" → "분류는
`fractal_scan` 결과의 `type` 필드가 유일한 근거다. 스킬이 분류 규칙을 직접
재적용하지 말 것 — `additional-organ-names` 등 프로젝트 설정이 규칙을 덮어쓸 수
있다." 로 바꾼다. **이 문장은 관찰 4 의 제약을 스킬에 심는 것이므로 생략하지
말 것.**

---

## 작업 7 — `lca_resolve` 제거

**산출물**: 공유 코드 배치 판단이 스캔 트리 위에서 이루어진다.

- `src/mcp/tools/lcaResolve/` 삭제, 등록·상수·배럴·`src/index.ts:176` 정리
- `src/core/analysis/lcaCalculator/` 는 `src/index.ts:52-54` 로 노출되어 있다.
  라이브러리 export 유지 여부를 T9 와 함께 판단한다.
- 스킬 전환: `skills/sync/{SKILL.md,reference.md}`,
  `skills/restructure/{SKILL.md,reference.md}`,
  `skills/update/{SKILL.md,reference.md}`,
  `agents/{drift-analyzer,fractal-architect}.md`

전환 문구에 반드시 포함할 제약: "LCA 는 임의의 상위 디렉터리가 아니라
`fractal_scan` 이 fractal 로 분류한 노드 중 가장 깊은 공통 조상이다.
경로 문자열만으로 계산하지 말 것."

`agents/drift-analyzer.md:41,50` 은 재분류 시 `lca_resolve` 인용을 **필수**로
규정한다. 이 요구를 "스캔 트리 상의 LCA 경로를 명시" 로 바꾼다.

---

## 작업 8 — `test_metrics` 를 path 입력으로 전환

**산출물**: 스펙 파일이 컨텍스트에 올라가지 않는다.

### 8-1. 입력 스키마 변경

`files: [{ filePath, content }]` → `paths: string[]` + `projectRoot: string`.
도구가 파일을 읽는다.

`action: 'decide'` 와 `decisionInput` 은 **D-1 에서 (a) 를 채택하면 제거된다**
— 진단이 에이전트 판단으로 이동하기 때문이다 (T4 에 속함). 그 경우 이 작업은
`count` 와 `check-gate` 두 액션만 남기고 정리한다.

**이는 호환성 깨는 변경이다** — `plugins/filid/src/mcp/tools/INTENT.md` 의
"Ask first: 기존 도구 입력 스키마 변경" 에 해당한다. 진행 전 승인 필요.

### 8-2. 카운터 정확도 수정

`src/metrics/testCounter/testCounter.ts:41` 은 `it.each([...])` 를 테이블 행
수와 무관하게 1건으로 센다. describe 깊이도 `});` 줄 패턴으로 추적해 취약하다
(L44). 최소한 `it.each` 의 배열 리터럴 행 수와 태그드 템플릿 행 수를 반영하도록
고친다. 이 변경은 기존 프로젝트의 판정을 바꾸므로 **D-5 로 승격해 별도 승인을
받는다.**

### 8-3. 스킬 갱신

`skills/{scan,promote,structure-review,update,revalidate}` 와
`skills/cross-review/phases/evidence.md:50-58` 에서 "파일 내용을 읽어 넘긴다"
지시를 "경로 목록을 넘긴다" 로 바꾼다.

---

## 작업 9 — 사장 코드 정리

`src/core/analysis/projectAnalyzer/` 와 `src/core/analysis/dependencyGraph/`
는 `src/index.ts` 의 라이브러리 export 와 자체 테스트에서만 참조되며 **어떤
MCP 도구도 사용하지 않는다.** 단 `dependencyGraph` 는
`src/core/rules/fractalValidator/validateDependencies.ts` 가 쓰므로
`circular-dependency` 규칙과 연결되어 있다 — **삭제 전 이 경로를 반드시 확인할 것.**

```bash
rg -n "buildDAG|detectCycles|topologicalSort|analyzeProject" plugins/filid/src --type ts | rg -v "__tests__"
```

`projectAnalyzer` 만 제거 후보로 두고, `dependencyGraph` 는 규칙에 물려 있으면
유지한다. 이 작업은 선택적이며 다른 작업을 막지 않는다.

---

## 작업 10 — 문서 동기화

### 10-1. 규칙 문서 (생성물 주의)

`plugins/filid/templates/rules/filid_fca-policy.md` 를 편집한 뒤
`yarn filid build:rules` 로 `templates/rules/manifest.json` 의 해시를
재계산한다. 루트 `AGENTS.md` 는 `rule_docs_sync` 가 재배포한다.

바꿔야 할 것:

- Quality Thresholds 표의 LCOM4 / Cyclomatic Complexity 행 (D-1·D-2 결론 반영)
- "Metrics are computed by `/filid:scan` — do not estimate them by inspection."
  — 남는 측정 도구만 가리키도록 수정

```bash
node plugins/filid/scripts/syncRuleHashes.mjs --check   # 기대: exit 0
```

### 10-2. 패키지 문서

- `plugins/filid/INTENT.md` — Dependencies 절(L46-49)
- `plugins/filid/CLAUDE.md` — L40 "AST 엔진" 절 삭제
- `plugins/filid/src/mcp/tools/INTENT.md` — "19개" → 실제 개수, 목록 갱신
- `plugins/filid/src/mcp/server/DETAIL.md` — 현재 "18 tools" 로 이미 틀림. 정정
- `plugins/filid/README.md` · `README-ko_kr.md` — 도구 카탈로그
- `.metadata/filid/08-API-SURFACE.md` · `06-HOW-IT-WORKS.md`(AST 엔진 서술)

### 10-3. 매니페스트

`yarn filid build` 가 `.codex-plugin/` · 루트 `plugin.json` ·
`mcp_config.json` · `hooks.json` 을 재생성한다. 손편집 금지. 빌드 후 diff 를
확인해 도구·스킬 삭제가 반영되었는지 검사한다.

---

## 작업 간 인터페이스

| 생산 작업 | 산출                                                                                                        | 소비 작업                                |
| --------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| T1        | `walkDirectories(rootPath, WalkOptions): string[]` (`src/core/tree/fractalTree/scanner/walkDirectories.ts`) | T4 (`getFilesForLanguage` 삭제 가능해짐) |
| T1        | `isDynamicPattern(pattern: string): boolean` (`src/lib/globToRegexp.ts`)                                    | 없음                                     |
| T3        | 정규식 import 스캐너 (`src/core/coverageVerify/extractImportsLite.ts`)                                      | T4 (`src/ast/` 삭제 가능해짐)            |
| T5        | `doc_validate` 도구 + 출력 스키마                                                                           | T5 스킬 전환, T10 문서                   |
| D-1·D-2   | CC/LCOM4 게이트 대체 결정                                                                                   | T4, T10-1                                |
| D-5       | 테스트 카운터 semantics 변경 승인                                                                           | T8-2                                     |

---

## 자체 점검

- 삭제 대상 6개 도구 + 1개 스킬이 각각 하나의 작업에 배정되었다 (T2, T4, T5, T6, T7).
- `coverage_verify` 는 최초 판정에서 삭제였으나 토큰 경제 기준으로 번복되어
  T3 에 존치 작업으로 배정되었다.
- `@ast-grep/napi` 제거는 T3(의존 분리) → T4(삭제) 순서로 분할되어 각각
  독립 검증이 가능하다.
- `fast-glob` 3개 호출 지점이 모두 T1 의 하위 단계로 명시되었다 (1-3, 1-4, 1-5).
- 미해결 항목은 TBD 가 아니라 D-1~D-5 로 번호를 붙여 차단 관계를 명시했다.
- 생성물(`AGENTS.md`, `.codex-plugin/`, `plugin.json`)을 직접 편집하지 말라는
  경고가 전역 제약과 T10 양쪽에 있다.

---

## 예상 감축량

| 항목                                                      | 줄 수       |
| --------------------------------------------------------- | ----------- |
| `src/ast/**/*.ts`                                         | 1017        |
| MCP 도구 3종 (astAnalyze, astGrepSearch, astGrepReplace)  | 466         |
| `src/types/ast.ts` + `src/constants/astLanguages.ts`      | 175         |
| `skills/ast-fallback/`                                    | 398         |
| `src/compress/`                                           | 182         |
| `src/mcp/tools/{docCompress,fractalNavigate,lcaResolve}/` | 약 427      |
| 번들 배너 + fast-glob 래퍼                                | 약 145      |
| **소계**                                                  | **약 2810** |
| 신설 (`doc_validate`, `walkDirectories`, import 스캐너)   | 약 -250     |
| **순감**                                                  | **약 2560** |

런타임 의존성은 `@modelcontextprotocol/sdk` 와 `zod` 둘만 남는다.
`bridge/mcp-server.cjs` 는 현재 458,711 바이트다 — 감소폭을 T1·T4 완료 후
실측해 이 표를 갱신할 것.
