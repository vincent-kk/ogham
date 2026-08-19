# 실행 계획 — maencof 그래프 외 서고와 경쟁 단위 교체 (2026-08-19, rev.2)

요청서: [`maencof-archive-cluster-request-2026-08-19.md`](../../../maencof-archive-cluster-request-2026-08-19.md) (repo 루트, R1~R7).
목표: 크롤링 대상(증분 기록물·서고 문서)을 기본 검색/컨텍스트 경쟁에서 격리하고, 명시 질의로만 열리게 한다.

> rev.2 — 3자 crosscheck 리뷰(codex·antigravity·claude, 전원 rework-required) 반영. 변경 요지: 대표 선정을 그래프 전역 멤버로 확장(요청서 문언 복원), cluster 열거 모드 계약 정밀화, 경로 게이트 traversal 방어, 역직렬화 2경로 게이트, T6를 2단계 측정으로 재구성(ratchet 게이트 무력화 회피), sub_layer를 query() pre-filter로 승격, lens 열기 파라미터 편입(T3b), `ARCHIVE_DIR` 상수 철회. 상세는 말미 `## Review`.

## 전역 제약 (모든 태스크 공통)

- 브랜치: `maencof/archive-layer` (이미 체크아웃됨). 커밋 시 co-author 금지.
- 대상 패키지: `plugins/maencof` (Node ≥ 20, Yarn 4.12, TS 5.7, vitest, zod ^3.23). 현재 버전 `0.12.0`. T3b만 `plugins/maencof-lens`를 함께 수정한다.
- 레이어 디렉토리 실명(정본 `src/constants/architecture.ts` `LAYER_DIR`): `01_Core` `02_Derived` `03_External` `04_Action` `05_Context`. 요청서의 "01_Core ~ 05_Context"는 이 5개를 뜻한다.
- vault 서고 `99_Archive`와 만료 L4 정본 보관소 `.maencof-meta/archive/`는 **별개 개념**이다(후자의 정본: `src/hooks/utils/archiveExpired/INTENT.md`). 이름·경로를 섞지 않는다.
- `src/version.ts`·`bridge/` 손편집 금지(생성물). 빌드: `yarn build`, 훅/브릿지 변경 시 `bridge/` 커밋.
- 문서 선행 규율: 각 태스크는 해당 fractal의 INTENT/DETAIL과 설계 정본(`.metadata/maencof/Claude-Code-Plugin-Design/`)을 코드보다 먼저 수정한다. filid 훅이 모듈 첫 쓰기 전 문서를 배달하므로 게이트 발생 시 같은 호출 재시도.
- 테스트 규율: 새 동작은 fail-first — 테스트를 먼저 작성해 구현 전 실패(의도한 이유로)를 확인하고 기록한다. 실행: `yarn test:run` (전체), `yarn eval` (골든셋), `yarn typecheck`.
- "Ask first" 항목 승인 근거: 요청서 자체가 스캔 패턴 변경(vaultScanner INTENT:20-22)·쿼리 파라미터 구조 변경(queryEngine INTENT:24-26)·입출력 스키마 변경(각 도구 INTENT)의 승인이다. 각 태스크 커밋 메시지에 요구 ID(R1 등)를 명시한다.
- MCP 도구 이름은 `create`/`update`/`kg_search`/`kg_context`/`kg_suggest_links` (kg_ 접두 CRUD 아님).

## 파일 맵 (전체)

**신규**

| 파일                                                  | 책임                                              |
| ----------------------------------------------------- | ------------------------------------------------- |
| `src/search/queryEngine/query/collapseClusters.ts`    | 클러스터 collapse 순수 함수 (T3)                  |
| `src/search/queryEngine/query/applySubLayerFilter.ts` | sub_layer pre-filter — applyLayerFilter 형제 (T3) |
| `src/search/queryEngine/DETAIL.md`                    | queryEngine 계약 신설 — collapse 의미론 (T3)      |
| `src/__tests__/integration/archiveExclusion.test.ts`  | 서고 격리 통합 검증: 수용 기준 1·2 (T1)           |

**수정** (괄호는 태스크)

- `src/constants/vaultScanner.ts` — `VAULT_SCAN_LAYER_PATTERNS` allowlist (T1)
- `src/constants/thresholds.ts` — `MAX_CLUSTER_ENUMERATION` (T3)
- `src/constants/queryEngine.ts` — `ARCHIVED_SEED_MULTIPLIER` (T4)
- `src/types/layer.ts` — `isLayerDirPath` (traversal 방어 포함) (T1)
- `src/types/frontmatter.ts` — `cluster_key` 필드 (T2)
- `src/types/graph.ts` — `KnowledgeNode.clusterKey`, `ActivationResult.clusterKey/collapsedCount` (T2·T3)
- `src/types/mcpCrud.ts` — `MaencofCreateInput`(:16)·`MaencofUpdateFrontmatter`(:58)에 `cluster_key` (T2)
- `src/types/mcpKg.ts` — `KgSearchInput.seed?/cluster?`, `KgSearchResultItem.clusterKey?/collapsedCount?`, `KgSearchResult.cluster?/clusterSize?/truncated?`, kg_context documents 항목 (T3)
- `src/core/vaultScanner/operations/scanVault.ts` — glob allowlist 전환 (T1)
- `src/core/documentParser/operations/buildKnowledgeNode.ts` — 경로 게이트 + `cluster_key` 전파 (T1·T2)
- `src/core/documentParser/types/types.ts` — `BuildKnowledgeNodeOptions` (T1)
- `src/core/indexer/metadataStore/operations/deserializeGraph.ts` · `deserializeShards.ts` — 역직렬화 게이트(레이어 밖 노드·dangling edge 제거) (T1)
- `src/mcp/tools/maencofRead/maencofRead.ts` · `maencofUpdate/maencofUpdate.ts` · `maencofMove/maencofMove.ts` · `maencofDelete/maencofDelete.ts` — 검증 전용 호출부 `allowNonLayerPath` 옵트아웃 (T1); update는 `cluster_key` patch 추가 (T2)
- `src/mcp/tools/maencofCreate/maencofCreate.ts` — `cluster_key` 조립 2곳 (T2)
- `src/mcp/server/registrations/operations/crud.ts` — create/update zod에 `cluster_key` (T2)
- `src/mcp/server/registrations/operations/kg.ts` — `kg_search`에 `cluster` 파라미터·상호배타 규칙, `seed` optional 완화, 설명 갱신 (T3)
- `src/search/queryEngine/query/query.ts` — subLayerFilter 적용 + collapse 삽입 (T3)
- `src/search/queryEngine/types/types.ts` — `QueryOptions.subLayerFilter` (T3)
- `src/search/queryEngine/seeds/resolveKeywordSeed.ts` — archived 강등 (T4)
- `src/mcp/tools/kgSearch/kgSearch.ts` — cluster 열거 모드 + 응답 필드 + sub_layer 후필터 제거 (T3)
- `src/mcp/tools/kgContext/kgContext.ts` · `helpers/selectContextCandidates.ts` · `src/search/contextAssembler/operations/toContextItems.ts` · `itemToMarkdown.ts` · `contextAssembler/types/types.ts` — collapse 표기 전파(열기 키 포함) + sub_layer 후필터 제거 (T3)
- `plugins/maencof-lens/src/tools/lensSearch/lensSearch.ts` + lens 도구 등록 스키마 — `cluster` pass-through (T3b)
- `src/mcp/tools/kgSuggestLinks/kgSuggestLinks.ts` — archived 강등 (T4)
- `agents/checkup.md` · `skills/checkup/reference.md` · `templates/rules/link-integrity.md` — 서고 참조 분류 (T5)
- `src/__tests__/eval/fixtureVault.ts` · `goldenSet.ts` · `baseline.json` — 커버리지+승계 골든 케이스 (T6)
- 설계 정본: `Claude-Code-Plugin-Design/{02-knowledge-layers,05-frontmatter-schema,06-link-policy,07-search-engine-overview,11-data-pipeline,17-mcp-tools}.md` (T0)
- 각 태스크 대상 fractal의 INTENT/DETAIL (해당 태스크)

