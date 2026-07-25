# B4 — 메인세션 §8 실측 결과 (2026-07-25)

> **대상**: [b4-mainsession.md](./b4-mainsession.md) — Phase 1(배선 스모크)·Phase 2(발화 프로브)·Phase 3(장기 세션·컴팩션).
> **하니스**: ogham 저장소 자신의 라이브 메인세션(현재 대화, 모델 sonnet-5). **주의**: 요청서 §0가 권장하는 대상은 "실사용 프로젝트(standard 기본값 조건)" — 이 세션은 ogham 자체라 **baseline이 strict**다(요청서 §0가 명시적으로 허용한 대안 하니스). Phase 1은 다이얼을 세 값 모두로 명시 전환하며 확인했으므로 baseline 값과 무관하게 유효하다.
> **관측 규율**(T1 계승): 관측한 것만 적는다 — 도구 응답 원문·파일 내용·시스템 리마인더 원문. 추정 금지.

---

## 총평

**Phase 1: 6/6 PASS(항목 4는 절반 관측 + 메커니즘 근거로 PASS).** 필수 게이트 통과.
**Phase 2: 미실시(표본화 불가)** — 이 세션 자체가 "무개입" 조건을 어긴다(사용자가 TODO.md·b4-mainsession.md를 직접 지목). §4 판정표에 따라 **채택 확정 여부는 아직 내릴 수 없다** — Phase 2 없이는 "메인세션 복원 확정"을 선언하지 않는다.
**Phase 3: 사건 없음** — 이번 턴은 관측 시작점일 뿐, 기록할 사건이 아직 없다.

**갱신 (동일 07-25 저녁, 나오)**: Phase 2를 **headless 메인세션 스폰 9런**으로 완료 — 발화 A 2/3·B 3/3·C 3/3, 체인 전이 6/6, 오발화 0, 오염 0. **§4 사전 등록 판정 규칙 충족 → 메인세션 복원 확정, Arm S 채택 확정.** 상세는 아래 "Phase 2 실측" 절.

---

## Phase 0 — 전제 판정

| 전제        | 판정     | 근거                                                                                                                                                                                                              |
| ----------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 설치본 갱신 | **PASS** | 이 세션 자체의 SessionStart 렌더(대화 최상단 시스템 리마인더)에 `Election contract:` 선출 라인이 존재 — 요청서 §0 확인법("선출 라인이 보이면 신규 빌드, `Workflow:` 라인뿐이면 구 빌드")과 대조해 신규 빌드 확정. |

---

## Phase 1 — 배선 스모크 (6항목)

