# prawf 산출물 템플릿

> chair·strategist가 작성하는 산출물의 **리터럴 포맷**. [`orchestration.md`](./orchestration.md) §5(frontmatter 계약)의
> *본문 구조*를 정의한다. filid review `templates.md` 대응.
>
> **출력 언어**: 산출물은 `[filid:lang]`(또는 시스템 언어, 기본 영어) 설정을 따른다 — 아래 예시는 한국어다.
> 축 id·프레임워크명·finding-id·verdict enum 은 원형을 유지한다. chair는 산출물 작성 전 본 파일을 읽는다.

## 1. `review-report.md` (chair) — 메인 산출물

```markdown
---
verdict: reject # enum: accept | minor-revision | major-revision | reject (orchestration §5.5)
soundness_tally: { critical: 1, major: 0, minor: 0 } # UNRESOLVED 기준, dedup 후
status_counts: { defended: 2, mitigated: 1, unresolved: 1, withdrawn: 0 }
impact: moderate
override: fatal-flaw # none | fatal-flaw
external_verification: complete # complete | unavailable | partial
panel: [argument, methodology, statistics, causality, bias, integrity, impact]
profile: natural-science
---

# prawf Review Report — <논문 제목>

**Date**: <ISO 8601> **Profile**: <분야 프로파일> **Type**: <paper type>
**Verdict**: <ACCEPT | MINOR REVISION | MAJOR REVISION | REJECT>

## Verdict Summary

- **판정**: <verdict> — soundness 미해결 critical <N> · major <N> · minor <N>
- **Override**: <none | fatal-flaw (어느 축의 어느 finding)>
- **외부검증**: <complete | partial | unavailable>

## Panel & Profile

| 항목          | 값                                                                    |
| ------------- | --------------------------------------------------------------------- |
| 분야 프로파일 | <profile> (<주입 경로: CLI/config/auto/fallback>)                     |
| 논문 유형     | <type> → 적용 가이드라인 <guideline>                                  |
| 소집 축       | <argument, statistics, causality, bias, integrity (+impact advisory)> |
| 비활성·흡수   | <causality→argument (math 프로파일)> / 없음                           |

## Findings by Axis

> 모든 location 은 `paper-normalized.md` 좌표(`§<섹션>¶<문단>·줄`). 중복은 dedup 후 소유 축에 1회 표기.

| finding-id | 축          | severity | location  | 최종 상태  | 한 줄 요약                        |
| ---------- | ----------- | -------- | --------- | ---------- | --------------------------------- |
| CAUS-2     | causality   | critical | §4¶1 L88  | UNRESOLVED | 횡단 설계로 역인과 배제 불가      |
| STAT-1     | statistics  | major    | §3¶2 L45  | MITIGATED  | 다중비교 미보정 → 재분석으로 완화 |
| METH-3     | methodology | minor    | §2¶4 L31  | DEFENDED   | 결측치 처리 — 본문에 기술 확인    |
| INTEG-1    | integrity   | minor    | §6¶1 L120 | DEFENDED   | 데이터 가용성 — OSF 링크 보강     |

## Deliberation Log

### R1 — ATTACK

- 소집: [argument, methodology, statistics, causality, bias, integrity] + impact(advisory)
- Raised: CAUS-2(critical), STAT-1(major), METH-3(minor), INTEG-1(minor)

### R2 — DEFENSE

- DEFENDED: METH-3(본문 인용), INTEG-1(OSF 링크 — 검증된 산출물)
- MITIGATED 제안: STAT-1(Bonferroni 재분석 결과 첨부 — 검증된 산출물 → 강등 자격 충족)
- UNRESOLVED 제안: CAUS-2(종단 데이터 부재로 방어 불가, solution: null)

### R3 — RE-REVIEW

- STAT-1: 원 Reviewer 수용 → **MITIGATED** (major→minor 효과)
- CAUS-2: 원 Reviewer 거부 → **UNRESOLVED** (fatal-flaw: Temporality, 강등 불가)

### Verdict

- soundness_tally: critical 1 (CAUS-2) → **REJECT**, override: fatal-flaw

## Significance & Scope _(advisory — verdict 무관)_

- **Impact**: <high | moderate | low | niche> — <근거>
- **Scope**: <일반화·적용 범위 노트>

## Verdict Rationale

<verdict 별 서술 — 아래 변형 참조>
```

### 1.1 Accept(PASS) 변형 — Verdict Rationale

```markdown
## Verdict Rationale — ACCEPT (PASS)

soundness 6축에서 **미해결 critical/major 0건**. 잔여 minor <N>건(<finding-id…>)은
결론을 바꾸지 않는 완성도 결함이다. 무결성이 evidence 기반으로 확인되어 통과로 결론한다.
(보고서 9장 — 무결성 입증도 검증의 일부.)
```

### 1.2 Provisional 변형 — `external_verification: unavailable`

```markdown
> ⚠ **Provisional Accept** — 외부 검증 capability 부재로 다음 축이 미검증:
> <causal(선행연구), statistical(사전등록), integrity(표절)>. 표절·조작·선행연구 정합성은
> 확인되지 않았다. 이 PASS는 **잠정**이며 외부 검증 후 재확인을 권한다.
```