## 태스크 간 인터페이스

| 심볼                                         | 정의 위치                               | 시그니처                                                                               | 소비자                                        |
| -------------------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------- |
| `VAULT_SCAN_LAYER_PATTERNS`                  | `constants/vaultScanner.ts`             | `readonly string[]` (`01_Core/**/*.md` × 5)                                            | `scanVault`                                   |
| `isLayerDirPath`                             | `types/layer.ts`                        | `(relativePath: string) => boolean` — posix.normalize + `..`/절대경로 거부             | `buildKnowledgeNode`, deserialize 2곳, 테스트 |
| `BuildKnowledgeNodeOptions`                  | `core/documentParser/types/types.ts`    | `{ allowNonLayerPath?: boolean }`                                                      | read/update/move/delete 핸들러                |
| `Frontmatter.cluster_key`                    | `types/frontmatter.ts`                  | `string \| undefined` (min 1)                                                          | create/update, buildKnowledgeNode             |
| `KnowledgeNode.clusterKey`                   | `types/graph.ts`                        | `string \| undefined`                                                                  | collapseClusters, kgSearch 열거 모드, fixture |
| `ActivationResult.clusterKey/collapsedCount` | `types/graph.ts`                        | 둘 다 optional                                                                         | kgSearch/kgContext 응답 매핑                  |
| `collapseClusters`                           | `queryEngine/query/collapseClusters.ts` | `(results, graph, isEligible: (node: KnowledgeNode) => boolean) => ActivationResult[]` | `query()` 내부 전용 (barrel 미노출)           |
| `QueryOptions.subLayerFilter`                | `queryEngine/types/types.ts`            | `SubLayer \| undefined` — SA 후·collapse 전 pre-filter                                 | kgSearch, selectContextCandidates             |
| `MAX_CLUSTER_ENUMERATION`                    | `constants/thresholds.ts`               | `200`                                                                                  | kgSearch 열거 모드                            |
| `ARCHIVED_SEED_MULTIPLIER`                   | `constants/queryEngine.ts`              | `0.3`                                                                                  | resolveKeywordSeed, kgSuggestLinks            |
| `KgSearchInput.cluster`                      | `types/mcpKg.ts`                        | `string \| undefined`; `seed`는 optional로 완화; 둘은 상호 배타                        | kg.ts 스키마, kgSearch 핸들러, lens           |
| `LensSearchInput.cluster`                    | `maencof-lens lensSearch.ts`            | `string \| undefined` — handleKgSearch로 pass-through                                  | lens 도구 등록                                |

직렬화: `serializeGraph`는 노드를 통짜 배열로 내보내고(`serializeGraph.ts:15`) `deserializeGraph`/`deserializeShards`도 통짜 복원(실측)이므로 `clusterKey` 필드는 자동 왕복한다. 단 T1이 역직렬화에 **레이어 게이트 필터**를 추가하므로 두 함수는 수정 대상이다.

`ARCHIVE_DIR` 상수는 도입하지 않는다(rev.2): 코드 소비자가 없고(게이트는 `isLayerDirPath`가 담당), `.maencof-meta/archive/`와 같은 단어로 다른 장소를 가리키게 된다. 테스트는 `'99_Archive'` 리터럴을 테스트 데이터로 쓴다.

---

## T0 — 설계 정본 갱신 (문서 선행)

`.metadata/maencof/Claude-Code-Plugin-Design/`에서 각 장의 현행 서술을 읽고 최소 수정:

- `02-knowledge-layers.md`: 경쟁 스펙트럼 3계급(간행물 0표 / 에피소드 스레드당 1표 / 정제 지식 문서당 1표)과 `99_Archive` = 그래프 외 서고 계약을 명시. "레이어 외 디렉토리는 그래프에서 무시"가 우연(파싱 실패)이 아니라 allowlist+게이트 계약임을 적는다. **vault 서고 `99_Archive`와 만료 정본 보관소 `.maencof-meta/archive/`의 구분을 1문단으로 적는다.** 루트 유효 문서가 그래프에서 빠지는 동작 변화(allowlist 부수 효과)도 명기.
- `05-frontmatter-schema.md`: `cluster_key` 필드(선택, 증분 문서의 스레드 선언, 시드·태그 채널과 분리).
- `07-search-engine-overview.md`: 검색 파이프라인에 collapse 단계(max 승계·**그래프 전역 멤버 중 updated 최신 대표**·접힌 건수/총원 표기)와 archived 시드 강등, sub_layer pre-filter 위치를 추가.
- `11-data-pipeline.md`: 스캔 allowlist(레이어 디렉토리 한정), 노드 빌드 경로 게이트, **역직렬화 게이트**(3차 방어선 — 기존 인덱스 잔존 노드 정화).
- `17-mcp-tools.md`: `kg_search`의 `cluster` 열거 모드(상호배타·전수 반환·`clusterSize`/`truncated`)와 응답 필드(`clusterKey`/`collapsedCount`), create/update의 `cluster_key` 입력.
- `06-link-policy.md`: 레이어 문서 → `99_Archive/**` 링크는 깨진 링크가 아니라 서고 참조.

검증: 없음(프로즈). 커밋: `docs(maencof): archive vault contract + cluster collapse design (R1-R6)`

