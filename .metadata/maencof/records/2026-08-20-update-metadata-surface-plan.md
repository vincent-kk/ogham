# update 도구 metadata 표면 완성 계획 (2026-08-20)

## 결정: 신규 도구가 아니라 `update` 통합

`update` 는 이미 부분 frontmatter 패치(11필드)·`unset`·L1 3중 게이트·쓰기 직전 `validateFrontmatter` 게이트를 소유한다. 신규 `update_metadata` 도구는 이 게이트들을 복제하거나 소유를 쪼개고, 도구 수(현재 21)를 늘려 매 세션 컨텍스트 비용을 키우며, 같은 문서에 두 mutate 경로를 만든다. 실제 공백은 두 가지다:

1. **커버리지**: `FrontmatterSchema` 의 편집 가능 필드 16개가 타입·핸들러·등록 스키마 어디에도 없다. `skills/remember/SKILL.md:129` 가 "no MCP write path" 라고 명시적으로 문서화한 알려진 제약이다.
2. **발견성**: `update` 등록 description 이 metadata 편집 능력을 광고하지 않는다 — "도구가 없는 것 같다"는 인식의 직접 원인.

따라서 **`update` 의 frontmatter 표면을 스키마 정본에서 파생해 완성하고, description 을 재작성한다.** 3계층(타입·핸들러·스키마) 동기는 과거 사고 이력이 있으므로(registrations DETAIL History 2026-08-03: `unset` 스키마 누락) 컴파일 강제 + 동기 테스트로 구조적으로 봉인한다.

## 검증 가능한 목표

- 신규 spec `updateMetadataFields.test.ts` 15케이스 green: 16개 신규 필드가 패치·라운드트립된다.
- 신규 spec `updateSchemaSurfaceSync.test.ts` 1케이스 green: 등록 스키마 키 집합 == 직렬화 테이블 키 ∪ {hub, unset}.
- 기존 update 스위트(maencofUpdateUnset · l1UpdateGuard · gistContract · frontmatterClusterKey · hubCreateRoundTrip · updateNoFrontmatter · pathContainment) **무수정** green — 리팩터 불변식.
- `yarn typecheck` green.

## 전역 제약

- 실행 위치: `/Users/Vincent/Workspace/ogham_mk2/plugins/maencof` (yarn workspace). 명령: `yarn vitest run <paths>` · `yarn test:run` · `yarn typecheck` · `yarn format`.
- zod `^3.23.8` (v3). `z.enum([...SubLayerSchema.options, 'L2'])` 스프레드는 frontmatter.ts:90 에서 이미 증명된 관용구.
- 값 집합(enum·날짜 regex)은 `types/frontmatter.ts` 정본에서만 파생한다. 등록부·타입에 리터럴 재기술 금지 (registrations DETAIL Requirements; src/DETAIL.md:62).
- 문서 선행: DETAIL 변경이 코드 변경보다 먼저 커밋 순서상 앞선다 (filid code-placement §5). DETAIL 계약 섹션은 현행화(대체)하고 과거는 History 로 (filid module-documents §5·§6).
- spec 문서 캡: 파일당 15케이스 (filid verification-records §2). 기존 테스트 파일은 수정하지 않는다.
- 보호 불변식 유지: `created`/`updated` 는 호출자 불가(자동), `layer`/`tags` 는 set 가능·unset 불가. L1 게이트·unset 선처리·쓰기 직전 검증 로직 무변경.
- 제외 필드와 사유(코드에 넣지 말고 DETAIL 에만 기록): `created`·`updated`(자동 관리) · `accessed_count`(세션 카운터, 자동) · `archived`·`archive_path`(archiveExpired 훅 소유 — 에이전트 쓰기는 아카이브 불변식 파괴) · `person`(중첩 객체 — 라인 기반 패처가 표현 불가, 별도 과제).
- hooks/·bridge/·생성물 미접촉. **커밋·푸시 금지** — 변경은 워킹트리에 남기고 보고만 한다.
- 알려진 기존 한계(이번 범위 아님, 신규 필드도 동일 노출): 손편집으로 블록 스칼라/블록 리스트가 된 값의 키 라인만 교체되는 patchFrontmatterField 한계. create 산출물은 항상 단일 라인이라 실사용 경로에서는 발생하지 않는다.

## 파일 맵

| #   | 파일                                                                      | 책임                                                                                            |
| --- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 1   | `plugins/maencof/src/mcp/tools/maencofUpdate/DETAIL.md`                   | 계약 선행: 패치 표면 규칙·제외 목록·AC 2개 추가                                                 |
| 2   | `plugins/maencof/src/mcp/server/registrations/DETAIL.md`                  | 공유 프래그먼트 계약 확장·History                                                               |
| 3   | `plugins/maencof/skills/remember/SKILL.md`                                | "no MCP write path" 문장 현행화                                                                 |
| 4   | `plugins/maencof/src/types/frontmatter.ts`                                | enum·날짜 스키마 정본 export (+4 파생 타입)                                                     |
| 5   | `plugins/maencof/src/__tests__/unit/core/updateMetadataFields.test.ts`    | 신규 spec 15케이스 (선작성, red 확인)                                                           |
| 6   | `plugins/maencof/src/__tests__/unit/core/updateSchemaSurfaceSync.test.ts` | 신규 spec 1케이스 (선작성, red 확인)                                                            |
| 7   | `plugins/maencof/src/types/mcpCrud.ts`                                    | `MaencofUpdateFrontmatter` +16필드                                                              |
| 8   | `plugins/maencof/src/mcp/tools/maencofUpdate/maencofUpdate.ts`            | if-사다리 → 직렬화 테이블 (`FM_FIELD_SERIALIZERS` export)                                       |
| 9   | `plugins/maencof/src/mcp/server/registrations/operations/crud.ts`         | `updateFrontmatterInputSchema` 분리·export, 16필드 describe, enum 파생 교체, description 재작성 |