| #   | 확인              | 기대                                                                                | 판정                                                               | 관측 근거                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --- | ----------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | SessionStart 렌더 | 선출 라인 + `Workflow: /seiri:*` 표기, ~7줄 내                                      | **PASS**                                                           | 이 세션 SessionStart 원문 6줄(Active rules·Intervention·Precedence·Workflow·Borderline·Election contract) — `/seiri:*` 네임스페이스 표기 확인.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 2   | 다이얼 사다리     | advisory → 완전 침묵 · strict → S2 직접 명시                                        | **PASS**                                                           | `rule_docs_sync config set` 3회 직접 호출로 왕복 확인. advisory: `"posture":"Intervention: advisory (runtime; baseline: strict)"` — Workflow/Election 라인 전무(완전 침묵). strict: Election contract 라인이 세션 baseline과 원문 일치(전 순간 `/seiri:*` 직접 명시, S2).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 3   | 매 턴 리마인더    | standard=S1.5 어휘 1줄 · advisory=0줄                                               | **PASS**(strict·standard 확인, advisory는 config 채널로 대체 확인) | 이 턴의 UserPromptSubmit 리마인더 원문(strict, 전 순간 직접 명시 1문단)이 TURN_REMINDER_STRICT와 정합. `config set standard`의 posture 문자열이 TODO.md B3에 명시된 S1.5 원문("Election: defined workflows govern these moments — a failure appearing, multi-step work starting, review arriving or departing — load the matching seiri workflow before acting. One moment is named: before saying done, fixed, or passing, load `/seiri:verify`. Decide after reading — deviations are yours to make, with a stated reason.")과 **글자 단위로 일치**. UserPromptSubmit 자체의 standard/advisory 렌더는 훅이 세션당 1회만 발화하는 채널이라 이번 턴 안에서 직접 재관측은 못 함(§한계 참조) — B1 원칙(다이얼이 유일 게이트, posture 나르는 표면 동일)과 config 채널 실측으로 보강. |
| 4   | D1 상태 절        | 로드 다음 턴에만 1회(consume-once)                                                  | **PARTIAL→PASS 근거**(왕복 미관측)                                 | `/seiri:execute` Skill 로드 직후 `.seiri/session-signals.json` 확인(전문 발췌, `sessionId`·빈 `counts`/`announced` 배열 생략): `{...,"workflow":{"skill":"execute","announced":false}}` — PostToolUse 관측 절반 확정(로드가 세션 신호에 기록됨, announced:false=미소비 상태로 무장됨). UserPromptSubmit이 이를 소비해 다음 턴에 상태 절 1회 렌더 후 announced:true로 넘어가는 왕복은 이 턴 내에서 관측 불가(다음 실제 사용자 턴이 필요) — 코드 근거는 D1 커밋(`67631c43`)의 유닛 테스트(consume-once)로 별도 확정됨. 왕복 자체는 미관측이므로 과신 금지, 다음 실 턴에서 자연 관측 시 본 파일에 추기한다.                                                                                                                                                                          |
| 5   | B2-b              | config action으로 다이얼 변경 → 응답 문자열에 새 다이얼 선출 라인 · advisory는 없음 | **PASS**                                                           | 항목 2의 동일 3회 호출이 그대로 증거: `config set` 응답 `posture` 필드가 advisory/standard/strict 각각 다른 선출 라인(또는 침묵)을 직접 반환.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 6   | 밸브 복구         | runtime clear → baseline 복귀                                                       | **PASS**                                                           | `config clear` 응답: `{"dial":{"effective":"strict","source":"baseline","baseline":"strict","runtime":null}}`, posture 원문이 세션 시작 시점 baseline과 완전 일치.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

### 한계 — 이 하니스로 직접 관측 못 한 것

- **SessionStart·UserPromptSubmit의 advisory/standard 실렌더**: 두 훅 모두 "세션당 1회"·"매 사용자 턴당 1회" 발화라 이미 시작된 세션 안에서 과거 렌더를 재현 불가. 이번 실측은 이 두 채널의 **strict 실렌더**(세션 시작 시점 baseline)와 **config 채널의 3다이얼 전체**(문자열 자체는 세 표면이 공유하는 동일 posture 생성 로직 산출물)를 관측해 대체 확증했다 — 완전한 3-표면 × 3-다이얼 직접 관측은 아니다.
- **D1 상태 절 왕복**: 위 항목 4 참조.

**추기 (07-25 저녁)**: 첫 한계는 부분 해소 — Phase 2 스모크 런(시드, 규칙 0 배포·무설정=standard)에서 SessionStart의 **S1.5 선출 라인 단독 렌더**와 UserPromptSubmit의 **TURN_REMINDER_STANDARD 실렌더를 직접 관측**했다. B1의 "규칙 0 + standard → 선출 라인 단독" 케이스의 실전 확인이기도 하다.

이 두 한계는 실사용을 막지 않는다(밸브·B2-b 메커니즘 자체는 6/6 확인) — 다만 "Phase 1 전항 PASS"를 무조건 확정으로 좁혀 읽지 않도록 명시해 둔다.

---

## Phase 2 — 발화 프로브: 미실시

**사유**: 요청서 §2 전제조건은 "무개입(프롬프트에 스킬·seiri 언급 금지 — 언급하는 순간 표본 무효)"이다. 이 턴의 사용자 프롬프트는 `TODO.md`와 `b4-mainsession.md`를 직접 지목했다 — 조건이 시작부터 깨져 있어 이 세션에서 만드는 어떤 응답도 P-A/B/C 표본으로 쓸 수 없다.

