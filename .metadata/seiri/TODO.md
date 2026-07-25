# TODO — D7-E 채택 사이클 (2026-07-25 재개설 · 같은 날 B1·B3 확정)

_근거: [phase0/d7-election-results.md](./phase0/d7-election-results.md) — S2 13/15 복원, 사전 등록 판정 "채택 후보". **최종 채택 게이트는 메인세션 §8**(B4). Vincent 확정(07-25): **B1 분리 · B3 S1.5 · 발전방향(D) 전면 진행** — "해당 발견은 중요한 것의 누락을 의미한다". 개발 착수 핸드오프: [phase0/d7e-adopt-handoff.md](./phase0/d7e-adopt-handoff.md). 완료 시 관례대로 본 문서를 제거한다._

**공통 제약**: 신규 규칙 추가 금지(봉인) · 선출만 강제/채택 잔존 문구 불변("decide after reading / deviations are yours to make, with a stated reason") · advisory 완전 침묵 불변(신규 렌더·상태 기록 포함) · 차단 훅 금지·fail-open · MCP 도구 2·에이전트 0·스킬 ≤4KB · FCA 자기적용.

---

## A. 즉시 — 실측 종결 잔여

- [x] **A1 커밋** (`cb3c2e17`): `bridge/` 재빌드분. `phase0/d7-election{,-results}.md` 는 `97ea3c0b` 에서 이미 추적됨 — A1 은 재빌드분만 남아 있었다.
- [x] **A2 trace-structure Hand off 명시화** (`beb0c9d2`): `/seiri:write-plan`. 요청서 §2-2 오기에 정정 주석 1줄.
- [x] **A3 brainstorm·interview Hand off 명시화** (`9fe56119`): `/seiri:*` 네임스페이스. 이로써 플러그인 내 Hand off 전량이 네임스페이스 표기.
- [x] **A4 jsdoc 정정** (`4bff263b`): 다이얼이 움직이는 표면 4종(SessionStart·SubagentStart 선출·매 턴 상기·postToolUse 기록)으로 정정.

## B. 메인세션 §8 전 정합

### B1 ✅ 확정 (Vincent 07-25): 선출 라인은 규칙과 분리 — 항상 주입

- [x] **B1 구현** (`79b47c48`): 선출 라인 렌더를 `deployed.length === 0` 가드 밖으로. 게이팅은 **intervention 다이얼만** — 미설정 → `DEFAULT_INTERVENTION`(standard) → **기본 발화**; `advisory`는 명시적 opt-out **침묵 유지**(ELECTION_RENDER 무항목 구조 그대로); 규칙 배포 여부는 무관. Active-rules 라인만 배포 존재 시 렌더. SubagentStart(compact)·SessionStart(B2) 양 채널 동일 원칙. 테스트: 규칙 0 + standard에서 선출 라인 단독 렌더 / advisory에서 완전 침묵.

### B3 ✅ 확정 (Vincent 07-25): S1.5 — standard는 내생 순간만 직접 명시

- [x] **B2 메인 채널 정합** (`748b89d2`, S1.5 반영 — strict 렌더 6줄/경고 포함 ≤9):
  - `ELECTION_STANDARD_LINE` → **S1.5** 개정 초안: _"Election: defined workflows govern these moments — a failure appearing, multi-step work starting, review arriving or departing — load the matching seiri workflow before acting. One moment is named: before saying done, fixed, or passing, load `/seiri:verify`. Decide after reading — deviations are yours to make, with a stated reason."_ (내생 순간=done-claim만 스킬명 직접 명시 — S1→S2 격차가 A 시나리오에 집중된 실측 근거)
  - `ELECTION_STRICT_LINE` = S2 현행 유지.
  - **SessionStart 렌더에 선출 라인 추가** (B1 원칙 동일 — 다이얼만 게이팅). 총 렌더 ~7줄 내.
  - `WORKFLOW_CHAIN_LINE` → `/seiri:*` 네임스페이스 표기로.
  - `TURN_REMINDER_STANDARD` → 선출 어휘 + `/seiri:verify` 명시(S1.5 정합) · `TURN_REMINDER_STRICT` → 전 순간 `/seiri:*` 직접 명시(S2 정합). 초안은 핸드오프 문서, 채택 잔존 문구 불변 조건 하에 다듬기 허용.
- [x] **B2-b ✅ 승인 (Vincent 07-25) — `rule_docs_sync` config action의 posture 문자열에 선출 라인 포함** (`83acac1d`): 세션 중 다이얼을 옮기는 **제3 채널**이 선출 라인을 안 나르던 것을 정합. B1 원칙("다이얼이 유일한 게이트, posture를 나르는 모든 표면 동일")의 완결. 유효 다이얼 기준 렌더 · advisory 침묵 · 테스트 1건 추가.
- [ ] **B4 메인세션 §8 실측** (본 개발 범위 밖, B2 완료 후 별도 발주): 5세대 메인세션 · 긴 세션·컴팩션 관문 통합 · 발화율 + 준수율(D2 도구) 병행 · 선출 라인 컴팩션 생존 관측. **전제 2건**: ①설치본 갱신 — 현 캐시는 Bash matcher만 가진 이전 빌드(Skill matcher·신규 렌더 미탑재) ②재편 후 재빌드 bridge/ 커밋.