## 태스크 간 인터페이스 (정확한 심볼)

- T2 산출 → T4·T5 소비: `IsoDateSchema` · `DomainTypeSchema` · `OrgTypeSchema` · `MembershipStatusSchema` · `MaturitySchema` · `BufferTypeSchema` · `PromotionTargetSchema` · `HubKindSchema` (모두 zod 스키마, `types/frontmatter.ts` named export), 타입 `DomainType` · `OrgType` · `MembershipStatus` · `Maturity`.
- T4 산출 → T3(sync 테스트)·T5 소비: `FM_FIELD_SERIALIZERS` (named export, `maencofUpdate.ts`) — 키 = `Exclude<keyof MaencofUpdateFrontmatter, 'hub' | 'unset'>` 전체.
- T5 산출 → T3(sync 테스트) 소비: `updateFrontmatterInputSchema` (named export, `crud.ts`) — `z.object`, `.shape` 로 키 열거 가능.
- 신규 16필드 키 이름(모든 계층 공통): `source` `expires` `mentioned_persons` `domain` `domain_type` `person_ref` `trust_level` `expertise_domains` `org_type` `membership_status` `ba_context` `topic_category` `maturity` `buffer_type` `promotion_target` `source_context`.

---

## T1 — 계약 문서 선행 갱신

### T1a `src/mcp/tools/maencofUpdate/DETAIL.md`

Requirements 에 추가:

```md
- 패치 가능한 frontmatter 표면은 `FrontmatterSchema` 의 전 필드에서 제외 목록을 뺀 전부다. 제외와 사유: `created`·`updated`(자동 관리 — updated 는 매 update 자동 갱신), `accessed_count`(세션 참조 카운터, 자동), `archived`·`archive_path`(archiveExpired 훅이 소유하는 아카이브 불변식), `person`(중첩 객체 — 라인 단위 패처가 표현하지 못한다; 쓰기 경로가 필요해지면 별도 설계). 필드별 값 검증은 이 도구가 재기술하지 않는다 — 쓰기 직전 `validateFrontmatter` 게이트가 레이어·서브레이어 배타 규칙까지 판정한다.
- 직렬화 규칙은 `FM_FIELD_SERIALIZERS` 테이블 하나가 소유한다: 자유 문자열은 `quoteYamlValue` 인용, 문자열 배열은 원소별 인용 후 `[a, b]` 인라인, 숫자·enum·날짜는 비인용. 타입에 필드를 추가하면 테이블이 컴파일 단계에서 직렬화기를 강제한다.
```

API Contracts 의 「Frontmatter 패치」 표를 **규칙 단위로 대체** (필드 나열은 스키마·타입이 정본이므로 문서에 인벤토리를 두지 않는다):

```md
| 연산                       | 동작                                                                                |
| -------------------------- | ----------------------------------------------------------------------------------- |
| `unset: string[]`          | 키 라인을 제거한다. 보호 필드는 거부, L1 은 연산 자체를 거부한다.                   |
| `hub: false` / `hub: true` | 키 제거 / `hub: true` 패치 — 유일한 값-조건 분기                                    |
| 자유 문자열 필드           | `quoteYamlValue` 인용 후 패치 (`title` · `purpose` · `source` · `domain` 등)        |
| 문자열 배열 필드           | 원소별 인용 후 `[a, b]` 인라인 (`tags` · `mentioned_persons` · `expertise_domains`) |
| 숫자·enum·날짜 필드        | 비인용 패치 (`layer` · `confidence` · `sub_layer` · `expires` · L3/L5 enum 류)      |
```

27행의 낡은 문장을 교체: `자동 생성 필드(...created · updated · tags · layer...)는 호출자가 직접 쓰는 대상이 아니다` → `호출자가 쓸 수 없는 것은 created(불변)와 updated(자동 갱신)다. AUTO_GENERATED_FM_KEYS 는 본문 중복 제거(deduplicateContent)에 넘기는 키 목록이며 쓰기 권한 목록이 아니다.`

Acceptance Criteria 추가:

```md
### AC-frontmatter-surface-complete — 패치 표면 완전성

- `FrontmatterSchema` 의 모든 필드는 update 로 패치 가능하거나, Requirements 의 제외 목록에 사유와 함께 올라 있다. 어느 쪽도 아닌 필드는 계약 위반이다.

### AC-schema-serializer-sync — 스키마·직렬화기 동기

- 등록 스키마(`updateFrontmatterInputSchema`)의 키 집합은 `FM_FIELD_SERIALIZERS` 의 키 ∪ {`hub`, `unset`} 과 정확히 일치한다. spec `updateSchemaSurfaceSync.test.ts` 가 고정한다.
```

History 최신 항목 추가 + Last Updated 갱신:

```md
- 2026-08-20 — frontmatter 패치 표면을 스키마 전 필드로 넓혔다. 그전에는 16개 편집 가능 필드(source · expires · domain 계열 · L3 서브레이어 확장 · L5 버퍼 필드)에 쓰기 경로가 없어 skills/remember 가 "no MCP write path" 를 명시하는 상태였고, 신규 도구 대신 update 통합을 택했다 — 게이트(L1 3중·보호 unset·쓰기 직전 검증)를 복제하지 않기 위해서다.
```

### T1b `src/mcp/server/registrations/DETAIL.md`

「공유 Zod 프래그먼트」의 sub_layer 문단을 현행화:

```md
`sub_layer` 를 받는 여섯 도구(`create` · `update` · `move` · `kg_search` · `kg_context` · `kg_timeline`)는 `types/frontmatter.ts` 의 `SubLayerSchema` 를 `.optional().describe(...)` 로 파생해 쓴다. 같은 원칙이 update 의 frontmatter 하위 스키마 전체로 확장된다 — enum·날짜 값 집합(`HubKindSchema` · `DomainTypeSchema` · `OrgTypeSchema` · `MembershipStatusSchema` · `MaturitySchema` · `BufferTypeSchema` · `PromotionTargetSchema` · `IsoDateSchema`)은 전부 `types/frontmatter.ts` 파생이고, 등록부는 값을 열거하지 않는다. update 의 frontmatter 하위 스키마는 `updateFrontmatterInputSchema` 로 분리되어 있으며, 키 집합이 핸들러 직렬화 테이블과 일치함은 spec(`updateSchemaSurfaceSync.test.ts`)이 고정한다.
```

History 항목 추가 + Last Updated 갱신:

```md
- 2026-08-20 — update 의 frontmatter 스키마를 표면 전체(편집 가능 16필드 추가)로 넓히며 `updateFrontmatterInputSchema` 로 분리했다. update·move 에 남아 있던 `sub_layer` 리터럴 열거 2곳과 create·update 의 `hub_kind` 리터럴 2곳을 정본 파생으로 교체했다 — 2026-08-04 에 네 자리를 고칠 때 남은 잔여다.
```

### T1c `skills/remember/SKILL.md` 129행

현행: `Rich sub-layer metadata (L3A `person`, L3B `org_type`, etc.) is schema-validated on read but has no MCP write path — do not promise those fields during remember.`

교체: `` `confidence` (internalization 0.0-1.0, initial ~0.3) is not a create parameter — set it after creation via `mcp__plugin_maencof_tools__update` (frontmatter). Sub-layer scalar metadata (L3A `person_ref`/`trust_level`/`expertise_domains`, L3B `org_type`/`membership_status`/`ba_context`, L3C `topic_category`/`maturity`) is likewise settable only through post-create `update`. The nested L3A `person` object still has no MCP write path — do not promise it during remember. `` (문장 전체를 이 형태로; 앞부분 confidence 문장은 기존 그대로 유지된다.)

## T2 — `src/types/frontmatter.ts` 정본 export

`SubLayerSchema` 선언(16행) 아래에 추가하고, `FrontmatterBaseSchema` 의 해당 인라인 값들을 참조로 교체한다 (값 불변 — 동작 무변경):

```ts
/** YYYY-MM-DD 날짜 문자열 정본 — frontmatter 날짜 필드와 MCP 도구의 날짜 입력이 파생한다. */
export const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Domain 유형 허용값 정본. */
export const DomainTypeSchema = z.enum(["life", "professional"]);
/** Domain 유형. */
export type DomainType = z.infer<typeof DomainTypeSchema>;

/** 조직 유형(L3B) 허용값 정본. */
export const OrgTypeSchema = z.enum([
  "company",
  "community",
  "team",
  "institution",
]);
/** 조직 유형(L3B). */
export type OrgType = z.infer<typeof OrgTypeSchema>;

/** 멤버십 상태(L3B) 허용값 정본. */
export const MembershipStatusSchema = z.enum(["active", "inactive", "alumni"]);
/** 멤버십 상태(L3B). */
export type MembershipStatus = z.infer<typeof MembershipStatusSchema>;

/** 주제 성숙도(L3C) 허용값 정본. */
export const MaturitySchema = z.enum([
  "seed",
  "growing",
  "mature",
  "evergreen",
]);
/** 주제 성숙도(L3C). */
export type Maturity = z.infer<typeof MaturitySchema>;

/** L5 버퍼 항목 종류 허용값 정본. */
export const BufferTypeSchema = z.enum([
  "snippet",
  "conversation",
  "unclassified",
]);

/** L5 승격 대상 허용값 정본 — 서브레이어 이름 또는 'L2'. */
export const PromotionTargetSchema = z.enum([...SubLayerSchema.options, "L2"]);

/** 허브 문서 종류 허용값 정본. */
export const HubKindSchema = z.enum([
  "project_moc",
  "cross_domain",
  "synthesis",
  "study_hub",
]);
```

`FrontmatterBaseSchema` 내부 교체 (각 1줄):

- `created:` / `updated:` → `IsoDateSchema` / `IsoDateSchema` (기존 doc comment 유지)
- `expires:` → `IsoDateSchema.optional()`
- `domain_type:` → `DomainTypeSchema.optional()`
- `org_type:` → `OrgTypeSchema.optional()`
- `membership_status:` → `MembershipStatusSchema.optional()`
- `maturity:` → `MaturitySchema.optional()`
- `buffer_type:` → `BufferTypeSchema.optional()`
- `promotion_target:` → `PromotionTargetSchema.optional()` (기존 인라인 `z.enum([...SubLayerSchema.options, 'L2'])` 대체, doc comment 유지)
- `hub_kind:` → `HubKindSchema.optional()`

