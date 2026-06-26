# r-statistics — assert_analysis_plan 표준 룰셋

순수 통계 기준(도메인 중립). 기법별 가정은 `methods/{technique}/meta.yaml`에 선언, `assert_analysis_plan`이 정규화 필드로 결정론적 검증.

## severity 2단계

- **hard**: 통계적으로 명백히 부적합 → `interactive`·`auto` 모두 차단(statistician 재선택).
- **soft**: 가정 위반이나 판단 여지 → `interactive` 경고+대화 / `auto` 엄격 재선택.

## hard 룰 (항상 차단)

| 코드                      | 조건                                                                  |
| ------------------------- | --------------------------------------------------------------------- |
| `OUTCOME_METHOD_MISMATCH` | 결과변수 타입 ↔ 기법 불일치 (연속형에 카이제곱, 이분형에 선형회귀 등) |
| `SAMPLE_TOO_SMALL`        | 최소 표본 미달 (t-test 그룹당 n<2; 회귀 EPV 심각 부족)                |
| `EXPECTED_COUNT_LOW`      | 카이제곱 기대빈도 다수 <5인데 Fisher 미전환                           |
| `MISSING_REQUIRED_INPUT`  | 필수 변수/데이터 부재                                                 |

## soft 룰 (기법별 가정 매핑)

| 기법 (technique)                           | family        | 가정 (assumptionId)                                                                          | 검증                                          | 위반 권고                                    |
| ------------------------------------------ | ------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------- | -------------------------------------------- |
| `t_test`                                   | parametric    | normality, homogeneity                                                                       | shapiro · levene                              | 비정규→`mann_whitney`, 이분산→`welch_t_test` |
| `paired_t`                                 | parametric    | normality_of_diff                                                                            | shapiro(diff)                                 | →`wilcoxon_signed_rank`                      |
| `anova`                                    | parametric    | residual_normality, homogeneity                                                              | shapiro(resid) · levene                       | →`kruskal_wallis` / `welch_anova`            |
| `mann_whitney`·`kruskal_wallis`·`wilcoxon` | nonparametric | independence                                                                                 | —                                             | (모수 가정 불요)                             |
| `linear_regression`                        | regression    | linearity, residual_normality, homoscedasticity, independence, no_multicollinearity          | resid plot · BP test · VIF                    | 변환 / robust SE / 변수정리                  |
| `logistic_regression`                      | regression    | logit_linearity, no_multicollinearity, epv_ge_10                                             | box-tidwell · VIF                             | 변환 / 표본확보                              |
| `poisson_regression`                       | regression    | mean_equals_variance                                                                         | dispersion test                               | 과대산포→`negative_binomial`                 |
| `cox_model`                                | survival      | proportional_hazards, loglinearity                                                           | cox.zph · schoenfeld                          | 시간상호작용 / 층화                          |
| `chi_square`                               | categorical   | expected_count_ge_5                                                                          | expected counts                               | <5→`fisher_exact`                            |
| `pearson_correlation`                      | correlation   | normality, linearity                                                                         | shapiro · scatter                             | →`spearman_correlation`                      |
| `gam`                                      | regression    | residual_normality, homoscedasticity                                                         | shapiro · resid plot                          | 비선형은 모델이 흡수, 잔차 가정만            |
| `spline_regression`                        | regression    | residual_normality, homoscedasticity                                                         | shapiro · BP test                             | 기저함수 공선성 미검사                       |
| `ancova`                                   | regression    | linearity, residual_normality, homoscedasticity, homogeneity_of_slopes, no_multicollinearity | resid plot · shapiro · BP · interaction · VIF | 회귀기울기 동질성 gating                     |
| `cmh`                                      | categorical   | independence                                                                                 | design                                        | Breslow-Day(OR 동질성) 수동                  |

**미등록 기법**: `TECHNIQUE_RULES`에 없는 technique → `unregistered_technique` soft 경고(`interactive` 허용+공개, `auto` 차단·재선택). 더 이상 `ok`로 조용히 통과하지 않음.

## meta.yaml 예 (`methods/t_test/meta.yaml`)

```yaml
technique: t_test
family: parametric
outcome_types: [continuous]
required_assumptions:
  - id: normality
    severity: soft
    check: shapiro
    on_violation: { recommend: [mann_whitney] }
  - id: homogeneity
    severity: soft
    check: levene
    on_violation: { recommend: [welch_t_test] }
hard_rules: [OUTCOME_METHOD_MISMATCH, SAMPLE_TOO_SMALL]
required_artifacts: [result.hypothesis_test, table.test_summary]
packages: [stats, broom, rstatix]
```

## 입력 아티팩트 연동

`assumption-check` 스킬이 `run_r`로 가정검정을 수행해 `assumption.{id}` 아티팩트(passed: bool) 생성 → `assert_analysis_plan`의 `assumptionArtifacts`로 전달 → 룰 평가. 가정 아티팩트 부재 시 해당 soft 룰은 "미검증" 경고.

## 다중비교

복수 검정 시 `reporting`/statistician의 multiplicityPlan(Bonferroni/Holm/BH-FDR) 적용. 보정 미적용 다중검정 결과의 export는 validator가 soft block(`auto`에서 엄격).
