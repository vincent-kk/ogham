# maencof 검색·그래프 페인포인트 진단 리포트

- **작성일**: 2026-06-30
- **대상**: `kg_search` 시드 해석 / Spreading Activation(SA) / 그래프 인덱스 빌더·로더
- **근거**: 실제 vault 그래프 데이터(`.maencof/{nodes,edges}.json`) 직접 계산 + `kg_search` 블랙박스 probe + 소스 코드(`src/`) 대조. 결론은 codex·antigravity·claude 교차검증으로 재확인(출처 §9).
- **스코프**: 진단 전용. 수정은 본 리포트 기반으로 후속 진행. **본 문서는 정정이 본문에 통합된 단일 정본이다.**

---

## 0. TL;DR

| 영역 | 증상 | 근본원인 (소스) | 수정 위치 |
|----|------|----------------|----------------|
| **P0 런타임** | 빌드 직후와 리로드 후 검색·SA 동작이 다름 + CVE류 검색 650ms | `deserializeShards`가 invertedIndex·adjacency·edge맵을 **미복원** | `core/indexer/metadataStore` |
| **PP1** | LINK 고립 노드 진단 부재 | 폴더 SIBLING이 의미적 고립을 마스킹; LINK 서브그래프 지표 없음 | `skills/checkup` + `kg_status` |
| **PP2** | 다토큰(공백)·경로 prefix 시드 0건 | 시드 **비토큰화**(통문자열 매칭) + 경로 exact-only | `search/queryEngine/queryEngine.ts` |
| **PP3** | 허브 태그 오염 + 동의어 회수 실패 | 허브 태그가 대량 시드 생성 + `classifyMatch` **IDF 무가중** + alias 미연결 | `queryEngine.ts:classifyMatch` + 시드 정규화 |
| **PP4** | 폴더-형제 클리크 컨텍스트 폭발 + 균일점수 랭킹붕괴 | `tree.ts` 무가중·무상한 폴더 클리크 + SA MAX-누적 | `graphBuilder/builders/tree.ts` + SA |

> **공통 통찰**: 그래프에는 **태그 엣지가 존재하지 않는다**(엣지는 SIBLING + LINK뿐). 태그는 *시드 매칭*에만 쓰인다.
> - **PP4(컨텍스트 폭발)**의 기전은 **폴더-형제 클리크**다(태그 아님).
> - **PP3(허브 오염)의 1차 동인은 태그**다 — `["security"]`가 `classifyMatch`에서 127개 동점 시드를 만드는 *시드 단계 폭발*이며, 폴더 클리크는 그 위에 얹히는 2차 증폭이다.
> - PP2/PP3/PP4의 *관측 행동*은 런타임 인덱스 상태(빌드직후 vs 리로드)에 좌우되므로 **P0를 먼저 확정**해야 한다.

---

## 1. 그래프 베이스라인 (측정값)

```
노드 291 / 엣지 13,259 (노드당 평균 45.5)
엣지 타입: SIBLING 12,828 (96.7%)  +  LINK 431 (3.3%)   ← TAG 엣지 없음
SIBLING 정의: same_dir 12,828 / diff_dir 0 (양방향)      ← 100% 동일 폴더 클리크
  - 태그 무관 SIBLING 엣지도 1,622개 존재 → 폴더 기반임이 결정적
태그 편중: security 127 · cve 113 · vulnerability 102 (상위 3개가 노드의 35~44%) · 고유 태그 676
폴더 편중: 03_External/topical/cve = 97노드 → 9,312 엣지 = 전체의 72.6%
```

SA 확산 시 엣지 타입별 멀티플라이어(`src/constants/spreadingActivation.ts`):

```ts
export const EDGE_TYPE_MULTIPLIER = {
  LINK: 1.0, PARENT_OF: 0.8, CHILD_OF: 0.8,
  SIBLING: 0.5, RELATIONSHIP: 0.7, CROSS_LAYER: 0.6, DOMAIN: 0.3,
};
```

> **weight 주의**: 빌더는 SIBLING을 `weight: 1.0`으로 생성하지만(`tree.ts:80`), 빌드 단계에서 `weightCalculator`가 Wu-Palmer 값(동일 폴더·동일 depth → **0.75**)으로 덮어쓴다. 즉 **서빙·실측 edges.json의 SIBLING weight는 0.75**이고 1.0은 과도기값이다.

---

## 2. P0 (횡단 결함) — 런타임 인덱스/맵 미복원

다른 모든 PP의 *관측 행동*이 이 결함에 의존하므로 가장 먼저 둔다.

