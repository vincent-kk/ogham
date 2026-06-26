# Balanced Normal Groups

## 파일

- `data.csv`: 균형 잡힌 2군 연속형 결과 데이터 원자료입니다. 각 행은 독립 참가자 1명입니다.

## 통계적 특성

- 표본 수는 120명이며 `control` 60명, `treatment` 60명으로 균형입니다.
- `baseline_score`와 `outcome_score`는 대체로 정규분포에 가깝고, 군별 분산 차이는 작게 설계했습니다.
- `treatment`에는 평균적으로 약한 양의 효과가 있으며, `baseline_score`는 `outcome_score`와 양의 상관을 갖습니다.
- `age`와 `segment`는 공변량 또는 층화 변수 테스트에 사용할 수 있습니다.

## 권장 테스트

- 두 표본 t-test, Welch t-test, ANCOVA, 선형회귀, 정규성/등분산성 검정.
- 효과크기와 신뢰구간 보고 품질 확인.