## T1 — 서고 계약 승격: 스캔 allowlist + 노드 경로 게이트 + 역직렬화 게이트 (R1·R2)

**선행 문서**(리뷰 실측): `src/core/vaultScanner/INTENT.md` — DETAIL 부재, 경계 변화이므로 INTENT의 Purpose/Boundaries에 allowlist 계약 반영. `src/core/documentParser/DETAIL.md` — 존재, 게이트 계약 반영. `src/core/indexer/metadataStore` 쪽 문서(존재 시) — 역직렬화 게이트 반영.

1. `src/constants/vaultScanner.ts`에 추가 (기존 exclude는 유지 — 레이어 내부 `node_modules` 등 방어):

```ts
import { LAYER_DIR } from "./architecture.js";

/**
 * Vault scan 의 인덱싱 대상 allowlist — 레이어 디렉토리(01_Core~05_Context)만 스캔한다.
 * 제외 나열(blocklist)이 아닌 allowlist 인 이유: 서고(99_Archive)든 미래의 낯선
 * 디렉토리든 여기 없는 경로는 그래프에 새지 않는다. vault 루트 문서도 대상 밖이다.
 */
export const VAULT_SCAN_LAYER_PATTERNS: readonly string[] = Object.values(
  LAYER_DIR,
).map((dir) => `${dir}/**/*.md`);
```

2. `src/core/vaultScanner/operations/scanVault.ts:24` — `glob('**/*.md', …)` → `glob([...VAULT_SCAN_LAYER_PATTERNS], …)` (import 추가; 나머지 옵션 불변 — `followSymbolicLinks`는 기본 false이고 옵션을 켜는 호출자가 없음을 실측, 알려진 한계로 기록).

3. `src/types/layer.ts`에 추가 — **traversal 방어 포함** (rev.2: `01_Core/../99_Archive/x.md` 우회 차단; `@ogham/cross-platform`의 `normalize`는 역슬래시 변환만 하므로(실측 1줄 구현) `posix.normalize`를 겹친다):

```ts
import { posix } from "node:path";

import { LAYER_DIR } from "../constants/architecture.js";

/** 레이어 디렉토리 이름 집합 (경로 첫 세그먼트 게이트용) */
const LAYER_DIR_NAMES: ReadonlySet<string> = new Set(Object.values(LAYER_DIR));

/**
 * vault 상대 경로의 정규화된 첫 세그먼트가 레이어 디렉토리(01_Core~05_Context)인지
 * 판정한다. 그래프 노드 자격의 경로 조건 — 서고(99_Archive)·vault 루트 문서·미지의
 * 디렉토리·절대경로·상향 탈출(`..`) 경로는 false. 대소문자는 구분한다(디렉토리
 * 실명과 불일치하는 경로는 스캔 allowlist 도 놓치므로 게이트도 같은 기준을 쓴다).
 */
export function isLayerDirPath(relativePath: string): boolean {
  const canonical = posix.normalize(normalize(relativePath));
  if (canonical.startsWith("/") || canonical.startsWith("..")) return false;
  const first = canonical.split("/")[0] ?? "";
  return LAYER_DIR_NAMES.has(first);
}
```

(`normalize`는 파일 상단 기존 import 재사용. `posix.normalize('01_Core/../99_Archive/x.md')` → `'99_Archive/x.md'` → 거부. `'./01_Core/x.md'` → `'01_Core/x.md'` → 통과 — partialReindex stalePath의 `./` 접두 어긋남도 이 정규화가 흡수한다.)

4. `src/core/documentParser/types/types.ts`에 `BuildKnowledgeNodeOptions` 추가, `buildKnowledgeNode.ts:18-23` 게이트 삽입:

```ts
export function buildKnowledgeNode(
  doc: ParsedDocument,
  options?: BuildKnowledgeNodeOptions,
): NodeBuildResult {
  if (options?.allowNonLayerPath !== true && !isLayerDirPath(doc.relativePath))
    return {
      success: false,
      error: `Path outside layer directories (not a graph node): ${doc.relativePath}`,
    };
  if (!doc.frontmatter.success || !doc.frontmatter.data) /* 기존 그대로 */
```

5. 검증 전용 호출부 4곳에 `{ allowNonLayerPath: true }` 전달 — `maencofRead.ts:58`, `maencofUpdate.ts:163`, `maencofMove.ts:145`, `maencofDelete.ts:54` (라인 실측 확인됨). 그래프 삽입 3경로(`fullBuild.ts:24`, `incrementalBuild.ts:84`, `partialReindex.ts handleMutate:163-165`)는 무인자 호출 유지 → 게이트 기본 적용. partialReindex의 게이트 거부는 의도된 무소음 드랍(서고 문서 read 시 정상 동작)이므로 로그를 추가하지 않는다.

6. **역직렬화 게이트** (rev.2 — R2가 명시한 "lens 재수화 등 스캔 외 진입로"의 실제 구멍): `deserializeGraph.ts`·`deserializeShards.ts` 두 복원 경로에 동일 필터 —

```ts
const nodes = new Map<NodeId, KnowledgeNode>();
for (const node of nodesArr)
  if (isLayerDirPath(node.path)) nodes.set(node.id, node);
const edges = (edgesArr as KnowledgeEdge[]).filter(
  (e) => nodes.has(e.from) && nodes.has(e.to),
);
return {
  nodes,
  edges,
  builtAt: meta.builtAt,
  nodeCount: nodes.size,
  edgeCount: edges.length,
};
```

변경 이전에 만들어진 `.maencof/` 인덱스에 남은 비-레이어 노드(예: 루트 문서)가 로드 시점에 정화되고, 읽기 전용 lens(스스로 재빌드 불가, `@ogham/maencof`의 deserialize를 소비)도 같은 필터를 자동 상속한다. dangling edge를 함께 걸러 nodeCount/edgeCount를 재계산한다.

**테스트 (fail-first — 구현 전 작성·실패 확인)**

- `scanVault` 기존 스위트(`src/core/vaultScanner/__tests__/` 탐색 후 추가): 임시 vault에 `01_Core/a.md`·`99_Archive/b.md`·루트 `c.md`·`07_Unknown/d.md` → 결과에 `01_Core/a.md`만. 사전 실패: b·c·d 포함.
- `isLayerDirPath` 단위: `01_Core/x.md` true / `99_Archive/x.md` false / `01_Core/../99_Archive/x.md` false (traversal) / `./01_Core/x.md` true / `/abs/x.md` false / `01_core/x.md` false (대소문자). 사전 실패: 심볼 부재.
- `buildKnowledgeNode`: 유효 frontmatter + `99_Archive/x.md` → `success:false`, error `/outside layer/`; `{allowNonLayerPath:true}` → `success:true`; `01_Core/x.md` → `success:true`. 사전 실패: 게이트 부재로 `success:true`.
- deserialize 스위트: 비-레이어 노드+해당 edge를 담은 SerializedGraph/shards → 복원 그래프에 부재, count 재계산. 사전 실패: 잔존.
- 신규 `src/__tests__/integration/archiveExclusion.test.ts`: 유효 frontmatter 문서를 `99_Archive/`에 둔 임시 vault로 fullBuild → 노드 부재 **그리고** `parseFailures` 0건 (수용 기준 1·2).

