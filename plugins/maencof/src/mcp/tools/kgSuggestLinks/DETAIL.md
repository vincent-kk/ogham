# kgSuggestLinks — Contract

## Requirements

- 태그 Jaccard 후보와 SA 보강을 결합해 연결을 제안한다. candidates_explored는 태그 후보 수이며 0은 어휘가 겹치지 않아 탐색이 시작되지 않았다는 의미다.
- archive 스텁은 태그가 온전해도 종합 점수를 침강시킨다. 증류 뒤 남은 스텁이 제안 상위를 차지하지 않게 하되 tag_score·sa_score 원값은 보존한다.
- seedResolution은 명시 입력 tags의 해석만 보고한다. path의 태그는 정의상 vault에 있고 content_hint의 추출 단어는 투기적이므로 사용자 입력의 실패처럼 보고하지 않는다.

## API Contracts

candidates_explored가 0이면 태그가 후보와 겹치지 않아 탐색이 시작되지 않았다는 신호다. seedResolution은 호출자가 명시한 tags만 대상으로 하고 path 유래 태그나 투기적으로 추출한 키워드는 포함하지 않는다.

## Acceptance Criteria

행동별 결과와 경계값은 이 모듈을 검증하는 테스트가 고정한다.

## Last Updated

태그 후보와 SA 보강의 의미, archive 스텁 침강 또는 명시 tags의 해석 보고 범위가 바뀔 때 갱신한다.
