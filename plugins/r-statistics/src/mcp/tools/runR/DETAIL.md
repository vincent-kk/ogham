# DETAIL — run_r 실행 계약

## Requirements

- LLM 이 생성한 R 코드를 `--vanilla` 헤드리스 Rscript + temp 워크스페이스로만 실행한다.
- 실행 전 `validateRScript` 정적 게이트가 `FORBIDDEN_R_CALLS`(process·network·filesystem-escape) 를 차단한다.
- 입력 데이터(`dataRefs`)는 MCP 가 워크스페이스 `data/` 로 복사하고 `refs.json` 으로만 노출한다. user R 코드는 경로를 직접 만들지 않는다.
- `timeoutMs` 는 `MAX_TIMEOUT_MS` 로 clamp, `dataRefs` 는 `MAX_DATA_REFS` 로 제한한다.

## API Contracts

### run_r 입력

- `scriptCode` (필수): `MAX_SCRIPT_CHARS` 이하 R 소스.
- `dataRefs[]` (선택): `{ id, format, path, encoding?, sha256? }`.
  - `id`: `^[A-Za-z0-9_-]+$` — 복사본 파일명이 되므로 경로 구분자 금지(워크스페이스 탈출 차단).
  - `path`: **절대경로 + allow-root 하위(realpath 기준)만 허용** — 아래 위협 모델 참조.
- `sessionMode`/`executionMode`/`timeoutMs`/`seed`/`workspaceId`: 실행 격리·모드 제어.
- `project_root` (선택): 워크스페이스 디렉토리 절대경로. Claude Code 에서는 생략(서버가 워크스페이스에서 기동됨) — 플러그인 설치 디렉토리에서 기동하는 호스트에서는 필수.

### 데이터 경로 위협 모델 (`dataRefs[].path`)

- **위협**: 복사 주체는 게이트된 R 이 아니라 MCP(신뢰 코드)다. 무제한 `path` 는 R 정적 게이트를 우회해 임의 호스트 파일(`~/.ssh/id_rsa`, `/etc/*`)을 `data/` 로 끌어와 무해한 read 로 유출하는 exfil 증폭 채널이 된다.
- **완화**: `resolveDataRefs` 가 `realpath(path)` 를 allow-root 하위로 강제한다(심링크 탈출 포함 거부). 위반 → `DATA_REF_OUTSIDE_ROOT`.
- **allow-root**: 기본 프로젝트 루트 — Claude Code 에서는 `process.cwd()`(MCP 를 기동한 프로젝트 디렉토리), 그 외 호스트에서는 `project_root` 로 전달된 절대경로. **미전달 시 `process.cwd()` 폴백 없이 `project_root` 재전달을 안내하며 throw** 한다(projectRoot 가드 — 이 안내 메시지는 `DATA_ROOT_INVALID` 로 가려지지 않는다). `R_STATISTICS_DATA_ROOT` 로 재정의하며, **지정된 루트가 realpath 로 해석 불가일 때만** `DATA_ROOT_INVALID`.
- 실행 안전 계층만 담당 — 통계 정책은 assert 소관.

## Last Updated

2026-07-15 — allow-root 해석 실패 시 projectRoot 가드 안내를 `DATA_ROOT_INVALID` 로 삼키던 결함 수정 (M2-4 실측). 두 실패를 분리: project_root 미전달 → 재전달 안내 throw, 지정 루트 realpath 불가 → `DATA_ROOT_INVALID`.
2026-07-12 — `dataRefs[].path` allow-root containment 도입 (operations-sre-3 부채 해소).
