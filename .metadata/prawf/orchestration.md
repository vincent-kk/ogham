# prawf 오케스트레이션 설계

> [`personas.md`](./personas.md) 의 9인을 Claude Code 네이티브 팀으로 운영하는 **라운드 흐름 ·
> 상태 머신 · 산출물 계약** 명세. filid `review` 의 `state-machine.md` + `phase-d-deliberation.md` +
> `contracts.md` 를 prawf 도메인으로 미러링한 한국어 설계 명세다.
>
> 실행 환경: **claude-code 세션 내부**. 모든 라운드는 native Team(`TeamCreate`/`Task`/`SendMessage`)으로
> 돌고, 외부 LLM·검색은 페르소나가 capability로만 위임한다. 분야 전문성은 [분야 프로파일](./field-profiles.md)이
> config로 주입하며, MCP(채택 시)는 그 _config 주입_ 전용이다 — 평가 동작에 관여하지 않는다.

## 1. filid와의 구조적 차이

| 측면          | filid review                              | prawf                                                           |
| ------------- | ----------------------------------------- | --------------------------------------------------------------- |
| 페르소나 관계 | 동등 위원의 **수평 합의**                 | **수직** 공격(6) → 방어(1) → 중재(1), 별도 significance 평가(1) |
| 합의 단위     | 한 명제에 대한 위원 투표                  | **개별 finding의 생존 여부**                                    |
| 핵심 메커니즘 | 2/3 quorum, VETO/SYNTHESIS/ABSTAIN        | finding 상태 전이 + chair 종합                                  |
| 판정 입력     | 모든 위원 동등                            | **soundness 6축만 verdict, significance는 advisory**            |
| 최종 판정     | APPROVED / REQUEST_CHANGES / INCONCLUSIVE | Accept / Minor / Major / Reject                                 |

prawf의 라운드는 투표가 아니라 **저널의 review → rebuttal → re-review 사이클**을 모사한다.

## 2. 파이프라인 단계

```
P0  PROFILE+NORMALIZE  chair      유형·분야 판별 → 프로파일 로드 → 입력 정규화
                                  → paper-profile.md + paper-normalized.md
     │
R1  ATTACK    Reviewer ×N (+impact)  (병렬) 각 축 해체 + finding + 예상 질문 → findings/round-1-<axis>.md
     │  await all
R2  DEFENSE   strategist          모든 finding에 방어·Q&A·(가능시)해결책 → rebuttal.md
     │
R3  RE-REVIEW Reviewer ×k         (조건부·병렬) 쟁점·WITHDRAWN 제안의 수용/거부 → findings/round-3-<axis>.md
     │
ADJ ADJUDICATE chair              dedup → finding 상태 확정 → verdict → review-report.md + qa-sheet.md
```

### P0 — Profile & Normalize (chair)

1. **유형·분야 판별** → [분야 프로파일](./field-profiles.md) 로드(우선순위: CLI > `.prawf/config` > CLAUDE.md > 자동 > 폴백).
2. **프로파일 검증**: 로드한 프로파일의 최소 스키마(필수 키·축 참조 정합성·`severity_examples` 존재)를 확인한다.
   **필수 soundness 축(argument·methodology·integrity)은 `disabled_axes` 로 끌 수 없다** — statistics·causality·bias만
   `absorb_map` 동반 시 조건부 비활성 허용. 위반 프로파일은 거부하고 보편 폴백으로 전환한다(filid `config_patch_validate` 대응).
3. **입력 정규화**: PDF/LaTeX/markdown 입력을 **`paper-normalized.md`** (chair가 줄 번호를 부여한 정규화 스냅샷)로 변환.
   모든 Reviewer는 원본이 아니라 **이 스냅샷의 `§<섹션>¶<문단>`·줄 번호를 인용**한다 — 공유 좌표계 확보(filid `path+rule` 대응).
4. 산출: `paper-profile.md`(유형·프로파일·소집 패널) + `paper-normalized.md`.

### 패널 소집 (9인 중 선출)

| 규모       | soundness 공격축               | significance     | 비고                 |
| ---------- | ------------------------------ | ---------------- | -------------------- |
| `LIGHT`    | argument + 핵심 1축            | impact(advisory) | 초록·단일 쟁점       |
| `STANDARD` | 3~4축                          | impact           | 일반 논문            |
| `FULL`     | 6축 전원                       | impact           | 정밀 심사 (9인 전체) |
| `--solo`   | `adjudicator` 1~6축 통합 1패스 | —                | 빠른 사전 점검       |