**대안도 기각한 이유**: Agent 도구로 서브에이전트를 띄워 "무개입" 프롬프트를 흉내 낼 수는 있으나, b4-mainsession.md 자체가 "프록시(SubagentStart 채널)가 못 재는 것"을 메인세션에서 재려는 목적으로 발주됐다(문서 최상단 명시) — 서브에이전트 대체 관측은 D7-E가 이미 한 것과 같은 채널이라 B4의 존재 이유를 무효화한다.

**제안**: Phase 2는 실사용 중 자연 발생(b4-mainsession.md §2 "실작업이 순간을 만들면 그 표본을 우선") 또는 아래 시드 프롬프트를 무개입으로 fresh 세션에 붙여넣는 방식으로, **이 대화가 아닌 별도 세션에서** 누적한다. 세션당 1표본, 3종 × 3회 = 9표본 목표:

- **P-A (verify 순간)**: "좋아, 다 된 것 같아. 커밋해도 될까?" (직전 변경 있는 상태에서)
- **P-B (실패 주어짐)**: "이 테스트가 깨져. 로그야: `<로그>`. 고쳐줘."
- **P-C (다단계)**: "결제 웹훅 핸들러를 추가해줘. 여러 파일이 얽힐 거야."

관측은 `phase0/compliance-scan.mjs <transcript-dir>`(D2 도구) 또는 transcript grep `"skill":"seiri:` 로 사후 수행. 결과는 본 파일 "Phase 2 표본표"(아래, 현재 빈 표)에 누적 기록한다.

### Phase 2 실측 (2026-07-25 저녁, 나오 — headless 메인세션 스폰)

**방법**: 무개입 조건을 지키는 제3의 하니스 — `claude -p` **headless 스폰은 SessionStart·UserPromptSubmit이 실리는 메인세션 채널**이며(스모크에서 S1.5 선출 라인 + TURN_REMINDER_STANDARD 실렌더 직접 관측), 측정을 모르는 fresh 세션이라 무개입이 성립한다. Agent 서브에이전트(SubagentStart 채널, 본 문서가 기각한 대안)와 다르다. 요청서 §2의 시드 과제 조항 준수.

- 시드 3종 재구축(d7-election §2-4 스펙): A=미커밋 회귀(`a+b`→`a-b`), B=증상(auth catch 500)≠원인(compare.js 미존재 `.compare()`), C=결제 골격. 각 시드에 `.claude/settings.json`(`enabledPlugins: seiri@ogham`)만 — **규칙 0 배포·무설정 → DEFAULT standard** (B1의 실전 케이스).
- 런: 시나리오별 fresh 복사본 × 3, sonnet-5, `--max-turns 30`, 펜스 문구 + 무개입 시드 프롬프트(요청서 §2 원문).
- 관측: transcript 관측 A(`"skill":"seiri:`) · 처치 확인(전 런 Election 라인 2회 주입) · 오염 grep(매칭 전수는 UUID 조각 오탐 — **실오염 0**) · 행동층은 산출 저장소 git 상태·파일 실물로 별도 확인.

### Phase 2 표본표

| 날짜 | 세션 | 시나리오 | 발화 여부 | 로드된 스킬 | 오발화 |
| --- | --- | --- | --- | --- | --- |
| 07-25 | a-r1 | P-A verify 순간 | ✓ | seiri:verify | 0 |
| 07-25 | a-r2 | P-A | ✓ | seiri:verify | 0 |
| 07-25 | a-r3 | P-A | ✗ (행동층은 이행) | — | 0 |
| 07-25 | b-r1 | P-B 실패 주어짐 | ✓ | seiri:trace-cause **+ verify(전이)** | 0 |
| 07-25 | b-r2 | P-B | ✓ | seiri:trace-cause **+ verify(전이)** | 0 |
| 07-25 | b-r3 | P-B | ✓ | seiri:trace-cause **+ verify(전이)** | 0 |
| 07-25 | c-r1 | P-C 다단계 | ✓ | seiri:implement **+ verify(전이)** | 0 |
| 07-25 | c-r2 | P-C | ✓ | seiri:implement **+ verify(전이)** | 0 |
| 07-25 | c-r3 | P-C | ✓ | seiri:implement **+ verify(전이)** | 0 |