### 1.3 Inconclusive 변형

```markdown
**Verdict**: INCONCLUSIVE — load-bearing 축 <axis> 가 핵심 주장 검증 근거를 끝내 확보하지 못해
판정 불가(`reasoning_gaps` 참조). filid quorum-failure 와는 조건이 다르다.
```

## 2. `qa-sheet.md` (chair, strategist 종합) — 사용자 핵심 산출물

```markdown
# prawf 예상 질문 & 해결책 — <논문 제목>

> 저자용 시트. **평가 verdict와 독립**이다 — 통과 여부와 무관하게 예상 공격과 대응을 제공한다.
> 해결책은 _명확한 해법이 있을 때만_ 채운다. 불명확하면 _미해결/Limitation 승화_ 로 비운다.

## Q&A by Finding

| finding-id  | 축          | 예상 질문                                   | 유형 | 방어 전술     | 해결책                        | 상태       |
| ----------- | ----------- | ------------------------------------------- | ---- | ------------- | ----------------------------- | ---------- |
| STAT-1      | statistics  | "다중비교 보정은 했는가?"                   | good | justification | Bonferroni 재분석 첨부        | mitigated  |
| CAUS-2      | causality   | "횡단 설계인데 역인과를 어떻게 배제했는가?" | good | deferral      | _(미해결 — 종단 데이터 필요)_ | unresolved |
| METH-3      | methodology | "결측치는 어떻게 처리했는가?"               | good | clarification | 본문 §2 다중대체 명시         | defended   |
| —(advisory) | —           | "이 결과가 분야를 넘어 응용되는가?"         | bad  | —             | sidestep(검증 아님) — qa만    | —          |

> `bad`/`cringy` 유형, `sidestep` 전술 항목은 **verdict 강등 근거가 아니다** — 구두 방어 참고용이다.

## Rebuttal Letter 초안 (point-by-point)

> 리뷰어 응답서. 각 항목을 Revision / Justification / Clarification 으로 태깅. 평정심·수용적 어조 유지(8.2).

**[STAT-1 · Justification]** 지적에 감사드립니다. 다중비교 우려에 대해 Bonferroni 보정을 재수행한
결과(부록 표 S3)를 추가했으며, 주요 결과는 보정 후에도 유의합니다(p<.01). 본문 §3 L45를 수정했습니다.

**[CAUS-2 · Clarification(한계 승화)]** 역인과 가능성은 본 횡단 설계의 한계입니다. 현 데이터로는
배제 불가하므로, 한계점 섹션에 명시하고 종단 후속 연구를 제안하는 것으로 겸허히 수용했습니다.

## Significance & Scope Note

- **Impact**: <rating> — <근거>. _(이 평가는 게재 권고가 아니라 파급력 참고용이다.)_
```

## 3. `rebuttal.md` (strategist) — 방어 라운드 산출

```markdown
---
round: 2
persona: rebuttal-strategist
defenses:
  - finding_id: STAT-1
    question_type: good
    tactic: justification
    proposed_status: mitigated
  - finding_id: CAUS-2
    question_type: good
    tactic: deferral
    proposed_status: unresolved
external_refs: ["Bonferroni 1936", "OSF/abc123"]
---

# Rebuttal — <논문 제목>

## Defense by Finding

### STAT-1 (statistics · major) — proposed: MITIGATED

- **예상 질문** (good): "다중비교 보정은 했는가?"
- **전술**: justification
- **방어**: 5개 종속변수에 Bonferroni 보정(α=.01) 재수행, 주요 효과 유지.
- **해결책**: 재분석 표 첨부(검증된 산출물 → 강등 자격 충족).

### CAUS-2 (causality · critical) — proposed: UNRESOLVED

- **예상 질문** (good): "횡단 설계의 역인과는?"
- **전술**: deferral
- **방어**: 현 데이터로 역인과 배제 불가를 인정.
- **해결책**: _null — 종단 데이터 필요. Limitation 으로 승화._
- **주의**: fatal-flaw(Temporality) 축 → 억지 방어 금지, UNRESOLVED 유지.
```

> `tactic: sidestep` 또는 외부근거 없는 `justification` 의 `proposed_status`는 **mitigated/defended 가 될 수 없다**
> (검증된 산출물 부재) — chair가 `CONTESTED` 로 처리한다(orchestration §4.3).

## 4. 중간 산출물 (요약 포맷)

| 파일                         | 핵심 본문                                                                  |
| ---------------------------- | -------------------------------------------------------------------------- |
| `paper-profile.md`           | 유형·프로파일·소집 패널·주입 경로 + `absorb_map` 적용 내역                 |
| `paper-normalized.md`        | `§<섹션>¶<문단>` 헤더 + chair-부여 줄 번호. 모든 인용의 공유 좌표계        |
| `findings/round-1-<axis>.md` | frontmatter(§5.1) + 축별 finding 서술(claim·evidence·anticipated_question) |
| `findings/round-3-<axis>.md` | frontmatter(§5.4) + 방어 수용/거부 사유                                    |
