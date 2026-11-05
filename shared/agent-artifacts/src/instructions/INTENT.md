## Purpose

호스트가 읽는 지침 파일에서 한 소유자의 마커 구간을 검사하고 계획·적용한다.
파일 전체가 아니라 주소가 지정된 구간만 관리한다.

## Conventions

- 기본 marker는 owner 대문자 namespace와 선택적 section id로 만든다.
- 기존 Maencof marker와 sibling backup은 명시적 호환 옵션으로 유지한다.
- 훅 구현은 범용 plan/apply/revision/locking 그래프와 분리하되, 외부 소비자는 패키지 루트에서 필요한 심볼을 가져온다.

## Boundaries

### Always do

- marker 밖 텍스트를 바이트 단위로 보존한다.
- malformed/overlapping marker를 수정하지 않고 conflict로 보고한다.
- 훅 writer도 실제 기존 파일 변경에만 sibling backup을 만든다.

### Ask first

- marker 문법, backup 정책, 유효 지침 후보 순서 변경.

### Never do

- 파일 전체를 소유한 것으로 간주하거나 drift를 묵시적으로 교체.
- cross-platform의 순수 marker 연산을 중복 구현.
- hook 구현에서 범용 manager, transaction, lock 모듈 import.