검증: `yarn test:run` 통과. 커밋: `feat(maencof): archive vault scan allowlist + node path gate + deserialize gate (R1, R2)`

## T2 — `cluster_key` frontmatter 필드 (R3)

**선행 문서**: `src/mcp/tools/maencofCreate/DETAIL.md`·`maencofUpdate/DETAIL.md`(둘 다 존재 — 실측)와 T0의 05장 정합 확인.

1. `src/types/frontmatter.ts` — `archive_path`(42행) 아래 추가:

```ts
  /** 증분 문서의 스레드 선언 (예: jira-gcc-3903) — 같은 키의 문서들은 검색에서 대표 1건으로 접힌다. 시드·태그 채널과 분리된 별도 필드. */
  cluster_key: z.string().min(1).optional(),
```

2. `src/types/graph.ts` `KnowledgeNode` — `archived` 아래:

```ts
  /** 클러스터 키 (frontmatter cluster_key) — kg_search/kg_context 가 같은 키를 대표 1건으로 접는다 */
  clusterKey?: string;
```

3. `buildKnowledgeNode.ts` 전파부(`if (fm.archived) …` 뒤): `if (fm.cluster_key) node.clusterKey = fm.cluster_key;`

4. `crud.ts` create inputSchema(`source` 근처)와 update `frontmatter` 객체(`schedule` 근처)에 각각:

```ts
        cluster_key: z
          .string()
          .min(1)
          .optional()
          .describe(
            'Thread/cluster declaration for incremental records (e.g. "jira-gcc-3903", "works-mail-2026-08-19"). Documents sharing a cluster_key collapse to one representative in kg_search/kg_context; open the full cluster via kg_search { cluster }. Remove with frontmatter.unset.',
          ),
```

5. `maencofCreate.ts` — `inputToFrontmatterObject`에 `if (input.cluster_key !== undefined) fm.cluster_key = input.cluster_key;`, `buildFrontmatter`에 `if (input.cluster_key) lines.push(\`cluster_key: ${quoteYamlValue(input.cluster_key)}\`);` (`source` 처리와 같은 위치·형식).

6. `maencofUpdate.ts` `updateFrontmatter`(64행)에 `sub_layer` 클로즈와 같은 형태로:

```ts
if (updates.cluster_key !== undefined)
  yaml = patchFrontmatterField(
    yaml,
    "cluster_key",
    quoteYamlValue(updates.cluster_key),
  );
```

7. 입력 타입: `src/types/mcpCrud.ts`의 `MaencofCreateInput`(:16)·`MaencofUpdateFrontmatter`(:58)에 `cluster_key?: string` 추가. `AUTO_GENERATED_FM_KEYS`는 불변 — cluster_key는 사용자 선언 필드. **제거 경로는 기존 `frontmatter.unset`이 커버한다**(crud.ts:204-209 — protected 목록은 created/updated/layer/tags뿐) — 별도 null 의미론을 만들지 않는다.

**테스트 (fail-first)**: frontmatter 스위트에 `cluster_key: 'jira-gcc-3903'` 파싱 → `data.cluster_key` 보존 (사전 실패: zod 비-strict 스트립으로 undefined); buildKnowledgeNode 전파; updateFrontmatter가 `cluster_key:` 라인 추가/치환; **`unset: ['cluster_key']`로 제거 후 필드 부재** (rev.2); serialize→deserialize 왕복에서 `clusterKey` 보존(레이어 경로 노드로).

검증: `yarn test:run`. 커밋: `feat(maencof): cluster_key frontmatter field through create/update (R3)`

## T3 — 검색 클러스터 collapse + 명시 열기 (R4) — T2 의존

**선행 문서**(리뷰 실측): `src/search/queryEngine/DETAIL.md` **신설** — 부재 확인(INTENT만 존재). collapse 의미론(아래 결정 전부)을 Requirements/API Contracts/Acceptance Criteria로 기록. `src/mcp/tools/kgSearch/DETAIL.md`·`src/mcp/tools/kgContext/DETAIL.md` — 둘 다 존재, 응답 필드·cluster 열거 모드·미적용 파라미터 계약 갱신.

**설계 결정** (rev.2 — 3자 리뷰 수렴 반영):

- 그룹 점수 **max 승계** (요청서 명시 — sum 금지). 점수는 **결과 집합 내 활성 멤버**의 max — 활성화 증거가 있는 값만 점수로 나간다.
- 대표 = **활성 필터(layer/sub_layer/time)를 만족하는 그래프 전역 클러스터 멤버 중 `updated` 최신** (요청서 문언 그대로 — rev.1의 "활성 멤버 한정"은 3자 리뷰가 일치 기각: 증류본은 본문이 압축되어 어휘 매칭이 얇으므로, 원자료의 희귀 토큰 질의에서 활성화되지 못한 채 승계가 깨진다 — P3 재현). tie-break: `updated` 동일 → 활성 멤버 우선 → nodeId 사전순. `updated` 결측·비정규 형식은 `mtime` 폴백으로 비교.
- 대표가 비활성 멤버로 승계된 경우: `hops` = 활성 멤버 최소 hops, `trace`(path)는 빈 배열 — SA 경로가 성립하지 않음을 계약에 명시. include_trace 시에도 collapse 대표는 trace 생략.
- `collapsedCount` = **이 응답에서** 접힌 활성 멤버 수(대표가 활성 멤버면 m−1, 비활성 승계면 m), ≥1일 때만 표기. `clusterSize` = 그래프 전역 총원(필터 무관) — 열거 모드 응답과 의미가 일치하도록 항목이 아닌 응답 레벨이 아니라 **항목에** `clusterKey`와 함께 실을 수 있게 kg_search 항목 필드로 두되, 스키마 주석에 "collapsedCount는 이 응답 기준, 전 멤버는 cluster 열기로" 명시.
- 클러스터 인덱스는 도입하지 않는다: 결과에 등장한 클러스터 키에 대해 `graph.nodes` 1패스로 전역 멤버를 수집(O(N), N≈수천 — sub-ms). 인덱스는 partialReindex 등 3개 유지 경로 동기화 비용이 더 크다.
- **sub_layer를 query() pre-filter로 승격**: `QueryOptions.subLayerFilter` 신설, `applyLayerFilter` 직후 적용(collapse·slice 전). kgSearch.ts:47-51·selectContextCandidates.ts:51-54의 후필터 제거. 부수 개선: 기존 "sub_layer 필터 시 max_results 미달" 결함 해소. 캐시 키는 옵션 객체라 자동 포함.
- 명시 열기 = `kg_search { cluster: "<key>" }` **열거 모드**: `seed`와 **상호 배타**(둘 다 → error). SA 없이 전역 멤버 전수를 `updated` 내림차순(→ path 사전순)으로 반환, `MAX_CLUSTER_ENUMERATION = 200` 안전 상한 + `truncated: true` 표기. `max_results`·`layer_filter`·`sub_layer`·`since/until`·`include_trace`는 **미적용** — 도구 description과 DETAIL에 명시. score/hops = 0, exploredNodes = 0, seedResolution = `{ resolved: {} }`, 응답에 `cluster`·`clusterSize`·`truncated?`. kg_timeline 확장안은 기각: timeline은 시간창 나열 계약으로 cluster 개념·전수 보장이 없고, 접힘 표기(kg_search)와 열기가 같은 도구 안에서 닫히는 쪽이 호출자 계약상 단순하다.

