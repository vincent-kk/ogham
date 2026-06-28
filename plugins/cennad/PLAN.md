# PLAN — cennad 프로바이더 개편: Gemini 제거 + Claude(Anthropic) 추가

이 문서는 사전 조사의 **결론**과 **단계별 개발 로드맵**이다. 구현자는 이 문서를 충실히 따른다.
배경 조사 과정·대안 비교는 생략하고, 확정된 사항과 실행 순서만 담는다.

## 0. 목표

1. **Gemini 프로바이더 완전 제거** — Gemini CLI 서비스 종료(2026-06-18). Google 라우팅을 antigravity 단독으로 통일. `gemini` 스킬·디스패처·설정·실행 코드 전부 제거.
2. **Claude 프로바이더 신규 추가** — claude-code CLI를 감싸는 새 프로바이더. 코드 키 `claude`, 설정 UI 표시명 **"Anthropic"**. 비율 라우팅 포함 전체 동등(full parity).

순서는 **Phase 1(제거) → Phase 2~5(추가)**. Phase 1 종료 시 2-프로바이더(codex/antigravity) 상태로 테스트 그린을 확보한 뒤 claude를 얹는다.

---

## 1. 확정 결정 (Decisions)

| #      | 결정                                                                                                                                                                                                    |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **D1** | 프로바이더 키 = `claude` (enum·config·디스패처·스킬 전부). 설정 UI 표시명만 **"Anthropic"** (회사 그룹핑; codex/Google 라벨 패턴과 동일).                                                               |
| **D2** | **전체 동등.** claude를 ratio/counter/keywords/훅 자동 라우팅에 포함. 훅·설정 UI를 2-슬롯(codex↔Google) → **3-레인(codex / Google / Anthropic)** 으로 개편.                                             |
| **D3** | **티어 = 티어별 `{model, effort}` 맵.** `model_map.claude = { high, mid, low }`, 각 티어가 모델 + effort를 독립 지정. UI는 모델 드롭다운 + (모델 종속) effort 드롭다운 2단. 자유입력 없음(오탈자 차단). |
| **D4** | **Gemini 완전 제거(legacy enum 잔존 없음).** 세션 TTL 72h ≪ EOL 후 경과일 → 디스크에 살아있는 gemini 세션 없음. 깨끗이 제거.                                                                            |
| **D5** | **claude 디스패처는 antigravity(modelMap 소비) + codex(단순 단일 JSON 파싱) 혼합 미러.** claude-code는 진짜 `session_id`를 반환 → cwd-격리 우회 불필요.                                                 |
| **D6** | **권한 = `permission_mode` 단일 노브(6종).** sandbox 개념 없음(claude-code엔 `--sandbox` 플래그 없음). `skip_permissions` 불리언 미사용(`bypassPermissions` 모드가 흡수).                               |
| **D7** | **격리 필수.** `--strict-mcp-config` 항상 + `--safe-mode` 기본. cennad가 Claude 세션 내부에서 claude를 호출하므로 부모 MCP/훅/CLAUDE.md 상속을 차단해야 함.                                             |

### 기본값 (DEFAULT_CONFIG)

```
ratio.claude        = { value: 50, enabled: true }      # codex/antigravity/claude 균등(3-way)
keywords.claude     = 'reasoning, writing, analysis, review'
option_flags.claude = { permission_mode: 'acceptEdits' }
model_map.claude    = { high:  { model: 'opus',   effort: 'max'  },
                        mid:   { model: 'opus',   effort: 'high' },
                        low:   { model: 'sonnet', effort: 'high' } }
default_tier.claude = 'mid'
preamble.claude     = ''
recency_factor.claude = 'off'
```

---

## 2. 반드시 알아야 할 제약 (Critical Constraints)

구현 중 어기면 회귀·데이터 손상으로 이어지는 항목.

1. **"gemini" 네임스페이스 2개 — 일괄 삭제 금지.**
   - 제거 대상: 프로바이더 `gemini` (Gemini CLI).
   - **보존 대상**: antigravity가 서빙하는 모델 패밀리 문자열 `'Gemini 3.1 Pro'` 등(`constants/defaults.ts` `model_map.antigravity`), agy 데이터 경로 **`AGY_HOME = ~/.gemini/antigravity-cli`**(`constants/paths.ts`), `agyModels` 테스트 픽스처(`gemini-pro` 등).
   - 삭제 전 항상 "프로바이더 gemini인가, 모델패밀리 Gemini인가" 구분.