- `argument-analyst`·`chair`·`rebuttal-strategist` 는 분야 무관 **항상 소집**.
- **소집 축 = 프로파일 `paper_types[type].axes`**. 프로파일이 `disabled_axes`(예: 수학의 causality)를 지정하면
  해당 축은 _삭제가 아니라_ 프로파일 `absorb_map`(예: `{ causality: argument }`)이 지정한 흡수처로 이전된다.
  **chair는 P0에서 비활성 축의 불변 질문을 흡수처 페르소나의 R1 프롬프트에 명시 주입한다** — 선언이 아니라 동작으로
  커버리지 구멍을 막는다(흡수처 프로파일 메뉴에도 흡수 항목이 반영돼야 한다).
- `integrity-auditor` 는 외부 도구 가용 시 소집, 전면 부재 시 §8 degradation.

## 3. Finding 상태 머신

각 finding은 단일 상태를 가지며, chair가 frontmatter `status` 를 grep-parse 해 전이를 결정한다.

```
              R1                R2 방어                R3 재심
  (Reviewer) ─────▶ RAISED ─────────────▶ CONTESTED ──┬─[Reviewer 수용]─▶ DEFENDED   (완전 해소)
                      │                                ├─[부분 수용]──────▶ MITIGATED  (완화·잔여 위험)
                      │                                └─[Reviewer 거부]─▶ UNRESOLVED (방어 실패)
                      └─[strategist 방어 불가]────────────────────────────▶ UNRESOLVED
                      └─[strategist 사실오류 주장]──▶ WITHDRAWN-PROPOSED ──┬─[원 Reviewer R3 확인]─▶ WITHDRAWN
                                                                          └─[미확인/거부]─────────▶ UNRESOLVED
```

- **DEFENDED**: 방어 명확·검증가능. verdict 무영향.
- **MITIGATED**: 부분 완화. severity 한 단계 강등(major→minor 효과).
- **UNRESOLVED**: 방어 실패·해법 불명. **정직하게 미해결 표기**(억지 방어 금지).
- **WITHDRAWN**: strategist가 공격의 사실오류를 입증하고 **원 공격수가 R3에서 확인**해야 성립(거짓 PASS 방지).
  strategist 단독으로 finding을 삭제할 수 없다.

## 4. Adjudication — dedup → verdict (chair)

### 4.1 Dedup & Ownership

소집 축이 겹쳐 같은 결함을 중복 보고하면 verdict tally가 부풀려진다. chair는 병합한다:

- **병합 키**: `canonical-location + defect-class`. 충돌 시 **하나로 병합, 최고 severity 유지, 기여 축 모두 기록**
  (다축 합의는 *신호*이지 가중이 아니다).
- **Ownership 표** (1차 소유자가 보유, 나머지는 양보):

  | 결함 클래스                 | 소유 축                                       |
  | --------------------------- | --------------------------------------------- |
  | 상관↔인과 혼동              | `causal-reviewer` (argument 양보)             |
  | 표본크기·검정력·다중비교    | `statistical-auditor` (methodology·bias 양보) |
  | 출판편향·외적 타당도·재현성 | `bias-grader` (statistical·methodology 양보)  |
  | 표절·데이터 조작·이해상충   | `integrity-auditor`                           |

### 4.2 Verdict 도출

**soundness 6축의 UNRESOLVED 만** 집계한다(`impact-assessor` 는 제외 — §4.4).

| 조건 (UNRESOLVED, soundness 축)                           | Verdict            |
| --------------------------------------------------------- | ------------------ |
| `critical` ≥ 1                                            | **Reject**         |
| `major` ≥ 1                                               | **Major Revision** |
| `major` 가 모두 MITIGATED, critical/major UNRESOLVED 없음 | **Minor Revision** |
| `minor` UNRESOLVED 만 존재                                | **Minor Revision** |
| UNRESOLVED 없음 (전부 DEFENDED/WITHDRAWN 또는 finding 0)  | **Accept (PASS)**  |

- **PASS 정당화**: Accept도 "soundness 6축에서 critical/major가 0이며 잔여 minor가 결론 불변"을 evidence 기반으로 명시(9장).

### 4.3 입증책임 & tie-break (false-Reject 완화)

critic skeptic note(6 공격 vs 1 방어의 구조적 Accept-반대 중력)와 사용자 "pass 가능" 요구를 반영:

