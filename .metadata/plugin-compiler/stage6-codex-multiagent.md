# Stage 6 실측 — Codex 네이티브 multi_agent 로 위원회 이식 (2026-07-20)

> **결론 한 줄**: Codex 는 **선언적 플러그인 `agents` 컴포넌트가 없을 뿐**, 런타임
> `multi_agent`(stable)가 **스킬로 전달된 페르소나 원장을 격리 subagent 로 스폰**하고
> 충실히 실행한다. ⇒ 위원회 의존 스킬(filid Phase D·prawf·atlassian)은 Codex 에서
> **"단일 에이전트 격하"가 아니라 이식 가능**. TODO §2 재정의 근거.

## 무엇을 닫았나 (§2 미해결 질문)

matrix §7(line 204)·§10 L3 가 "Subagent 격리 위원회 = 🔴 agents 컴포넌트 없음 → 미이식"
으로 남겨둔 것을 실측으로 정정. 두 층위를 분리해야 한다:

- **선언적 등록** (Claude `agents/*.md` 자동발견): Codex 매니페스트에 **없음** (소스 `plugin/manifest.rs`, plugin-creator `plugin-json-spec.md` — 컴포넌트는 `skills`·`hooks`·`mcpServers`·`apps`·`interface` 뿐). 스킬 안 `agents/openai.yaml` 은 페르소나가 아니라 하니스 UI 설정(`openai_yaml.md`: _"config for the machine/harness, not the agent"_).
- **런타임 subagent**: `codex features list` → `multi_agent` = **stable, true**. config.toml 에 `subagent_start` 훅 이벤트(ponytail 등록). `hook_names.rs` 에 `Agent` 별칭. ⇒ 모델이 런타임에 subagent 를 스폰한다.

핵심: **페르소나를 파일로 "등록"하는 경로는 없지만, 스킬 본문(원장)으로 "전달"하면 런타임 multi_agent 가 스폰 시 주입한다.**

## 측정 방법

- codex-cli **0.144.6**, `codex exec --json -s read-only --skip-git-repo-check`, model `gpt-5.6-sol`(effort max). 부수효과 없음(텍스트 리뷰만) → read-only 로 승인 게이트 회피.
- 관측: `--json` 이벤트 스트림(`collab_tool_call tool="wait"`) + `~/.codex/sessions/**/rollout-*.jsonl`(스폰된 스레드마다 1파일, `agent_path`·`thread_source`).
- 환경 고지: 측정 중 **ponytail 스킬 활성** 상태였으나 fan-out 을 억제하지 않았다(3인·10인 모두 정상 스폰).

## Probe 1 — 3인, 프롬프트 전달 (메커니즘 확인)

원장(optimist/skeptic/chair)을 프롬프트에 실어 subagent 스폰 지시. 리뷰 대상: `parseInt` radix 누락 주장.

- **스폰**: rollout 4개 = 오케스트레이터(`…6148`) + subagent 3(`/root/optimist`·`/root/skeptic`·`/root/chair`, `thread_source: subagent`, depth 1).
- **충실도**: skeptic 이 결함 정밀 포착("Without a radix, parseInt infers base 16 for `0x` prefixes and accepts partial parses such as `10px`→10" — 미제시 케이스까지 독립 발견), optimist 방어, chair **REJECT**.

## Probe 2 — 10인, 스킬 전달 (전달 벡터·스케일 확인)

원장을 **스킬**(`~/.codex/skills/prawf-mini/SKILL.md`, prawf 축소판: soundness 6 + impact + rebuttal + chair + adjudicator)에 넣고, 프롬프트엔 **리뷰 대상(CLAIM)만** 전달. 리뷰 대상: "비교정렬이 모든 입력에서 O(n)" 결함 초록.

- **스킬 전달 확정**: 오케스트레이터가 `sed -n '1,240p' ~/.codex/skills/prawf-mini/SKILL.md` 로 **스킬 파일을 직접 읽어** 원장 취득(item_1). 프롬프트엔 페르소나 0개 → 원장은 스킬에서 왔다.
- **스케일 확정**: rollout **11개 = 오케스트레이터 1 + subagent 10**. 원장 10 페르소나 전부 격리 스폰(`/root/soundness_theory`·`soundness_statistics`·…·`/root/adjudicator`; 하이픈→언더스코어 정규화). 억제·collapse 없음.
- **충실도(대규모)**: 각 페르소나 레인 유지 — soundness-theory 는 결정트리 Ω(n log n) 하한으로 격파, soundness-statistics 는 정확 이항 p=0.125·95% CI [0.29,1.00], soundness-novelty 는 하한·introsort·Timsort·1986 FastSort 선행 인용, rebuttal 은 "예비 PoC" 재해석, adjudicator **REJECT**.

## 남는 경계 (정직 고지)

1. **전달 경로 프록시**: 측정은 사용자 스킬 디렉터리(`~/.codex/skills/`)로 스킬을 주입 — 플러그인 스킬과 **동일한 주입 세만틱**이나, 마켓플레이스 등록·trust 설치 단계는 건너뜀. 완전 플러그인 E2E(`codex plugin marketplace add`→`plugin add`→invoke)는 동일 주입 + 설치 오버헤드로 저위험이나 별도 미실행.
2. **모델 의존**: `gpt-5.6-sol`·effort max·헤드리스 기준. 병렬 폭(wall-clock)은 엄밀 측정 안 함(스폰·격리·충실도만 확정).
3. **비용/지연**: 위원회 1회 = N+1 모델 컨텍스트. 위원회 리뷰의 본질적 비용.

## 이 발견의 반영

- **TODO §2**: "단일 에이전트 인라인 폴백" → **"스킬 임베드 페르소나 원장 + Codex 네이티브 multi_agent 오케스트레이션"**. 컴파일러 Codex 어댑터가 `agents/*.md`(Codex 무시) → 스킬 참조로 **재배치**하는 것이 실작업.
- **matrix §7 line 204 · §10 L3**: 🔴 미이식 → 🟢 이식 가능(측정). "선언적 등록 부재"만 잔존 한계로 유지.
- **prawf**: "Codex 제외 후보" → **측정 확인된 이식 가능**.