2. **TypeScript가 못 잡는 2영역.** `PROVIDERS` enum 변경은 대부분의 누락을 컴파일 에러로 표면화하지만, 다음은 잡지 못함 — 수동 점검 필수:
   - **훅**(`src/hooks/**`): 공유 타입 없이 자체 타입 중복 선언(zod 금지). `configTypes.ts` 등 별도 갱신.
   - **설정 UI**(`index.html`/`scripts/app.js`): 수기 유지. 빌드/E2E로만 검증.

3. **재귀/격리.** cennad는 Claude Code 세션 안에서 `claude -p`를 호출 → 격리하지 않으면 자식이 부모의 MCP(특히 cennad 자신의 `tools` 서버)·훅·CLAUDE.md·스킬을 상속해 간섭·재귀. **항상 `--strict-mcp-config` + `--safe-mode`** (D7, §3).

4. **빌드 산출물은 AI가 수정하지 않는다.** `bridge/*.mjs`, `bridge/mcp-server.cjs`, `public/settings.html`은 소스에서 생성되는 커밋 대상. **AI는 `src/`·`skills/`·문서만 수정**하고, 빌드 및 산출물 커밋은 사용자가 수행.

5. **FCA 분해.** 새 `dispatcher/claude/`는 루트에 배럴(`index.ts`) + `INTENT.md`(≤50줄, 3-tier 경계) + `DETAIL.md`만. 로직은 `operations/`·`utils/` organ에 **함수 1개/파일**로 처음부터 분해(peer 파일 금지).

6. **CLI 호출은 `spawnCli`** (`@ogham/cross-platform`) 경유. `node:child_process` 직접 사용 금지.

7. **사용자 노출 텍스트 규칙.** `SKILL.md`는 영문, 업스트림 이슈번호·내부경로 금지. 주석 최소화. 커밋 co-author 미추가.

---

## 3. claude-code CLI 사양 (검증 완료 — v2.1.195)

### 호출

```
# start (새 대화)
claude -p <composedPrompt> --output-format json \
  --session-id <cennad sessionId> \
  --permission-mode <mode> --model <model> [--effort <effort>] \
  [--fallback-model <chain>] --strict-mcp-config --safe-mode [--mcp-config <json>]

# resume (이어가기)
claude -p <composedPrompt> --output-format json \
  --resume <externalSessionRef> \
  --permission-mode <mode> --model <model> [--effort <effort>] \
  --strict-mcp-config --safe-mode [--mcp-config <json>]
```

- **`--session-id`에 cennad가 생성한 sessionId(UUID)를 주입** → `externalSessionRef = sessionId`. 출력에서 session_id를 파싱·추적할 필요 없음.
- **출력 파싱**: `--output-format json` → 단일 JSON 객체. `result`→응답 텍스트. 비JSON/비정상 종료코드 → `errorMap` 정규화. (codex의 JSONL 스트리밍 파서보다 단순.)
- `composedPrompt`는 기존 `composePrompt`(preamble + recency)로 합성한 문자열을 `-p` 인자로 전달(다른 프로바이더와 동일).

### permission_mode (6종)

`default | acceptEdits | auto | dontAsk | plan | bypassPermissions`. `bypassPermissions` = `--dangerously-skip-permissions`. 기본 `acceptEdits`. **sandbox 플래그 없음** — 격리는 권한 기반.

### effort × model 상한 (`MODEL_EFFORT_SETS`)

effort 스케일: `low < medium < high < xhigh < max`. 모델별 지원 집합:

| 모델 별칭                              | effort 드롭다운 노출                         |
| -------------------------------------- | -------------------------------------------- |
| `opus` / `opus[1m]` / `fable` / `best` | low / medium / high / xhigh / max            |
| `sonnet` / `sonnet[1m]`                | low / medium / high / **max** (xhigh 건너뜀) |
| `haiku`                                | **없음** (effort 미지원 → 셀렉터 비활성)     |

- 상한 초과 요청은 claude-code가 **에러 없이 조용히 강등**(예: sonnet + xhigh → high). UI 제약은 사용자 오인 방지용.
- `opus` 별칭은 인증처 의존(API/AWS=xhigh 지원, Bedrock/Vertex=xhigh 건너뜀). UI는 넓은 집합 노출하되 강등이 안전망.
- **ultracode 제외**: `--effort` 값이 아님(별도 스웜 설정). 드롭다운/스키마에서 제외.

### 격리 플래그 (D7)

