# Provider Preamble & Recency Factor — 설계 계획 (v2)

cogair가 gemini / codex 위임 시 prompt prefix를 주입해 (a) 사용자 정의
preamble과 (b) 정보 최신성 hint를 항상 부여하는 기능 설계.
v1 초안에 대한 cogair `/crosscheck` 리뷰 결과 반영.

## 배경

gemini / codex가 학습 데이터 분포에 기반해 오래된 정보를 우선 인용하는
경향이 관찰됨 (특히 gemini). cogair가 prompt → CLI 변환 레이어를 단독
소유하므로, prefix 주입을 통한 가벼운 hint 제어가 자연스러운 위치.

**CLI 사실관계** — gemini-cli `-p`, codex `exec` 둘 다 별도 system prompt
채널이 없음. 모두 단일 prompt string. 따라서 본 기능의 "system prompt
주입"은 실질적으로 **prompt prefix 주입**.

## 설계 결정

1. **위치**: cogair (provider-별 설정과 동일 자리). "system prompt"가
   아닌 "prompt prefix"라 부른다 — CLI에 별도 system 채널이 없는 사실
   반영.
2. **적용 범위**: 항상-on. 모든 호출에 prefix 부여 — 사용자 책임 모델.
3. **per-provider 분리**: gemini / codex 각각 독립 설정.
4. **유연성 분리**:
   - 레벨별 본문은 cogair가 owns (코드/PR로만 수정).
   - 사용자 자유 조정은 `preamble` textarea 한 곳에 한정.
5. **시점 정보**: `{today}` 토큰을 dispatch 시점에 `YYYY-MM-DD`로 치환.
   사용자 로컬 timezone 기준임을 본문에 명시.
6. **범위 한정**: 레벨 텍스트는 "시간에 따라 변할 수 있는 정보"에만
   적용되도록 본문에 명시 — 코드 작업, 의도적 과거 정보 요청에 대한
   간섭 방지.
7. **XML 태그 wrap**: 레벨 텍스트는
   `<recency_policy>...</recency_policy>`로 감싸 시스템 지시문임을
   명시화. 사용자 prompt와 분리.

## Schema (`src/types/config.ts`)

```ts
export const RecencyLevelSchema = z.enum(['off', 'normal', 'strict']);
export type RecencyLevel = z.infer<typeof RecencyLevelSchema>;

export const PreambleConfigSchema = z.object({
  gemini: z.string(),
  codex: z.string(),
});
export type PreambleConfig = z.infer<typeof PreambleConfigSchema>;

export const RecencyFactorConfigSchema = z.object({
  gemini: RecencyLevelSchema,
  codex: RecencyLevelSchema,
});
export type RecencyFactorConfig = z.infer<typeof RecencyFactorConfigSchema>;

// ConfigSchema 에 추가:
preamble:       PreambleConfigSchema,
recency_factor: RecencyFactorConfigSchema,
```

**Default**:

- `preamble.gemini = ""`, `preamble.codex = ""`
- `recency_factor.gemini = 'off'`, `recency_factor.codex = 'off'`

## 레벨 의미

| Level  | 의미                                                                                  |
| ------ | ------------------------------------------------------------------------------------- |
| off    | 주입 없음                                                                             |
| normal | 시간 민감 정보일 때 최신 공식/원출처 확인 권고                                        |
| strict | 시간 민감 정보일 때 검색 도구 실행 의무 + 출처/기준일 표기 + 확인 불가 시 명시적 거부 |

## 레벨별 텍스트 (`src/constants/recencyPrompts/`)

### normal

```
오늘은 {today}입니다 (사용자 로컬 기준).
사용자 요청이 시간에 따라 변할 수 있는 정보(현재 상태, 최근 변경, 가격,
버전, 법/정책, 일정, 인물/조직 현황 등)를 포함하면 다음을 따라주세요:

- 검색 도구가 사용 가능하면 최신 공식/원출처를 확인한 뒤 답변하세요.
- 출처의 게시일·업데이트일을 함께 고려하세요.
- 오래된 출처만 확인되는 경우 기준일을 명시하고, 현재 상태는 별도로
  "확인 불가"라고 분리해 답변하세요.
```

### strict

```
오늘은 {today}입니다 (사용자 로컬 기준).
사용자 요청이 시간에 따라 변할 수 있는 정보(현재 상태, 최근 변경, 가격,
버전, 법/정책, 일정, 인물/조직 현황 등)를 포함하면 다음을 엄격히
따라주세요:

1. 검색 도구를 실행하여 최신 공식/원출처를 확인한 후 답변을
   작성하세요.
2. 핵심 결론·수치·날짜·버전·정책에는 출처와 기준일을 함께 표기하세요.
3. 공식/원출처가 있으면 우선 사용하세요. 출처가 서로 충돌하거나
   고위험 사실인 경우에만 독립 출처로 교차검증하세요.
4. 검색 도구를 사용할 수 없거나 신뢰할 만한 최신 출처를 찾지 못하면
   "확인 불가"로 답변하고 추측하지 마세요.
```

## 조립 로직 (dispatch 시점)