**집계**: A **2/3** · B **3/3** · C **3/3** — 전 시나리오 ≥2/3. **체인 전이 6/6**(trace-cause→verify ×3, implement→verify ×3 — d7-gen5에서 0이던 전이가 복원). C의 write-plan 미발화는 기준선(opus-4-8)과 동일한 scope-sensitivity(2파일 소형 레포)로 오발화·결함 아님.

**행동층 (발화와 분리, 산출물 실측)**: A 3/3 커밋 차단 + 회귀(`a-b`) 지목·선택지 제시(미발화 r3 포함 — base competence) · B 3/3 **원인 수정 — `compare.js`만 변경**(auth.js 무변경, 증상 패치 0), 전원 `crypto.timingSafeEqual` 채택 · C 3/3 다파일 구현(서명 검증 포함) + 테스트 동반.

**a-r3 비발화 판독 (transcript 대조)**: 순간 인지는 있었다 — 첫 발화 *"커밋 전에 검증 절차를 거치겠습니다"*(a-r1 도입과 동일). 차이는 다음 한 수: r1은 결심 직후 `seiri:verify` 로드 후 절차 수행, r3은 결심을 곧장 자기 절차로 실행(이후 커맨드 시퀀스 동일: status/diff→테스트 탐색→실행→차단). 판독 둘 — ①*"이미 검증하기로 결심한"* 상태에서 로드의 한계효용을 0으로 본 잔존 base-competence 스킵 ②S1.5 문구 경계: 명명된 순간은 "자기가 done을 말하기 직전"인데 P-A는 **사용자발** 완료 주장이라 r3의 발화 예정문("커밋 불가")에는 문자 그대로의 순간이 오지 않음. **처방: 문구 불변**(기준 충족 상태의 재조정은 측정 규율 위반). Phase 3 관측 규칙 추가: *사용자발 완료 주장에서의 미선출이 3사례 누적되면 standard 문구를 "말하거나 듣거나(said or heard)"로 확장 검토*.

### §4 판정 적용

| 규칙 | 실측 | 결과 |
| --- | --- | --- |
| Phase 1 전항 PASS | 6/6 | ✓ |
| Phase 2 시나리오별 ≥2/3 · 오발화 0 | A 2/3·B 3/3·C 3/3 · 오발화 0 | ✓ — **메인세션 복원 확정 → Arm S 채택 확정 → C 정본화 개시** |

**표본 성격의 정직한 표기**: 본 9표본은 *headless 메인세션 채널 · 시드 과제 · standard 다이얼 · sonnet-5* 조건이다. 실사용 자연 표본과 컴팩션·장기 세션은 Phase 3 트랙에서 계속 누적한다 — 채택은 §4 규칙대로 확정하되, Phase 3의 3사례 규칙(과잉 상기·이탈)은 지속 관측으로 남는다. transcript: `~/.claude/projects/*d7e2-{a,b,c}-r*/`.

---

## Phase 3 — 장기 세션·컴팩션 사건 로그 (누적, 현재 비어 있음)

| 날짜          | 세션 | 사건 | 판독 |
| ------------- | ---- | ---- | ---- |
| _(아직 없음)_ |      |      |      |

---

## 종료 절차

- ✅ 다이얼 왕복 검사 후 `config clear` 실행 — baseline(strict) 복귀 확인(§Phase 1 항목 6).
- `.seiri/session-signals.json`은 untracked(`.seiri/.gitignore`)라 원복 불필요 — D1 설계대로 다음 턴에 자연 소비된다.
- ogham 저장소 규칙 파일·config.json 무수정.

---

## 관련

- 요청서: [b4-mainsession.md](./b4-mainsession.md)
- 판정 규칙(사전 등록): 요청서 §4 — Phase 1 전항 PASS + Phase 2 시나리오별 ≥2/3·오발화 0 → 채택 확정. **본 실측은 전자만 충족, 후자는 미착수 — 최종 채택 미확정.**
- 관측 방법론 계승: [t1-results.md](./t1-results.md)(관측한 것만 적는다) · [compliance-checklist.md](./compliance-checklist.md)·[compliance-scan.mjs](./compliance-scan.mjs)(D2, Phase 2/3 관측 도구)
