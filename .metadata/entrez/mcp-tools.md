# entrez — MCP 도구

도메인 무지·stateless 실행 레이어. **5종**(+ `paper-search` 대량용 async 트리오). 등록은 `src/mcp/server/lifecycle/createServer.ts`에서 `server.registerTool(name, {description, inputSchema, annotations}, wrapHandler(handler))` (deilen 패턴). `inputSchema`는 `src/types/`의 **zod** 로 정의하고 도구 입력 검증에 재사용한다. **모든 외부 HTTP는 `core/httpClient` 경유**(핸들러에서 `fetch` 직접 호출 금지) — atlassian httpClient 차용(fetch + retry + 429 backoff + **auto-POST** + **SSRF** eutils allowlist). 문자열 리터럴은 전부 `types/enums.ts`(`as const`)·`constants/{messages,defaults,paths}.ts`에서 import(인라인 금지).

| 도구 | 핸들러 | 역할 |
|------|--------|------|
| `paper-search` | `tools/paperSearch/paperSearch.ts` | ESearch(count probe)→segment→union→dedup (동기·소량) |
| `paper-search-start` / `_status` / `_results` | `tools/paperSearch/operations/{startJob,pollJob,readJob}.ts` | 대량 검색 async job (start→status 폴링→results) |
| `mesh-lookup` | `tools/meshLookup/meshLookup.ts` | MeSH Descriptor/SCR/entry 매핑 (`db=mesh`) |
| `fetch-fulltext` | `tools/fetchFulltext/fetchFulltext.ts` | PMC OA 본문(PDF/XML/TAR) 다운로드 |
| `setup` | `tools/setup/setup.ts` | web UI 설정 (상세 [setup.md](./setup.md)) |
| `auth-check` | `tools/authCheck/authCheck.ts` | config 확인 + EInfo 도달성 + rate 표시 |

> **enum 정본** `src/types/enums.ts`: `Db`·`FetchMode`·`CapStrategy`·`QueryRole`·`Breadth`·`DateField`·`DateType`·`SortOrder`·`RecordField`·`FulltextFormat`·`UnavailableReason`·`OaStatus`·`MeshMatch`·`JobStatus`·`ExpansionSource`·`RateLimit`·`ErrorCode`. 내부 어댑터 조립용: `EutilFn`·`RetMode`·`HttpMethod`·`FieldTag`. 아래 TS 인터페이스는 모두 이 enum을 참조한다. 검색식 **본문**(`SearchQuery.term`)은 데이터이므로 enum 아님(예외 — 코드 조립용 `FieldTag` 만 상수).

---

## `paper-search`

agent가 생성한 `QueryRole` 다중 검색식(`queries[]`)을 받아 **결정론적 union**을 만든다. 흐름: `queries[]` → ESearch(count probe) → (10k 초과 시) 날짜 segmentation → usehistory/EFetch(대량 시 POST·배치) → 합집합·dedup(복합키 PMID>DOI>title). LLM은 검색식 생성(전)·재랭킹(후)만 담당하고, **누락 0** 보장은 이 도구의 책임이다.

### 입력