1. `src/types/graph.ts` `ActivationResult`에 optional `clusterKey?: string` / `collapsedCount?: number` (주석: "collapse 후에만 존재").

2. `src/search/queryEngine/types/types.ts` — `QueryOptions`에 `subLayerFilter?: SubLayer`. 신규 `src/search/queryEngine/query/applySubLayerFilter.ts` (applyLayerFilter 미러):

```ts
export function applySubLayerFilter(
  results: ActivationResult[],
  graph: KnowledgeGraph,
  subLayer: SubLayer,
): ActivationResult[] {
  return results.filter(
    (r) => graph.nodes.get(r.nodeId)?.subLayer === subLayer,
  );
}
```

3. 신규 `src/search/queryEngine/query/collapseClusters.ts`:

```ts
export function collapseClusters(
  results: ActivationResult[],
  graph: KnowledgeGraph,
  isEligible: (node: KnowledgeNode) => boolean,
): ActivationResult[] {
  const groups = new Map<string, ActivationResult[]>();
  const order: Array<ActivationResult | string> = [];
  for (const r of results) {
    const key = graph.nodes.get(r.nodeId)?.clusterKey;
    if (!key) {
      order.push(r);
      continue;
    }
    const members = groups.get(key);
    if (members) members.push(r);
    else {
      groups.set(key, [r]);
      order.push(key);
    }
  }
  if (groups.size === 0) return results;

  // 결과에 등장한 클러스터의 전역 멤버·총원 — graph.nodes 1패스
  const globalMembers = new Map<string, KnowledgeNode[]>();
  const clusterTotals = new Map<string, number>();
  for (const node of graph.nodes.values()) {
    const key = node.clusterKey;
    if (!key || !groups.has(key)) continue;
    clusterTotals.set(key, (clusterTotals.get(key) ?? 0) + 1);
    if (isEligible(node)) {
      const list = globalMembers.get(key);
      if (list) list.push(node);
      else globalMembers.set(key, [node]);
    }
  }

  const collapsed: ActivationResult[] = [];
  for (const entry of order) {
    if (typeof entry !== "string") {
      collapsed.push(entry);
      continue;
    }
    const active = groups.get(entry)!;
    const activeIds = new Set(active.map((m) => m.nodeId));
    const candidates = globalMembers.get(entry) ?? [];
    const representative = pickRepresentative(candidates, activeIds);
    const maxScore = Math.max(...active.map((m) => m.score));
    const minHops = Math.min(...active.map((m) => m.hops));
    const repActive = representative
      ? active.find((m) => m.nodeId === representative.id)
      : undefined;
    const base: ActivationResult = repActive
      ? { ...repActive, score: maxScore }
      : {
          nodeId: representative?.id ?? active[0]!.nodeId,
          score: maxScore,
          hops: minHops,
          path: [],
        };
    const collapsedCount = repActive ? active.length - 1 : active.length;
    collapsed.push({
      ...base,
      clusterKey: entry,
      ...(collapsedCount > 0 && { collapsedCount }),
    });
  }
  return collapsed.sort(
    (a, b) =>
      b.score - a.score ||
      a.hops - b.hops ||
      (a.nodeId < b.nodeId ? -1 : a.nodeId > b.nodeId ? 1 : 0),
  );
}
```

`pickRepresentative(candidates, activeIds)`는 같은 파일의 unexported 헬퍼(8줄 이내, seiri 함수 경계 준수): `updated`(결측 시 `mtime` 문자열화 폴백) 최신 → 활성 멤버 우선 → id 사전순. 정렬 비교자는 `accumulativeActivation.ts:246-252` 실측 코드와 동일 — SA 정렬 규율 유지. 8줄을 넘으면 형제 파일로 분리.

4. `query.ts` — `applyTimeWindow` 뒤·path-exact 제외 뒤에 (subLayerFilter 적용 위치 포함):

```ts
if (options.subLayerFilter)
  results = applySubLayerFilter(results, graph, options.subLayerFilter);
// …applyTimeWindow, pathExactSeedSet 계산 기존 그대로…
const isEligible = (node: KnowledgeNode): boolean =>
  (layerFilter.length === 0 || layerFilter.includes(node.layer)) &&
  (!options.subLayerFilter || node.subLayer === options.subLayerFilter) &&
  isWithinWindow(node, options.since, options.until);
const filtered = collapseClusters(
  results.filter((r) => !pathExactSeedSet.has(r.nodeId)),
  graph,
  isEligible,
).slice(0, maxResults);
```

`isWithinWindow`는 `applyTimeWindow`의 판정을 노드 단위로 재사용(내부에 헬퍼가 없으면 추출 — 중복 금지). `exploredNodes`(pre-slice·pre-collapse) 불변. 캐시는 최종 결과 저장이라 변경 없음.

5. `src/types/mcpKg.ts` — `KgSearchInput`: `seed?: string[]` + `cluster?: string`; `KgSearchResultItem`에 `clusterKey?`/`collapsedCount?`(주석: "collapsedCount는 이 응답에서 접힌 수 — 전 멤버는 cluster 열기로"); `KgSearchResult`에 `cluster?: string`/`clusterSize?: number`/`truncated?: boolean`; kg_context documents 항목에 `clusterKey?`/`collapsedCount?`.

6. `kg.ts` kg_search 스키마 — `seed` `.min(1).optional()` + description에 "Exactly one of seed or cluster is required."; `cluster`:

