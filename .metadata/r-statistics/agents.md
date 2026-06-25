# r-statistics — 에이전트

3종. `agents/{id}.md` (filid/imbas 패턴). `analyze`(Dispatcher)가 `Task(subagent_type: "r-statistics:<id>")`로 호출. 에이전트는 **추천만**, 상태 전이는 Dispatcher.

## frontmatter 형식
```yaml
---
name: <agent-id>
description: <역할·범위>
model: opus|sonnet|haiku
tools: [Read, Grep, Glob, Bash, ...]      # MCP 도구는 mcp_* 로 접근
maxTurns: <N>
---
```

## 역할 분담 (WHAT / HOW / VALID)
| 에이전트 | 책임 | 질문 | model | 주요 도구 |
|----------|------|------|-------|----------|
| **statistician** | 데이터+가설 → 기법 선택(결정트리), 분석계획(SAP) 작성, 가정 위반 시 재선택 | WHAT | opus | Read, Grep, mcp_assert_analysis_plan |
| **r-expert** | R 코드 생성·`run_r` 실행·트러블슈팅, 패키지 선택, R 공식문서 참조 | HOW | sonnet | Read, Bash, mcp_run_r, mcp_get_r_job |
| **methodology-validator** | SAP 부합성·다중비교 전략·효과크기·결과 타당성 (soft) | VALID | sonnet | Read, mcp_assert_analysis_plan |

## statistician
- 입력: dataset_profile(데이터 프로파일) + 가설/분석 목표.
- 출력: SAP `{ question, outcomeType, variables, selectedMethod:{technique,family,rationale,alternatives}, requiredAssumptions, multiplicityPlan }`.
- 핵심: **기법은 statistician만 변경 가능**(r-expert는 SAP 못 바꿈). assert/validator가 위반 반환 시 재선택.
- 참조: 결정트리(`(결과변수 × 구조 × 가정)`), `methods/{technique}/meta.yaml`.

## r-expert
- 입력: SAP + 데이터 + `methods/{technique}/template.R.tmpl`.
- 출력: R 코드(템플릿 slot 채움) → `run_r` → result/plot/table 아티팩트.
- 트러블슈팅: `run_r` 에러(stderr/exitCode) → 진단·수정·재실행(rRepair guard 한계 내).
- R 공식 리소스(방법론 기준, 도메인 중립):
  - R Project https://www.r-project.org/ · CRAN https://cran.r-project.org/ · 매뉴얼 https://cran.r-project.org/manuals.html
  - CRAN Task Views https://cran.r-project.org/web/views/ — **방법론**: Distributions·Bayesian·MixedModels·Survival·TimeSeries·MetaAnalysis·Multivariate (응용 도메인 뷰 비참조)
  - help https://stat.ethz.ch/R-manual/ · ggplot2 https://ggplot2.tidyverse.org/

## methodology-validator
- 입력: SAP + 실행 결과 아티팩트 + assumption 아티팩트.
- 출력: `{ status: "ok"|"soft_warning"|"block", findings:[{severity, category, message, recommendedAction}], requiresStatisticianRevision }`.
- 범위(soft): SAP 일탈·가정 처리 적절성·다중비교 보정·효과크기 보고·해석 타당성.
- hard gate는 담당 아님(그건 `assert_analysis_plan` MCP). validator는 판단형 검토.

## hand-off 계약
immutable·versioned. Dispatcher가 각 에이전트에 SAP·아티팩트 참조·사전 결정(audit trail) 전달, 에이전트는 구조화된 델타 반환. 상세 [dispatcher.md](./dispatcher.md).
```ts
interface AgentHandoff {
  from: "dispatcher"; to: "statistician"|"r_expert"|"methodology_validator";
  state: PipelineState;
  context: { sap?: SAP; artifactRefs: ArtifactRef[]; priorDecisions: DecisionRecord[]; mode: "interactive"|"auto" };
}
```