```ts
interface PaperSearchInput {
  queries: SearchQuery[];          // agent가 생성한 QueryRole 다중 검색식 (1+)
  db?: Db;                         // 기본 Db.PUBMED (단일 db)
  fetchMode?: FetchMode;           // IDS_ONLY | SUMMARY | ABSTRACTS | FULL, 기본 SUMMARY
  capStrategy?: CapStrategy;       // WARN | DATE_SEGMENT | ABORT, 기본 DATE_SEGMENT
  dateRange?: DateRange;           // 검색 한정 (segmentation 과 별개)
  dateField?: DateField;           // 10k segmentation 기준 필드, 기본 DateField.PUBLICATION(dp)
  maxRecords?: number;             // operationBudget: union 상한 (초과 시 partial=true)
  batchSize?: number;              // EFetch/ESummary 배치, 기본 200 (실무 200~500)
  fields?: RecordField[];          // PaperRecord 투영 (미지정=fetchMode 기본 집합)
  sort?: SortOrder;                // RELEVANCE | PUB_DATE | FIRST_AUTHOR ...
  includeQueryTranslation?: boolean; // PubMed QueryTranslation 포함, 기본 true
  cursor?: string;                 // ids_only 페이지네이션 토큰 (대량 결과 분할 수신)
}

interface SearchQuery {
  term: string;                    // PubMed 검색식 본문 (데이터; enum 아님)
  role: QueryRole;                 // ATM_BROAD | MESH_EXPLODED | MESH_NOEXP | TIAB_SYNONYM | ALL_FIELDS | SIMILAR
  breadth?: Breadth;               // BROAD | NARROW (recall 게이트 참고)
  rationale?: string;              // agent 근거 (SearchManifest audit 용)
  seedPmids?: string[];            // role=SIMILAR 일 때 ELink Similar Articles seed
}

interface DateRange {
  from?: string;                   // "YYYY/MM/DD" | "YYYY"
  to?: string;
  type?: DateType;                 // pdat | edat | mdat (datetype 파라미터)
}
```

### 출력

```ts
interface PaperSearchOutput {
  per_query: PerQueryResult[];     // 각 검색식 개별 통계 (count·translation·capped)
  union: UnionResult;              // 합집합·dedup 결과
  segments: DateSegment[];         // 10k 초과로 분할된 날짜 버킷
  warnings: SearchWarning[];       // cap·espell·lint 경고 (비치명)
  errors: SearchError[];           // 치명·재시도불가 오류
  partial: boolean;                // maxRecords/budget/실패로 전수 미달성
  missing_pmids: string[];         // ID는 확보했으나 메타 fetch 실패한 PMID
  failed_batches: FailedBatch[];   // 배치 단위 실패 (부분 복구 후 잔여)
  reproducibility: ReproducibilityRef; // SearchManifest 참조 (재현·디버깅)
  cursor?: string;                 // 다음 페이지 토큰 (있으면 미완)
}

interface PerQueryResult {
  query: string;
  query_role: QueryRole;
  count: number;                   // ESearch Count (probe 결과)
  translation?: string;            // PubMed QueryTranslation (ATM 변환 결과)
  capped: boolean;                 // Count > 10000 (10k 상한 초과)
  segmented: boolean;              // 이 검색식이 날짜 분할로 처리됨
  retrieved: number;               // 실제 retrieve 한 건수
}

interface UnionResult {
  records: PaperRecord[];
  total_unique: number;            // dedup 후 유일 레코드 수
  dedup_collisions: number;        // 복합키 충돌로 병합된 건수
}

interface PaperRecord {
  pmid: string;                    // primary key (PubMed 내부 dedup 기준)
  doi?: string;                    // 형제 plugin 병합 시 secondary key
  pmcid?: string;                  // PMC 본문 연결 (fetch-fulltext 입력)
  title: string;
  abstract?: string;               // fetchMode ABSTRACTS | FULL 일 때만
  authors: Author[];               // 구조화 (문자열 합치기 금지)
  journal?: string;
  year?: number;
  mesh?: string[];                 // MeSH descriptor 목록
  hit_by: string[];                // 이 레코드를 맞춘 SearchQuery.term[]
  query_role: QueryRole[];         // 맞춘 role[] (recall 기여 추적)
  expansion_source?: ExpansionSource; // SIMILAR 등 확장 경유 시 출처 표시
}

interface Author {
  lastName?: string;
  foreName?: string;
  initials?: string;
  orcid?: string;
  collective?: string;             // CollectiveName (단체 저자)
}

interface DateSegment {
  field: DateField;                // 분할 기준 (dp | edat | crdt)
  from: string;
  to: string;
  count: number;                   // 이 버킷의 ESearch Count
  capped: boolean;                 // 버킷이 또 10k 초과 (재귀 분할 필요)
}

interface SearchWarning { code: string; message: string; query_role?: QueryRole; }
interface SearchError { code: ErrorCode; message: string; retryable: boolean; query?: string; }
interface FailedBatch { retstart: number; retmax: number; pmidCount: number; reason: string; }

interface ReproducibilityRef {
  manifestPath: string;            // SearchManifest(JSON) 위치 — spec.md 참조
  searchPlanVersion: string;       // 검색 계획 버전
  fetchedPmidChecksum: string;     // retrieve 한 PMID 집합 체크섬 (snapshot)
  webEnv?: string;                 // History WebEnv (~1시간 만료; 재현은 checksum 우선)
  queryKey?: string;
}
```

