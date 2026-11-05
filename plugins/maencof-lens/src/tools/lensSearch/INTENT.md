## Purpose

`search` 툴 핸들러. Spreading Activation 기반으로 시드 키워드에서 볼트 지식을 검색한다.

## Conventions

- 시드의 분해·정규화와 랭킹은 maencof가 소유한다. 어댑터가 입력을 바꾸면 항목 사이 합집합과 항목 안 AND 의미가 달라진다.
- cluster 열거는 maencof에서 레이어를 거르지 않으므로 응답 상한을 이 어댑터가 적용한다. 전역 `clusterSize`를 필터 후 개수로 바꾸지 않는다.

## Boundaries

### Always do

- 시드의 의미와 본가 기본값을 보존하고 cluster 열거에는 상한 후필터를 적용한다
- 이 경계의 계약 변경은 해당 검증과 함께 갱신하여 소비자와 구현이 어긋나지 않게 한다

### Ask first

- 공개 API 시그니처 변경
- 다른 모듈에 대한 새로운 의존성 추가

### Never do

- 순환 의존성 도입
- organ 경계를 넘는 직접 import
