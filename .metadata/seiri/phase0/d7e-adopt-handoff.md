# D7-E 채택 사이클 — 개발 핸드오프 프롬프트 (2026-07-25)

_아래 프롬프트를 ogham 작업 세션에 복사해 사용한다. 정본 계획은 [../TODO.md](../TODO.md). 작업 로그는 본 문서 하단에 추가한다._

---

```
ogham 저장소에서 seiri 플러그인의 D7-E 채택 사이클 개발을 진행해줘.

## 먼저 읽기 (순서대로)
1. .metadata/seiri/TODO.md — 개발계획 정본 (본 작업의 범위·제약·순서)
2. .metadata/seiri/phase0/d7-election-results.md — 실측 근거 (S2 13/15 복원)
3. plugins/seiri/src/constants/intervention.ts · src/constants/hooks.ts ·
   src/hooks/shared/renderStatusLines.ts — 주요 수정 대상

## 확정된 결정 (2026-07-25 Vincent)
- B1: 선출 라인은 규칙 배포와 분리 — 규칙 미배포여도 렌더한다. 게이팅은
  intervention 다이얼만: 미설정 → standard(기본 발화), advisory는 명시적
  opt-out으로 완전 침묵 유지. SubagentStart·SessionStart 양 채널 동일 원칙.
- B3: standard 문구는 S1.5 — 내생 순간(done-claim)만 `/seiri:verify`로 직접
  명시, 나머지는 절차 프레이밍. strict는 S2(전 순간 직접 명시) 현행 유지.
- 발전방향 D1·D2 포함 전면 진행. B4(메인세션 실측)와 C(정본화)는 범위 밖.

## 작업 순서 (TODO.md 기준: A → B1 → B2 → D1 → D2)
A1 bridge/ 재빌드분 + phase0/d7-election{,-results}.md 커밋 (단위별 커밋 분리)
A2 trace-structure Hand off를 `/seiri:write-plan`으로 명시
   + d7-election.md §2-2 "없음" 오기에 정정 주석 1줄
A3 brainstorm·interview Hand off를 `/seiri:*` 네임스페이스로 명시
A4 intervention.ts INTERVENTION_LEVELS jsdoc "SessionStart render only" 정정
B1 renderStatusLines 재구조 — 선출 라인을 deployed.length===0 가드 밖으로.
   Active-rules 라인만 배포 존재 시 렌더. 신규 테스트: 규칙 0 + standard에서
   선출 라인 단독 렌더 / advisory에서 완전 침묵.
B2 메인 채널 정합 — ELECTION_STANDARD_LINE을 S1.5로 개정(초안은 TODO.md B2,
   다듬기 허용하되 "decide after reading / deviations are yours to make,
   with a stated reason" 문구 계열은 불변), SessionStart 렌더에 선출 라인
   추가(~7줄 내), WORKFLOW_CHAIN_LINE을 `/seiri:*` 표기로,
   TURN_REMINDER_STANDARD를 선출 어휘 + `/seiri:verify` 명시로,
   TURN_REMINDER_STRICT를 전 순간 `/seiri:*` 직접 명시로 개정.
D1 훅 상태 체인 (fail-cheap) — PostToolUse가 `seiri:*` Skill 로드를 관측해
   .seiri/ 세션 신호(비추적, .gitignore 커버 확인)에 마지막 워크플로우 상태를
   기록하고, UserPromptSubmit이 체인 진행 중일 때만 상태 1절을 추가한다
   (예: "a plan was produced — `/seiri:execute` owns its performance").
   비차단 · standard 이상에서만 · advisory 침묵 · 실패 시 무주입 fail-open.
D2 준수율 오프라인 도구 — phase0/에 transcript·아티팩트 grep 스크립트와
   체크리스트(발화 · 계획/원장 아티팩트 존재 · fresh verify 실행 · 순서).
   런타임·MCP 추가 금지.

## 불변 제약 (위반 시 해당 작업 중단하고 보고)
- 신규 규칙 추가 금지 — templates/rules/ 불변 (templateHash 유지)
- 선출만 강제, 채택 잔존 — 강제 문구는 로드 순서까지만, 채택·이탈은 모델 몫
- advisory = 완전 침묵 (신규 렌더·상태 기록 포함 전부)
- 차단 훅 금지 (PreToolUse·Stop 불사용) · 주입 전용 · fail-open
- MCP 도구 2개 유지 · 에이전트 0 · 스킬 각 ≤4KB
- FCA 자기적용 — 변경 fractal의 INTENT.md 갱신, index.ts 순수 배럴
- 각 단계 후 yarn seiri build + yarn seiri test:run green(기존 102 + 신규) +
  typecheck clean. bridge/ 재빌드분을 같은 커밋에 포함.

## 산출
- 작업 단위별 커밋 (메시지에 TODO 항목 ID: A1, B1, B2, D1, D2)
- TODO.md 체크박스 갱신
- 특기사항·설계 이탈은 phase0/d7e-adopt-handoff.md 하단 "작업 로그"에 추가
- 완료 보고에 "B2 정합 완료 — B4(메인세션 실측) 측정 가능" 상태 명시
```

