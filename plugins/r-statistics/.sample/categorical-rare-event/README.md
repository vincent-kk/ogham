# Categorical Rare Event

## 파일

- `data.csv`: 범주형 설명변수와 희귀한 이진 결과를 포함한 원자료입니다. 각 행은 독립 관측치 1개입니다.

## 통계적 특성

- `event_30d`는 희귀 사건이며 전체 발생률이 낮습니다.
- `treatment`, `region`, `risk_band` 분포가 균형적이지 않아 교란과 층화 필요성을 테스트할 수 있습니다.
- `risk_band`가 높을수록 사건 가능성이 커지고, `intervention`은 평균적으로 사건 가능성을 낮추도록 설계했습니다.
- 일부 층에서는 사건 수가 적어 카이제곱 근사, Fisher exact test, 로지스틱 회귀의 안정성을 점검할 수 있습니다.

## 권장 테스트

- contingency table, Fisher exact test, logistic regression, 층화 분석, 희귀사건에서의 신뢰구간/완전분리 진단.
- 전체 효과와 층화 효과가 달라지는지 확인.
