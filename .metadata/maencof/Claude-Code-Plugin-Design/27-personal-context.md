---
created: 2026-07-09
updated: 2026-07-09
tags: [personal-context, states, topics, companion, session-context, mcp, hooks]
layer: design-area-4
---

# Personal Context 층 — 사용자 상태 트래킹 + 최근 동향 원장

## 개요

vault(지식)·companion(AI 정체성)과 구분되는 제3의 축: **사용자에 대한 에이전트의 운영 지식**.
확장 가능한 단일 envelope(`.maencof-meta/personal-context.json`) 위에 두 섹션을 둔다.

- `states` — 대화에서 포착한 사용자의 일시적 상태(기분·수면·건강·상황 등). 컴페니언이
  은연중 배려로 소비한다.
- `topics` — vault 쿼리와 무관하게 유지하는 최근 동향 원장(약속·고민·관계·일·계획·관심사).

관련 문서: [플러그인 아키텍처](./16-plugin-architecture.md) | [MCP 도구 명세](./17-mcp-tools.md) | [스킬 명세](./18-skills.md)

---

## 1. 경계 — 기존 축과의 구분

| 축                                     | 주체   | 내용                                             | 기록 방식                     |
| -------------------------------------- | ------ | ------------------------------------------------ | ----------------------------- |
| sessionStore / workIndex / activityLog | 시스템 | 무엇을 **했나** (세션·작업·도구 호출)            | 자동                          |
| companion-identity                     | AI     | AI가 **누구인가**                                | 저작 (`companion_edit`)       |
| **personal-context**                   | 사용자 | 사용자가 **어떤 상태이고 무엇에 마음이 가 있나** | 컴페니언이 대화에서 선별 캡처 |

- vault 문서가 아니다: KG 인덱스·recall/explore·checkup·maencof-lens에 노출되지 않는다
  (은닉성 — 상태가 검색 결과로 떠오르면 안 된다).
- 60일을 넘겨 반복 재강화되는 특성은 상태가 아니라 정체성이다 — L1 문서로의 승격을
  personal-status 스킬이 안내한다.
- vault 자동 커밋 scope(`.maencof-meta/` 포함)를 그대로 따른다 — 멀티머신 연속성과 상태
  변화의 git 이력을 얻는다(개인 vault 저장소 전제).

---

## 2. 저장 스키마 (`.maencof-meta/personal-context.json`)

```jsonc
{
  "_schemaVersion": 1, // CONFIG_REGISTRY additive-merge 관례
  "config": { "enabled": true },
  "states": [
    {
      "id": "번아웃-기미", // label 정규화 슬러그 (sanitizeSegment) = dedup 키
      "label": "번아웃 기미", // ≤ 40자
      "kind": "mood", // 자유 어휘 (소문자 kebab, ≤ 24자) — 아래 §3
      "intensity": "medium", // low | medium | high
      "note": "야근 연속, 피로 호소", // ≤ 80자, 선택
      "evidence": "07-08 '요즘 계속 야근'", // ≤ 100자, 필수 (근거 없는 상태 금지)
      "capturedAt": "ISO",
      "lastReinforcedAt": "ISO",
      "expiresAt": "ISO", // 서버 계산: now + ttlDays (기본 14, 1–60)
      "reinforceCount": 1,
    },
  ],
  "topics": [
    {
      "id": "이직-타이밍-고민",
      "label": "이직 타이밍 고민", // ≤ 40자
      "kind": "concern", // 자유 어휘 (소문자 kebab, ≤ 24자)
      "note": "현 직장 3년차, 연내 결정 희망", // ≤ 100자, 선택
      "status": "active", // active | resolved
      "due": "2026-07-20", // YYYY-MM-DD, 선택 (약속/계획)
      "firstSeenAt": "ISO",
      "lastSeenAt": "ISO", // recency 정렬 키; resolve 시각 겸용
      "touchCount": 3,
    },
  ],
}
```

단일 파일인 이유: SessionStart가 fs read 1회로 전체를 로드하고(훅 번들 코드 최소),
`_schemaVersion` envelope이 한 곳이며, 새 섹션 추가가 additive다. 비대해지면
companionMigration 골격(멱등 가드 + 백업 후 쓰기 + 에러 격리)으로 분리 마이그레이션한다.

### 새 섹션(kind) 확장 절차