### 내부 E-utilities 흐름

1. **query_lint** (`core/queryLint`): 괄호 짝·예약어·field tag 오용 검증. 따옴표·wildcard·tag 가 ATM/explosion 을 끄는 패턴 경고.
2. **count_probe**: 각 `SearchQuery` 마다 ESearch(`retmax=0`) 로 `Count` 만 선조회. `includeQueryTranslation` 이면 `QueryTranslation` 수집.
3. **cap 판정**: `Count > 10000` →
   - `CapStrategy.DATE_SEGMENT`(기본): `core/segmenter` 가 `dateField`(dp/edat/crdt) 기준 버킷 분할(필요 시 재귀). 각 버킷이 다시 10k 초과면 더 좁게.
   - `CapStrategy.WARN`: 첫 10,000 건만 + `capped:true` 경고.
   - `CapStrategy.ABORT`: `ErrorCode.CAP_EXCEEDED` 로 중단.
4. **fetch_ids**: usehistory(`WebEnv`+`query_key`) 또는 직접 ID 목록 수집. `retmax` 는 **항상 명시**(NCBI 기본 20 의존 금지).
5. **fetch_records**: `fetchMode != IDS_ONLY` 면 EFetch/ESummary 로 메타·초록 수집. ID 다수(>~200) 또는 URL>2000자 → httpClient 가 **자동 POST**(`application/x-www-form-urlencoded`). `batchSize`(기본 200) 단위 분할.
6. **union·dedup** (`core/union`): 복합키 `PMID`(primary) → `DOI` → 정규화 title(소문자·공백/특수문자 제거) 로 합집합. `hit_by`·`query_role` 병합, `expansion_source` 보존.
7. **partial_recovery**: 실패 배치는 `failed_batches`/`missing_pmids` 로 격리하고 나머지는 반환(부분 실패가 전체를 막지 않음).
8. **manifest 기록**: `ReproducibilityRef` + `SearchManifest`(spec.md) 영속.

### 대량 = async (`paper-search-start` / `_status` / `_results`)

수천~만 건은 MCP 동기 타임아웃을 넘기므로 **job** 으로 분리한다(동기 핸들러는 소량 fast-path). `core/searchJob` 가 레지스트리·진행률·cursor 관리.

```ts
type PaperSearchStartInput = PaperSearchInput;          // 동일 입력
interface PaperSearchStartOutput {
  jobId: string;
  status: JobStatus;                                    // 보통 QUEUED
  estimate?: { totalCount: number; segments: number };  // count_probe 기반 추정
}

interface PaperSearchStatusInput { jobId: string; }
interface PaperSearchStatusOutput {
  jobId: string;
  status: JobStatus;                                    // QUEUED | RUNNING | SUCCEEDED | PARTIAL | FAILED | CANCELLED
  progress?: { fetched: number; total: number; currentSegment?: number; segments: number };
  partial?: boolean;
  error?: SearchError;
}

interface PaperSearchResultsInput { jobId: string; cursor?: string; }
type PaperSearchResultsOutput = PaperSearchOutput;      // 동기와 동일 페이로드 (cursor 로 분할 수신)
```

- 진행률은 MCP progress 로도 피드백(Dispatcher 가 사용자에게 표시).
- 재랭킹은 `IDS_ONLY` + cursor 로 후보만 받고 deterministic pre-score 후 top-N 만 LLM(전건 LLM 금지).

---

## `mesh-lookup`

