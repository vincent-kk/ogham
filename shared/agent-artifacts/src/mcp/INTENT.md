## Purpose

프로젝트 또는 사용자 범위의 MCP 서버 등록을 검사하고 계획·적용한다.
계획·결과 모델은 공유하지만 호스트별 JSON, TOML, CLI 어댑터는 분리한다.

## Conventions

- CLI 어댑터는 argv를 구성하고 실행은 cross-platform spawn에 맡긴다.
- Codex TOML은 크기 제한 후 전체 유효성을 검사하되 재직렬화하지 않는다.
- 공개 함수와 보조 함수는 각각 하나의 파일에 둔다.
- TOML ownership·관찰 상태·failure plan 계산은 adapter helper로 분리한다.

## Boundaries

### Always do

- 관련 없는 서버·JSON 키·TOML 바이트를 보존한다.
- 같은 이름의 비소유 서버와 충돌하면 쓰지 않는다. 예외로 사용자 범위의 호스트 CLI 등록은 소유 마커 없이 이름으로 위임하므로 수동 등록도 교체·제거될 수 있다. Claude는 `replaceDrift: true`에서 같은 이름을 제거·재등록하고 Codex는 단일 호스트 명령의 동작을 따른다.

### Ask first

- transport 정의, CLI scope 또는 TOML 소유 marker 변경.

### Never do

- `~/.claude.json` 직접 수정 또는 전체 TOML 직렬화.
- CLI 부재/실패를 성공으로 보고.