```ts
        cluster: z
          .string()
          .optional()
          .describe(
            'Open a collapsed cluster: enumerate ALL documents whose cluster_key equals this value, newest updated first, without SA (score/hops are 0; other filters do not apply; capped at 200 with truncated flag). Mutually exclusive with seed. Use the clusterKey reported on a collapsed result.',
          ),
```

도구 description에 collapse 의미론 1문장(같은 cluster_key는 대표 1건 + collapsedCount, 대표는 클러스터 내 updated 최신).

7. `kgSearch.ts` 핸들러 재구성:

```ts
if (input.cluster && input.seed?.length)
  return { error: "seed and cluster are mutually exclusive." };
if (!input.cluster && !input.seed?.length)
  return { error: "Either seed or cluster is required." };
```

- cluster 모드: `graph.nodes` 1패스로 멤버 수집 → `clusterSize = 총원` → `updated` desc(→ path asc) 정렬 → `MAX_CLUSTER_ENUMERATION` 절단 + `truncated` → 항목 매핑(score 0, hops 0, clusterKey) → 공유 꼬리. 응답: `{ results, durationMs, exploredNodes: 0, seedResolution: { resolved: {} }, cluster, clusterSize, ...(truncated && { truncated }) }`.
- seed 모드: `query()`에 `subLayerFilter: input.sub_layer` 전달(기존 후필터 :47-51 제거), 항목 매핑에 `...(r.clusterKey !== undefined && { clusterKey: r.clusterKey })`, `...(r.collapsedCount !== undefined && { collapsedCount: r.collapsedCount })`.
- include_content 본문 수화는 두 모드 공유 꼬리.

8. kg_context 전파 — `selectContextCandidates.ts`: `query()`에 `subLayerFilter` 전달, 후필터 :51-54 제거. `ContextItem`에 `clusterKey?`/`collapsedCount?`; `toContextItems.ts` 매핑; `itemToMarkdown.ts`: `collapsedCount` 존재 시 항목 라인에 **`(+N collapsed · cluster: <key>)`** — 기본 markdown 모드에서도 열기 키가 노출되어야 호출자가 `kg_search { cluster }`를 만들 수 있다(리뷰 지적). `kgContext.ts:49-56` documents 매핑에 두 필드.

**테스트 (fail-first)**

- `collapseClusters` 단위: max 승계 / **전역 승계**(cluster_key만 공유하고 결과에 없는 최신 증류본이 대표 — 사전 실패는 심볼 부재) / 활성 대표(최신이 활성 멤버) / `updated` 결측 mtime 폴백 / isEligible 위반 전역 멤버 배제 / collapsedCount(활성 m−1 vs 비활성 m) / cluster_key 없는 노드 불변 / 결정적 tie-break.
- `query()` 통합: clusterKey 8건 + 무관 문서 → maxResults 10에 대표 1건 + collapsedCount, subLayerFilter가 collapse 전에 적용.
- `kgSearchResponse` 스위트: 항목 `clusterKey`/`collapsedCount` 노출; cluster 열거 모드(updated desc 정렬·score 0·`clusterSize`·`truncated`·`resolved: {}`); 상호 배타 error 2종(둘 다/둘 다 없음); sub_layer pre-filter 이동 회귀(필터 시에도 max_results 충족).
- **kg_context 케이스 2건**(리뷰 지적 — R4의 절반): `include_content: false` documents에 두 필드; 조립 markdown에 `(+N collapsed · cluster:` 문자열 표기.

검증: `yarn test:run`. 커밋: `feat(maencof): cluster collapse in search + explicit cluster open (R4)`

## T3b — lens 열기 pass-through — T3 의존

**사실**(리뷰 실측): `plugins/maencof-lens/src/tools/lensSearch/lensSearch.ts:1,30,51`은 `@ogham/maencof`의 `handleKgSearch`를 직접 호출해 결과를 통짜 반환한다 — collapse와 `clusterKey`/`collapsedCount` 표기는 lens에 **자동 전파**되지만, `LensSearchInput`에 `cluster`가 없어 접힘을 보고도 열 수 없다(R4 문언 "호출자가 명시 질의로 열 수 있게"의 lens 측 결손).

1. `LensSearchInput`에 `cluster?: string` 추가, `handleKgSearch` 호출 객체에 `cluster: input.cluster` pass-through.
2. lens의 `lens_search` 도구 등록 zod 스키마(등록 파일은 실행 시 `grep -rn 'lens_search' plugins/maencof-lens/src`로 확정)에 같은 `cluster` 파라미터 + 상호배타 설명.
3. lens 패키지 버전 patch 범프.

**테스트**: `plugins/maencof-lens`의 기존 lensSearch 테스트(`lensSearchContent.test.ts` 실측 존재)에 cluster pass-through 1케이스.

검증: lens 패키지 테스트 러너로 통과 확인(스크립트는 lens package.json에서 확정). 커밋: `feat(maencof-lens): pass cluster open-parameter through lens_search (R4)`

## T4 — `archived` 시드 강등 (R5) — T3 이후 실행

**선행 문서**: queryEngine DETAIL(T3에서 신설됨)·`src/mcp/tools/kgSuggestLinks/DETAIL.md`(존재 — 실측)에 강등 정책 1줄.

1. `src/constants/queryEngine.ts`:

```ts
/**
 * archived: true 문서(증류 후 스텁)의 시드/후보 점수 강등 계수. 본문이 비어도
 * 태그가 온전한 스텁이 태그 채널 경쟁력으로 정제 지식을 밀어내는 것을 막는다.
 * 명시 경로 시드(path-exact/path-prefix)에는 적용하지 않는다 — 직접 지목은 존중.
 * 0.3: tag-exact(0.5)를 suggest_links 기본 min_score(0.2) 아래(0.15)로 보낸다.
 * 운영 실측 후 조정 여지 있음.
 */
export const ARCHIVED_SEED_MULTIPLIER = 0.3;
```

2. `resolveKeywordSeed.ts:84-89` — `score: Math.min(1, score * idfScale)` → `score: Math.min(1, score * idfScale * (node.archived ? ARCHIVED_SEED_MULTIPLIER : 1))` (import 추가).

3. `kgSuggestLinks.ts:118-122` — `const score = (tagScore + saScore * SA_BONUS_WEIGHT) * (node.archived ? ARCHIVED_SEED_MULTIPLIER : 1);` (import 추가; `tag_score`/`sa_score` 원값 필드 불변).

**테스트 (fail-first)**: 동일 태그 쌍둥이 노드(하나만 `archived: true`) — resolveSeedNodes에서 archived matchScore가 0.3배; kg_suggest_links에서 archived 스텁이 기본 min_score 아래로 탈락(P3 실측 0.4 → 0.12 재현). 사전 실패 = 동점.