- `--strict-mcp-config`: `--mcp-config`로 명시한 서버만 로드(없으면 0개). 부모 MCP 상속 차단. **항상 부착.**
- `--safe-mode`: 커스터마이즈(CLAUDE.md/스킬/플러그인/훅/MCP) 비활성, **auth/model/권한은 정상** → OAuth/구독 사용자 안전. **기본 격리 모드.**
- `--bare`는 사용하지 않음(빠르지만 OAuth/keychain 미독 → 구독 사용자 인증 깨짐).

### 부재/주의

- `--max-turns`는 v2.1.195에 **없음**(과거 문서 기준 조사 교정).
- 모델 목록 동적 조회 서브커맨드 **없음**(`claude models` 부재) → 모델 별칭은 큐레이트 상수로 관리(§4 Phase 2.2).

---

## 4. 개발 로드맵 (Phase 0 → 5)

각 Phase는 끝에 **검증 게이트**를 통과해야 다음으로 진행한다.

### Phase 0 — 기준선

- [ ] 작업 브랜치 생성.
- [ ] `yarn cennad typecheck && yarn cennad test:run && yarn cennad test:e2e:run` 그린 확인(기준선).

### Phase 1 — Gemini 제거 (→ 2-프로바이더 안정화)

원칙: `PROVIDERS`에서 `gemini` 제거 후 TS 컴파일 에러를 따라가며 정리. 모델패밀리 "Gemini"/`~/.gemini` 보존(§2-1).

- [ ] **1.1 타입** — `conversation.ts` `PROVIDERS`에서 `'gemini'` 제거. `dispatch.ts`의 `GeminiFlagsSchema`/`GeminiSandboxBackendSchema`/`GeminiFlags` 삭제. `config.ts`의 gemini 키(Ratio/Keywords/OptionFlags/DefaultTier/Preamble/RecencyFactor) 제거 + **`ConfigSchema.superRefine` 상호배제 블록 삭제**(`ConfigSchema = ConfigObjectSchema`). `counter.ts`의 `gemini` 제거.
- [ ] **1.2 상수** — `defaults.ts` gemini 6개 키 제거(**`model_map.antigravity` 보존**). `paths.ts` `GEMINI_CWD_DIR`/`geminiCwdPath()` 제거(**`AGY_HOME`/`~/.gemini` 보존**). ratio 기본 enabled를 antigravity 활성으로.
- [ ] **1.3 코어** — `configManager/utils`: `mergeOptionFlags`/`mergeDefaultTier`/`mergePreamble`/`mergeRecencyFactor`에서 gemini 제거. `normalizeRatio`에서 gemini 제거 + **레거시 정수 ratio의 gemini 가중치를 antigravity 슬롯으로 이전**(사용자 분배 보존). `normalizeMutualExclusion.ts` **파일 삭제** + `mergeWithDefaults`의 import·호출 제거. `counterManager`(getCounter/incrementCounter) gemini 제거. `sessionStore/pruneExpired` gemini-cwd 분기 제거.
- [ ] **1.4 디스패처** — `dispatcher/gemini/**` 서브트리 전체 삭제. 레지스트리 3지점(`entities/dispatchers.ts`, `operations/dispatchers.ts`, `index.ts`)에서 gemini 제거.
- [ ] **1.5 MCP** — `startConversation`: gemini fallback `else` 제거(분기 명시화 — 미지 provider가 삭제된 디스패처로 흐르지 않게). `continueConversation`: gemini resume 분기 + 에러 문자열 제거. `createServer` 설명 prose 수정. `handleGetProviderStatus`: `checkExecutable('gemini')`·`gemini` 응답 필드 제거.
- [ ] **1.6 훅** — `configTypes.ts` gemini 미러 타입 제거. `activeGoogleEngine.ts`를 `'antigravity' | null`로 축소(함수는 유지). `pickRatio`/`pickKeywords`/`pickOptionFlags`/`pickPreamble`/`pickRecencyFactor` gemini picker 제거. `injectDynamic/utils/loadCounter.ts` gemini 카운트 제거. injectStatic/Dynamic의 `'gemini/antigravity'` 폴백 문자열 단순화.
- [ ] **1.7 스킬** — `skills/gemini/SKILL.md` 삭제. `crosscheck/SKILL.md`를 antigravity 고정(`<google>` 간접화·상호배제·`gemini auth login` 제거). `codex/SKILL.md`·`antigravity/SKILL.md`의 gemini 언급 정리(모델패밀리 "Gemini"는 보존).
- [ ] **1.8 UI 소스** — `index.html`: Google 엔진 라디오·gemini 토글/퍼센트/advanced 패널/EOL 경고 제거, "Google 슬롯"을 antigravity 단독화. `app.js`: `DEFAULT_GOOGLE_ENGINE`/`GOOGLE_ENGINES`/`GEMINI_BACKENDS`·googleEngine 매핑 제거 → `ratio.antigravity` 직접 기록.
- [ ] **1.9 테스트** — gemini 전용 삭제(`dispatcher/gemini/__tests__`, `normalizeMutualExclusion.test`). 멀티프로바이더 테스트에서 gemini arm 편집. **E2E fake provider**(`fakeProviderScripts`/`installFakeProviders`)의 gemini 가짜 CLI를 antigravity 가짜로 재지정, config 픽스처 재작성. **`agyModels` 테스트 fixture의 gemini 문자열은 보존.**
- [ ] **1.10 문서** — `plugin.json`/`package.json` 설명·키워드, `CLAUDE.md`(Gemini sandbox 불릿 삭제 등), `INTENT.md` 체인, `README.md`/`README-ko_kr.md`(Delegating to Gemini 섹션 삭제), `.metadata/cennad/*`.
- **검증 게이트**: `typecheck` + `test:run` + `test:e2e:run` 그린. `/filid:scan` 신규 위반 없음.