기존 타입(common.ts 의 `BufferType`·`PromotionTarget`·`HubKind`·`SubLayer`)은 그대로 둔다 — 신규 타입 export 는 common.ts 에 짝이 없는 4개(`DomainType`·`OrgType`·`MembershipStatus`·`Maturity`)만. `types/index.ts`·`src/index.ts` 배럴에는 올리지 않는다(외부 소비자가 생길 때 올린다 — 현재 소비자는 base schema 와 crud.ts 뿐이고 둘 다 `types/frontmatter.js` 직접 import).

검증: `yarn typecheck` green (이 시점 전체 green 이어야 함 — 순수 additive).

## T3 — 실패 테스트 선작성 (red 확인)

### T3a `src/__tests__/unit/core/updateMetadataFields.test.ts` — 15케이스

기존 `maencofUpdateUnset.test.ts` 의 하네스 패턴(mkdtemp vault + `writeFm` + 핸들러 직접 호출)을 그대로 쓴다. 전체 코드:

```ts
/**
 * @file updateMetadataFields.test.ts
 * @description handleMaencofUpdate 확장 metadata 필드 패치 표면.
 *
 * 15케이스 캡: 인용 문자열 5(each) + enum 3(each) + 결합·배열·날짜 5 + 거부·승격 2.
 */
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { handleMaencofRead } from "../../../mcp/tools/maencofRead/maencofRead.js";
import { handleMaencofUpdate } from "../../../mcp/tools/maencofUpdate/maencofUpdate.js";

async function makeTempVault(): Promise<string> {
  return mkdtemp(join(tmpdir(), "maencof-update-metadata-"));
}

async function writeFm(
  vault: string,
  rel: string,
  fmLines: string[],
  body = "Body.",
): Promise<void> {
  const abs = join(vault, rel);
  await mkdir(join(vault, rel.split("/").slice(0, -1).join("/")), {
    recursive: true,
  });
  const content = ["---", ...fmLines, "---", "", body].join("\n");
  await writeFile(abs, content, "utf-8");
}

const BASE_L2 = [
  "created: 2026-01-01",
  "updated: 2026-01-01",
  "tags: [t]",
  "layer: 2",
];
const BASE_L4 = [
  "created: 2026-01-01",
  "updated: 2026-01-01",
  "tags: [t]",
  "layer: 4",
];
const BASE_L5 = [
  "created: 2026-01-01",
  "updated: 2026-01-01",
  "tags: [t]",
  "layer: 5",
];
const baseL3 = (sub: string): string[] => [
  "created: 2026-01-01",
  "updated: 2026-01-01",
  "tags: [t]",
  "layer: 3",
  `sub_layer: ${sub}`,
];

describe("handleMaencofUpdate — 확장 metadata 필드", () => {
  let vault: string;

  beforeEach(async () => {
    vault = await makeTempVault();
  });

  afterEach(async () => {
    await rm(vault, { recursive: true, force: true });
  });

  // ─── 인용 문자열 필드 (5) ─────────────────────────────────────────────
  it.each([
    ["source", "03_External/topical/s.md", baseL3("topical")],
    ["ba_context", "03_External/structural/b.md", baseL3("structural")],
    ["topic_category", "03_External/topical/tc.md", baseL3("topical")],
    ["person_ref", "03_External/relational/p.md", baseL3("relational")],
    ["source_context", "05_Context/sc.md", BASE_L5],
  ] as const)(
    "인용 필요 문자열 패치·라운드트립: %s",
    async (field, rel, fm) => {
      await writeFm(vault, rel, [...fm]);
      const result = await handleMaencofUpdate(vault, {
        path: rel,
        frontmatter: { [field]: "val: needs quoting" },
      });
      expect(result.success).toBe(true);
      const raw = await readFile(join(vault, rel), "utf-8");
      expect(raw).toMatch(new RegExp(`^${field}: "val: needs quoting"$`, "m"));
      const readBack = await handleMaencofRead(vault, { path: rel });
      expect(readBack.success).toBe(true);
    },
  );

  // ─── enum 필드 (3) ────────────────────────────────────────────────────
  it.each([
    [
      "org_type",
      "community",
      "03_External/structural/o.md",
      baseL3("structural"),
    ],
    [
      "membership_status",
      "alumni",
      "03_External/structural/m.md",
      baseL3("structural"),
    ],
    ["maturity", "evergreen", "03_External/topical/ma.md", baseL3("topical")],
  ] as const)("enum 필드 비인용 패치: %s", async (field, value, rel, fm) => {
    await writeFm(vault, rel, [...fm]);
    const result = await handleMaencofUpdate(vault, {
      path: rel,
      frontmatter: { [field]: value },
    });
    expect(result.success).toBe(true);
    const raw = await readFile(join(vault, rel), "utf-8");
    expect(raw).toMatch(new RegExp(`^${field}: ${value}$`, "m"));
  });

  // ─── 결합·배열·날짜 (5) ───────────────────────────────────────────────
  it("domain + domain_type 한 호출 (L2)", async () => {
    await writeFm(vault, "02_Derived/d.md", BASE_L2);
    const result = await handleMaencofUpdate(vault, {
      path: "02_Derived/d.md",
      frontmatter: { domain: "work", domain_type: "professional" },
    });
    expect(result.success).toBe(true);
    const raw = await readFile(join(vault, "02_Derived/d.md"), "utf-8");
    expect(raw).toMatch(/^domain: work$/m);
    expect(raw).toMatch(/^domain_type: professional$/m);
  });

  it("mentioned_persons 배열 인라인 패치 (L2)", async () => {
    await writeFm(vault, "02_Derived/mp.md", BASE_L2);
    const result = await handleMaencofUpdate(vault, {
      path: "02_Derived/mp.md",
      frontmatter: { mentioned_persons: ["홍길동", "Alice"] },
    });
    expect(result.success).toBe(true);
    const raw = await readFile(join(vault, "02_Derived/mp.md"), "utf-8");
    expect(raw).toMatch(/^mentioned_persons: \[홍길동, Alice\]$/m);
    const readBack = await handleMaencofRead(vault, {
      path: "02_Derived/mp.md",
    });
    expect(readBack.success).toBe(true);
  });

  it("trust_level + expertise_domains 한 호출 (L3A)", async () => {
    await writeFm(vault, "03_External/relational/t.md", baseL3("relational"));
    const result = await handleMaencofUpdate(vault, {
      path: "03_External/relational/t.md",
      frontmatter: {
        trust_level: 0.85,
        expertise_domains: ["security", "devops"],
      },
    });
    expect(result.success).toBe(true);
    const raw = await readFile(
      join(vault, "03_External/relational/t.md"),
      "utf-8",
    );
    expect(raw).toMatch(/^trust_level: 0.85$/m);
    expect(raw).toMatch(/^expertise_domains: \[security, devops\]$/m);
  });

  it("expires 날짜 비인용 패치 (L4)", async () => {
    await writeFm(vault, "04_Action/e.md", BASE_L4);
    const result = await handleMaencofUpdate(vault, {
      path: "04_Action/e.md",
      frontmatter: { expires: "2026-12-31" },
    });
    expect(result.success).toBe(true);
    const raw = await readFile(join(vault, "04_Action/e.md"), "utf-8");
    expect(raw).toMatch(/^expires: 2026-12-31$/m);
  });

  it("L5 버퍼 3필드 한 호출 (L5)", async () => {
    await writeFm(vault, "05_Context/buf.md", BASE_L5);
    const result = await handleMaencofUpdate(vault, {
      path: "05_Context/buf.md",
      frontmatter: {
        buffer_type: "snippet",
        promotion_target: "relational",
        source_context: "clipping",
      },
    });
    expect(result.success).toBe(true);
    const raw = await readFile(join(vault, "05_Context/buf.md"), "utf-8");
    expect(raw).toMatch(/^buffer_type: snippet$/m);
    expect(raw).toMatch(/^promotion_target: relational$/m);
    expect(raw).toMatch(/^source_context: clipping$/m);
  });

  // ─── 검증 게이트 경유 거부·승격 (2) ──────────────────────────────────
  it("L5 전용 필드는 비-L5 에서 검증 게이트가 거부하고 파일은 불변", async () => {
    await writeFm(vault, "02_Derived/no5.md", BASE_L2);
    const before = await readFile(join(vault, "02_Derived/no5.md"), "utf-8");
    const result = await handleMaencofUpdate(vault, {
      path: "02_Derived/no5.md",
      frontmatter: { buffer_type: "snippet" },
    });
    expect(result.success).toBe(false);
    expect(result.message).toContain("exclusive to Layer 5");
    const after = await readFile(join(vault, "02_Derived/no5.md"), "utf-8");
    expect(after).toBe(before);
  });

  it("layer 승격 + L5 필드 unset 결합이 한 호출로 통과", async () => {
    await writeFm(vault, "05_Context/promote.md", [
      ...BASE_L5,
      "buffer_type: snippet",
      "promotion_target: L2",
    ]);
    const result = await handleMaencofUpdate(vault, {
      path: "05_Context/promote.md",
      frontmatter: {
        layer: 2,
        unset: ["buffer_type", "promotion_target"],
      },
    });
    expect(result.success).toBe(true);
    const raw = await readFile(join(vault, "05_Context/promote.md"), "utf-8");
    expect(raw).toMatch(/^layer: 2$/m);
    expect(raw).not.toMatch(/^buffer_type:/m);
    expect(raw).not.toMatch(/^promotion_target:/m);
  });
});
```

