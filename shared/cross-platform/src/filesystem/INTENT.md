## Purpose

상위 Ogham 패키지가 파일을 안전하게 읽고 교체하기 위한 동기식 시스템 호출 경계다.

## Conventions

- "없음"만 `null`, `[]`, `false`로 낮추고 권한/형식 오류는 throw한다.
- host가 실제로 해석하는 target 경로는 referent가 없는 symlink도 따라가 가장 가까운 기존 ancestor의 real path와 suffix를 결합하며, unlink 판정은 terminal directory entry를 보존한다.
- 공개 함수와 내부 보조 함수 모두 파일당 하나만 선언한다.
- 외부 소비자는 패키지 루트만 쓰고, 같은 패키지 subtree는 소유한 concrete 구현을 직접 import할 수 있다.
- hook 격리는 `sideEffects: false` tree-shaking과 emitted byte·output forbidden-pattern guard로 검증한다.
- 파일은 같은 디렉터리의 고유 임시 파일을 rename해 교체한다.
- 잠금은 원자적 lock-directory, owner token, stale quarantine을 사용한다.
- 신뢰한 root 자체는 허용하고 그 아래 기존 symlink segment만 거부한다.

## Boundaries

### Always do

- 임시 파일과 lock cleanup은 정확한 sibling 경로로 제한한다.
- lock timeout은 `acquired: false`로 반환한다.
- 기존 파일 권한은 별도 mode가 없으면 보존한다.
- 경계 판정 전 target canonicalization은 symlink ancestor와 case alias를 실제 host 해석대로 보존하고, Delete는 terminal symlink 자체를 판정한다.

### Ask first

- 비동기 API 추가 또는 lock 파일 형식 변경.

### Never do

- 잠금 없이 timeout 이후 작업 실행.
- 재귀 삭제 대상을 검증되지 않은 경로나 root로 확장.
- ENOENT 이외 오류를 "없음"으로 숨김.