**사실**: `saveGraph`(`metadataStore.ts:185-206`)는 `nodes.json` + `edges.json` + `graph-meta.json` **3-shard만** 기록한다. `loadGraph → deserializeShards`(`metadataStore.ts:119-135`)는 nodes/edges만 복원하고 **invertedIndex·adjacencyList·edgeWeightMap·edgeTypeMap을 재생성하지 않는다**. (이들은 빌드 시 `buildGraph`에서만 생성되며, `server/DETAIL.md`도 "weights/PageRank/edgeWeightMap/edgeTypeMap/adjacencyList는 background rebuild 의존"이라 명시.)

**결과 — 그래프 상태가 두 가지로 갈린다**:
- **빌드 직후 (in-process `kg_build`)**: invertedIndex·edge맵 존재 → 키워드 검색은 inverted-index prefix 경로, SA는 맵 조회(빠름).
- **리로드 후 (일반 장기 서빙 상태)**: `graph.invertedIndex === undefined` →
  - 키워드 검색은 **substring full-scan** 폴백(`queryEngine.ts:123-131`)으로 떨어진다.
  - SA는 엣지별 weight/type를 fallback 조회로 재계산(O(degree×E)) → **CVE 클리크 검색 650ms의 유력 원인**.

**부수 위험 (평행/중복 엣지)**: 동일 `(from,to)`에 LINK과 SIBLING이 공존하면 `edgeWeightMap`/`edgeTypeMap`은 쌍당 1개만 저장하므로 한 타입이 다른 타입을 덮는다 → **빌드 직후 vs 리로드 후 SA 의미론이 달라질 수 있다**. 중복 LINK 엣지(~97개)도 adjacency·성능을 오염시킨다.

**함의**: 어떤 PP를 고치든 **먼저 런타임 그래프 상태(빌드직후/리로드)를 확정**하지 않으면 회귀 재현이 불가능하다. 권장: 로드 시 invertedIndex/맵을 재구성(또는 영속화)하고, edge 맵을 (from,to,type) 키 또는 멀티-edge 허용 구조로 정정.

---

## 3. PP1 — 위키링크(LINK) 고립 노드 진단 부재

### 증상
LINK(위키링크) 기준 고립 노드를 식별하는 진단이 없다. 기존 orphan 지표는 total-degree(모든 엣지) 기준이라 폴더-형제 엣지에 의해 거의 모든 노드가 "연결됨"으로 보인다.

### 측정 증거
```
LINK 완전고립(in/out 모두 없음): 161 / 291 = 55%   (L3:134, L2:14, L4:9, L1:4)
outbound LINK 없음: 187 / inbound LINK 없음: 180
total-degree 0 (SIBLING조차 없어 SA 영구 도달불가): 단 1개
   → 02_Derived/insights/meta/vault-h1-duplication-pitfall.md (폴더 내 단독 + 무링크)
LINK 고립 161개 중 160개는 폴더-형제로만 도달 (의미적으로는 고립)
```

### 근본원인
- 연결성의 96.7%가 SIBLING(폴더)이라, total-degree 기반 orphan 검사는 **단 1개만** 보고하고 의미적 고립 160개를 은폐한다.
- total-degree=0 검사 자체는 "SA로 영구 도달불가" 결함을 정확히 잡으므로 **무용은 아니다**. 다만 *의미적(LINK) 고립*에는 맹목적이다 → LINK-only 진단은 기존 검사의 **대체가 아니라 보강**이다.
- (해석 주의) LINK 고립 161개를 일괄 '결함'으로 보는 것은 가치판단이다. L3 외부 raw 클리핑은 산문 위키링크가 없는 게 정상일 수 있다.

### 수정 제안
- LINK-only 서브그래프에서 ⓐ `linkDegree==0`(완전 SA 불가) ⓑ `inboundLink==0`(미참조) ⓒ `outboundLink==0`(미연결)을 **분리 집계**.
- 노출: `skills/checkup` orphan 체크를 LINK 기준으로 보강 또는 `kg_status`에 `linkOrphanCount`.
- 후속 액션(고립 노드 `kg_suggest_links` 자동 제안)은 **노드 타입/레이어 게이팅**으로 raw L3 과대집계 방지.

---

## 4. PP2 — 다토큰(공백)·경로 prefix 시드 0건

