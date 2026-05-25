# Architecture: Cross-Platform Adapter System

6개 패키지를 가로지르는 비호환 문제를 해결하기 위한 중앙 통제형 시스템 설계 및 분석 결과입니다.

## 1. 카테고리별 통합 분석 (8대 패턴)

여러 패키지에 산재한 OS 비호환 이슈를 8가지 주요 패턴으로 범주화했습니다.

| 카테고리 | 발생 패키지 | 원인 및 해결 방향 |
| --- | --- | --- |
| **C1. spawn shell 누락** | cogair, maencof 등 5개 | Windows `.cmd` 무시됨. `cross-spawn` 래퍼로 대체. |
| **C2. hooks.json PATH 의존** | cogair, filid, maencof 등 | 훅 실행 시 빈 PATH. `.cmd` shim 생성으로 부트스트랩. |
| **C3. 라인 엔딩 미정규화** | cogair | CRLF(`\r\n`)를 LF(`\n`)로 일괄 파싱 전 정규화. |
| **C4. 절대경로/구분자 하드코딩** | imbas, filid, maencof-lens | `/usr` 하드코딩 및 `/` split 사용. `path` 내장 모듈 사용으로 전환. |
| **C5. 환경변수 차이** | imbas | Windows `USERPROFILE` 누락. `os.homedir()` 필수 적용. |
| **C6. 바이너리 디스커버리 부재**| 전체 패키지 | CLI PATH 부재. 1회 탐색 후 캐싱 및 미발견 시 OS 가이드 제공. |
| **C7. 타임아웃 OS-flat** | cogair | Windows 프로세스 생성 오버헤드 무시. `osMultiplier` 헬퍼 적용. |
| **C8. silent failure 로깅 부재**| maencof | 훅 실패가 가려짐. `self-probe` 헬퍼와 `error-log.json` 도입. |

## 2. 플랫폼 어댑터 시스템 설계 (3축 구조)

단편적 수정이 아닌 아키텍처 레벨에서의 표준화 전략입니다.

### 2.1 (A) 공유 어댑터 모듈: `shared/cross-platform`
모노레포 내부 워크스페이스 전용 모듈(`@ogham/cross-platform`)을 신설하여 모든 OS 의존 로직을 흡수합니다.

- **원칙**: 외부 노출 0. 빌드 시 esbuild 에 의해 각 플러그인에 **inline 번들링**되어 패키지 충돌이나 추가 다운로드 없이 동작합니다.
- **주요 서브 모듈**:
  - `spawn/`: `cross-spawn` 래퍼(`spawnCli`), EOL 정규화, 타임아웃 팩터(`osTimeout`).
  - `paths/`, `env/`: `os.homedir()`, `os.tmpdir()`, 경로 분리자 등 환경 차이 흡수.
  - `eol/`: 라인 엔딩 및 BOM 정규화(`normalizeEol`).
  - `binaries/`: 외부 바이너리(`codex`, `git` 등) 디스커버리 체계.
  - `hooks/`, `shim/`: hook 부트스트랩 및 `.cmd` 자동 생성 헬퍼.

### 2.2 (B) `cross-spawn` 표준화
모든 패키지에서 `node:child_process` 의 직접 호출(`spawn`, `exec` 등)을 금지하고, `@ogham/cross-platform` 에서 제공하는 래퍼를 거치게 하여 `shell` 옵션 누락 같은 실수를 원천 차단합니다.

### 2.3 (C) Windows Hook Bootstrap
훅의 실행 시점에 노출되는 빈 PATH 이슈를 막기 위해, 빌드 단계에서 `bridge/run-hook.cmd` 매니페스트를 자동 생성하고 이를 통해 상대적 위치의 `node.exe`를 구동하는 안전한 훅 컨텍스트를 마련합니다. 부팅 실패 시 즉각 `error-log.json`에 기록해 silent failure 를 근절합니다.

## 3. Unix ↔ Windows 명령어/도구 매칭

향후 개발 간 준수해야 할 OS 독립적 Node.js API 맵핑 가이드라인입니다.

| Unix | Windows | 권장 해결책 (Node API) |
| --- | --- | --- |
| `rm -rf`, `rm` | `rmdir /S`, `del` | `fs.rmSync(p, {recursive:true, force:true})` |
| `mkdir -p` | `mkdir` | `fs.mkdirSync(p, {recursive:true})` |
| `cp -r` | `xcopy` / `robocopy` | `fs.cpSync(s, d, {recursive:true})` |
| `find`, `grep` | `dir /S`, `findstr` | `fast-glob`, `ripgrep` |
| `$HOME`, `~` | `%USERPROFILE%` | `os.homedir()` |
| `$TMPDIR`, `/tmp` | `%TEMP%` | `os.tmpdir()` |
| `\n` (LF) | `\r\n` (CRLF) | 입력 시 항시 `normalizeEol()` 정규화 수행 |
