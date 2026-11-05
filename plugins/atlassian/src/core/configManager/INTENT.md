[filid:lang:ko]

## Purpose

Atlassian 설정 파일의 로드·저장·병합. user(플러그인 데이터 디렉터리)와 project(`<workspace>/.atlassian/config.json`) 두 레이어이며 project 가 user 를 재정의한다 — 저장소 하나가 개인 기본값과 다른 사이트를 가리킬 수 있게 하기 위함이다. **credentials 는 레이어링하지 않는다**: project 레이어는 워킹트리 안에 있어 비밀이 `git add .` 한 번 거리에 놓인다.

## Conventions

유효 설정과 개별 레이어 원문을 구별한다. 병합 결과를 되쓰면 프로젝트 재정의가 개인 기본값에 굳어진다.

## Boundaries

### Always do

- 검증은 **병합 결과에만** 건다. project 레이어는 재정의한 키만 담아 단독으로 스키마를 통과할 수 없다. `saveConfig` 는 주어진 문서를 그대로 쓰고, 호출자가 병합 미리보기를 검증한다.
- 두 레이어 모두 `0o600` 으로 쓰고, project 디렉터리에는 생성 시 `.gitignore` 를 동봉한다.
- 설정 파일 부재 시 빈 기본값을 반환하고, 그 외 오류는 상위로 전파한다.
- `mergeConfig` 는 **레이어 병합이 아니다** — 한 문서 안의 얕은 patch 이며, 병합 후 스키마 파싱으로 유효성을 재확인한다.
- index.ts 배럴을 통해서만 외부에 심볼을 노출한다.
- Win32 에서는 `chmod 0o600` 가 no-op 이며, 호스트 resolver가 선택한 설정 부모 디렉토리의 NTFS ACL (기본값: 현재 사용자 전용 상속) 이 파일 보호를 담당함을 호출자에게 README Security 섹션으로 안내한다.

### Ask first

- `AtlassianConfig` 스키마 구조(필드 추가·제거) 변경.
- 설정 파일 기본 경로(`CONFIG_PATH`) 정책 변경.

### Never do

- mcp/ 레이어에서 import하지 않는다 (단방향: mcp → core).
- credentials 를 project 레이어에 쓰지 않는다.
- 병합 결과를 어느 한 레이어에 되쓰지 않는다 — project 재정의가 user 기본값에 구워진다.
- 다른 core 모듈의 상태를 이 모듈 내부에서 직접 변경하지 않는다.