### 재현 (실측)
| 시드 | 결과 | 비고 |
|------|------|------|
| `["investment fomo"]` (공백) | **0건** | 해당 노드는 존재하는데 0 |
| `["investment-fomo"]` (하이픈) | **0건** | |
| `["investment"]` | 2건 (0.5) | 단일 토큰 정상 |
| `["invest"]` (부분) | 2건 (0.3) | tag-prefix |
| **`["investment","fomo"]`** (배열 분리) | **8건 (0.8)** | ✅ 우회 동작 |
| `["03_External/topical/cve"]` (경로 prefix) | **0건** | |
| `".../cve/CVE-2014-0160.md"` (정확 경로) | 정상 | exact만 동작 |

### 근본원인 (소스 확정)
`resolveSeedNodes`(`queryEngine.ts:155-170`)가 시드를 두 갈래로 분기하는데 **양쪽 모두 시드를 토큰 분할하지 않는다**.

**(A) 경로 분기** — 시드에 `/` 포함 또는 `.md`로 끝나면 `resolvePathSeed`(L91-107)가 **정확 노드 id 일치만** 검사(`graph.nodes.has(toNodeId(seed))`). prefix 미지원 → `"03_External/topical/cve"`는 0.

**(B) 키워드 분기** — `resolveKeywordSeed`(L109-142)가 시드 *전체 문자열*을 매칭. P0(§2) 때문에 런타임 상태별로 경로가 갈린다:
- 인덱스 존재(빌드 직후): `term.startsWith(통시드)`(L117-122). invertedIndex term은 단일 토큰(제목은 경계 분할, 태그는 통문자열) → 공백/하이픈 다토큰은 어떤 단일 토큰의 prefix도 못 됨 → 0.
- 인덱스 부재(리로드, 일반): substring full-scan `title.includes || tag.includes`(L123-131) → 다토큰은 *제목/태그에 연속으로 존재할 때만* 매칭.

이 상태의존성이 관측된 **비대칭**을 정확히 설명한다: `["프롬프트 인젝션"]`은 한글 **제목에 연속 포함**되어 substring 매칭(0.8), `["investment fomo"]`는 한글 제목·영문 태그 어디에도 연속으로 없어 0. 배열 분리 `["investment","fomo"]`는 각 원소가 개별 시드로 resolve되어 정상 → **유일한 핵심 결함은 "단일 시드 문자열을 분할하지 않음" + "경로 exact-only"**.

### 수정 제안
- `resolveKeywordSeed`: 시드를 제목 토큰화와 동일 경계 정규식(`/[\s\-_/\\.,;:!?()[\]{}'"]+/`)으로 분할 후 토큰 매칭. 단 **naive OR는 과확장** → 기본 AND(교집합) + **연속 일치(phrase) 보너스**, 기존 배열 시드 union 의미론은 유지.
- `resolvePathSeed`: 정확 id 실패 시 `normalizedPrefix + "/"` 경계 prefix 폴백(+ 시드 수 상한)으로 폴더 시드를 폴더 내 노드로 확장.
- 분리자 정규화(space ↔ hyphen ↔ underscore)로 `investment fomo` == `investment-fomo` 동치 처리.
- (전제) §2 P0를 먼저 정리해 빌드/리로드 간 매칭 의미론을 통일.

---

## 5. PP3 — 허브 태그 오염 + 동의어 회수 실패

### 증거
- **오염**: `["security"]` → exploredNodes 138, 상위 전부 보안/CVE 클러스터. `security`(127노드) tag-exact와 `keycloak`(소수) tag-exact가 **동일 점수 0.5**.
- **동의어 단절**: `["보안"]`(한글) → concepts 22노드만 도달, **English `security` 태그가 달린 127개 운영 노드는 전혀 미회수**.
- **인프라 갭**: `.maencof-meta/tag-taxonomy.json`에 `aliases`(vuln→vulnerability 등 6개, 영문 약어뿐·한↔영 없음)와 security 계층이 정의돼 있으나 `src` 어디에서도 import 안 됨(테스트 외 0건).

### 근본원인 (소스 확정)
1차 동인은 **시드 단계 태그 폭발**이다. `classifyMatch`(`queryEngine.ts:62-89`)는:
```ts
if (titleLower === kw) return { score: 1.0, type: 'title-exact' };
if (titleWords.some(w => w === kw)) return { score: 0.8, type: 'title-word' };
if (node.tags.some(t => t === kw)) return { score: 0.5, type: 'tag-exact' };   // ← 빈도 무관 동점
if (node.tags.some(t => t.startsWith(kw))) return { score: 0.3, type: 'tag-prefix' };
if (titleLower.includes(kw)) return { score: 0.8, type: 'title-word' };
return { score: 0.3, type: 'tag-prefix' };
```
- **IDF/빈도항 전무** → `security`(127) = `keycloak`(소수)로 동점. 변별력 없는 허브 태그가 127개 시드를 한꺼번에 만들어 결과를 도배(그 후 폴더 클리크가 2차 증폭).
- **동의어/별칭/교차언어 확장 없음**: 정규화는 `toLowerCase()`뿐. `tag-taxonomy.aliases` 미연결, 한↔영 브리지 없음.