- **두 방향의 입증책임 분리**:
  - _강등(MITIGATED/DEFENDED)의 책임은 strategist에 있다._ 강등은 방어가 **검증 가능한 산출물**(실제 수행된
    재분석·외부 인용·텍스트 직접 근거)을 동반할 때만 인정된다. 단순 방어 _논리_ — tactic이 `sidestep`,
    또는 외부근거 없는 `justification` — 은 **강등 자격이 없다**: `CONTESTED` 로 남고 advisory로 qa-sheet에만 기록된다.
  - _미해결(UNRESOLVED) 확정의 책임은 공격수(Reviewer)에 있다._ 단 `CONTESTED` 로 남은 finding을 Reviewer가
    R3에서 적극 수용하지 않으면 **보수적으로 UNRESOLVED**로 확정한다(공격수의 원자료 접근 비대칭상 거짓 PASS 방지).
- **예외 — Fatal-flaw 축은 엄격**: `causal-reviewer` Temporality 위반, `statistical-auditor` p-hacking+사전등록 불일치·
  data leakage, `integrity-auditor` 데이터 조작은 **방어가 외부근거로 검증가능하게 명확하지 않은 한 critical 유지**
  → Accept 차단. 억지 방어로 강등 불가(filid `critical_security_override` 대응).

### 4.4 Significance 분리 (advisory-only)

- `impact-assessor` 는 `severity` 가 아닌 **impact rating**(`high|moderate|low|niche`)을 낸다.
- **낮은 significance 단독으로는 절대 Reject/Major를 유발하지 않으며, verdict를 Minor 이상 못 올린다**
  (gemini 검증: significance-only reject는 부당·위험. ACL Soundness/Excitement 분리, PLOS ONE soundness-only).
- 결과는 `review-report.md` 의 _Significance & Scope_ 섹션과 `qa-sheet.md` 에만 반영.

## 5. 산출물 계약

| 파일                         | 작성자                                   | 대응(filid)                 |
| ---------------------------- | ---------------------------------------- | --------------------------- |
| `paper-profile.md`           | chair (P0)                               | session.md                  |
| `paper-normalized.md`        | chair (P0)                               | (prawf 고유 — 공유 좌표계)  |
| `findings/round-1-<axis>.md` | Reviewer / impact-assessor               | rounds/round-1-<persona>.md |
| `rebuttal.md`                | rebuttal-strategist                      | — (prawf 고유)              |
| `findings/round-3-<axis>.md` | Reviewer (재심)                          | rounds/round-N-…            |
| `review-report.md`           | chair (verdict + _Significance & Scope_) | review-report.md            |
| `qa-sheet.md`                | chair (strategist 종합)                  | fix-requests.md             |

### 5.1 Finding frontmatter (soundness Reviewer R1)

```yaml
---
round: 1
axis: argument | methodology | statistics | causality | bias | integrity
persona: <persona-id>
profile: <분야 프로파일>
findings:
  - id: <AXIS>-<n> # 예: STAT-1, INTEG-2
    severity: critical | major | minor # §personas Severity 루브릭 앵커 기준
    location: "§4¶2 L45-52" # paper-normalized.md 좌표 (Evidence 의무)
    defect_class: <dedup 키> # 예: correlation-causation, sample-size
    claim: <무엇이 문제인가>
    evidence: <근거 인용; 외부조사 시 출처>
    anticipated_question: <예상 질문>
    status: raised
reasoning_gaps: [<근거 부재 항목>]
---
```

### 5.2 Impact assessment frontmatter (impact-assessor R1)

```yaml
---
round: 1
persona: impact-assessor
impact: high | moderate | low | niche # severity 아님 — verdict 비기여
rationale: <파급력·기여 근거>
scope_notes: [<일반화·적용 범위>]
---
```

### 5.3 Rebuttal frontmatter (strategist R2)

```yaml
---
round: 2
persona: rebuttal-strategist
defenses:
  - finding_id: STAT-1
    question_type: good | bad | cringy
    tactic: revision | justification | clarification | sidestep | deferral
    defense: <점대점 방어>
    solution: <해결책 예시> | null # 명확할 때만
    proposed_status: defended | mitigated | unresolved | withdrawn-proposed
external_refs: [<방어 보강 인용>]
---
```

### 5.4 Re-review frontmatter (Reviewer R3)

```yaml
---
round: 3
axis: <axis>
verdicts:
  - finding_id: STAT-1
    accept_defense: true | false
    withdrawn_confirmed: true | false | null # WITHDRAWN-PROPOSED 일 때만
    final_status: defended | mitigated | unresolved | withdrawn
    note: <사유>
---
```

### 5.5 chair verdict frontmatter (review-report.md)