```
<recency_policy>
{레벨 본문 ({today} 치환 완료)}
</recency_policy>

{preamble (사용자 자유 텍스트)}

{args.prompt}
```

- 레벨 `off` 이면 `<recency_policy>` 블록 전체 생략.
- `preamble` 빈 문자열이면 해당 줄 생략.
- 둘 다 비어 있으면 `args.prompt` 그대로 통과.

## 영향 영역

| 영역                    | 파일 / 위치                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------- |
| schema                  | `src/types/config.ts`                                                                                         |
| DEFAULT_CONFIG / merge  | `src/constants/`, `src/core/configManager/utils/mergeWithDefaults.ts`                                         |
| 레벨 텍스트 상수        | `src/constants/recencyPrompts/` (신규 organ)                                                                  |
| 합성 util               | `src/dispatcher/utils/composePrompt.ts` (신규)                                                                |
| dispatch start          | `src/dispatcher/gemini/utils/buildPromptArgs.ts`, `src/dispatcher/codex/utils/buildStartArgs.ts`              |
| dispatch resume         | `src/dispatcher/codex/utils/buildResumeArgs.ts` ; gemini 는 buildPromptArgs.ts 공용 — resume 케이스 검증 필수 |
| MCP tool 진입           | `src/mcp/tools/startConversation/`, `src/mcp/tools/continueConversation/`                                     |
| dispatcher operations   | `src/dispatcher/{gemini,codex}/operations/*.ts`                                                               |
| operations 진입         | `src/dispatcher/operations/dispatchers.ts`                                                                    |
| config migration (core) | `src/core/configManager/operations/loadConfig.ts`                                                             |
| config migration (hook) | `src/hooks/shared/configTypes.ts`, `src/hooks/shared/loadConfig.ts` — 신규 필드 default fill (zod 없이)       |
| artifact 저장 정책      | `src/core/artifactWriter/` — raw prompt 와 prefix 포함 prompt 분리 저장 (감사용)                              |
| UI (HTML)               | `src/mcp/pages/settings/index.html`                                                                           |
| UI (JS)                 | `src/mcp/pages/settings/scripts/`                                                                             |
| UI (CSS)                | `src/mcp/pages/settings/styles/`                                                                              |
| 문서 (FCA 규칙)         | 영향 모듈 `INTENT.md` / `DETAIL.md` — 코드 변경 전 갱신                                                       |
| 테스트                  | unit (compose, level resolve), backward-compat (legacy config default merge), UI save, e2e (argv prefix 검증) |

## 구현 순서 제안

1. INTENT.md / DETAIL.md 갱신 (FCA: 코드 전)
2. schema (`src/types/config.ts`) + `DEFAULT_CONFIG` + `mergeWithDefaults`
3. 레벨 텍스트 상수 (`src/constants/recencyPrompts/`)
4. 합성 util (`composePrompt.ts`) + unit test
5. dispatch start (gemini `buildPromptArgs`, codex `buildStartArgs`) 합성 진입
6. dispatch resume (codex `buildResumeArgs`, gemini resume 케이스) 합성 진입 + 검증
7. MCP tool 합성 검증 (`startConversation`, `continueConversation` 양쪽)
8. config migration (core / hook 두 곳 동기)
9. artifact 저장 정책 (raw prompt 분리)
10. settings UI (HTML / JS / CSS)
11. E2E / 통합 / backward-compat 테스트

## 후속 검토 항목 (v2 backlog)

- **Per-call escape hatch** (예: `<bypass-recency>` 태그 또는 MCP
  파라미터): 현재는 `recency_factor=off` 전역 설정으로 충분. 사용 패턴
  관찰 후 결정.
- **레벨 텍스트 영어 locale split**: 필요 시 추가.
- **strict 레벨에서 모델 권고 자동 상향** (예: `auto` → `high` tier
  강제): v2 검토.
- **preamble textarea UI hint** (길이/포맷 가이드): UI 단계에서 결정.

## 리뷰 기록

v2 변경은 cogair `/crosscheck` 리뷰 결과를 반영. 양쪽 모두 지적한 12개
항목 수용. `recency_factor` 4단계 → 3단계 축소, 시간 민감 정보 범위
한정, 긍정문/도구 명시 호출, "2개 출처" 룰 완화, XML 태그 wrap, resume
경로 포함, DEFAULT_CONFIG / mergeWithDefaults / hook configTypes·
loadConfig 보완, artifact 분리 저장, timezone 명시, backward-compat /
UI save / e2e 검증.

리뷰 세션 (cogair session TTL 내):

- codex `08ae478e-229b-439c-9f33-610fca4691f8`
- gemini `0bec9ef9-a482-4aa7-b490-331b76b9e7bc`

사용자 판단으로 채택하지 않은 항목:

- **Gemini 한정 `.gemini/GEMINI.md` 동적 주입** — provider별 비대칭
  구현이 발생하고 "prompt prefix"라는 단일 mental model이 깨지는 비용이
  더 크다고 판단.
- **Per-call escape hatch v1 포함** — `recency_factor=off` 전역 설정으로
  사실상 escape 가능. 항상-on + 사용자 책임 모델과의 일관성 유지를 위해
  v2 backlog로 이동.