### 수정 제안
- **IDF 단독은 불충분**: 단일 공통태그 쿼리는 127개에 *동일계수*를 곱하므로 결과 내부 랭킹이 불변이고, `query()`는 keyword 시드를 결과에서 제거하지 않는다(`queryEngine.ts:279`는 path-exact만 제외). 따라서 도배를 직접 못 줄인다(IDF의 효과는 다중항 랭킹 + 시드 활성 약화로 2차 전파 억제에 그침).
- **실제 처방**: ⓐ 공통태그 **시드 수 상한(pagerank top-k)** ⓑ 초기활성 **질량 정규화**(태그 시드당 `base/df`) ⓒ title > tag 점수 갭 유지. IDF는 다중항 보조로 한정 도입.
- **alias/동의어**: 시드 정규화 단계에서 `tag-taxonomy.aliases` 적용(query-time canonicalization, 무재빌드; cycle/충돌·exact우선 처리). **한↔영 별칭을 추가**하거나 concept-bridge(`concepts/*.md` 제목 괄호 "Security (정보보안)" 파싱)로 보안→security 연결. 로컬 임베딩 보조는 2단계.

---

## 6. PP4 — 폴더-형제 클리크 컨텍스트 폭발

### 증거
```
시드 1개(CVE-2014-0160.md) → exploredNodes 97, 형제 49개 전부 동일점수 0.2625, durationMs 650(최장)
각 CVE 노드 SIBLING degree = 192 (= 96형제 × 양방향)
```
**균일점수 메커니즘 (코드 추적)**:
```
seed 1.0 × getEdgeWeight(0.375) × decay(0.7) = 0.2625
  └ getEdgeWeight = baseWeight_WuPalmer(0.75) × EDGE_TYPE_MULTIPLIER.SIBLING(0.5) = 0.375
```
형제 전원이 동일 hop·type·weight라 활성치가 같아진다. 게다가 SA 누적은 합산이 아니라 **MAX**(`spreadingActivation.ts:128-129`, `if (existing.score >= cappedActivation) return`)라 **다중경로 중첩으로도 형제를 변별할 수 없다** → 랭킹 신호 소멸.

### 근본원인 (소스 확정)
`buildSiblingEdges`(`tree.ts:70-86`)가 폴더 크기와 무관하게 전쌍(O(n²)) 양방향 SIBLING을 생성:
```ts
for (let i = 0; i < siblings.length; i++)
  for (let j = i + 1; j < siblings.length; j++) {
    edges.push({ from: a, to: b, type: 'SIBLING', weight: 1.0 });  // 무가중·무상한
    edges.push({ from: b, to: a, type: 'SIBLING', weight: 1.0 });
  }
```
97노드 폴더 → 9,312 엣지. SA의 유일한 가드는 `queryEngine.ts:265 maxActiveNodes: 100`인데, 이웃 루프 내부에서 크기를 검사하지 않는 **소프트 캡**이라 고차수 노드 하나가 폴더 전체를 채워 다른 신호를 밀어낸다.

### 수정 제안
- **권장(저위험)**: SA 쿼리 시점 **노드별 형제 fanout 상한(top-k 전파)** + **pagerank 타이브레이크**(이미 계산됨). 토폴로지 불변·무재빌드.
- **비권장**: 엣지 `1/√n` 재가중은 대형폴더(예: 1/√97≈0.027)에서 유효활성이 threshold(0.1) 밑으로 떨어져 **SIBLING을 사실상 비활성화**(완화가 아닌 기능 제거)한다.
- hub-spoke(폴더 대표 경유) 치환은 현 그래프에 `index.md`/PARENT_OF가 사실상 없어 **합성 허브 신설**이 필요 → 공수 큼(중장기).
- 결과 다양성 재랭킹(MMR)으로 단일 폴더의 상위 독점 방지.

---

## 7. 소스 진입점 맵 (수정 착수용)

