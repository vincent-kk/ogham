# Repeated Measures Missingness

## 파일

- `data.csv`: 반복측정 long format 원자료입니다. 각 행은 특정 피험자의 특정 방문 시점입니다.

## 통계적 특성

- 54명 피험자, 5개 시점(0, 2, 4, 6, 8주)으로 구성되어 있습니다.
- 같은 `subject_id` 내부 관측치는 독립이 아니며, 개인별 baseline 차이가 있습니다.
- `enhanced` 군은 시간에 따른 평균 감소 폭이 더 크게 설계했습니다.
- 후반 시점에는 결측이 있으며, baseline 수준과 condition에 따라 결측 가능성이 달라지는 MAR에 가까운 구조입니다.
- 결측 값은 CSV에서 빈 칸으로 남겨 두었고, `observed`가 관측 여부를 나타냅니다.

## 권장 테스트

- paired 분석과 독립분석의 차이 확인, mixed-effects model, repeated measures ANOVA, 결측 처리 전략 비교.
- 결측 행을 단순 삭제했을 때 추정이 흔들리는지 확인.