① `types/personalContext.ts`에 섹션 타입 추가 → ② `capture_personal_context` 입력에 target 추가 →
③ `renderPersonalContextBlock`에 섹션 렌더 추가 → ④ `prunePersonalContext`에 수명 규칙 추가 →
⑤ `normalizePersonalContext`의 허용 목록(섹션·필드)에 신규 필드 추가. 전부 additive.

⑤가 필수인 이유: normalize는 알려진 필드만으로 envelope/entry를 재구성해 미지 필드를
조용히 drop한다(손편집 방어). 이 단계를 빠뜨리면 구버전 normalize를 거치는 read-prune-write
사이클이 신규 필드를 제거하고 auto-commit이 손실본을 동기화한다.

---

## 3. kind 어휘 — 자유 + 제안 어휘

kind는 닫힌 enum이 아니다(발산 방지의 실질 장치는 캡과 slug dedup이며, kind는 렌더
메타정보다). 스키마는 `소문자 kebab 단어 ≤ 24자`만 강제하고, 제안 어휘를 도구
description과 캡처 지침에 실어 자연 수렴시킨다.

- **states 제안 어휘**: `mood`, `anxiety`, `sleep`, `energy`, `stress`, `physical-health`,
  `chronic-condition`, `social`, `motivation`, `challenge`
- **topics 제안 어휘**: `work`, `family`, `relationship`, `health`, `finance`, `plan`,
  `appointment`, `learning`, `leisure`, `travel`, `concern`, `interest`

운영 데이터가 쌓이면 고빈도 어휘를 enum으로 승격할 수 있다(자유 문자열 → enum은 additive).

---

## 4. 수명주기 규칙

### states — 발산도 고정도 안 되게

| 장치      | 규칙                                                                                                         |
| --------- | ------------------------------------------------------------------------------------------------------------ |
| 발산 방지 | active(미만료) 최대 **10개** — 초과 캡처는 거부 + 현황 반환(병합/해소 유도)                                  |
|           | slug 일치 재캡처 = 신규가 아닌 **재강화**: lastReinforcedAt·expiresAt 갱신, reinforceCount++, 제공 필드 갱신 |
| 고정 방지 | `expiresAt` 필수 — 영구 상태 불허. 기본 TTL **14일**, ttlDays 1–60                                           |
|           | 재강화 없으면 자연 소멸 (SessionEnd prune)                                                                   |
| 조기 해소 | `action: 'resolve'` — 항목 즉시 제거 (예: "감기 다 나았어")                                                  |

### topics — 회전

| 장치     | 규칙                                                                    |
| -------- | ----------------------------------------------------------------------- |
| 보존 캡  | 최대 **20개** — 초과 시 resolved 우선 제거, 다음 oldest-lastSeenAt 제거 |
| 주입 캡  | active를 lastSeenAt 내림차순 최근 **7개**만                             |
| dedup    | slug 일치 → lastSeenAt touch + touchCount++ + 제공 필드 갱신            |
| resolved | 주입 제외, lastSeenAt 기준 **14일** 후 prune                            |
| due 경과 | due + **7일** 경과 시 자동 resolved (kind 무관, due 보유 항목 전체)     |

kind별 TTL 차등은 두지 않는다 — 운영 데이터가 쌓인 후 재검토.

---

## 5. 데이터 흐름

```
캡처 (MCP capture_personal_context — 조용히, 무배너)
  → 주입 (SessionStart, companion identity 직후, 세션 1회)
  → 재강화/해소 (같은 slug upsert / resolve)
  → 정리 (SessionEnd prune)
```

### 5.1 캡처 — `capture_personal_context` (17 §3)

- 응답은 `{ success, id, merged, message }` 최소형 — insight의 캡처 배너·pending 통지·세션
  시작 알림 같은 표면화가 **없다**. 캡처 사실은 대화에서 언급하지 않는다.
- 게이트: `config.enabled=false` → 거부. states 캡 초과 → 거부 + 현황.
- 검증: 필드 길이는 Zod max로 **거부**한다(절단하지 않음 — 저작 시점 게이트, companion 예산 철학).
- target/action 조합별 필수 필드는 핸들러가 검증한다(스키마는 플랫 유지 — MCP SDK ZodRawShape 제약).

### 5.2 주입 — SessionStart bootstrap

