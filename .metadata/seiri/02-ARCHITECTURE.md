# 02 — 아키텍처

**seiri는 filid와 같은 4계층 풀스택 플러그인입니다.** Hook · MCP · Skill · (Agent 없음). filid 구조를 기반으로 하되, AST·메트릭 계층 없이 **규칙 배포와 상태 관리**만 갖습니다.

---

# 1. 전달 경로 — 두 갈래

seiri가 모델에게 무언가를 전달하는 경로는 둘이며, **나르는 것이 다릅니다.**

```
  templates/rules/seiri_*.md
            │
            │ ① MCP: rule_docs_sync (사용자 확인 후)
            ▼
  <프로젝트>/.claude/rules/seiri_*.md
            │
            │ 하니스가 세션 시작 시 자동 로드
            ▼
  ┌────────────────┐   ◄─── ② SessionStart 훅: bridge/setup.mjs
  │  모델 컨텍스트  │        (활성 규칙 목록 · 다이얼 · 드리프트 경고, ~5줄)
  └────────────────┘
```

| 경로            | 나르는 것                 | 주체                               |
| --------------- | ------------------------- | ---------------------------------- |
| **① 규칙 본문** | 규칙 전문 (파일)          | 배포는 MCP 도구, **로드는 하니스** |
| **② 상태 요약** | 활성 규칙 · 다이얼 · 경고 | **seiri 훅**                       |

## 왜 둘로 나누는가

**규칙 본문을 훅으로 주입하면 이중 비용입니다.** `.claude/rules/*.md`는 하니스가 이미 자동 로드하므로(§5), 훅이 같은 내용을 또 넣으면 컨텍스트를 두 번 씁니다.

훅이 나르는 것은 **파일이 스스로 말할 수 없는 것**입니다 — 어떤 규칙이 지금 활성인지, 다이얼이 어디 있는지, 로컬 편집 드리프트가 있는지.

filid `src/hooks/userPromptSubmit`가 같은 원칙을 명시합니다 — _"배포된 규칙 문서는 하니스가 자동 주입하므로, 이 모듈은 그 내용을 복제해서는 안 되고 위치만 가리킨다."_

## 선택(배포)의 경로

```
사용자 ─► /seiri:setup ─► MCP: open_settings ─► 설정 UI (체크박스)
                                                      │
                                                      ▼
                                          MCP: rule_docs_sync
                                          diff 제시 → 확인 → 쓰기/삭제
                                                      │
                                                      ▼
                                    <프로젝트>/.claude/rules/seiri_*.md
```

filid의 `/filid:setup` → `open_settings` → `rule_docs_sync` 경로를 그대로 계승합니다. **훅은 배포에 관여하지 않습니다.**

---

# 2. 저장소 구조

## 계층 (filid 4계층 중 3계층)

| 계층      | seiri                                   | 비고                                        |
| --------- | --------------------------------------- | ------------------------------------------- |
| **Hook**  | 2개 — SessionStart · InstructionsLoaded | filid는 4개. **차단 훅 없음**(P2)           |
| **MCP**   | 도구 2~3개                              | filid는 15개+. 코드 분석 도구 없음          |
| **Skill** | 11개 — 호출 4 · 자동 7 (§3 스킬 지도)   | 호출형 상시 비용 0, 자동형 description만    |
| **Agent** | **없음**                                | 리뷰는 filid 소관, 오케스트레이션은 역할 밖 |

## 레이아웃

`✅` = 초기화 커밋(`25f8bd0e`)에서 이미 생성됨