자연어 용어를 MeSH 어휘로 매핑(검색식 생성·explosion 판단 재료). 흐름: `terms[]` → ESearch(`db=mesh`) → ESummary/EFetch 로 Descriptor/SCR/entry 구분.

```ts
interface MeshLookupInput {
  terms: string[];
  includeScopeNote?: boolean;      // scopeNote 포함, 기본 true
  includeScr?: boolean;            // Supplementary Concept Record 매핑 포함, 기본 true
}

interface MeshLookupOutput { mappings: MeshMapping[]; }

interface MeshMapping {
  input: string;                   // 원 용어
  matched: MeshMatch;              // DESCRIPTOR | SCR | ENTRY_TERM | NONE
  descriptorName?: string;
  descriptorUi?: string;           // MeSH UI (예: "D000086382")
  treeNumbers?: string[];          // 계층 트리 번호 (explosion 범위 판단)
  entryTerms?: string[];           // 동의어·진입어 (tiab 합성 재료)
  scopeNote?: string;
  scrMappings?: ScrMapping[];      // SCR → 매핑 Descriptor (보충개념)
}

interface ScrMapping { scrName: string; scrUi: string; mappedDescriptors: string[]; }
```

- `mesh` 는 **MCP 로만** 노출(별도 스킬 없음). agent 의 생성 모드가 직접 호출.
- 캐싱은 versioned(연간 MeSH 갱신 — 아래 캐싱 절).

---

## `fetch-fulltext`

PMC Open Access 본문을 다운로드. 흐름: `ids[]`(PMID/PMCID 혼재 허용) → **idconv**(PMID→PMCID) → **oa.fcgi**(OA 여부·license 판별) → PDF/XML/TAR 다운로드. **per-format 실패**를 개별 표현하고, 비OA 는 링크만 리포트한다.

```ts
interface FetchFulltextInput {
  ids: string[];                   // PMID 또는 PMCID (혼재 허용)
  formats?: FulltextFormat[];      // PDF | XML | TAR, 기본 [FulltextFormat.PDF]
  outDir?: string;                 // 저장 경로 (미지정=config 기본)
  overwrite?: boolean;             // 기존 파일 덮어쓰기, 기본 false
}

interface FetchFulltextOutput {
  downloaded: DownloadedItem[];
  unavailable: UnavailableItem[];
}

interface DownloadedItem {
  pmcid: string;
  pmid?: string;
  format: FulltextFormat;
  path: string;
  sha256: string;                  // 무결성·재현
  bytes: number;
  oaStatus: OaStatus;              // oa.fcgi 판별 결과
  license?: string;                // OA license (예: "CC BY") — ⚠️ PMCID≠재배포 가능, 확인 필수
}

interface UnavailableItem {
  id: string;                      // 입력 id (PMID/PMCID)
  reason: UnavailableReason;       // NO_PMCID | NOT_OA | NOT_FOUND | FETCH_FAILED
  format?: FulltextFormat;         // per-format 실패 시 해당 포맷
  links: { doi?: string; publisher?: string }; // 비OA LinkOut/DOI 대체 링크
}
```

- ⚠️ **`oa.fcgi`/`idconv` 응답 명세는 구현 시 실제 호출로 검증**(필드·에러 형태 확정 후 어댑터 고정).
- ⚠️ PMCID 존재 ≠ 재배포 가능. `license` 미확인이면 다운로드 보류하고 링크만 제공.

---

## `setup` / `auth-check`

```ts
interface SetupInput { mode?: "ui" | "headless"; } // 상세 절차·UI 는 setup.md
interface SetupOutput { url?: string; status: "serving" | "saved"; }
// api_key → credentials.json (0o600), 그 외(tool·email·기본값) → config.json

interface AuthCheckInput { probeEInfo?: boolean; }   // 기본 true
interface AuthCheckOutput {
  reachable: boolean;              // EInfo 도달 성공 여부
  hasApiKey: boolean;              // 키 존재만 (값 노출 금지)
  rateLimit: RateLimit;            // RATE_3PS(키 없음) | RATE_10PS(키 있음)
  toolEmailConfigured: boolean;    // tool+email 필수 파라미터 구성 여부
  dbList?: string[];               // EInfo 가 반환한 db 목록
}
```

