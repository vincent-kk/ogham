# prawf 분야 프로파일 (분야 프로파일 데이터)

> 보편 코어 페르소나에 **분야 전문성을 주입하는 데이터 레이어**. 페르소나([personas.md](./personas.md))의
> 정체성은 분야 무관 *불변 질문*이고, 분야별 프레임워크는 본 문서의 프로파일이 *메뉴*로 주입한다.
> 이 데이터는 **review P0가 논문 내용으로 분야를 자동 판정할 때 사용하는 분야 데이터**다 —
> 평가 동작이 아니라 *참조 데이터*이며, 별도 주입 통로 없이 P0 자동 판정에 직접 쓰인다.

## 1. 개념 — 축은 코어, 프레임워크는 데이터

| 구성                                            | 위치                    | 분야 의존 |
| ----------------------------------------------- | ----------------------- | --------- |
| 페르소나 정체성 (불변 질문)                     | `agents/<id>.md` (코어) | **무관**  |
| 프레임워크 메뉴 · 유형 taxonomy · severity 예시 | 분야 프로파일 (config)  | **의존**  |

이로써 동일한 9인이 의학 논문이든 ML 논문이든 동작한다 — 주입되는 프로파일만 바뀐다.
critic 권고("axis = invariant question, framework = variable menu")와 gemini 공통 4축(투명성·건전성·재현성·맥락화)의 구현체다.

## 2. 프로파일 스키마

```yaml
# .prawf/profiles/<name>.yaml
profile: <name>
axis_frameworks: # 축 id → 활성 프레임워크 메뉴
  argument: [<framework>, ...]
  methodology: [...]
  statistics: [...]
  causality: [...]
  bias: [...]
  integrity: [...]
  impact: [...]
disabled_axes: [<axis>, ...] # statistics·causality·bias 만 가능 (argument·methodology·integrity는 비활성 불가)
absorb_map: { <disabled-axis>: <흡수처 axis> } # 비활성 축의 점검 임무를 어느 축으로 이전하는지
paper_types: # 유형 → 소집 축 (P0 패널 선출 입력)
  - { type: <name>, axes: [...], guideline: <ref> }
severity_examples: # 축별 critical/major/minor 앵커 예시
  <axis>: { critical: "...", major: "...", minor: "..." }
external_checks: [<항목>, ...] # capability 부재 시 reasoning_gap 처리 대상
```

## 3. 기본 프로파일: `empirical-science` (실증과학·의학 역점)

보고서 native 도메인. 미지정 시 이 프로파일을 기본 적용한다.

```yaml
profile: empirical-science
axis_frameworks:
  argument: [toulmin, logical-fallacies]
  methodology:
    [cook-campbell-validity, equator-consort, equator-strobe, equator-prisma]
  statistics: [p-curve, multiple-comparison, preregistration-match]
  causality: [bradford-hill]
  bias: [rob2, robins-i, grade, newcastle-ottawa]
  integrity: [data-fabrication, image-forensics, coi, outcome-switching]
  impact: [nature-broad-consequence, lancet-mcid, health-equity]
disabled_axes: []
paper_types:
  - { type: rct, axes: [all], guideline: consort }
  - { type: observational, axes: [all], guideline: strobe }
  - {
      type: meta-analysis,
      axes: [argument, methodology, statistics, bias, impact],
      guideline: prisma,
    }
  - {
      type: qualitative,
      axes: [argument, methodology, integrity, impact],
      guideline: srqr,
    }
severity_examples:
  causality:
    {
      critical: "Temporality 위반(역인과)",
      major: "교란 미통제 인과주장",
      minor: "메커니즘 설명 부족",
    }
external_checks: [선행연구 정합성, 사전등록 대조, 출판편향, 표절]
```

## 4. 추가 프로파일

### 4.1 `cs-ml` (컴퓨터과학·머신러닝)

```yaml
profile: cs-ml
axis_frameworks:
  argument: [contribution-clarity, logical-fallacies]
  methodology: [ablation-study, reproducibility-badge, experimental-protocol]
  statistics:
    [data-leakage, seed-variance, benchmark-fairness, baseline-fairness]
  causality: [ablation-causal, confound-control] # 약화 — 인과주장 논문에만
  bias: [dataset-bias, artifact-availability]
  integrity: [code-data-availability, benchmark-cherry-picking, plagiarism]
  impact: [acl-excitement, sota-contribution]
disabled_axes: []
paper_types:
  - { type: empirical-ml, axes: [all], guideline: neurips-checklist }
  - {
      type: systems-benchmark,
      axes: [methodology, statistics, bias, integrity],
      guideline: acm-artifact,
    }
  - { type: theory-ml, axes: [argument, statistics], guideline: null }
severity_examples:
  statistics:
    {
      critical: "test-set 오염(data leakage)",
      major: "seed 분산 미보고·baseline 불공정",
      minor: "하이퍼파라미터 미공개",
    }
external_checks: [벤치마크 누수, SOTA 비교 공정성, 코드 재현]
```