```
plugins/seiri/
├── .claude-plugin/
│   └── plugin.json              # name·version·skills: "./skills/"·mcpServers: "./.mcp.json"
├── .mcp.json                    ✅ tools → bridge/mcp-server.cjs
├── .gitignore ✅ .prettierrc ✅ .prettierignore ✅
├── INTENT.md                    # ≤50줄, 3-tier 경계 — 역할 밖 목록 반영
├── DETAIL.md                    # 계약·수용 기준
├── README.md · README-ko_kr.md
├── package.json                 ✅ 빌드 4단계 + 의존성
├── tsconfig.json ✅ tsconfig.build.json ✅
├── vitest.config.ts ✅ playwright.config.ts ✅
│
├── libs/run.cjs                 ✅ 훅 러너 (공용)
│
├── hooks/
│   ├── hooks.json               # SessionStart · InstructionsLoaded 등록
│   └── INTENT.md
│
├── scripts/
│   ├── sync-rule-hashes.mjs     # templates/rules/*.md → manifest templateHash
│   ├── build-settings-html.mjs  # 설정 UI 인라인 번들
│   ├── build-mcp-server.mjs     # esbuild → bridge/mcp-server.cjs (CJS)
│   └── build-hooks.mjs          # esbuild → bridge/*.mjs (ESM)
│
├── src/
│   ├── index.ts                 # 순수 배럴 (named re-export만)
│   ├── INTENT.md
│   ├── version.ts               ✅ 자동 생성
│   ├── types/                   # manifest · config · state 타입
│   ├── constants/
│   ├── core/
│   │   ├── INTENT.md
│   │   ├── utils/               # findRepoRoot · computeFileSha256 · writeAtomically
│   │   ├── infra/
│   │   │   └── configLoader/    # .seiri/config.json — 다이얼 하나
│   │   └── ruleDocs/            # 매니페스트 · 상태 · plan/apply · 드리프트 판정
│   ├── mcp/
│   │   ├── INTENT.md
│   │   ├── server/              # MCP 서버 조립
│   │   ├── serverEntry/         # 진입점
│   │   ├── pages/settings/      # 설정 UI 소스
│   │   └── tools/
│   │       ├── openSettings/    # 설정 UI 열기 (+ webServer/)
│   │       └── ruleDocsSync/    # 배포·제거 실행
│   ├── hooks/
│   │   ├── INTENT.md
│   │   ├── shared/              # stdin 파싱·출력 계약
│   │   ├── setup/               # SessionStart — 상태 요약 주입
│   │   └── instructionsLoaded/  # 로드 관측 (주입 없음)
│   └── __tests__/
│
├── bridge/                      # 빌드 산출물 — **커밋됨**
│   ├── mcp-server.cjs
│   ├── setup.mjs
│   └── instructions-loaded.mjs
│
├── public/
│   └── settings.html            # build-settings-html.mjs 산출물
│
├── templates/
│   ├── INTENT.md
│   ├── rules/
│   │   ├── manifest.json        # SSoT
│   │   └── seiri_*.md           # 배포 규칙 (정본)
│   └── gates/                   # placeholder 골격 (값 없음)
│
├── skills/                      # 호출 4 · 자동 7 — 지도는 §3
│   ├── setup/ · brainstorm/ · interview/ · finish/        # 호출 전용 (상시 0)
│   └── trace-cause/ · write-plan/ · execute/ · implement/ · verify-done/
│       · request-review/ · receive-review/                # 자동 (description만)
│
└── e2e/                         # 설정 UI Playwright
```

## FCA 자기적용 — seiri는 filid의 규칙을 지킨다

filid는 자기 자신에게 FCA를 적용합니다 — `src/mcp/tools/<도구>/INTENT.md`까지 모든 fractal에 INTENT.md가 있습니다(실측 80여 개).

**seiri도 같은 규율을 따릅니다.** 이것은 형식적 준수가 아니라 두 플러그인의 위계가 실물에서 성립하는지 보는 시험대입니다 — filid가 seiri의 구조를 강제하고, seiri가 filid의 규칙 원칙을 제공합니다.

| 규약                    | 내용                                                      |
| ----------------------- | --------------------------------------------------------- |
| fractal마다 `INTENT.md` | ≤50줄, 3-tier(Always do / Ask first / Never do)           |
| 진입점                  | `index.ts` 순수 배럴 — named re-export만, `export *` 금지 |
| organ 디렉토리          | `types/` · `constants/` 등은 INTENT.md 없음               |
| 도구·훅 하나당 디렉토리 | `src/mcp/tools/ruleDocsSync/` · `src/hooks/setup/`        |

## 매니페스트

`.claude-plugin/plugin.json` (filid 형식):