---

## 작업 로그

### 2026-07-25 — A1–A4 · B1 · B2 · D1 · D2 (커밋 8건)

`cb3c2e17` A1 · `beb0c9d2` A2 · `9fe56119` A3 · `4bff263b` A4 · `79b47c48` B1 ·
`748b89d2` B2 · `67631c43` D1 · `905a60f5` D2. 각 커밋에서 build + test:run +
typecheck green 확인. 최종 114/114 (기존 102 + 신규 12).

**계획과 달랐던 것**

- **A1 축소**: `phase0/d7-election{,-results}.md` 는 `97ea3c0b` 에서 이미
  추적 중이었다 — A1 은 `bridge/` 재빌드분만 남아 있었다.
- **A2 diff 확대**: `d7-election.md` 정정 주석 1줄에 prettier 가 §2-2 표 전체를
  재정렬했다(공백만). 저장소 포매터가 매 턴 도는 이상 되돌릴 실익이 없어 수용.
- **B2 렌더 예산**: 선출 라인 추가로 strict 6줄(드리프트·경고 포함 최대 9)이 됐다.
  `renderStatusLines` 최대 예산 테스트 8→9, setup INTENT 도 같은 수치로 갱신.
- **B2 부수 정정 2건**(이름 함정): setup INTENT 의 `utils/renderStatusLines.ts`
  → 실제 경로 `../shared/`, userPromptSubmit INTENT 의 "문구 정본
  `constants/intervention.ts`" → 실제 `constants/hooks.ts`.
- **B2 범위 밖으로 남긴 것**: `rule_docs_sync` action `config` 의 `posture`
  문자열(`applyConfigAction`)은 여전히 선출 라인을 포함하지 않는다 — 세션 중
  다이얼을 옮기는 **제3 채널**이라 B2 의 문언(SessionStart·매 턴 상기)에 없다.
  넣을 값어치는 있어 보이나 별건으로 제안한다.
- **D1 함수 개명**: `processBashOutcome` → `processToolOutcome`. 도구 2종을
  받게 된 함수에 Bash 이름을 남겨두면 그게 첫 오독 지점이 된다.
- **D1 상태 저장소**: 새 파일을 만들지 않고 기존 `.seiri/session-signals.json`
  에 `workflow` 필드를 얹었다 — `.seiri/.gitignore` 가 이미 이 파일을 덮는다
  (비추적 확인 완료). 배럴(`sessionSignals/index.ts`)에는 **추가하지 않았다**:
  훅은 concrete import 라 외부 소비자가 없고, 소비자 없는 export 는
  `seiri_public-contract §1` 위반이다.
- **INTENT 50줄 캡**: subagentStart·userPromptSubmit·postToolUse·sessionSignals
  네 문서가 캡에 닿아 편집마다 다른 줄을 압축해야 했다(정확히 50줄 파일은
  라인-중립 편집도 차단된다). 사실은 유지하되 역사적 정당화 문장을 줄였다.
- **부수 포매팅**: D1 커밋에 `skills/interview/references/dimensions.md` 의
  prettier 재정렬(공백 5줄)이 함께 들어갔다. 내용 변경 없음.

**남은 불확실성 (B4 에서 확인)**