주의: `frontmatter: { [field]: ... }` 의 computed key 는 T4 이전에는 타입상 없는 필드지만 vitest 는 esbuild 변환(무타입검사)이라 **런타임으로 실행되고 assertion 에서 실패한다** — 이것이 의도된 red(기능 부재의 증상)다. `as const` 튜플 each 파라미터는 T4 이후 타입 통과를 위해 그대로 둔다.

### T3b `src/__tests__/unit/core/updateSchemaSurfaceSync.test.ts` — 1케이스

```ts
/**
 * @file updateSchemaSurfaceSync.test.ts
 * @description update 등록 스키마와 핸들러 직렬화 테이블의 키 집합 동기 —
 * AC-schema-serializer-sync. 2026-08-03 unset 스키마 누락 사고의 재발 방지.
 */
import { describe, expect, it } from "vitest";

import { updateFrontmatterInputSchema } from "../../../mcp/server/registrations/operations/crud.js";
import { FM_FIELD_SERIALIZERS } from "../../../mcp/tools/maencofUpdate/maencofUpdate.js";

describe("update frontmatter 표면 동기", () => {
  it("등록 스키마 키 == 직렬화 테이블 키 ∪ {hub, unset}", () => {
    const schemaKeys = [
      ...Object.keys(updateFrontmatterInputSchema.shape),
    ].sort();
    const expected = [
      ...Object.keys(FM_FIELD_SERIALIZERS),
      "hub",
      "unset",
    ].sort();
    expect(schemaKeys).toEqual(expected);
  });
});
```