```json
{
  "name": "seiri",
  "version": "0.0.1",
  "description": "Code authoring quality, review discipline, and development methodology rules for agent-legible codebases",
  "author": { "name": "Vincent K. Kelvin" },
  "repository": "https://github.com/vincent-kk/ogham",
  "homepage": "https://github.com/vincent-kk/ogham/tree/main/plugins/seiri",
  "license": "MIT",
  "keywords": [
    "claude-code",
    "plugin",
    "code-quality",
    "agent-legible",
    "rules"
  ],
  "skills": "./skills/",
  "mcpServers": "./.mcp.json"
}
```

**`agents` 필드를 넣지 않습니다** — seiri는 에이전트를 갖지 않습니다. `src/__tests__/wiring.test.ts` 가 이를 기계 검사합니다.

## 빌드 파이프라인

```
yarn build
  ├─ clean                    rm -rf bridge
  ├─ version:sync             package.json → src/version.ts
  ├─ sync-rule-hashes.mjs     templates/rules/*.md → manifest.json templateHash
  ├─ build-settings-html.mjs  src/mcp/pages/settings → public/settings.html
  ├─ tsc -p tsconfig.build.json
  ├─ build-mcp-server.mjs     → bridge/mcp-server.cjs (CJS)
  └─ build-hooks.mjs          → bridge/*.mjs (ESM)

yarn build:plugin             # 번들만 재생성 (tsc 없이)
```

**`bridge/`는 빌드 산출물이지만 커밋합니다.** `.gitignore`에 `dist/`만 있고 `bridge/`가 없는 이유입니다 — `/plugin install` 직후 빌드 없이 동작해야 합니다(filid ADR-2와 동일).

**`sync-rule-hashes.mjs`가 핵심입니다.** 규칙 파일을 고치면 해시가 자동 갱신되므로 manifest와 실제 파일이 어긋날 수 없습니다. 손으로 해시를 관리하지 않습니다.

## 명명 규약

| 대상          | 규약                                                                                |
| ------------- | ----------------------------------------------------------------------------------- |
| 규칙 파일     | `seiri_<slug>.md` — 다중 플러그인이 `.claude/rules/`를 공유하므로 네임스페이싱 필수 |
| 스킬 커맨드   | `/seiri:<name>`                                                                     |
| manifest id   | `seiri_<slug>`                                                                      |
| 훅 진입점     | `bridge/<kebab-case>.mjs` — filid 규약(`setup.mjs`·`pre-tool-use.mjs`)              |
| 소스 디렉토리 | camelCase — filid 규약(`ruleDocsSync/`·`configLoader/`)                             |
| 파일명 변경   | `legacyFilename` 필드                                                               |

## 규모 목표

| 항목                      | 목표                      | 근거                               |
| ------------------------- | ------------------------- | ---------------------------------- |
| **상시 주입**             | 훅 렌더 **~5줄**          | 규칙 본문은 하니스 몫              |
| **MCP 도구**              | **3개 이하**              | 스키마가 상시 컨텍스트 비용        |
| **훅**                    | **2개**                   | filid는 4개. 차단 훅 없음          |
| 규칙                      | 5~9개, 각 **200줄 미만**  | 공식: 초과 시 _"reduce adherence"_ |
| 스킬                      | 각 ≤2KB                   | SKILL.md만 — 깊은 절차는 호출형의 `references/`로(상시 0). 선례의 1,214줄이 반면교사     |
| **자동 스킬 description** | 훅 렌더와 합쳐 상시 ≤60줄 | 자동형만 매 세션 상주 — 호출형은 0 |
| `src/` 줄 수              | **제한 없음**             | 아래 참조 — 2026-07-23 폐지        |
| 에이전트                  | **0개**                   |                                    |
| 설치 경로                 | `/plugin install` 하나    |                                    |

**초과 시 대응**: 기능을 덜어냅니다. 코드가 목표를 넘는다는 것은 seiri가 소유하지 않아야 할 것을 소유하고 있다는 신호입니다(역할 밖 목록 재적용).

**`src/` 줄 수 상한은 폐지되었습니다** (2026-07-23, 사용자 결정). 원안은 ≤1,500줄이었고 실측은 2,199줄(테스트 제외, 설정 UI 자산 919줄 별도)입니다.

