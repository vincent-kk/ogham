## Purpose

deilen 의 영속·런타임 상태를 관리하는 core fractal. config 로드/저장, 렌더 세션(meta.json·viewer.md) 영속과 long-poll resolver 레지스트리, project 스코프 해시를 담당한다. 세션 토큰은 공유 `@ogham/http-kit`이 소유한다. 호스트 상태는 호스트별 deilen 캐시 루트, 프로젝트 설정은 워크스페이스의 .deilen 디렉터리에 두어 스코프를 분리한다.

## Conventions

- 디스크 쓰기는 원자 교체로 부분 파일 방지 — 설정 레이어는 공유 `writeConfigLayer`, 세션·피드백·이미지는 로컬 `atomicWrite`
- 세션은 `project_hash` 스코프 — 다른 cwd 조회는 null(→ 도구는 `unknown`)
- 디스크 JSON 키는 snake_case (외부 인터페이스)

## Boundaries

### Always do

- 세션 조회 시 `project_hash` 일치 확인
- 외부 설정 입력은 호출자가 병합 미리보기를 `ConfigSchema`로 검증한 뒤 저장 — 부분 레이어 자체 검증으로 유효한 재정의를 거부하지 않기

### Ask first

- 디스크 레이아웃(`constants/paths`) 변경
- `SessionMeta` 스키마 변경

### Never do

- 네트워크 I/O (core 는 디스크·메모리 순수 — HTTP 는 `mcp/httpServer`)
- pendingResolver 를 `settle()` 우회해 직접 resolve