### red 확인 실행

```
yarn vitest run src/__tests__/unit/core/updateMetadataFields.test.ts src/__tests__/unit/core/updateSchemaSurfaceSync.test.ts
```

기대: updateMetadataFields — 13/15 실패(필드 미반영 raw 불일치·검증 미거부; `layer 승격+unset` 케이스 등 기존 능력만 쓰는 케이스는 green 일 수 있음), updateSchemaSurfaceSync — 모듈 로드 실패(`FM_FIELD_SERIALIZERS`·`updateFrontmatterInputSchema` named export 부재 = 심볼 부재가 기대 실패 사유). 실제 red 출력을 기록해 둔다.

## T4 — 타입·핸들러 확장

### T4a `src/types/mcpCrud.ts`

import 추가: `import type { DomainType, Maturity, MembershipStatus, OrgType } from './frontmatter.js';`

`MaencofUpdateFrontmatter` 의 `unset` 앞에 16필드 삽입 (기존 11필드는 무변경):

```ts
  /** 외부 출처 (통상 Layer 3) */
  source?: string;
  /** 만료일 YYYY-MM-DD (Layer 4·L5 buffer) */
  expires?: string;
  /** 문서에서 언급된 인물 목록 (모든 레이어) */
  mentioned_persons?: string[];
  /** Domain 이름 (cross-layer 그룹핑) */
  domain?: string;
  /** Domain 유형 */
  domain_type?: DomainType;
  /** 인물 참조 키 (L3A 전용) */
  person_ref?: string;
  /** 신뢰 수준 0.0~1.0 (L3A) */
  trust_level?: number;
  /** 전문 도메인 목록 (L3A) */
  expertise_domains?: string[];
  /** 조직 유형 (L3B 전용) */
  org_type?: OrgType;
  /** 멤버십 상태 (L3B) */
  membership_status?: MembershipStatus;
  /** Ba 컨텍스트 (L3B) */
  ba_context?: string;
  /** 주제 카테고리 (L3C) */
  topic_category?: string;
  /** 주제 성숙도 (L3C) */
  maturity?: Maturity;
  /** 미분류 항목 종류 (L5 전용) */
  buffer_type?: BufferType;
  /** 승격 대상 (L5 전용) */
  promotion_target?: PromotionTarget;
  /** 항목 출처 서술 (L5 전용) */
  source_context?: string;
```

(`BufferType`·`PromotionTarget` 은 이미 import 되어 있는 `./common.js` 에서.)

### T4b `src/mcp/tools/maencofUpdate/maencofUpdate.ts`

`updateFrontmatter` 의 11개 if-사다리(81~134행)를 테이블 구동으로 대체. `PROTECTED_UNSET_FIELDS` 선언 아래에 추가:

```ts
/** hub(값-조건 분기)·unset(제거 연산)을 뺀 패치 대상 필드 키 */
type PatchableFieldKey = Exclude<
  keyof MaencofUpdateFrontmatter,
  "hub" | "unset"
>;

const quoteEach = (values: string[]): string =>
  `[${values.map((v) => quoteYamlValue(v)).join(", ")}]`;

/**
 * 필드별 YAML 라인 직렬화 테이블 — 자유 문자열은 인용, 배열은 원소별 인용 인라인,
 * 숫자·enum·날짜는 비인용. 값 집합 검증은 쓰기 직전 validateFrontmatter 가 맡고
 * 여기는 표기만 맡는다. 타입에 필드를 더하면 이 테이블이 직렬화기를 컴파일로 강제한다.
 */
export const FM_FIELD_SERIALIZERS: {
  [K in PatchableFieldKey]-?: (
    value: NonNullable<MaencofUpdateFrontmatter[K]>,
  ) => string;
} = {
  tags: quoteEach,
  title: quoteYamlValue,
  layer: String,
  confidence: String,
  schedule: quoteYamlValue,
  sub_layer: (v) => v,
  cluster_key: quoteYamlValue,
  gist: quoteYamlValue,
  hub_kind: (v) => v,
  purpose: quoteYamlValue,
  source: quoteYamlValue,
  expires: (v) => v,
  mentioned_persons: quoteEach,
  domain: quoteYamlValue,
  domain_type: (v) => v,
  person_ref: quoteYamlValue,
  trust_level: String,
  expertise_domains: quoteEach,
  org_type: (v) => v,
  membership_status: (v) => v,
  ba_context: quoteYamlValue,
  topic_category: quoteYamlValue,
  maturity: (v) => v,
  buffer_type: (v) => v,
  promotion_target: (v) => v,
  source_context: quoteYamlValue,
};
```

`updateFrontmatter` 본문의 필드 분기 전체(`if (updates.tags !== undefined) ... purpose ...`)를 다음으로 교체 — unset 선처리와 hub 특수 분기는 기존 위치·의미 유지:

