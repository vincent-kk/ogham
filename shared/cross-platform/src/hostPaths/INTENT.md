## Purpose

호스트마다 다르게 제공되는 **두 좌표**(플러그인 루트 / 프로젝트 루트)와 **지침 문서 채널**의 단일 해석 지점. MCP 서버 런타임 전용 — 훅에는 `OGHAM_HOST` 가 없으므로(어댑터는 MCP 선언에만 주입) 훅은 본 모듈 대신 순수 `instructions` 를 쓴다.

## Conventions

- `pluginRoot()` 는 **env → codex cwd → 상향 탐색** 순. 마지막 단계는 **존재 검증된 답**이라 미실측 호스트(agy)에도 안전하다 — cwd 를 추측하지 않는다.
- `projectRoot()` 의 claude 분기는 `process.cwd()` — 기존 동작과 완전히 동일해야 한다 (가산적 변경).
- claude 외 호스트에서 프로젝트 좌표 해석 실패는 **throw** — `process.cwd()` 폴백은 플러그인 폴더를 프로젝트로 오인하는 바로 그 결함이다.
- 공급된 경로는 `~` 전개 후 **절대경로만** 수용하고 `portableResolve` 로 정규화한다 (네이티브 `resolve` 금지) — 소비처가 `sha256(root)` 로 프로젝트를 식별하는데, 네이티브 `resolve` 는 Windows 에서만 구분자·드라이브를 바꿔 같은 작업물을 갈라놓는다.
- 도구 스키마의 `project_root` 설명은 `PROJECT_ROOT_ARG_DESCRIPTION` 하나를 공유한다 (문구 표류 금지).

## Boundaries

### Always do

- 프로젝트 대상 MCP 도구는 선택 인자 `project_root`(절대경로)를 받아 그대로 넘긴다.
- 실패해도 되는 정리·수명주기 작업은 `tryProjectRoot()` 로 받아 null 이면 건너뛴다.

### Ask first

- `agy` 의 지침 채널 확정 (현재 **미실측** — claude 와 동일하게 둔다).
- 새 `OGHAM_HOST` 값 추가.

### Never do

- claude 외 호스트에서 `process.cwd()` 를 프로젝트 루트로 폴백.
- 훅 도달 코드에서 본 모듈 소비 — 훅엔 호스트 마커가 없다. 순수 `instructions` 를 쓴다.