`composeSessionStartResult` 조립 순서: `identityBlock → personalContextBlock → l1Block → metaBody → advisories`.

```text
<personal-context>
  Apply silently: weave this awareness into tone, pacing, and suggestions.
  Never state that you track the user's state or topics; never fixate on them.
  Capture: when the conversation clearly evidences a durable shift in the user's
  condition or a recurring personal topic, record it quietly via capture_personal_context
  — typically 1-2 per session, more when several clearly surface. Resolve entries
  the user reports as over.
  states:
  - 번아웃 기미 (mood, medium, ~07-22) — 야근 연속, 피로 호소
  topics:
  - [concern] 이직 타이밍 고민 — 현 직장 3년차, 연내 결정 희망 (07-08, x3)
</personal-context>
```

- **companion 존재 시에만** 주입한다 (은닉 배려의 주체가 컴페니언).
- 캡처 지침은 블록에 내장한다(metaSkillBody가 아님) — enabled일 때만 지침이 존재하고
  읽기·쓰기 지침이 응집된다. 항목이 없어도 지침은 주입한다(캡처 부트스트랩).
- 만료 항목은 읽기 시 lazy-filter로 주입에서만 제외한다(파일 불변).
- 런타임 컷 없음 — 저작 게이트(길이 Zod max + 항목 캡)가 예산을 통제한다. 산술 상한
  ≈ 2.5K자(states 10 + topics 7 + 지침)로 companion 세션 예산(4,000자 soft)과 같은 급.
- 반영 시차는 의도된 동작: 세션 중 캡처는 다음 세션부터 주입된다(당 세션은 대화 문맥에
  이미 존재). 매 턴 주입은 없다 — 필요해지면 companion sections의 `inject`/`salience`
  모델을 재사용한다.

### 5.3 정리 — SessionEnd finalize

만료 state 제거 → due+7d 자동 resolve → resolved topic 14d 초과 제거 → topics 20개 컷.
변경이 있을 때만 쓴다. 실패는 errorLog로 격리.

---

## 6. 모듈 배치 — 훅 번들 경계

| 파일                                                   | 소비자                           | 제약                       |
| ------------------------------------------------------ | -------------------------------- | -------------------------- |
| `core/personalContext/readPersonalContext.ts`          | sessionStart·sessionEnd 훅 + MCP | zod-free 정규화 포함       |
| `core/personalContext/renderPersonalContextBlock.ts`   | sessionStart 훅 전용             | zod-free                   |
| `core/personalContext/prunePersonalContext.ts`         | sessionEnd 훅 전용               | zod-free                   |
| `core/personalContext/writePersonalContext.ts`         | prune·mutation 공용              | zod-free                   |
| `core/personalContext/applyPersonalContextMutation.ts` | MCP 전용                         | 훅 번들 미진입             |
| `types/personalContext.ts`                             | 전역                             | 순수 타입 (zod 없음)       |
| `constants/personalContext.ts`                         | 전역                             | 캡·TTL·길이 상한·제안 어휘 |

- 훅 도달 코드는 concrete 경로 import(배럴 금지) + zod 금지 — `build-hooks.mjs`의
  FORBIDDEN_PATTERNS와 번들 바이트 캡이 빌드 시 강제한다.
- id 슬러그는 `core/filenameSlug`의 `sanitizeSegment`를 재사용한다(한글 보존, 결정적,
  바이트 예산 + 해시 절단).
- 파일 프로비저닝은 `CONFIG_REGISTRY` 등록으로 얻는다(최초 SessionStart가 생성,
  `_schemaVersion` additive merge 마이그레이션 포함).

---

## 7. 열람·제어 — personal-status 스킬 (18 §5)

은닉은 대화 톤 요구이지 데이터 은폐가 아니다 — 데이터는 사용자 소유이므로 전용 열람
경로를 둔다.

- `(인자 없음)` — states/topics 요약 뷰 (파일 직접 Read)
- `--resolve <label>` — 항목 해소 (`capture_personal_context`의 resolve 액션 경유)
- `--enable` / `--disable` — `config.enabled` 토글 (insight-config 선례대로 config 필드만
  스킬이 직접 수정; states/topics 항목 조작은 반드시 MCP 도구 경유)
- 장수 상태(만료 연장 반복)를 발견하면 L1 승격을 안내한다.