```ts
// unset 먼저 처리 (머지 전 — 동일 키를 set+unset 시 set이 승리)
if (updates.unset)
  for (const key of updates.unset) yaml = removeFrontmatterField(yaml, key);

const patchField = <K extends PatchableFieldKey>(key: K): void => {
  const value = updates[key];
  if (value === undefined) return;
  yaml = patchFrontmatterField(
    yaml,
    key,
    FM_FIELD_SERIALIZERS[key](
      value as NonNullable<MaencofUpdateFrontmatter[K]>,
    ),
  );
};
for (const key of Object.keys(FM_FIELD_SERIALIZERS) as PatchableFieldKey[])
  patchField(key);

// hub 는 값-조건 분기: false 는 키 제거, true 는 패치
if (updates.hub !== undefined)
  yaml = updates.hub
    ? patchFrontmatterField(yaml, "hub", "true")
    : removeFrontmatterField(yaml, "hub");
```

(`value as NonNullable<...>` 은 generic indexed-access 의 undefined 배제 내로잉이 tsc 버전에 따라 흔들리는 지점의 명시적 좁힘이다 — `any` 계열 억제가 아니라 `!== undefined` 가드가 증명한 사실의 표기. tsc 가 캐스트 없이 통과하면 캐스트를 제거한다.)

검증: `yarn vitest run src/__tests__/unit/core/updateMetadataFields.test.ts` → **15/15 green**. `yarn vitest run src/__tests__/unit/core/maencofUpdateUnset.test.ts src/__tests__/unit/l1UpdateGuard.test.ts src/__tests__/unit/gistContract.test.ts src/__tests__/unit/core/frontmatterClusterKey.test.ts src/__tests__/unit/core/hubCreateRoundTrip.test.ts` → 무수정 green (리팩터 불변식).

## T5 — 등록 스키마 확장 (`crud.ts`)

import 확장: `import { HubKindSchema, IsoDateSchema, SubLayerSchema, DomainTypeSchema, OrgTypeSchema, MembershipStatusSchema, MaturitySchema, BufferTypeSchema, PromotionTargetSchema } from '../../../../types/frontmatter.js';`

`registerCrudTools` **위** 모듈 레벨에 update 의 frontmatter 하위 스키마를 분리·export (동기 테스트가 `.shape` 를 읽는다):

```ts
/**
 * update 의 frontmatter 하위 스키마 — 키 집합은 핸들러의 FM_FIELD_SERIALIZERS
 * ∪ {hub, unset} 와 일치해야 하며 updateSchemaSurfaceSync spec 이 고정한다.
 * 값 집합은 전부 types/frontmatter.ts 정본에서 파생한다.
 */
export const updateFrontmatterInputSchema = z.object({
  tags: z.array(z.string()).optional(),
  title: z.string().optional(),
  layer: z
    .number()
    .int()
    .min(1)
    .max(5)
    .optional()
    .describe("Layer change (1-5, use when correcting Layer violations)"),
  confidence: z.number().min(0).max(1).optional(),
  schedule: z.string().optional(),
  cluster_key: z
    .string()
    .min(1)
    .optional()
    .describe(
      "Thread/cluster declaration — documents sharing a cluster_key collapse to one representative in kg_search/kg_context. Remove with unset.",
    ),
  sub_layer: SubLayerSchema.optional().describe(
    "Sub-layer for Layer 3 only (relational/structural/topical).",
  ),
  gist: z
    .string()
    .optional()
    .describe(
      "One-line Layer 1 gist injected into turn context. Required for Layer 1 (update rejects a modification that leaves the L1 gist-less); optional for other layers. Single keyword/phrase line; capped to 128 code points in the per-turn view.",
    ),
  hub: z
    .boolean()
    .optional()
    .describe(
      "Promote or demote this document as a cross-layer hub (MOC). Requires purpose when true; rejected on Layer 5.",
    ),
  hub_kind: HubKindSchema.optional().describe(
    "Hub document kind. Only valid together with hub=true.",
  ),
  purpose: z
    .string()
    .optional()
    .describe(
      "One line stating what this hub integrates. Required when hub=true.",
    ),
  source: z
    .string()
    .optional()
    .describe("External source reference (typically Layer 3)."),
  expires: IsoDateSchema.optional().describe(
    "Expiry date YYYY-MM-DD (Layer 4 and L5 buffer).",
  ),
  mentioned_persons: z
    .array(z.string())
    .optional()
    .describe("People mentioned in this document (all layers)."),
  domain: z
    .string()
    .optional()
    .describe("Domain name for cross-layer grouping."),
  domain_type: DomainTypeSchema.optional().describe(
    "Domain kind (life/professional).",
  ),
  person_ref: z
    .string()
    .optional()
    .describe("Person reference key (L3A relational only)."),
  trust_level: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe("Trust level 0.0-1.0 (L3A relational)."),
  expertise_domains: z
    .array(z.string())
    .optional()
    .describe("Expertise domain list (L3A relational)."),
  org_type: OrgTypeSchema.optional().describe(
    "Organization kind (L3B structural only).",
  ),
  membership_status: MembershipStatusSchema.optional().describe(
    "Membership status (L3B structural).",
  ),
  ba_context: z
    .string()
    .optional()
    .describe("Ba context description (L3B structural)."),
  topic_category: z
    .string()
    .optional()
    .describe("Topic category (L3C topical)."),
  maturity: MaturitySchema.optional().describe("Topic maturity (L3C topical)."),
  buffer_type: BufferTypeSchema.optional().describe(
    "Layer 5 only. What kind of unclassified item this is.",
  ),
  promotion_target: PromotionTargetSchema.optional().describe(
    "Layer 5 only. Suggested destination when promoted (sub-layer name or L2).",
  ),
  source_context: z
    .string()
    .optional()
    .describe("Layer 5 only. Where this item came from."),
  unset: z
    .array(z.string())
    .optional()
    .describe(
      "Remove these frontmatter fields. Use this to recover a document whose frontmatter fails validation. Protected fields (created, updated, layer, tags) are rejected; blocked entirely on Layer 1.",
    ),
});
```