### 4.2 `math-theory` (수학·이론)

```yaml
profile: math-theory
axis_frameworks:
  argument: [
      proof-line-by-line,
      assumption-strength,
      formalizability,
      inference-leap-check,
    ] # 핵심 축 (+causality 흡수)
  methodology: [proof-structure]
  statistics: [counterexample, numerical-stability]
  causality: [] # 비활성 → argument 흡수
  bias: []
  integrity: [plagiarism, prior-result-attribution]
  impact: [theorem-generality, applicability]
disabled_axes: [causality, bias]
absorb_map: { causality: argument, bias: methodology } # 비활성 축 점검을 흡수처로 이전
paper_types:
  - { type: pure-proof, axes: [argument, integrity, impact], guideline: null }
  - {
      type: computational,
      axes: [argument, statistics, integrity],
      guideline: null,
    }
severity_examples:
  argument:
    {
      critical: "증명 단계 오류·순환논증",
      major: "가정이 과도하게 강함",
      minor: "표기 비일관",
    }
external_checks: [선행 정리 귀속, 표절]
```

### 4.3 `humanities-qualitative` (인문·정성)

```yaml
profile: humanities-qualitative
axis_frameworks:
  argument: [interpretive-validity, groundedness, logical-coherence]
  methodology: [coreq, reflexivity, data-saturation]
  statistics: [] # 비활성
  causality: [] # 비활성
  bias: [researcher-positionality, confirmation-bias]
  integrity: [source-attribution, plagiarism]
  impact: [discourse-contribution, situating]
disabled_axes: [statistics, causality]
absorb_map: { statistics: methodology, causality: argument } # 비활성 축 점검을 흡수처로 이전
paper_types:
  - {
      type: interpretive,
      axes: [argument, methodology, bias, integrity, impact],
      guideline: srqr,
    }
  - {
      type: ethnographic,
      axes: [argument, methodology, bias, integrity],
      guideline: coreq,
    }
severity_examples:
  argument:
    {
      critical: "1차 사료가 해석을 지지하지 않음",
      major: "대안 해석 미고려",
      minor: "맥락화 부족",
    }
external_checks: [1차 사료 귀속, 표절, 담론 위치]
```

> `social-science` 는 `empirical-science` 를 상속하되 구성개념 타당도·WEIRD 표본 경고를 강조한다(프로파일 생략 시 기본 폴백).

## 5. 주입 메커니즘

우선순위 (높은 쪽이 우선):

1. **`--profile <name>` override** — `/prawf:review --profile=cs-ml` (명시 지정, 선택)
2. **P0 자동 판정 (기본)** — chair가 논문 내용으로 유형·분야를 추론해 내장 프로파일 선택
3. **보편 폴백** — §6 (내장에 없는 미지의 분야)
4. **(선택) 커스텀 yaml** — 사용자가 작성한 `.prawf/profiles/<name>.yaml` 이 있을 때만 후보에 추가

**무결성 제약 (P0 검증)**: 주입 프로파일은 (1) 필수 키·축 참조 정합성, (2) `severity_examples` 존재를 만족해야 하며,
**필수 soundness 축 `argument·methodology·integrity` 는 `disabled_axes` 로 끌 수 없다**(statistics·causality·bias만
`absorb_map` 동반 시 조건부 비활성). 위반 시 chair는 프로파일을 거부하고 보편 폴백한다.

> 별도 설정 파일 없이 동작한다 — 분야 데이터는 본 문서의 내장 프로파일로 충분하다.
> 설정 파일(`.prawf/profiles/<name>.yaml`)은 사용자가 커스텀 분야를 둘 때만 생긴다.

## 6. 폴백 — 보편 메뉴 (프로파일 미지정·미지 분야)

프로파일을 특정할 수 없으면 각 축을 *분야 무관 핵심*으로 폴백한다:

| 축          | 보편 폴백 질문                                            |
| ----------- | --------------------------------------------------------- |
| argument    | 논증·추론에 형식적 오류나 비약이 없는가                   |
| methodology | 방법과 절차가 투명·재현 가능하게 보고되었는가             |
| statistics  | 데이터·분석에 자의적 선택이 은폐되지 않았는가             |
| causality   | 인과·메커니즘 주장이 근거에 비례하는가 (비해당 시 비활성) |
| bias        | 내재 편향이 통제되고 결과가 재현 가능한가                 |
| integrity   | 표절·조작·이해상충이 없는가                               |
| impact      | 기여가 명료하고 맥락 안에 위치하는가 (advisory)           |

폴백 사용 시 chair는 `review-report.md` 에 _"generic profile — 분야 특화 점검 미적용"_ 을 명시한다.