| 관심사 | 파일 | 핵심 위치 |
|--------|------|-----------|
| 런타임 로드/역직렬화(P0) | `src/core/indexer/metadataStore/metadataStore.ts` | `loadGraph` L219, `deserializeShards` L119-135, `saveGraph` L185 |
| 인덱스/맵 빌드 | `src/core/graphBuilder/graphBuilder.ts` | `buildInvertedIndex` L98, `tokenizeForInvertedIndex` L134 |
| 시드 분류/해석(PP2) | `src/search/queryEngine/queryEngine.ts` | `resolveSeedNodes` L155, `resolvePathSeed` L91, `resolveKeywordSeed` L109 |
| 매칭 점수/IDF·alias(PP3) | `src/search/queryEngine/queryEngine.ts` | `classifyMatch` L62-89, 시드 제외 L279 |
| SA 코어/가드/누적(PP4) | `src/core/spreadingActivation/spreadingActivation.ts`, `queryEngine.ts:265` | `getEdgeWeight` L74, MAX-누적 L128-129, `maxActiveNodes` |
| SA 엣지 멀티플라이어 | `src/constants/spreadingActivation.ts` | `EDGE_TYPE_MULTIPLIER` |
| SIBLING 빌더(PP4) | `src/core/graphBuilder/builders/tree.ts` | `buildSiblingEdges` L70 |
| 엣지 weight 산정 | `src/core/weightCalculator/weightCalculator.ts` | `case 'SIBLING'` (Wu-Palmer) |
| LINK 고립 진단(PP1) | `skills/checkup/*`, `src/mcp/tools/kgStatus/*` | (신규) |
| 태그 택소노미(PP3) | `.maencof-meta/tag-taxonomy.json` | `aliases`(미연결·한↔영 부재) |

> 주의: `~/.claude/plugins/maencof/<hash>/`의 `prompt-context*`/`session-context*`는 **런타임 컨텍스트 캐시**이며 소스가 아니다. 수정은 본 모노레포(`ogham/plugins/maencof/src`)에서 한다.

---

## 8. 수정 우선순위·로드맵

| 순위 | 항목 | 영향 | 노력 | 리스크 | 근거 |
|---|---|---|---|---|---|
| **P0** | 런타임 맵/인덱스 재수화 + 평행/중복 엣지 정합성 (검증 선행) | 매우높음 | 중 | — | PP2·3·4 동작과 650ms를 좌우 |
| **P1** | PP2 시드 토큰화(AND/phrase) + bounded 경로 prefix | 높음 | 낮음 | 낮음 | 국소 수정·검증 용이, 무음 0건은 최악 UX |
| **P2** | PP3-a alias/concept-bridge 연결(한↔영 추가) | 중상 | 낮음 | 무 | 인프라 존재, 시드 정규화 1곳, 무재빌드 |
| **P3** | PP4 SA 형제 fanout 상한 + pagerank 타이브레이크 | 높음 | 중 | 낮음 | 토폴로지 불변, 엣지 재가중보다 안전 |
| **P4** | PP3-b 시드 budget·질량 정규화 (IDF는 다중항 보조) | 중 | 중 | 중 | 단일 공통태그 도배의 직접 처방 |
| **P5** | PP1 LINK 진단 (노드타입 게이팅) | 중 | 낮음 | 낮음 | 검색 행동 불변, 진단 전용 |

---

## 9. 부록

### 9.1 재현 (그래프 데이터 only)
```bash
D=~/Soulstream/tirnanog/.maencof
# 엣지 타입 분포
jq 'group_by(.type)|map({type:.[0].type,count:length})' $D/edges.json
# LINK 완전고립 수
jq -n --slurpfile N $D/nodes.json --slurpfile E $D/edges.json '
  ($N[0]|map(.id)) as $all
  | [ $E[0][]|select(.type=="LINK")|(.from,.to) ]|unique as $linked
  | { isolated: (($all-$linked)|length) }'
# 폴더 크기(클리크 폭발원)
jq '[.[].path|split("/")|.[:-1]|join("/")]|group_by(.)|map({dir:.[0],n:length})|sort_by(-.n)|.[0:5]' $D/nodes.json
```
probe: `kg_search(seed)` — §4 표의 시드들로 재현.

### 9.2 교차검증 출처 (provenance)
- 본 리포트의 결론은 codex·antigravity·claude 3사 병렬 검토 + 소스 재대조로 확정. 세션:
  - codex `0570b750-c55e-47cf-b096-c8446d81356e`
  - antigravity `4813ad93-8a4e-49e9-8578-97f8df01bf22`
  - claude `b6a6b090-6786-41cc-9df6-38a8b2e615d7`
- antigravity 아티팩트: `~/.gemini/antigravity-cli/brain/892fbd9c-b401-4b4c-a4f9-6630cb3e8834/maencof_diagnostic_review.md`