### Phase 2 — Claude 타입 · 상수 · 코어 · 디스패처

- [ ] **2.1 타입** — `conversation.ts` `PROVIDERS`에 `'claude'`. `dispatch.ts`:
      `ts
  ClaudePermissionModeSchema = z.enum(['default','acceptEdits','auto','dontAsk','plan','bypassPermissions'])
  ClaudeFlagsSchema = z.object({ permission_mode: ClaudePermissionModeSchema, fallback_model: z.string().optional() })
  ClaudeEffortSchema = z.enum(['low','medium','high','xhigh','max'])
  ClaudeTierConfigSchema = z.object({ model: z.string(), effort: ClaudeEffortSchema.optional() })
  ClaudeModelMapSchema = z.object({ high: ClaudeTierConfigSchema, mid: ClaudeTierConfigSchema, low: ClaudeTierConfigSchema })
  `
      `config.ts`: claude 키 추가(Ratio/Keywords/OptionFlags/DefaultTier/Preamble/RecencyFactor). **`ModelMapSchema`에 `claude: ClaudeModelMapSchema` 추가**(antigravity는 기존 `TierModelMapSchema` 문자열 맵 유지). `counter.ts`에 `claude`. **sandbox 필드 추가 금지(D6).**
- [ ] **2.2 상수** — `defaults.ts`에 claude 블록(§1 기본값). 신규 상수: `CLAUDE_MODEL_ALIASES = ['opus','sonnet','haiku','fable','best','opus[1m]','sonnet[1m]']`, `CLAUDE_EFFORT_LEVELS`, **`MODEL_EFFORT_SETS`**(§3 상한표). `paths.ts`는 변경 없음(cwd-격리 불필요).
- [ ] **2.3 코어** — `configManager/utils`의 merge 함수들 + `normalizeRatio`에 claude. **`mergeModelMap`에 claude 딥머지**(`{model,effort}` 구조). `counterManager`에 claude.
- [ ] **2.4 디스패처** — 신규 `src/dispatcher/claude/`: - `index.ts`(배럴), `INTENT.md`, `DETAIL.md`. - `operations/claudeDispatcher.ts` — `Dispatcher<ClaudeFlags>`(start/resume, `supportedOptions=new Set()`). `resolveClaudeTier(tier, modelMap)` → `{model, effort}` → spawn. - `operations/resolveTier.ts` — `{ model: env['CENNAD_CLAUDE_'+TIER+'_MODEL'] ?? modelMap[tier].model, effort: env['CENNAD_CLAUDE_'+TIER+'_EFFORT'] ?? modelMap[tier].effort }`. effort `undefined`면 `--effort` 미부착. - `operations/spawn.ts` — `spawnCli('claude', argv, …)`. - `utils/buildStartArgs.ts` / `utils/buildResumeArgs.ts` — §3 호출 인자(`--session-id`/`--model`/`--effort`/`--permission-mode`/`--fallback-model`/격리). - `utils/parseResult.ts` — 단일 JSON 파싱(`result`→response). - 레지스트리 3지점 등록.
- **검증 게이트**: `typecheck` 그린. claude 디스패처 단위 테스트(buildArgs/resolveTier/parseResult/integration with fake CLI) 통과.

### Phase 3 — MCP 라우팅 + 훅 3-레인

