# configScope/merge — 계층 문서 순수 연산

## Requirements

- 두 config 레이어 문서를 합치고, project가 재정의한 자리를 열거하고, 지정한
  경로를 지우고, 쓰기 전 위험 키를 턴다.
- 값의 의미를 모른다. plain object와 그 밖만 구분하며, 스키마 검증은 호출자 몫이다.
- 모든 함수가 순수하다. 입력을 변형하지 않고 새 객체를 반환한다.
- node 내장 모듈을 import하지 않는다. 이 모듈은 브라우저 설정 페이지 번들과 훅
  번들에 동시에 들어가므로, 내장 하나가 브라우저 번들을 깨고 훅 번들을 불린다.

## API Contracts

외부 소비자는 `@ogham/cross-platform` 패키지 루트에서 이 API를 가져온다.

`FORBIDDEN_KEYS` 와 `isPlainObject` 는 형제 fractal `layers/` 가 직접 소비하고,
기존 공개 계약을 보존하기 위해 패키지 루트에서도 재노출한다.

`stripForbiddenKeys` 는 형제 레이어 writer 가 쓰기 직전에 부르는 단계다.

병합 우선순위는 `user < project`. 배열·원시값·`null` 은 override가 통째로
교체한다 — 인덱스 단위로 병합하면 project 레이어가 목록을 줄일 수 없다.

병합은 얕은 복사 기반이라 override가 건드리지 않은 중첩 객체는 base와 참조를
공유한다. 반환값은 읽기 전용으로 쓴다.

## Acceptance Criteria

### MERGE-2 — 위험 키는 대입 전에 걸러진다

- `__proto__`·`constructor`·`prototype` 은 병합 결과에 들어가지 않는다.
  입력이 디스크의 JSON이고 `JSON.parse` 가 `__proto__` 를 own key로 만들기 때문에
  실제 벡터다.
- `stripForbiddenKeys` 와 `mergeConfigLayers` 의 재귀 범위가 같다: plain object
  안으로만 들어가고 배열은 건드리지 않는다. 범위가 갈리면 쓰기와 병합이
  "위험한 키"를 서로 다르게 정의하게 된다.
- own key 판정은 `Object.hasOwn` 을 쓴다. `in` 은 프로토타입 체인을 본다.

## Last Updated

병합 우선순위·위험 키 제거 또는 브라우저 순수성의 보장 범위가 바뀔 때 갱신한다.