update 등록부 교체:

- description → `'Updates an existing maencof document: body content and/or frontmatter metadata. frontmatter patches any editable field (tags, title, layer, source, expires, domain/person/org/topic fields, L5 buffer fields, hub, gist, ...); unset removes fields. The target must already contain a frontmatter block — use create for new documents. The updated field is refreshed automatically.'`
- `frontmatter:` 인라인 `z.object({...})` 전체 → `updateFrontmatterInputSchema.optional().describe('Partial Frontmatter update (optional)')`

잔여 리터럴의 정본 파생 교체 (같은 파일, 같은 계약 위반의 잔여):

- create 의 `expires` 인라인 regex → `IsoDateSchema.optional().describe('Expiry date YYYY-MM-DD (for Layer 4 and L5 buffer)')`
- create 의 `hub_kind` 인라인 enum → `HubKindSchema.optional().describe('Hub document kind. Only valid together with hub=true.')`
- create 의 `buffer_type` 인라인 enum → `BufferTypeSchema.optional().describe(...)` (기존 describe 유지)
- create 의 `promotion_target` 인라인 enum → `PromotionTargetSchema.optional().describe(...)` (기존 describe 유지)
- move 의 `target_sub_layer` 인라인 enum → `SubLayerSchema.optional().describe(...)` (기존 describe 유지)

검증: `yarn vitest run src/__tests__/unit/core/updateSchemaSurfaceSync.test.ts` → green.

## T6 — 전체 검증

```
yarn typecheck          # tsc --noEmit, 테이블 완전성(mapped type -?)이 여기서 강제된다
yarn test:run           # 전체 스위트 — 기존 update 스위트 무수정 green 확인
yarn format             # prettier (touched files)
```

기대: 전부 green. 실패 시 해당 태스크로 되돌아가 원인 수정(증상 패치 금지). 완료 후 변경 파일 목록과 테스트 요약을 보고하고 **커밋하지 않는다**.

## 리뷰 판정 (review-plan, 2026-08-20)

**verdict: grounded-only** — challenge 트리거(공개 계약 변경: update inputSchema 확장) 성립을 인지한 채 접지만으로 진행한다. 사유: (1) 모든 현재-상태 주장이 이 세션의 도구 출력을 인용한다(아래 자체 검토 기록), (2) 실행은 codex 가 독립 수행하며 계획의 red→green 게이트가 하중 주장을 기계적으로 재검증한다.

접지 중 확인한 추가 사항:

- **필드 추가 순서 변화** — 테이블 구동으로 신규 필드의 append 순서가 구 if-순서와 달라질 수 있으나(hub 가 마지막), YAML 필드 순서는 파서·검증·기존 테스트(라인 단위 `/m` 정규식) 모두에 무영향. 확인 완료, 비위험.
- **파서 능력 주장은 기존 동작으로 증명됨** — 비인용 날짜(`created`/`updated`)·비인용 숫자(`confidence` 패치)·인라인 배열(`tags`)은 오늘도 모든 update 호출에서 `parseYamlFrontmatter`→`validateFrontmatter` 를 통과하고 있다. 신규 필드는 같은 직렬화 클래스만 쓴다.
- **sync 테스트의 `crud.js` import** — crud.ts 의 import 그래프(middlewares·graphCache·shared)는 함수 정의 모듈로 로드 시 I/O 없음(grep 확인). 만약 vitest 로드가 깨지면 `updateFrontmatterInputSchema` 를 `operations/updateFrontmatterInputSchema.ts` 리프로 추출하고 crud.ts 가 import 하는 형태로 전환한다(계약 동일).
- **미증명 잔여 2건(실행 중 자체 판정)** — 인라인 배열 내 한글 원소 파싱(기존 한글 태그와 동일 클래스, 테스트가 판정), T4b generic 내로잉의 tsc 통과 여부(캐스트 폴백 명시됨).

## 자체 검토 기록

- 요구 → 태스크 대응: 커버리지 공백(T2·T4·T5), 발견성(T5 description), 결정 근거 문서화(본 문서·T1), 재발 방지(T3b·T4b 테이블), 문서 선행(T1) ✓
- 플레이스홀더 없음 · 태스크 간 심볼 명세 일치 확인 ✓ (`FM_FIELD_SERIALIZERS` / `updateFrontmatterInputSchema` / frontmatter.ts 8종 스키마 + 4종 타입)
- 인용 경로·심볼은 전부 이 세션 도구 출력으로 확인: crud.ts 구조(Read), maencofUpdate.ts 구조(Read), frontmatter.ts 전문(Read), mcpCrud.ts 전문(Read), 테스트 하네스 패턴(Read), quoteYamlValue 동작(grep), 스크립트 명령(package.json), remember/SKILL.md:129(grep) ✓
- 캡 준수: 신규 spec 15·1케이스 ✓ 기존 테스트 무수정 ✓
