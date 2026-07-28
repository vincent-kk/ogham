## Purpose

플러그인 설정을 `user`(사용자 전역)와 `project`(프로젝트 로컬) 두 네임스페이스로
나눠 각각 읽고 쓰게 하고, 소비자에게는 project가 user를 재정의한 단일 병합
결과를 준다. 프로젝트마다 다른 설정을 허용하기 위한 계층이다.

## Structure

| Path       | Role                                   |
| ---------- | -------------------------------------- |
| `index.ts` | 하위 entry point의 이름 있는 재노출    |
| `types/`   | 레이어 좌표·문서·상태 타입 organ       |
| `merge/`   | 순수 문서 연산 (병합·재정의 열거·삭제) |
| `layers/`  | 파일 좌표 해석·읽기·쓰기·상태 조립     |

## Conventions

- 레이어 우선순위는 `user < project`다. 소비자가 세션 밸브 같은 상위 레이어를
  더 얹는 것은 각 플러그인의 몫이다.
- 스키마를 모른다. 소비자는 병합 결과만 검증한다 — project는 재정의된 키만
  담은 부분 문서라 단독으로는 strict 스키마를 통과할 수 없다.
- 프로젝트 루트는 호출자가 해석해 넘긴다. 앵커 규칙(git root / repo root /
  인자 cwd)이 플러그인마다 다르다.

## Boundaries

### Always do

- 병합은 언제나 `mergeConfigLayers`로 한다. 런타임과 설정 페이지가 다르게
  합치면 "보이는 값"과 "먹는 값"이 갈라진다. 읽기와 병합 사이에 낄 단계가
  없는 소비자는 `buildConfigScopeState` 하나로 끝낸다.
- 브라우저 번들과 훅 번들은 `config-scope/merge` subpath만 import한다.
  루트 배럴은 파일 I/O와 `env-paths` 그래프를 끌어온다.

### Ask first

- `ConfigScopeState` 필드 변경. 설정 페이지 8곳의 wire 계약이다.
- 레이어를 셋 이상으로 늘리기.

### Never do

- 레이어 원문을 정화하기. 위험 키를 거르는 지점은 병합 한 곳이다.
- 설정 페이지의 DOM을 여기서 다루기. 화면은 각 플러그인의 몫이고, 이 모듈이
  주는 것은 상태와 순수 연산뿐이다.

## Dependencies

- 내부: `filesystem`, `paths`.
- 외부: 없음.