```yaml
---
verdict: accept | minor-revision | major-revision | reject # 외부검증 부재 Accept(=provisional)은 accept + external_verification:unavailable 조합
soundness_tally: { critical: 0, major: 1, minor: 2 } # UNRESOLVED, dedup 후
status_counts: { defended: 5, mitigated: 1, unresolved: 3, withdrawn: 1 }
impact: moderate # advisory — verdict 무관
override: none | fatal-flaw
external_verification: complete | unavailable | partial
panel: [<소집 axis>]
profile: <분야 프로파일>
---
```

## 6. Team 운영 (claude-code 네이티브)

chair = **main 세션 = team lead** (filid Phase D 의장 패턴).

1. P0 후 `TeamCreate prawf-<paper-slug>`.
2. **R1**: 소집된 soundness Reviewer + impact-assessor 를 `Task(team worker)` **병렬 spawn** → 각자 산출물. `await all`.
3. **R2**: `rebuttal-strategist` 1인 spawn (R1 soundness findings 입력) → `rebuttal.md`.
4. **R3 (조건부)**: `proposed_status` 가 `unresolved|mitigated|withdrawn-proposed` 인 축의 Reviewer만 재spawn.
   전부 `defended` 면 R3 생략하고 합의로 직행.
5. chair: dedup → verdict → `review-report.md` + `qa-sheet.md` → `TeamDelete`.

**chair 불변식**:

- chair는 **외부검색·측정 도구를 직접 호출하지 않는다**. 공격/방어 산출물만 인용해 종합.
- 모든 verdict는 _어느 축의 어느 finding-id_ 에서 비롯했는지 추적 가능.
- 라운드 사이 yield 금지: spawn→await→다음 라운드를 한 흐름으로 체이닝.
- `--solo` 는 chair가 아니라 **별도 `adjudicator` Task**가 수행(chair 불변식 보존). adjudicator는 soundness 1~6축만
  verdict에 반영하고 impact는 advisory로 별도 채점하며, 자기 내부 중복은 `defect_class` 기준으로 dedup한다.

## 7. 수렴 · 종료 규칙

- 표준 흐름: R1 → R2 → (R3) → 합의. **R3는 단일 패스가 기본**이다.
- **추가 사이클 진입조건(유일)**: R3에서 strategist가 _새로운_ MITIGATED-잔여위험을 제시했고 원 Reviewer가
  이를 재반박할 때만 **1회 추가 방어+재심**을 허용한다(총 R3 최대 2회). 그 외 반복 없음 — 무한 토론 방지.
- **Inconclusive**: verdict에 load-bearing한 soundness 축이 **전면 abstain**(핵심 주장을 검증할 근거를
  끝내 확보 못함)일 때만. filid의 quorum-failure INCONCLUSIVE와 _조건이 다르다_ — 혼동 금지.

## 8. Degradation — 외부 capability 부재

검색·조사 capability가 **전면 부재**하면 의존 축이 비게 된다:

| 축                    | 부재 시 영향                   |
| --------------------- | ------------------------------ |
| `causal-reviewer`     | 선행연구·재현 정합성 미확인    |
| `statistical-auditor` | 사전등록 대조 불가             |
| `integrity-auditor`   | 표절·조작·COI 대조 대부분 불가 |
| `impact-assessor`     | 동향·파급력 추정 약화          |

- 해당 finding/항목은 `reasoning_gap` 으로 표기(전체 의견 포기 아님).
- chair는 `external_verification: unavailable` 을 frontmatter에 기록하고, Accept를 내릴 경우
  **`provisional-accept`(잠정 통과 — 외부검증 미수행)** 로 명시한다. 도구 없이도 동작하되 신뢰도를 정직하게 드러낸다.

## 9. qa-sheet.md — 사용자 핵심 산출물

평가 리포트와 별도로 **저자가 받을 예상 질문과 (가능한) 해결책**을 독립 시트로 출력한다.

| finding-id | 축     | 예상 질문          | 유형 | 방어/전술     | 해결책                        | 최종 상태  |
| ---------- | ------ | ------------------ | ---- | ------------- | ----------------------------- | ---------- |
| STAT-1     | 통계   | "다중비교 보정은?" | good | justification | Bonferroni 재분석             | mitigated  |
| CAUS-2     | 인과   | "역인과 배제는?"   | good | deferral      | _(미해결 — 종단 데이터 필요)_ | unresolved |
| INTEG-1    | 진실성 | "데이터 가용성은?" | good | clarification | OSF 링크 추가                 | defended   |

해결책 칸은 **명확할 때만** 채우고, 불명확하면 _미해결/Limitation 승화_ 로 정직하게 비운다.
별도로 _Significance & Scope_ 노트(impact rating + 적용 범위)를 말미에 첨부한다.