폐지 근거: 이 표의 나머지 항목은 전부 **상시 컨텍스트 비용**을 재는데, `src/` 줄 수만은 그렇지 않습니다. 도구 스키마·훅 렌더·스킬 description 은 매 세션 모델이 지불하지만, `src/` 는 esbuild 번들로만 존재하고 모델 컨텍스트에 들어가지 않습니다. 줄 수가 실제로 위험한 지점은 이미 별도 게이트가 지킵니다 — 훅 번들 바이트 캡, 스킬 2KB, 규칙 200줄. 대형화(R4)의 진짜 신호는 코드량이 아니라 **도구·훅·에이전트 개수와 역할 밖 목록 위반**이고, 그 셋은 위 표에 그대로 남습니다.

---

# 3. 콘텐츠 5상태

콘텐츠는 5가지 상태로 존재할 수 있고, 상태마다 **상시 컨텍스트 비용**과 **질문 권한**이 다릅니다.

| #   | 상태                 | 구현                                          | 상시 비용                    | 질문·멈춤 |
| --- | -------------------- | --------------------------------------------- | ---------------------------- | --------- |
| 1   | **무조건 규칙**      | `.claude/rules/seiri_*.md` (frontmatter 없음) | **전문**                     | —         |
| 2   | **조건부 규칙**      | 규칙 `paths:` glob                            | 매칭 파일 읽을 때            | —         |
| 3   | **자동 스킬**        | 기본 / `user-invocable: false`                | **description만**            | **금지**  |
| 4   | **조건부 자동 스킬** | 스킬 `paths:` glob                            | description만                | **금지**  |
| 5   | **호출 스킬**        | `disable-model-invocation: true`              | **0 — description조차 없음** | **허용**  |

**5번의 함의**: 사용자 전용 도구(브레인스토밍·인터뷰)는 상시 예산을 전혀 잠식하지 않습니다. 호출 스킬은 개수 제약을 완화합니다.

## 발동 주체가 질문 권한을 결정한다

> **문제는 질문이 아니라 초대받지 않은 질문입니다.**

| 상태       | 계약                                                                                         | 강제 수단                                     |
| ---------- | -------------------------------------------------------------------------------------------- | --------------------------------------------- |
| 자동 (3·4) | _"자동 발동되었다. 질문하지 않는다. 판단이 필요하면 보수적 기본값을 택하고 한 줄로 알린다."_ | `disallowed-tools: AskUserQuestion` (턴 단위) |
| 호출 (5)   | _"필요한 만큼 질문한다. 사용자가 그만 물으라 하면 산출물만 남기고 멈춘다."_                  | 거부권 조항                                   |

## 규칙과 스킬의 경계

|         | 규칙                | 스킬          |
| ------- | ------------------- | ------------- |
| 담는 것 | **판정 기준**(what) | **절차**(how) |
| 로드    | 상시 또는 경로 매칭 | 호출 시       |

참조는 **규칙 → 스킬 단방향**, 이름으로만 합니다(`@` 링크는 강제 로드).

## 스킬 지도 — 작업 주기의 순간들 (2026-07-23 확장)

seiri는 superpowers의 **대체재**입니다(원장 §0). 대체가 성립하려면 형식 규칙만이
아니라 sp가 덮던 **작업 주기의 순간들**을 스킬로 덮어야 합니다 — 이것이 4종→11종
확장의 근거입니다.

| 순간             | 스킬           | 상태   |
| ---------------- | -------------- | ------ |
| 설계를 다듬을 때 | brainstorm     | 5 호출 |
| 요구를 스펙으로  | interview      | 5 호출 |
| 다단계 작업 전   | write-plan     | 3 자동 |
| 계획 수행        | execute        | 3 자동 |
| 변경 구현 직전   | implement      | 3 자동 |
| 실패 발생        | trace-cause    | 3 자동 |
| 완료 선언 직전   | verify-done    | 3 자동 |
| 머지·핸드오프 전 | request-review | 3 자동 |
| 피드백 수신      | receive-review | 3 자동 |
| 통합 결정        | finish         | 5 호출 |
| 규칙 배포        | setup          | 5 호출 |

**할당 원리** — 절차(how)는 스킬로 가되, 셋을 가릅니다:

- **연속 구속**(모든 코드 줄에 성립 — naming·structure 류)은 **규칙**. 로드할 "순간"이 없습니다.
- **순간 구속 + 모델이 순간을 자기 인지**(실패 발생, 완료 선언 직전)는 **자동 스킬**.
- **순간 구속 + 인지 부재가 곧 실패 원인**(reuse-first — 재사용을 확인할 생각 자체를
  안 하는 실패)은 **규칙에 남습니다**. 스킬 디스패치는 그 인지에 베팅하는 장치라,
  옮기면 실패가 곧 미발화가 됩니다.

**체이닝**: 각 스킬 말미의 `Hand off` 줄이 다음 순간의 스킬을 **제안**합니다
(brainstorm→write-plan/implement · write-plan→execute · implement→verify-done · trace-cause→verify-done ·
verify-done→request-review/finish · receive-review→verify-done). sp의 terminal state 봉쇄
_"The ONLY skill you invoke…"_ 는 가져오지 않습니다 — 타 플러그인과의 공존을 깨고,
판단을 몰수합니다(P2).

**sp에서 가져오지 않는 것**: 강압 부트스트랩(_"1% 확률이면 무조건"_, Red Flags 상시
주입 — 판단 몰수이자 하니스 디스패치 능력의 대체 장치라 감가 대상, P1) · 서브에이전트
오케스트레이션 기계(역할 밖 — execute는 파일 핸드오프·이력 붙여넣기 금지 같은 위임
위생만 말합니다) · worktree 스킬(하니스 내장, §8).

**베팅(검증 대상)**: 강압 부트스트랩 없이 description 트리거 + 체이닝만으로 자동
스킬이 제 순간에 발화합니다. **틀렸다는 신호**: 디스패치 micro-test 발화율이 대조군
수준 — 그때의 처방은 SessionStart 렌더의 비강압 안내 1줄이며(강압 문구가 아니라),
Phase 0이 측정합니다(TODO D7).

## 호출 스킬의 깊이 — `references/` (2026-07-24)

**brainstorm·interview는 호출형이라 상시 비용이 0입니다**(5상태 ⑤). SKILL.md는
뼈대(≤2KB)로 두고, 절차 상세를 같은 디렉토리의 `references/`로 분리합니다 — 사용자가
부를 때만 로드되므로 깊이를 담아도 세션 예산을 잠식하지 않습니다.

담는 것은 omc `deep-interview`·sp `brainstorming`의 **절차적 지혜**를 seiri 형태로
이식한 것입니다 — 명확도의 차원 분해와 가장 약한 차원 조준(interview), 구별되는 형태
도출과 고립 설계·자가점검(brainstorm). **가져오지 않는 것**: omc의 모호도 점수(0.0~1.0)와
threshold 게이트입니다 — 판단을 수치로 대체하는 capability 대체라 P1 감가 대상이고, 그
_역할_만 관측 가능한 술어로 남깁니다(점수 대신 _"한 문장으로 말 못 함"_, 수렴 임계 대신
_"핵심 명사가 두 라운드 불변"_). 수치를 뺀 것은 정확성 손실이 아니라 헌법 정합입니다(A4
하방 개방·임계 비보유).

`references/`는 SKILL.md 2KB 캡의 대상이 아닙니다 — `size.test.ts`는 스킬 디렉토리의
`SKILL.md` 바이트만 재고 `references/`는 세지 않습니다. **이 둘만 `references/`를 갖는
것은 불일치가 아니라, 호출형의 상시 비용이 0이라는 사실의 활용입니다.**

---

# 4. 런타임

## 훅 2개

`hooks/hooks.json` — filid 형식(`libs/run.cjs`를 통해 `bridge/*.mjs` 실행):

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PLUGIN_ROOT}/libs/run.cjs\" \"${CLAUDE_PLUGIN_ROOT}/bridge/setup.mjs\"",
            "timeout": 10
          }
        ]
      }
    ],
    "InstructionsLoaded": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PLUGIN_ROOT}/libs/run.cjs\" \"${CLAUDE_PLUGIN_ROOT}/bridge/instructions-loaded.mjs\"",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