- **`Skill` 도구가 PostToolUse 를 실제로 발화하는지 미확인.** 공식 문서는
  "에이전트 루프의 모든 도구 호출에 PreToolUse·PostToolUse, `EndConversation`
  만 예외"라고 적고 있어 발화가 기대되지만, 살아 있는 세션에서 직접 확인하지는
  못했다(이 저장소에 설치된 seiri 는 아직 `Bash` matcher 만 가진 이전 빌드다).
  발화하지 않으면 D1 은 조용히 아무 일도 하지 않는다 — fail-open 설계대로
  손실은 절 하나뿐이고, 확인은 B4 의 transcript 로 가능하다.
- payload 의 `tool_input.skill` 키 이름은 실제 transcript(`"name":"Skill",
"input":{"skill":"seiri:execute"}`)에서 확인했다 — 여기까지는 실측 근거가 있다.
- **미해결(무관)**: `plugins/filid/e2e/setup-settings.spec.ts:107` 의 curly
  경고는 이 작업 이전부터 있던 것으로 건드리지 않았다.

### 2026-07-25 — B2-b (`83acac1d`)

- `rule_docs_sync` config action 의 `posture` 가 선출 라인을 나른다 — 제3
  채널 정합, B1 원칙("다이얼이 나르는 모든 posture 표면 동일")의 완결.
- `renderElectionLine` 을 configLoader 배럴에 노출(MCP 쪽 신규 소비자 발생 —
  훅은 여전히 concrete import). `applyConfigAction` 은 SessionStart 렌더와
  같은 순서(체인 뒤 선출)·같은 게이팅(유효 다이얼 단독, advisory 는 lookup
  miss 로 침묵)으로 조합한다.
- 채널 수를 진술하던 jsdoc 2곳(`electionLines.ts`·`renderElectionLine.ts`)을
  "두 채널" → 3채널로 정정 — 남겨두면 config 채널이 의도적 제외로 읽힌다.
- 테스트 1건 추가(effective 다이얼 기준 렌더 + advisory 침묵): 사전 실패
  관찰 후 구현. 116/116 green · typecheck clean · lint 는 기지의 filid curly
  경고 1건뿐. 재빌드 `bridge/mcp-server.cjs`(선출 라인 포함 diff 확인) 동커밋.
- 나오 지적 잔여(재편 후 bridge/ 6종 미커밋)는 본 작업 전 `23119b75` 에서
  이미 해소되어 있었다.

### 2026-07-25 저녁 — 검증 (나오)

- **커밋 9건 검토** (로그 8건 + 로그 외 `2f35af82` 상수 재편): 차단 결함 0.
  재편은 electionLines·turnReminders·workflowChain·workflowStateLines 분리로
  번들 바이트 격리를 개선했고, 재검증 115/115 green(재편 +1) · typecheck clean.
- **정합 확인**: templates/rules 불변 · hooks.json PostToolUse `Skill` matcher ·
  `chainMember`의 `seiri:` 접두 스트립 후 `WORKFLOW_SKILLS` 멤버십 검사 ·
  B1 렌더(다이얼 단독 게이팅, 규칙 0에서도 선출 라인 생존, compact/full 양 경로) ·
  advisory 침묵(상태 기록 포함) · fail-open 양방향 · 상태 절 consume-once.
- **★ 미확인 코멘트 1 해소 — Skill 도구의 PostToolUse 발화 실측 확인.**
  격리 스크래치에 `matcher: "Skill"` 훅 + 최소 스킬을 두고 headless 세션
  (CLI 2.1.220)을 실행: 훅이 발화했고 페이로드는
  `hook_event_name:"PostToolUse" · tool_name:"Skill" · tool_input:{"skill":"pingskill"}
· tool_response:{success:true}` — D1이 기대하는 구조 그대로. 플러그인 스킬의
  네임스페이스형(`seiri:execute`)은 D7-E transcript에서 기실측. **D1 전제 성립.**
- **코멘트 2 (config action posture)**: TODO B2-b로 등재 — B1 원칙(다이얼이 나르는
  모든 posture 표면 동일)의 완결로 **반영 권고**, Vincent 지시 대기.
- **잔여**: 재편 후 재빌드 `bridge/` 6종 미커밋(Election·상태 절 포함 신선함 확인) ·
  B4 전제 = 설치본 갱신(현 캐시는 Bash matcher만 가진 이전 빌드).