`setup` 상세(web UI 필드·credentials 분리·동의 흐름)는 [setup.md](./setup.md). 인증 실패·미구성은 `auth-check` 가 선제 감지하여 `setup` 안내.

---

## 도구 annotations

| 도구 | readOnly | destructive | idempotent | async |
|------|:-:|:-:|:-:|:-:|
| `paper-search` | true | false | false | ✅(대량) |
| `mesh-lookup` | true | false | true | false |
| `fetch-fulltext` | false | false | true | 선택 |
| `setup` | false | false | false | false |
| `auth-check` | true | false | true | false |

- `paper-search-start`/`_status`/`_results` 는 `paper-search` 의 async 표면 — annotations 상속(`_status`/`_results` 는 readOnly·idempotent, `_start` 는 비idempotent).
- `paper-search` 는 readOnly(서버 상태 불변)이나 union 비결정 입력 순서·History 만료로 **비idempotent**.

---

## 실행 계약 · E-utilities 제약 (deterministic service)

코드 규칙(10k cap·POST·rate·lint)은 LLM 이 아니라 이 레이어가 강제한다.

- **단일 호스트 + db**: `eutils.ncbi.nlm.nih.gov` 만. ESearch→EFetch/ESummary 2단. `tool`+`email` 파라미터를 httpClient 가 모든 호출에 자동 주입(필수).
- **rate limit**: api_key 없음 **3/s**, 있음 **10/s**(`RateLimit`). httpClient 가 토큰버킷 + 429 backoff(`rateRetry ≤ 5`).
- **🔴 10,000 UID 상한**: ESearch 는 query 당 첫 10,000 건만 retrieve. `Count>10000` → `core/segmenter` 가 날짜(dp/edat/crdt) 버킷 분할로 전수 확보.
- **🔴 EFetch POST 전환**: id 다수(>~200) 또는 URL>2000자 → GET 414 회피 위해 httpClient **auto-POST**(`application/x-www-form-urlencoded`). 또는 History `WebEnv`+`query_key`+`retstart`+`retmax` 페이징.
- **🔴 History WebEnv ~1시간 만료**: 페이징 지연 시 만료 위험 → 재현성은 `fetchedPmidChecksum`(PMID snapshot) 을 1차 근거로(WebEnv 는 보조).
- **retmax 명시 필수**: 모든 호출에 명시(기본 20 의존 금지).
- **batchSize**: EFetch/ESummary 실무 200~500(retmax 10000 가능하나 XML 크기·timeout 위험).
- **대량작업 시간대**: 미 동부 21:00~05:00 또는 주말 권장(NCBI 가이드).
- **EutilFn/RetMode/HttpMethod/FieldTag** 등 어댑터 조립 상수는 `enums.ts`. db·필드·제약 본문은 lazy `_shared/eutils.md`.

## 보안

- **SSRF allowlist**: httpClient 가 eutils 호스트만 허용(그 외 차단). 핸들러 직접 `fetch` 금지.
- **api_key**: `credentials.json`(`0o600`), 출력·로그·SearchManifest 어디에도 **값 노출 금지**(사용여부 boolean 만).
- **다운로드 경로**: `fetch-fulltext` 는 선언된 `outDir` 안에서만 기록(경로 traversal·symlink 탈출 거부), sha256 무결성.
- **license 게이트**: OA·license 미확인 본문은 저장 보류(재배포 위험 차단).

## 캐싱

- `mesh-lookup`: **versioned**(연간 MeSH 갱신 — 버전 키로 무효화).
- ESearch `Count`(probe): **short TTL**(검색 폭 변동 반영).
- PMID metadata: **긴 TTL**(단 ahead-of-print 갱신 표시 — 변동 가능 필드 stale 표기).
