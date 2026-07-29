## Purpose

config 파일의 읽기, 쓰기, 기본값 생성을 담당하는 설정 로더. user(호스트 상태 루트)와 project(`<projectRoot>/.maencof-lens/config.json`) 두 레이어이며 project 가 user 를 재정의한다 — 저장소 하나가 자기 vault 를 가리킬 수 있게 하기 위함이다.

## Structure

| File                    | Role                                       |
| ----------------------- | ------------------------------------------ |
| `configLoader.ts`       | load(병합) · loadConfigScope · write(단일) |
| `utils/configLayers.ts` | 두 레이어 좌표 해석                        |
| `index.ts`              | barrel                                     |

## Conventions

- 검증은 병합 결과에만 건다. project 레이어는 재정의한 키만 담을 수 있다.
- `vaults` 는 배열이라 project 가 통째로 교체한다 — 목록을 **줄일** 수 있는 유일한 방법이다. 개인 목록을 그대로 쓰려면 project 에서 그 키를 생략한다.
- 저장 레이어는 호출자가 지목한다. 기본값을 두지 않는다.

## Boundaries

### Always do

- 이 모듈의 단일 책임을 유지한다
- 변경 시 관련 테스트를 함께 업데이트한다

### Ask first

- 공개 API 시그니처 변경
- 다른 모듈에 대한 새로운 의존성 추가
- 레이어 개수·우선순위 변경

### Never do

- 순환 의존성 도입
- organ 경계를 넘는 직접 import
- 병합 결과를 어느 한 레이어에 되쓰기 — project 재정의가 개인 기본값에 구워진다
