# configManager — Contract

## Requirements

- 설정은 `user` 와 `project` 두 계층이다. `project` 는 `<cwd>/.imbas/config.json`, `user` 는 호스트 상태 루트에 있으며 `project` 가 `user` 를 재정의한다.
- 스키마 검증은 **병합 결과에만** 건다. `project` 계층은 재정의한 키만 담으므로 단독으로는 스키마를 통과할 수 없다.
- 저장 대상 계층은 호출자가 지목한다. 기본값을 두지 않는다 — 둘 다 유효한 대상이라 조용한 기본값은 잘못된 파일을 덮어쓴다.
- 두 계층이 모두 없는 상태는 오류가 아니라 정상이다. 검증된 기본값을 돌려준다.
- 병합 결과를 어느 한 계층에 되쓰지 않는다. 되쓰면 `project` 재정의가 `user` 기본값으로 구워진다.
- 알려진 한계: 설정 페이지의 project 저장은 필드별 재정의 화면이 없어 폼 스냅샷 전체를 project 계층에 쓰므로 이 규칙을 지키지 못한다. 해소는 저장되는 project 설정을 바꾸는 별도 결정이다.

## API Contracts

- `updateConfigLayer`는 지정 계층 원본만 갱신하고, 쓰기 전에 갱신이 만들 병합 결과를 검증한다. 유효하지 않은 변경이 다음 조회를 망가뜨리지 않아야 한다.
- `saveConfig`는 호출자가 명시적으로 저장할 전체 문서를 받는다. 사용자 계층 편집에 프로젝트 병합 결과를 넘기지 않아야 프로젝트 결정을 사용자 기본값으로 확산시키지 않는다. 부분 갱신에는 이 전체 교체 표면을 사용하지 않는다.
- 경로 해석·병합 규칙은 `@ogham/cross-platform`이 소유한다. 여기서 다시 구현해 계층 좌표를 갈라놓지 않는다.

## Acceptance Criteria

### AC-config-merge-only-validation — 병합 결과만 검증

- `project` 계층 파일 하나만 있고 필수 키가 빠져 있어도 `loadConfig` 가 병합 후 성공한다.
- `project` 계층 파일 단독으로 스키마 검증을 수행하는 경로가 없다.

### AC-config-explicit-scope — 저장 계층 명시

- `saveConfig` 의 scope 인자에 기본값이 없다.
- scope 없이 호출하면 타입 검사에서 실패한다.

### AC-config-no-merged-writeback — 병합 결과 되쓰기 금지

- `saveConfig` 가 쓰는 내용이 `loadConfig` 의 병합 결과가 아니라 지목된 계층의 값이다.

### AC-config-no-direct-fs — 직접 파일 I/O 부재

- `configManager/**` 에 `fs.writeFileSync` 직접 호출이 없다.

## Last Updated

설정 계층·부분 갱신·검증 계약의 내용과 근거가 바뀔 때 갱신한다.