검증: `yarn test:run` + `yarn eval`(골든 픽스처에 archived 노드 없음 → 회귀 없음 확인). 커밋: `feat(maencof): demote archived stubs in seed and link scoring (R5)`

## T5 — checkup 서고 참조 분류 (R6) — 독립, 프롬프트 소유물

`agents/checkup.md` D3(65-72행)에 예외 절 추가 (영어, 컴포넌트 파일 규칙):

```
Exception — archive references: a link whose target path starts with `99_Archive/`
is an archive reference (out-of-graph storage), not a broken link. The archive is
deliberately outside the knowledge graph; if the target file exists on disk under
`99_Archive/`, classify it as informational `archive-reference`, never a D3 error.
```

`skills/checkup/reference.md`의 D3 표(:11)·kg_navigate 매핑(:27)과 `templates/rules/link-integrity.md`(:33 부근, :71 예시)에 같은 분류를 각 문서의 기존 언어·형식으로 반영. `src/types/doctor.ts`의 `DiagnosticCategory`는 불변 — `archive-reference`는 오류 카테고리가 아니라 checkup 보고서의 정보성 라벨(프롬프트 소유).

**검증 한계**(명시): checkup은 프롬프트 소유 동작이라 기계 검증이 없다 — `doctorDiagnostics.test.ts` 불변 통과 + 문서 리뷰로 갈음하고, 실 vault에서의 동작 확인은 다음 checkup 실행 시 관찰로 남긴다.

커밋: `docs(maencof): classify 99_Archive links as archive references in checkup (R6)`

## T6 — 커버리지·승계 골든 케이스 + ratchet (R7) — T3 의존

**핵심 규율**(rev.2 — 리뷰 지적): `ratchet.ts:46`의 회귀 게이트는 `baseline.queries === queryCount`일 때만 작동한다. 골든 케이스를 추가하는 순간(27→29) 게이트가 꺼지므로, **픽스처 변경의 회귀 검증과 골든 추가를 별 단계로 쪼갠다**. `MAENCOF_EVAL_UPDATE_BASELINE=force`는 금지.

1. **(b1) 픽스처만 추가, 골든 불변**: `fixtureVault.ts` — `FixtureDoc`에 `clusterKey?: string;` + 빌더 매핑(:377 `updated` 방식과 동일). 신규 11건 — 격리 원칙: 새 서브디렉토리(SIBLING 클리크 분리) + 기존 태그 재사용 금지:
   - `L4/works/gcc-3903-update-{01..08}.md` × 8: L4_ACTION, tags `['jira', 'gcc-3903']`, clusterKey `'jira-gcc-3903'`, updated `'2026-02-01'`~`'2026-02-08'`.
   - **증류본** `L4/works/gcc-3903-digest.md`: L4_ACTION, tags `['gcc-3903']`만(어휘 얇음 — 승계 측정용), clusterKey `'jira-gcc-3903'`, updated `'2026-02-09'`(클러스터 내 최신).
   - `L2/decisions/gcc-3903-retry-decision.md`: L2, tags `['gcc-3903', 'billing']`, links `['L4/works/gcc-3903-digest.md', 'L2/decisions/billing-retry-policy.md']`, updated `'2026-02-10'`.
   - `L2/decisions/billing-retry-policy.md`(인접 주제): L2, tags `['billing']`, updated `'2026-01-20'`.

   이 상태로 `yarn eval` — **쿼리 27 불변이므로 ratchet 게이트 활성**: 기존 27케이스가 코퍼스 확장(IDF `log(1+N/df)`는 N 종속 — "상대 스케일이라 불변"은 성립하지 않음, 리뷰 교정)에도 baseline을 통과함을 기계로 증명. `contextBaseline`(7 불변)도 같은 러닝에서 검증. 실패 시 격리 강화(태그 교체·링크 축소) 후 재측정 — 그래도 남으면 사용자 판단 요청.

2. **(b2) 골든 2케이스 추가** (27→29):

```ts
  {
    id: 'cluster-collapse-coverage',
    seeds: ['gcc-3903'],
    relevance: {
      'L2/decisions/gcc-3903-retry-decision.md': 2,
      'L4/works/gcc-3903-digest.md': 2,
      'L2/decisions/billing-retry-policy.md': 1,
    },
  },
  {
    id: 'cluster-digest-succession',
    seeds: ['jira'],
    relevance: {
      'L4/works/gcc-3903-digest.md': 2,
    },
  },
```

- `coverage`: 시드 `'gcc-3903'`은 클러스터 전원+증류본+결정을 활성화 — 접힌 멤버(update-01..08)는 등급 0이므로 collapse 실패 시 top-10 도배로 nDCG 하락. 대표는 활성 멤버 중 최신인 digest.
- `succession`: 시드 `'jira'`는 update-01..08만 활성화(digest에는 'jira' 태그 없음) — **전역 승계**로 digest가 대표가 되는지를 직접 측정(rev.1 골든은 승계를 재지 않았다는 리뷰 지적 해소). 승계 실패 시 update-08(등급 0)이 1위 → nDCG 0.
- 추가 후 `MAENCOF_EVAL_UPDATE_BASELINE=1 yarn test:run`(정본 명령 — `searchQuality.eval.test.ts:6` 주석)으로 `baseline.json`(queries 29)을 **같은 커밋**에서 재기록.

검증: (b1)·(b2) 각각의 `yarn eval` 통과 기록 + baseline diff 설명. 커밋: `test(maencof): cluster coverage and digest-succession golden cases with baseline rewrite (R7)`

## T7 — 최종 검증·빌드·버전

1. `yarn typecheck` && `yarn test:run` && `yarn eval` 전체 그린.
2. **filid 구조 스캔**(rev.2 — `filid_code-placement` §5가 요구): `mcp__plugin_filid_tools__structure_validate`(또는 `/filid:scan`)를 plugins/maencof 범위로 실행, 경고 포함 결과를 기록.
3. `yarn build` — bridge 재생성 diff 확인 후 커밋. 루트 CLAUDE.md의 번들 크기·출력 금지 가드 스크립트 존재를 `package.json`·`scripts/`에서 확인 후 실행.
4. `yarn version:minor` (0.12.0 → 0.13.0) + lens patch 범프(T3b에서 완료 확인). 커밋: `chore: bump version to 0.13.0 for maencof plugin`
5. 수용 기준 최종 대조(아래 표) — `/seiri:verify` 규율로 증거(테스트 출력) 인용.

## 수용 기준 → 검증 매핑

