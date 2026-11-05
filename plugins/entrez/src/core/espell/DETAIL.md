# espell — Contract

## Requirements

- 재시도 판단과 교정 해석을 분리한다. 판단은 순수 함수이고, 네트워크는 `EspellFn` 으로 주입한다.
- union 결과가 0 이거나 저조하거나 spelling warning 이 있을 때만 재시도를 고려한다.

## API Contracts

호출 형태와 구체적인 반환 값은 공개 진입점과 테스트에서 확인한다.

## Acceptance Criteria

구체적인 입출력 수락 기준은 해당 모듈 테스트가 고정한다.

## Last Updated

철자 교정 재시도 판단과 교정 인정 정책이 바뀔 때 갱신한다.
