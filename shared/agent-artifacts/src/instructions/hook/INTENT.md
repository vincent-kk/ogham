## Purpose

크기 제한 훅이 이미 해석된 지침 후보에서 한 marker 구간만 검사하고 동기화한다.

## Conventions

- 범용 manager보다 약한 동기식 compatibility writer임을 API 이름에 드러낸다.
- 대상 해석은 호출자가 목적별 target resolver로 먼저 끝낸다.
- 외부 소비자는 `@ogham/agent-artifacts` 루트에서 공개 심볼만 import한다.
- 같은 패키지 subtree의 읽기·쓰기 훅은 각각 `status/`·`apply/` concrete
  파일을 직접 import한다.
- hook 격리는 `sideEffects: false` tree-shaking과 emitted byte·output
  forbidden-pattern guard로 검증한다.

## Boundaries

### Always do

- marker 밖 바이트와 다른 소유자 구간 보존
- malformed·duplicate·복수 후보를 conflict로 거부
- 기존 파일을 실제 변경할 때만 sibling `.bak` 생성
- effective placement의 가려진 구간 재배치

### Ask first

- lock/revision 보장 또는 backup 정책 추가

### Never do

- 범용 manager·planning·transaction·locking 모듈 import
- root/host 재해석 또는 파일 전체 소유