- [ ] **3.1 MCP** — `startConversation` 분기에 `else if claude`(flags: `option_flags.claude`, modelMap: `model_map.claude`) 추가, gemini fallback 자리 명시 에러화. `continueConversation`에 claude resume arm. `createServer` 설명에 claude.
- [ ] **3.2 훅** — `configTypes.ts`에 claude(Ratio/OptionFlags/Preamble/RecencyFactor/keywords/HookCounter + `ClaudeFlags`). pickers에 claude(`pickClaude` 포함). `loadCounter` claude. **`injectStatic`/`injectDynamic`/`formatRatio`를 2-레인 → 3-레인(N-way)으로 일반화.**
- **검증 게이트**: `typecheck` 그린. **훅 번들 10KB LIGHT cap 통과**(`scripts/buildHooks.mjs` 가드 — 의존성 추가 없이 로직만). 훅 단위 테스트 통과.

### Phase 4 — 설정 UI (3-레인 + Anthropic)

- [ ] **4.1 index.html** — codex / Google(antigravity 단독) + **신규 Anthropic 행**(`data-provider="claude"`, `<span class="provider-name">Anthropic</span>`). **단일 이진 슬라이더(codex↔Google) → 3-way 가중 컨트롤**(provider별 enable 토글 + value, 정규화 표시). claude advanced: `default_tier.claude` 라디오 + **티어별 2단 드롭다운**(모델 select + 모델 종속 effort select; haiku면 effort 비활성).
- [ ] **4.2 app.js** — `DEFAULT_*`/`providerAvailable`/DOM refs/`buildConfig`/`buildOptionFlags`/`buildModelMap`(`{model,effort}`)/`applyConfig`/`buildSummaryChips`/`renderRatio`(3-way)/`toggleProvider`/provider-status에 claude. **신규 `bindClaudeEffortOptions(tier, model)`**: 모델 변경 시 `MODEL_EFFORT_SETS[model]`로 effort 옵션 재구성(집합 밖 값은 클램프; haiku 비활성).
- [ ] **4.3 handleGetProviderStatus** — `checkExecutable('claude')` + `claude` 필드(모델 목록 없음 → `claudeModels` 불필요).
- **검증 게이트**: open-settings E2E + 수동 UI 확인(3-레인 저장/로드, effort 종속 드롭다운). **`public/settings.html` 등 빌드 산출물은 사용자가 빌드/커밋.**

### Phase 5 — 스킬 · 문서 · 마무리

- [ ] **5.1 스킬** — `skills/claude/SKILL.md`(codex 미러; `name: claude`, 영문, 트리거/argument-hint/Call mapping/Tier 표/실패 dispatch). 이슈번호·내부경로 금지.
- [ ] **5.2 문서** — `plugin.json`/`package.json`, `CLAUDE.md`(아키텍처·Tier), `README.md`/`README-ko_kr.md`(Delegating to Claude 섹션; 영/한 파일 분리), `.metadata/cennad/*`, 신규 `dispatcher/claude/INTENT.md`. README에 버전 숫자 금지.
- [ ] **5.3 검증** — `typecheck` + `test:run` + `test:e2e:run` 그린. `/filid:scan` 위반 없음. (선택) `CENNAD_E2E_REAL_CLI=1`로 real CLI 호출.
- [ ] **5.4 빌드/커밋** — 사용자가 `yarn cennad build` 실행 후 `bridge/*`·`public/settings.html` 포함 커밋.

---

## 5. v1 이후로 미루는 항목 (Deferred)

전체 동등 핵심에는 불필요하거나 범위가 커서 후속으로 분리.

- **도구 스코프 노출** — `--allowedTools`/`--disallowedTools`/`--tools`(읽기전용 리서치 모드 등). v1 미노출.
- **비용 가드** — `--max-budget-usd` config 노브화. v1 미노출.
- **YouTube 애드온 claude 타깃** — `--mcp-config`로 yt-dlp 주입 가능하나 provisioning 방식이 provider별로 달라 분리. v1 보류.
- **Anthropic `/v1/models` 동적 모델 목록** — 인증/네트워크 정책 부담으로 제외. 별칭 큐레이트 상수로 충분.

---

## 6. 전역 검증 게이트 (완료 정의)

- `yarn cennad typecheck` — 에러 0.
- `yarn cennad test:run` — 전체 그린.
- `yarn cennad test:e2e:run` — 전체 그린.
- `/filid:scan` — 신규 위반 0.
- 훅 번들 10KB LIGHT cap 통과.
- 설정 UI: 3-레인 + claude 모델/effort 종속 드롭다운 동작(수동 확인).
- 빌드 산출물은 사용자 커밋(AI 미수정).