## C. 채택 확정 후 정본화 (B4 통과 게이트 — 본 개발 범위 밖)

- [ ] **C1** `02-ARCHITECTURE.md` §3 디스패치 기제 개정 ("+선출 계약 주입, 5세대 이후 1급 기제")
- [ ] **C2** `01-CONSTITUTION.md` P1 해설 — 화물 축·선출/채택 분리 편입 (Vincent 승인 경유)
- [ ] **C3** `README.md`·`README-ko_kr.md` — 4KB·선출 라인·다이얼 서술
- [ ] **C4** `phase0/d7-dispatch.md` §7 처방 착지 주석
- [ ] **C5** vault 정본화(나오): 원장 §2-2·§4(4KB)·§7#8 · ext-review 기준선 정정(`DEFAULT_INTERVENTION=standard` 실측) · hook-layer-gap G2 재개방

## D. 발전 — 전면 진행 (Vincent 07-25)

- [x] **D1 훅 상태 체인 (레버 2)** (`67631c43`): 선제 배선 + 밸브 + 사후 관측 원칙(ext-observation 선례). **린 설계**: PostToolUse가 `seiri:*` Skill 로드를 관측 → `.seiri/` 세션 신호(비추적)에 마지막 워크플로우 상태 기록 → UserPromptSubmit이 체인 진행 중일 때만 상태 1절 추가(예: _"a plan was produced — `/seiri:execute` owns its performance"_). 비차단 · standard↑ 게이팅 · advisory 침묵 · 제거는 1급 선택지. 효과 관측은 B4·T2에서(선제 배선이므로 사전 측정 게이트 면제 — fail-cheap 설계 요건 충족 필수).
- [x] **D2 준수율 오프라인 도구 (레버 4·G2)** (`905a60f5` — `phase0/compliance-scan.mjs` + `compliance-checklist.md`): `phase0/`에 transcript·아티팩트 grep 스크립트 + 체크리스트 — 발화(관측 A `"skill":"seiri:*"`) · 아티팩트 존재(계획 문서·진행 원장) · 게이트 통과(fresh verify 실행) · 순서. **런타임·MCP 무추가**(도구 ≤3 유지). B4의 준수율 지표 공급원.
- [ ] **D3 하니스/모델층 피드백 (선택)**: H-0 증거 메모 — 시스템 프롬프트 선출 계약을 5세대가 무주입 시 미준수(0/5). `phase0/` 메모로 정리, 전달 여부는 Vincent.

---

## 착지 요약 (2026-07-25)

**개발 사이클 종료 (2026-07-25)**: A1–A4 · B1 · B2 · B2-b · D1 · D2 커밋 완료. `yarn seiri test:run` 116/116 green(기존 102 + 신규 14) · typecheck clean · build clean. **B2·B2-b 정합 완료 — B4(메인세션 §8 실측) 측정 가능.** 남은 것: B4 · C 정본화 · D3. 특기사항은 [phase0/d7e-adopt-handoff.md](./phase0/d7e-adopt-handoff.md) 작업 로그. 나오가 지적한 잔여(재편 후 재빌드 bridge/ 6종)는 `23119b75` 로 해소.

**검증 (나오, 2026-07-25 저녁)**: 커밋 9건(로그 8건 + 로그 외 상수 재편 `2f35af82` — 품질 양호, 번들 바이트 격리 개선) 검토 — **차단 결함 0**. templates/rules 불변(신규 규칙 금지 준수) · hooks.json PostToolUse `Skill` matcher 등록 · `chainMember`가 `seiri:` 접두 스트립 후 멤버십 검사 · advisory 침묵/fail-open/consume-once 전부 정합 · 재검증 115/115 green(재편 +1). **작업 세션 미확인 코멘트 해소: Skill 도구의 PostToolUse 발화를 라이브 하니스(CLI 2.1.220, 격리 스크래치)에서 실측 확인** — `hook_event_name:"PostToolUse" · tool_name:"Skill" · tool_input:{"skill":...}`. D1 전제 성립. 잔여: 재편 후 재빌드 bridge/ 6종 미커밋.

D7-E: C 0/9 · S1 10/15 · **S2 13/15 복원** · FP 0/12 · H-0 0/5(일괄 프라이어). 오염 0/56. 선출/채택 분리 문구가 오발화 없이 복원 — "억압 없이 지키기" 성립(s2-c-r4 전체 체인 완주). 코드 검토: 차단 결함 0, 비차단 5건(→ A2·A3·A4·B1·B2). **결정 확정: B1 분리(다이얼만 게이팅, 기본 발화, advisory opt-out 침묵) · B3 S1.5 · D 전면 진행.**