| 수용 기준                                                    | 태스크 | 증거                                                                     |
| ------------------------------------------------------------ | ------ | ------------------------------------------------------------------------ |
| 1. 유효 frontmatter가 `99_Archive`에 있어도 그래프 미진입    | T1     | `archiveExclusion.test.ts` 노드 부재 단언 + deserialize 게이트 단위      |
| 2. `99_Archive`발 파싱 실패 노이즈 0건                       | T1     | 같은 테스트의 `parseFailures` 길이 0 단언                                |
| 3. 같은 cluster_key 8건 → top-10에 대표 1건 + 접힌 건수 표기 | T3     | query 통합 + kgSearchResponse + **kg_context 2케이스** + 골든 `coverage` |
| 4. archived 문서가 시드 후보 상위에 안 오름                  | T4     | 쌍둥이 노드 강등 테스트 (suggest_links 0.4→0.12 재현)                    |
| 5. 기존 골든셋 ratchet 통과 (nDCG/Recall 회귀 없음)          | T6     | **(b1) 쿼리 27 불변 게이트-활성 상태의 `yarn eval` 통과** — 기계 증명    |

## 리스크·알려진 한계·후속

- **SA 시드 단계의 수 증폭 (후속 제안)**: 같은 클러스터 N건이 각각 시드 활성 질량을 갖고 SA 전파에서 이웃 점수를 증폭하는 현상은 결과-레벨 collapse로는 남는다(codex 지적). R4 문언("kg_search/kg_context **결과에서** 접는다")과 P1의 명명된 해악(결과 슬롯 점유)은 결과-레벨이 충족하고, SA 재설계는 요구 범위 밖 + 전 골든셋 요동 리스크이므로 이번 범위에서 제외한다(claude 동의견: SA 내부 collapse는 전파 의미론 훼손). 차기 요청서 후보로 "resolveSeedNodes에서 동일 clusterKey 시드 캡"을 기록해 요청자 판단에 회부.
- **픽스처 격리**: (b1) 단계가 기계 검증 — 실패 시 격리 강화 우선, force 재기록 금지.
- **followSymlinks**: 스캔 기본 false + 옵션을 켜는 호출자 전무(실측). 레이어 디렉토리 안 심볼릭 링크로 서고를 끌어오는 경우는 게이트가 lexical 검사라 통과할 수 있음 — 알려진 한계로 기록(운영 vault에 심링크 없음).
- **`seed` optional 완화**: 핸들러 상호배타 검증이 동일 오류를 돌려주므로 동작 동등, 설명 갱신으로 흡수.
- **강등 계수 0.3**: 기본값 — 근거는 T4 테스트와 P3 실측뿐, 운영 후 조정 여지를 상수 주석에 남김.
- **kg_timeline**: `query()` 미사용(실측 — `isDateInWindow` 직접 순회) — collapse 무영향.
- **루트 유효 문서의 그래프 이탈**: allowlist의 의도된 부수 효과 — T0 문서와 커밋 메시지에 명기(릴리스 노트감).

## Review (2026-08-19)

- **Triage**: challenge — 신규 기능 + 공개 계약 변경(MCP 스키마·검색 의미론) + 스캔 대상 축소.
- **Grounding**(본 세션): 플랜의 경로·라인·심볼 주장 전수 도구 실측 — 확증 10건(호출부 라인 3건, scanVault 무옵션 2건, deserialize 대칭, registerReadTool ZodObject 제약, SIBLING 디렉토리 파생, INTENT ask-first 2건), 수정 3건(baseline 명령 정본, mcpCrud.ts 소재, SA 비교자 실코드), 리스크 해소 2건(kg_timeline, lens), DETAIL 부재 2건 반영.
- **Challenge 위임**: 사용자 선택으로 cennad crosscheck (3자 병렬). 세션: codex `d8c36114-be73-4569-ac9d-3e061bd42bf6`, antigravity `d1287938-8d37-437a-8530-72953f5cfc10`, claude `c02c2d40-8bb9-40f8-a95b-88728728bbc5`. 3/3 `rework-required`.
- **Findings 처분** (채택 = rev.2 반영):
  - 대표 선정 "활성 멤버 한정" 편차 (3/3, blocker) — **채택**: 전역 멤버 + 활성 max 점수로 재설계 (T3).
  - ratchet 게이트 무력화 (codex·claude) — **채택**: T6를 (b1)/(b2) 2단계로 재구성.
  - 경로 traversal 우회 (codex, blocker) — **채택**: posix.normalize + `..`/절대경로 거부 (재확인: cross-platform normalize는 역슬래시 변환만).
  - 역직렬화/재수화 누수 (codex·claude) — **채택**: deserialize 2경로 게이트 (재확인: deserializeShards:24 통짜 삽입).
  - cluster 열거 모드 계약 (3/3) — **채택**: 상호배타·전수 반환·MAX_CLUSTER_ENUMERATION·clusterSize/truncated·미적용 파라미터 명시.
  - kg_context 표기 검증 부재 (antigravity·claude) — **채택**: 테스트 2케이스 + markdown에 열기 키 포함 (codex의 "기본 모드 열기 키 부재" 동시 해소).
  - sub_layer 후필터 상호작용 (codex·claude) — **채택**: query() pre-filter 승격.
  - lens 사실관계 (claude) — **채택**: 리스크 서술 교정(handleKgSearch 직접 호출 실측) + T3b 신설(3줄 pass-through).
  - ARCHIVE_DIR 소비자 부재·이름 충돌 (claude) — **채택**: 상수 철회 (재확인: `.maencof-meta/archive/` 별개 개념).
  - IDF "이론상 ~0" 근거 오류 (claude) — **채택**: 문구 교정(log(1+N/df) N 종속), (b1)이 기계 증명.
  - updated 결측·비정규 비교 (claude) — **채택**: mtime 폴백 + 테스트.
  - SA 시드 단계 수 증폭 = blocker (codex 단독) — **부분 채택**: 현상은 실재하나 R4 문언·P1 해악 정의가 결과-레벨을 지정하고 claude가 SA 내부 개입을 반대 — 범위 밖 후속으로 기록, 요청자 회부.
  - cluster_key 제거 불가 (claude, minor) — **기각**: 기존 `frontmatter.unset` 경로가 커버(crud.ts:204-209 실측, protected 목록 외) — 대신 unset 테스트 1건 추가.
  - checkup 계약 테스트 (codex, minor) — **부분 채택**: 프롬프트 소유물이라 기계 검증 불가 — 한계 명시로 갈음, filid 구조 스캔은 T7에 추가.
- **Scoped recheck**: 리뷰어 신규 사실 주장 6건 재실측(lensSearch 구조, deserializeShards, lens graphCache import, `.maencof-meta/archive`, IDF 식, normalize 구현) — 전부 일치.
- **Verdict**: `cleared` — rework 반영 완료, 접근 골격(collapse를 query() 내부 slice 전에 두는 위치, R1+R2 구조, R5 지점, R6 프롬프트 처리)은 3자 모두 타당 판정.
