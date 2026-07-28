## Purpose

두 config 레이어를 합치고, 무엇이 재정의되었는지 세고, 재정의를 지운다. 값의
의미는 모른다 — plain object와 그 밖의 값만 구분하는 순수 문서 연산이다.

## Structure

| File                     | Role                                |
| ------------------------ | ----------------------------------- |
| `index.ts`               | public barrel                       |
| `mergeConfigLayers.ts`   | user 위에 project를 재귀 병합       |
| `listOverriddenPaths.ts` | project 리프의 dot path 열거        |
| `clearConfigPaths.ts`    | dot path 목록 삭제                  |
| `utils/isPlainObject.ts` | 순수 객체 판정 3단                  |
| `utils/forbiddenKeys.ts` | 프로토타입을 건드리는 키 목록       |
| `utils/removePath.ts`    | segment 열 하나 삭제와 빈 상위 정리 |

## Conventions

- 모든 함수는 순수하고 입력을 변형하지 않는다.
- 병합은 얕은 복사 기반이라 override가 건드리지 않은 중첩 객체는 base와 참조를
  공유한다. 반환값은 읽기 전용으로 쓴다.
- 스키마를 모른다. 검증은 `Record<string, unknown>`을 받은 호출자가 한다.

## Boundaries

### Always do

- 배열·원시값·`null`은 override가 통째로 교체한다. 인덱스 단위로 병합하면
  project 레이어가 목록을 줄일 수 없다.
- 키를 대입하기 전에 `FORBIDDEN_KEYS`를 거른다. 입력은 디스크의 JSON이고
  `JSON.parse`는 `__proto__`를 own key로 만든다.
- own key 판정은 `Object.hasOwn`을 쓴다. `in`은 프로토타입 체인을 본다.

### Ask first

- 병합 규칙 변경 (배열 교체, 재귀 조건).
- `FORBIDDEN_KEYS` 목록 변경.

### Never do

- node 내장 모듈 import. 이 모듈은 브라우저 설정 페이지 번들과 훅 번들에
  동시에 들어간다. `__tests__/pureImports.test.ts`가 이를 강제한다.
- 레이어 원문 정화. 걸러내는 지점은 병합 한 곳이며, 읽기 계층은 원문을 보존한다.

## Dependencies

- 내부: 없음.
- 외부: 없음.