| 이벤트                 | 진입점                           | 역할                               | 출력                     |
| ---------------------- | -------------------------------- | ---------------------------------- | ------------------------ |
| **SessionStart**       | `bridge/setup.mjs`               | 활성 규칙 · 다이얼 · 드리프트 경고 | `additionalContext` ~5줄 |
| **InstructionsLoaded** | `bridge/instructions-loaded.mjs` | 어떤 지시 파일이 로드됐는지 기록   | **없음** (측정 전용)     |

**차단 훅 없음.** `PreToolUse`·`Stop`을 쓰지 않습니다 — 진실 소유는 저장소 몫(P2).
**UserPromptSubmit도 없습니다.** 매 프롬프트 실행은 지연을 낳고, 상태는 세션 중 거의 바뀌지 않습니다.

### 주입 렌더 (SessionStart)

```
[seiri] Active rules: agent-legible, public-contract, test-validity (3/9) — .claude/rules/
[seiri] Intervention: advisory
```

드리프트가 있으면 한 줄 추가. **규칙 내용은 절대 복제하지 않습니다.**
훅 실패 시 **무주입으로 안전 폴백** — 세션을 막지 않습니다.

### InstructionsLoaded — 효능 측정

seiri가 **자기 효능에 대한 오라클**을 갖는 유일한 공식 경로입니다.

> P2에 따라 코드의 진실은 저장소가 소유하지만, **seiri 자신이 작동하는지에 대한 진실은 seiri가 측정해야 합니다.**

## MCP — 상태기계, 도구상자 아님

### 상태 3종

| 상태            | 내용                              | 담당                      |
| --------------- | --------------------------------- | ------------------------- |
| **설정**        | 활성 규칙 선택 · 개입 강도 · 언어 | `core/infra/configLoader` |
| **배포 상태**   | 배포된 규칙 + templateHash 대조   | `core/rules/hashCompare`  |
| **세션 플래그** | 주입 1회 완료 여부                | `core/infra/cacheManager` |

**상태 키는 저장소 신원 + 워크트리로 분리합니다**(`core/infra/projectHash`) — 같은 저장소의 워크트리 두 개가 동시 세션을 열어도 섞이지 않아야 합니다.

### 도구 3개 이하

| 도구                | 역할                              | filid 대응     |
| ------------------- | --------------------------------- | -------------- |
| `open_settings`     | 설정 UI 열기                      | `openSettings` |
| `rule_docs_sync`    | 선택 반영 — diff 제시 → 배포·제거 | `ruleDocsSync` |
| (선택) `config_get` | 다이얼·활성 규칙 조회             | —              |

**코드 분석·검색 도구는 두지 않습니다** — 하니스가 이미 갖고 있습니다. 도구 추가는 규모 목표를 넘기는 결정입니다.

## 다이얼

`advisory`(기본) / `standard` / `strict`. **주입 렌더만 바꾸고 배포된 규칙 문서는 바꾸지 않습니다** — 문서를 바꾸면 templateHash 드리프트 감지와 충돌합니다.

| 축                   | advisory           | standard             | strict           |
| -------------------- | ------------------ | -------------------- | ---------------- |
| 주입 블록            | Active rules 한 줄 | 기본 (규칙 + 다이얼) | 기본 + 선택 블록 |
| 자동 스킬 발동 폭    | 최소               | 기본                 | 넓게             |
| 게이트 스캐폴드 권유 | 안 함              | 제안                 | 적극 제안        |

---

# 5. 규칙 로드 — 하니스의 동작 (실측 확정)

**seiri가 구현하는 것이 아니라, seiri가 의존하는 사실입니다.**

| 형태             | 로드 시점                                                 |
| ---------------- | --------------------------------------------------------- |
| frontmatter 없음 | **세션 시작 무조건**, `.claude/CLAUDE.md`와 동일 우선순위 |
| `paths:` 있음    | 매칭 파일을 **읽을 때**                                   |

- 우선순위: 사용자 규칙(`~/.claude/rules/`) → 프로젝트 규칙 → **프로젝트 우선**
- 재귀 발견 · 심볼릭 링크 · `claudeMdExcludes` 제외 지원
- **`paths:`는 경로 glob만** — "커밋 대상이면"은 표현 불가. 커밋 시점 검증은 저장소 git hook·CI로 위임(P2 정합)

**v1은 전부 무조건 로드**로 두고, 총량이 예산을 넘으면 조건부를 도입합니다.

> 검증: `/context`의 **Memory files**에 배포된 규칙이 나타나는지로 확인합니다.

---

# 6. 배포

## manifest.json — SSoT

| 필드                    | 용도                                  |
| ----------------------- | ------------------------------------- |
| `id`                    | `seiri_<slug>`                        |
| `filename`              | 소스이자 배포 대상 basename           |
| `legacyFilename`        | 파일명 변경 시 구 이름                |
| `required`              | **전부 `false`**                      |
| `title` · `description` | 설정 UI 체크박스 라벨·설명            |
| `templateHash`          | `sync-rule-hashes.mjs`가 빌드 시 갱신 |

## 동기화 계약

| 요소             | 내용                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------ |
| 쓰기 조건        | **사용자가 설정 UI에서 확인한 후에만**                                               |
| **주입 전 diff** | 무엇이 쓰이는지 먼저 보여줍니다 (filid에 없는 보강)                                  |
| 제거             | 체크 해제 시 파일 삭제                                                               |
| 드리프트         | `templateHash` 불일치 시 재동기화 여부를 묻습니다 — 로컬 편집을 임의로 덮지 않습니다 |
| 실패             | 부분 실패 시 무엇이 쓰였고 무엇이 실패했는지 보고. **조용한 실패 금지**              |

## required 정책

**전부 opt-in.** 다이얼 기본값(advisory)과 정합하고 무차별 적용을 피합니다. 설정 UI가 **권장 세트**를 기본 체크로 제시합니다 — `agent-legible` · `public-contract` · `test-validity`.

---

# 7. 자기검증 — `rule-lint`

**헌법이 문서로만 있으면 드리프트합니다.** 기계 검사로 고정합니다.

| 검사          | 규칙                                                                                                            |
| ------------- | --------------------------------------------------------------------------------------------------------------- |
| 우선순위 사슬 | 모든 규칙 첫 블록에 `> **Precedence**:`                                                                         |
| **형식 근거** | `rests on a property` **또는** `rests on properties` 1건 이상 — **P5 게이트**. 수는 기대는 형식 개수에 맞춥니다 |
| 이중 반증     | `This rule is working if:` **와** `is wrong for you if:`                                                        |
| 크기          | 규칙 ≤200줄, 스킬 `SKILL.md` ≤2KB (`references/`는 무제한)                                                      |
| **임계 금칙** | 본문에 독립 숫자 임계 금지                                                                                      |
| **언어 금칙** | 러너명(`npm `·`pytest`·`cargo ` 등) 금지                                                                        |
| **배선**      | 모든 `templates/rules/*.md`가 manifest 등재 · 모든 `bridge/*.mjs`가 `hooks.json` 등록                           |
| **해시 최신** | `sync-rule-hashes` 실행 후 diff 없음                                                                            |

⇒ 이 테스트가 **"우리가 우리 규칙을 지키는가"의 오라클**입니다.

**FCA 준수는 filid가 검사합니다** — `/filid:scan`으로 INTENT.md·배럴·구조를 검증합니다. seiri가 자체 구조 검사를 만들지 않습니다(역할 밖).

---

# 8. 하지 않는 것

| 기능                 | 이미 있는 수단                                                            |
| -------------------- | ------------------------------------------------------------------------- |
| 규칙 로드 확인       | `/context`의 Memory files                                                 |
| 규칙 편집·탐색       | `/memory`                                                                 |
| 무관 규칙 제외       | `claudeMdExcludes`                                                        |
| **문서 트림 제안**   | `/doctor` — _"코드에서 유도 가능한 것은 자르고, 함정·근거·관례는 남긴다"_ |
| 규칙 공유            | `.claude/rules/` 심볼릭 링크                                              |
| 코드 탐색·분석       | Read · Grep · Glob (하니스 내장)                                          |
| 워크트리 생성·정리   | 하니스 내장 (finish는 하니스 소유 작업공간을 건드리지 않음)               |
| **구조 검증 (FCA)**  | **filid** — `/filid:scan`                                                 |
| 코드 리뷰 파이프라인 | **filid** — `/filid:review`                                               |
