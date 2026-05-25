# Cross-Platform Compatibility Audit & Plan

`/Users/Vincent/Workspace/ogham/packages` 모노레포 6개 패키지 전수 조사 결과와, Windows/Unix 양쪽에서 정상 동작하도록 만드는 시스템 설계.

리포트 입력:

- [`bug-windows-cogair-checkexec.md`](./bug-windows-cogair-checkexec.md) — cogair Windows `checkExecutable` 1차 진단.
- [`bug-windows-cogair-comprehensive.md`](./bug-windows-cogair-comprehensive.md) — cogair Windows 종합 (provider 감지/디스패치/타임아웃 3증상).
- [`bug-windows-maencof-hook.md`](./bug-windows-maencof-hook.md) — maencof Windows hook silent failure로 인한 페르소나 미주입.

---

## TL;DR

- **근본 원인은 4가지**로 수렴됨.
  1. `child_process.spawn` 의 `shell` 옵션 누락 → Windows `.cmd/.bat` shim 해석 실패.
  2. `hooks.json` 의 `node "..."` 직접 명령 → Windows 훅 실행 컨텍스트의 PATH 가 비어있을 때 silent failure.
  3. 외부 CLI(`node`, `git`, `npm`, `codex`, `gemini`) 의 PATH 존재를 무조건 가정.
  4. 라인 엔딩(CRLF), 경로 분리자(`\`), 환경변수(`HOME` vs `USERPROFILE`), 임시 디렉토리(`/tmp`) 같은 OS-specific 디테일 누락.
- **6개 패키지 중 5개에 영향**. atlassian만 거의 안전(외부 바이너리 호출 0, openBrowser는 이미 platform 분기 완료).
- 단편적 수정 대신 **`shared/cross-platform` 공유 어댑터 + `cross-spawn` 의존성 + Windows `.cmd` hook bootstrap** 3축으로 표준화하면 같은 문제가 다른 패키지에서 재발하지 않음.
- **hook 무결성 = 플러그인 가용성**: hook 실패 시 MCP 서버·lifecycle dispatcher·vault committer 등 플러그인 핵심 채널이 모두 죽으므로, fallback 채널 도입(예: CLAUDE.md persona 병기) 대신 hook bootstrap 무결화에 자원을 집중하기로 결정. (의사결정 근거: Part 4.3/4.8)
- 코드 수정은 다음 단계. 본 문서는 **Part 1 인벤토리 → Part 2 카테고리 분석 → Part 3 Unix↔Windows 매칭 → Part 4 시스템 설계 → Part 5 로드맵 → Part 6 테스트 → Part 7 합격 기준 → Part 8 사용자 결정 필요 항목** 순서로 계획만 담음.

---

## Part 1. 패키지별 비호환 위치 인벤토리

각 패키지별로 발견된 위치. `난이도`는 단일 패치 기준 (저=옵션 한 줄, 중=helper 도입 필요, 고=구조 변경).

### 1.1 cogair (10건)

| #   | 파일:라인                                                               | 카테고리         | 현 상태(요약)                                   | 영향                                                              | 난이도 |
| --- | ----------------------------------------------------------------------- | ---------------- | ----------------------------------------------- | ----------------------------------------------------------------- | ------ |
| 1   | `src/lib/checkExecutable.ts:23`                                         | spawn shell 누락 | `spawn(bin, ['--version'], {stdio})`            | Windows `codex.cmd`/`gemini.cmd` ENOENT → 설정 UI "not installed" | 저     |
| 2   | `src/dispatcher/codex/operations/spawn.ts:21`                           | spawn shell 누락 | `spawn('codex', args, {cwd,env,stdio})`         | `/cogair:codex` 디스패치 30ms cli_error                           | 저     |
| 3   | `src/dispatcher/gemini/operations/spawn.ts:28`                          | spawn shell 누락 | `spawn('gemini', args, {cwd,env,stdio})`        | `/cogair:gemini` 디스패치 30ms cli_error                          | 저     |
| 4   | `src/lib/checkExecutable.ts:8`                                          | 타임아웃 부족    | `DEFAULT_TIMEOUT_MS = 1500`                     | Windows gemini 콜드스타트 2.7–3.9s → "not installed" 오감지       | 저     |
| 5   | `src/dispatcher/gemini/utils/normalizeResponse.ts:2`                    | 라인 엔딩        | `stdout.replace(/\n+$/, '')`                    | CRLF 잔존 (`\r` 미제거)                                           | 저     |
| 6   | `src/dispatcher/gemini/sessionResolver/queries/parseListSessions.ts:12` | 라인 엔딩        | `stdout.split('\n')`                            | `\r` 포함 토큰 비교 실패                                          | 중     |
| 7   | `src/dispatcher/codex/jsonlParser/jsonlParser.ts:18`                    | 라인 엔딩        | `stdout.split('\n')`                            | JSON 파싱 실패 가능                                               | 중     |
| 8   | `hooks/hooks.json` (각 줄)                                              | hook PATH 의존   | `node "${CLAUDE_PLUGIN_ROOT}/libs/run.cjs" ...` | Windows PATH 결손 시 SessionStart 배너/세션 분기 실패             | 중     |
| 9   | `.mcp.json`                                                             | mcp PATH 의존    | `"command": "node"`                             | MCP 서버 구동 실패 → 모든 도구 사용 불가                          | 중     |
| 10  | (참고) `src/mcp/tools/openSettings/utils/openBrowser.ts:20`             | 안전 처리 선례   | `shell: process.platform === 'win32'`           | — 정상 —                                                          | —      |

**외부 의존 바이너리**: `codex`, `gemini`, `node`, `open`/`start`/`xdg-open`.

### 1.2 filid (12건)

| #   | 파일:라인                                                                  | 카테고리               | 현 상태(요약)                                          | 영향                                                                       | 난이도 |
| --- | -------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------- | ------ |
| 1   | `libs/run.cjs:1`                                                           | shebang                | `#!/usr/bin/env node`                                  | Windows 직접 실행 시 무의미 (hook 으로는 우회됨, 그러나 직접 호출 시 실패) | 저     |
| 2   | `hooks/hooks.json` (다수)                                                  | hook PATH 의존         | `node "${CLAUDE_PLUGIN_ROOT}/libs/run.cjs" "..."`      | maencof report3 와 동일 silent failure 위험                                | 중     |
| 3   | `src/mcp/tools/ast-grep-replace/ast-grep-replace.ts:73`                    | Unix 절대경로 하드코딩 | `['/usr','/bin','/sbin','/etc','/var/lib']`            | Windows 드라이브 레터 검증 미통과                                          | 중     |
| 4   | `src/core/infra/config-loader/utils/resolve-git-root.ts:19`                | execSync PATH          | `execSync('git rev-parse --show-toplevel')`            | git 미설치/비-PATH Windows 환경에서 발견 실패                              | 저     |
| 5   | `src/mcp/tools/review-manage/utils/content-hash.ts:9`                      | execFile PATH          | `execFileAsync('git', args)`                           | 동일                                                                       | 저     |
| 6   | `src/hooks/*/entry.ts` (6개)                                               | shebang                | `#!/usr/bin/env node`                                  | 번들 단계에서 제거되어 실무 영향 적음 (확인 필요)                          | 저     |
| 7   | `src/mcp/server-entry/server-entry.ts:1`                                   | shebang                | `#!/usr/bin/env node`                                  | 번들 후 운명 — `bridge/mcp-server.cjs` 출력 확인 필요                      | 저     |
| 8   | (참고) `libs/run.cjs:99-107`                                               | 안전 처리              | `spawnSync(process.execPath, ..., {windowsHide:true})` | — node.exe 우회 정상 —                                                     | —      |
| 9   | (참고) `src/hooks/utils/is-ancestor-path.ts:12`                            | 안전 처리              | `path.sep` 사용                                        | — 정상 —                                                                   | —      |
| 10  | (참고) `src/hooks/pre-tool-use/helpers/intent-injector/intent-injector.ts` | 안전 처리              | `.replace(/\\/g, '/')` 정규화                          | — 정상 —                                                                   | —      |
| 11  | (참고) `src/__tests__/unit/core/prune-throttle-{session,global}.test.ts`   | 안전 처리              | `skipIf(process.platform === 'win32')` chmod 분기      | — 정상 —                                                                   | —      |
| 12  | `.mcp.json`                                                                | mcp PATH 의존          | `"command":"node" "args":["bridge/mcp-server.cjs"]`    | MCP 구동 실패 → 모든 filid 도구 비활성                                     | 중     |

**외부 의존 바이너리**: `git`, `npm`, `node`.

### 1.3 maencof (9건)

| #   | 파일:라인                     | 카테고리          | 현 상태(요약)                                                 | 영향                                                                              | 난이도 |
| --- | ----------------------------- | ----------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------ |
| 1   | `hooks/hooks.json` (16+ 줄)   | hook PATH 의존    | `node "${CLAUDE_PLUGIN_ROOT}/libs/run.cjs" ...`               | **report3 핵심 원인** — SessionStart `additionalContext` 미주입 → 페르소나 사라짐 | 중     |
| 2   | `.mcp.json`                   | mcp PATH 의존     | `"command":"node"` + `bridge/mcp-server.cjs`                  | MCP 서버 부재 → vault 도구 전무                                                   | 중     |
| 3   | `bridge/vault-committer.mjs`  | execSync git      | `execSync("git rev-parse ...")`                               | git 미설치/PATH 결손 시 vault 커밋 실패                                           | 중     |
| 4   | `bridge/changelog-gate.mjs`   | execSync git      | `execSync("git status --porcelain ...")`                      | git 결손 시 changelog 검사 실패 (report3 에러로그 인용)                           | 중     |
| 5   | `bridge/context-injector.mjs` | homedir fallback  | `process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude")` | 안전 (homedir() 가 USERPROFILE 우회)                                              | 저     |
| 6   | `bridge/layer-guard.mjs`      | 경로 정규화       | `path.replace(/\\/g, "/")`                                    | 안전 (Windows 경로 정규화)                                                        | —      |
| 7   | `libs/run.cjs:57`             | env 의존          | `process.env.CLAUDE_PLUGIN_ROOT`                              | 미설정 시 fallback 스캔 있음 — 부분 안전                                          | 저     |
| 8   | (silent failure 일반)         | logging 미흡      | 훅 자체가 실행 안 되면 `error-log.json` 에도 안 남음          | 진단 자체가 불가능 (report3 4번 요청)                                             | 고     |
| 9   | `bridge/*.mjs` 다수           | execFileSync 배열 | `S("git", ["add",...])` 형태                                  | 배열 형식 = shell:false → 메타문자 안전. 단 git PATH 의존 잔존                    | 중     |

**외부 의존 바이너리**: `node`, `git`. (git 결손은 catch 되지만 hook silent failure 는 잡지 못함).

### 1.4 imbas (5건)

| #   | 파일:라인                                | 카테고리      | 현 상태(요약)                                           | 영향                                                                                     | 난이도 |
| --- | ---------------------------------------- | ------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------ |
| 1   | `setup.ts:23`                            | 경로 분리자   | `cwd.split('/').pop()`                                  | Windows 경로(`C:\...\ogham`)에서 `/` 가 없어 전체 경로가 base 가 됨 → 캐시 디렉토리 오류 | 저     |
| 2   | `setup.ts:21`                            | 환경변수      | `process.env['HOME'] \|\| ''`                           | Windows 에서 `HOME` 미정의 → 빈 경로 fallback → `.claude` 가 상대경로화                  | 저     |
| 3   | `scripts/build-mcp-server.mjs:44`        | execSync PATH | `execSync('npm root -g')`                               | Method 1 실패 시 fallback. npm 미PATH 환경에서 빌드 실패                                 | 중     |
| 4   | (참고) `scripts/build-mcp-server.mjs:47` | 안전 처리     | `process.platform==='win32' ? ';' : ':'` PATH delimiter | — 정상 —                                                                                 | —      |
| 5   | (참고) `libs/run.cjs:95-102`             | 안전 처리     | `spawnSync(process.execPath, ..., {windowsHide:true})`  | — 정상 —                                                                                 | —      |

**외부 의존 바이너리**: `node`(process.execPath 우회), `npm`(fallback only).

### 1.5 atlassian (3건, 대부분 안전)

| #   | 파일:라인                                         | 카테고리    | 현 상태(요약)                                                   | 영향                                                                       | 난이도 |
| --- | ------------------------------------------------- | ----------- | --------------------------------------------------------------- | -------------------------------------------------------------------------- | ------ |
| 1   | `src/mcp/tools/setup/utils/openBrowser.ts:12-16`  | 안전 처리   | `process.platform` 분기 후 `open`/`cmd.exe /c start`/`xdg-open` | — 정상 —                                                                   | —      |
| 2   | `src/core/config-manager/config-manager.ts:17,40` | POSIX chmod | `chmod(path, 0o600)`                                            | Windows 에서 무시되지만 에러 무발생 — 안전. ACL 보호는 별도 필요할 수 있음 | 저     |
| 3   | `src/core/auth-manager/auth-manager.ts:18,30`     | POSIX chmod | `chmod(path, 0o600)`                                            | 동일                                                                       | 저     |

**외부 의존 바이너리**: **없음** (HTTP REST API only). hooks 디렉토리 없음.

> atlassian 은 chmod 가 Windows 에서 사일런트 무효라 보안상 토큰 보호 수준이 OS 별로 다르다는 점만 INTENT 에 명기하면 됨.

### 1.6 maencof-lens (10건)

| #    | 파일:라인                                                                         | 카테고리             | 현 상태(요약)                               | 영향                                                    | 난이도 |
| ---- | --------------------------------------------------------------------------------- | -------------------- | ------------------------------------------- | ------------------------------------------------------- | ------ |
| 1    | `hooks/hooks.json`                                                                | hook PATH 의존       | `node "..."`                                | maencof 와 동일 silent failure 위험                     | 중     |
| 2    | `.mcp.json`                                                                       | mcp PATH 의존        | `"command":"node"`                          | MCP 서버 부재 → vault lookup 불가                       | 중     |
| 3    | `libs/run.cjs:61`                                                                 | 경로 슬라이스        | `targetPath.slice(pluginRoot.length)`       | 경로 구분자 혼재(`/` vs `\`) 시 슬라이싱 결과 오염 가능 | 고     |
| 4    | `libs/run.cjs:82`                                                                 | 경로 결합            | `join(cacheBase, version) + scriptRelative` | 문자열 + 연결 — `scriptRelative` 의 선행 분리자에 의존  | 고     |
| 5    | `__tests__/.../config-loader.test.ts:29,44,71,79,89,100`                          | `/tmp` 하드코딩      | `'/tmp/vault'`                              | Windows runner 에서 fail                                | 중     |
| 6    | `__tests__/.../hook-bundles.test.ts:29`                                           | spawnSync shell 누락 | `spawnSync('node', [bundle], {...})`        | Windows node.exe shim 미해석 위험                       | 저     |
| 7-10 | `src/config-loader.ts`, `find-marker.ts`, `stale-detector.ts`, `session-start.ts` | path.join 사용       | 안전                                        | —                                                       | —      |

**외부 의존 바이너리**: `node`(process.execPath 우회 + hooks.json 직접 호출).

---

## Part 2. 카테고리별 통합 분석

6개 패키지를 가로지르는 **8개 공통 패턴**. 동일 카테고리는 동일 해결책으로 흡수 가능.

| 카테고리                                   | 발생 패키지                                       |          발생 횟수 | 근본 원인                                                                              | 통합 해결 방향                                                                                   |
| ------------------------------------------ | ------------------------------------------------- | -----------------: | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **C1. spawn/exec shell 옵션 누락**         | cogair, maencof, filid, imbas, maencof-lens       |                12+ | Node `spawn` 기본 `shell:false` 에서 Windows `.cmd/.bat` 미해석                        | `cross-spawn` 일괄 도입 또는 공유 `spawnCli()` 헬퍼                                              |
| **C2. hooks.json `node "..."` PATH 의존**  | cogair, filid, maencof, imbas(없음), maencof-lens | 5 패키지 × hook 수 | Claude Code 가 훅을 셸 명령으로 실행하지만 Windows 훅 컨텍스트는 PATH 비어있을 수 있음 | `.cmd` shim + `runtime-node-resolver` (Windows 한정 등록)                                        |
| **C3. 라인 엔딩 CRLF 미정규화**            | cogair (3)                                        |                  3 | 외부 CLI stdout 의 `\r\n` 을 `\n` split 으로 처리                                      | 입력 진입점에서 `normalizeEol()`                                                                 |
| **C4. 경로 분리자/Unix 절대경로 하드코딩** | imbas, filid, maencof-lens                        |                  4 | `'/'` split, `/usr`,`/bin` 등 Unix 가정                                                | `path.basename`/`path.sep` 강제, 검증 화이트리스트는 OS-aware                                    |
| **C5. 환경변수 `HOME`/`TMPDIR` 누락**      | imbas                                             |      1 (잠재 다수) | Windows 는 `USERPROFILE`/`TEMP`                                                        | `os.homedir()`/`os.tmpdir()` 의무화. `process.env.HOME` 직접 사용 금지 lint                      |
| **C6. 외부 바이너리 디스커버리 부재**      | 전 패키지                                         |               다수 | `node`/`git`/`npm`/`codex`/`gemini` 의 PATH 가정                                       | 1회 디스커버리 + 캐시 + 설치 가이드 메시지                                                       |
| **C7. 타임아웃 OS-flat**                   | cogair (1500ms)                                   |      1 (확장 가능) | Windows 콜드스타트가 2–4배 느림                                                        | `osMultiplier` 도입 (win32: 3x, 그 외 1x)                                                        |
| **C8. silent failure 로깅 부재**           | maencof, 잠재 전체                                |                 1+ | 훅 실행 자체 실패 시 로그가 안 남음                                                    | hook 실행 시 OS PATH/Node 가용성 self-probe → `~/.claude/plugins/<pkg>/error-log.json` 즉시 기록 |

C1+C2 만 해결해도 report1/2/3 모든 증상이 사라짐. C3–C8 은 정합성/관측성 강화.

---

## Part 3. Unix ↔ Windows 명령어/도구 매칭

이 매핑표는 시스템 설계(Part 4) 및 향후 코드 리뷰에서 "이 Unix 가정이 보이면 Windows 대응 무엇?" 의 즉답 카드.

### 3.1 셸 명령

| Unix                      | Windows cmd.exe                   | PowerShell                                      | 권장 (Node API 또는 npm 모듈)                                     |
| ------------------------- | --------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------- |
| `rm -rf <dir>`            | `rmdir /S /Q <dir>`               | `Remove-Item -Recurse -Force <dir>`             | `fs.rmSync(p, {recursive:true, force:true})`                      |
| `rm <file>`               | `del /Q <file>`                   | `Remove-Item <file>`                            | `fs.unlinkSync(p)`                                                |
| `mkdir -p <dir>`          | `mkdir <dir>` (자동 재귀)         | `New-Item -ItemType Directory -Force <dir>`     | `fs.mkdirSync(p, {recursive:true})`                               |
| `cp -r <src> <dst>`       | `xcopy /E /I /Y` 또는 `robocopy`  | `Copy-Item -Recurse <src> <dst>`                | `fs.cpSync(s, d, {recursive:true})`                               |
| `mv <src> <dst>`          | `move <src> <dst>`                | `Move-Item <src> <dst>`                         | `fs.renameSync(s, d)`                                             |
| `chmod 755 <f>`           | (개념 없음, 무시 가능)            | `icacls <f> /grant ...`                         | `fs.chmodSync(p, 0o755)` (Windows 에서는 read-only bit만 영향)    |
| `ls <dir>`                | `dir <dir>`                       | `Get-ChildItem <dir>`                           | `fs.readdirSync(p, {withFileTypes:true})`                         |
| `find <dir> -name '*.ts'` | `dir /S /B *.ts`                  | `Get-ChildItem -Recurse -Filter *.ts`           | `fast-glob` 또는 `globby` (모노레포 이미 dev dep 다수)            |
| `grep -r 'X'`             | `findstr /S /M /C:"X"`            | `Select-String -Pattern X -Recurse`             | `ripgrep` (CLI) 또는 정규식 직접                                  |
| `sed -i 's/a/b/'`         | (없음)                            | `(Get-Content) -replace 'a','b' \| Set-Content` | `string.replace()` + `fs.writeFileSync`                           |
| `which <bin>`             | `where <bin>`                     | `Get-Command <bin>`                             | `which` npm 모듈 또는 `cross-spawn` 내장 lookup                   |
| `cat <f>`                 | `type <f>`                        | `Get-Content <f>`                               | `fs.readFileSync(p, 'utf8')`                                      |
| `tail -n 50 <f>`          | (없음)                            | `Get-Content -Tail 50`                          | 직접 구현 (line split slice)                                      |
| `pwd`                     | `cd` (인자 없이) 또는 `echo %CD%` | `Get-Location`                                  | `process.cwd()`                                                   |
| `open <url>`              | `start "" <url>`                  | `Start-Process <url>`                           | `open` npm 모듈 또는 platform 분기 (cogair `openBrowser.ts` 선례) |
| `xdg-open <url>`          | `start "" <url>`                  | `Start-Process <url>`                           | 동일                                                              |
| `tar -czf`                | `tar` (Win10+ 내장)               | `Compress-Archive` (zip)                        | `tar` npm 모듈                                                    |
| `kill <pid>`              | `taskkill /PID <pid> /F`          | `Stop-Process -Id <pid>`                        | `process.kill(pid)`                                               |

### 3.2 환경변수/경로 상수

| 의미                | Unix                             | Windows                                        | Node API 권장                            |
| ------------------- | -------------------------------- | ---------------------------------------------- | ---------------------------------------- |
| 홈 디렉토리         | `$HOME` / `~`                    | `%USERPROFILE%` (또는 `%HOMEDRIVE%%HOMEPATH%`) | `os.homedir()`                           |
| 임시 디렉토리       | `$TMPDIR` / `/tmp`               | `%TEMP%` / `%TMP%`                             | `os.tmpdir()`                            |
| 설정 디렉토리 (XDG) | `$XDG_CONFIG_HOME` / `~/.config` | `%APPDATA%`                                    | `env-paths` npm 모듈                     |
| 캐시 디렉토리       | `$XDG_CACHE_HOME` / `~/.cache`   | `%LOCALAPPDATA%`                               | `env-paths`                              |
| 경로 분리자         | `/`                              | `\` (POSIX 호환도 일부 지원)                   | `path.sep`, `path.posix.sep`             |
| PATH 구분자         | `:`                              | `;`                                            | `path.delimiter`                         |
| 라인 엔딩           | `\n` (LF)                        | `\r\n` (CRLF)                                  | `os.EOL` (출력용), 입력은 항상 정규화    |
| 실행 비트           | rwx                              | (개념 없음, 확장자로 판단)                     | `fs.chmod` 호출은 OK (Windows 에서 무시) |
| 셸                  | `/bin/sh`, `/bin/bash`           | `cmd.exe`, `powershell.exe`, `pwsh.exe`        | 가급적 셸 우회 (Node API)                |
| Node 바이너리       | `node`                           | `node.exe` (또는 `node.cmd` shim)              | `process.execPath`                       |
| npm 글로벌 bin      | `~/.local/bin`, `/usr/local/bin` | `%APPDATA%\npm\` (`.cmd` shims)                | `cross-spawn`                            |

### 3.3 npm/Node 생태 도구

| 문제            | Unix 동작                  | Windows 동작              | 권장                                                                   |
| --------------- | -------------------------- | ------------------------- | ---------------------------------------------------------------------- |
| 글로벌 CLI 실행 | `codex` (실행파일)         | `codex.cmd` (셸 스크립트) | `cross-spawn` 또는 `spawn(..., {shell: process.platform === 'win32'})` |
| `npx <pkg>`     | 직접 실행                  | `npx.cmd` 거쳐 실행       | `cross-spawn`                                                          |
| Shebang         | `#!/usr/bin/env node` 존중 | 무시 (확장자로 판단)      | `.cmd` wrapper 자동 생성 (npm shim)                                    |
| 패키지 매니저   | `yarn`/`pnpm`/`npm`        | 동일 `.cmd` shims         | 동일                                                                   |

---

## Part 4. 플랫폼 어댑터 시스템 설계

3축 구조: **(A) 공유 어댑터 모듈** + **(B) `cross-spawn` 표준화** + **(C) Windows hook bootstrap**.

### 4.1 설계 원칙

1. **셸 명령 호출 금지** — `rm`/`mkdir`/`cp` 등 모두 Node fs API 로 통일. 셸 메타문자 escape 위험 제거.
2. **외부 바이너리 호출은 단일 진입점** — 모든 `spawn`/`exec` 호출이 공유 `spawnCli()` 를 거치게 한다. 옵션 누락이 발생할 자리 자체를 제거.
3. **OS 분기는 한 곳에만** — `platform.ts` 가 모든 분기를 흡수. 호출자는 `paths.config()`, `paths.tmp()` 만 알면 된다.
4. **hooks.json 단순화** — `node "..."` 패턴을 OS-aware shim 으로 감싼다. Windows 에서는 `.cmd`, Unix 에서는 그대로.
5. **silent failure 차단** — hook 진입 시 self-probe (node 가용성, git 가용성, PATH 길이) → 실패 항목을 `error-log.json` 에 즉시 기록.
6. **테스트는 fake binary suite** — 모든 spawn 호출은 mock 가능해야 함. Windows runner CI 매트릭스 필수.

### 4.2 신규 공유 모듈: `shared/cross-platform`

> 모듈 위치는 **신규 워크스페이스 `shared/cross-platform`** 으로 확정됨 (Part 8 결정 #1). drift 방지와 단일 책임 원칙을 우선.

#### 4.2.0 번들 정책 (외부 의존성 0, 모노레포 내부 워크스페이스 전용)

`@ogham/cross-platform` 은 **모노레포 내부 워크스페이스 전용** 패키지이다. npm 레지스트리에 publish 되지 않으며, 사용자에게 외부 의존성으로도 노출되지 않는다. 빌드 시 각 플러그인의 bridge 산출물에 esbuild 가 **inline 번들** 한다.

- **`package.json`**: 각 플러그인(cogair, filid, maencof, imbas, atlassian, maencof-lens) 의 `devDependencies` 에 `"@ogham/cross-platform": "workspace:^"` 등록. `dependencies` 에는 두지 **않는다** — 외부 노출 차단. (모노레포 root 의 `workspaces: ["packages/*"]` 가 자동 매칭하므로 별도 등록 불필요.)
- **esbuild**: 각 패키지의 `scripts/build*.mjs` 에서 `@ogham/cross-platform` 을 `external` 배열에 **포함하지 않음** → 호출 코드와 함께 `bridge/*.cjs`, `bridge/mcp-server.cjs` 결과물에 inline.
- **사용자 머신**: 플러그인 캐시 (`~/.claude/plugins/<pkg>/`) 에 `@ogham/cross-platform/` 별도 디렉토리가 **존재하지 않음**. `bridge/` 안에 코드가 이미 녹아있다. `npm install` 시 추가 다운로드 0건.
- **버전 drift 0**: 각 플러그인이 자신의 빌드 시점 cross-platform 스냅샷을 들고 다니므로, 사용자 환경에서 두 플러그인이 서로 다른 cross-platform 버전을 요구해 충돌할 가능성 자체가 없다.
- **`cross-spawn` 의존성**: `cross-platform` 패키지의 `dependencies` 가 아닌 `devDependencies` 로 등록. esbuild 가 inline 시 함께 번들된다. 결과적으로 각 플러그인의 산출물 내부에 `cross-spawn` 의 minified 사본이 들어간다 (각 ~5 KB).
- **트레이드오프 — 산출물 크기 증가**: 같은 helper 가 6개 플러그인 산출물에 6번 inline 됨 (각 모듈당 약 ~3–10 KB). 특히 cogair 의 **10 KB LIGHT hook cap** (`scripts/buildHooks.mjs` 의 `FORBIDDEN_PATTERNS`) 은 사전 검증 필수 — 가벼운 helper (`spawn`/`paths`/`env`/`eol`) 만 hook 번들에 들이고, 무거운 helper (`binaries.discover` / `hooks.bootstrap` 등) 는 MCP 서버 번들에만 inline 한다. 필요 시 `cross-platform` 을 `cross-platform/light` / `cross-platform/heavy` 서브 진입점으로 분리.
- **배포 라이프사이클**: `cross-platform` 자체에는 changeset 이 발행되지 않는다. 변경 시 모든 의존 플러그인이 함께 재빌드되며, 각 플러그인의 changeset 만 발행 (Phase 6 회귀 보장 참조).

#### 4.2.1 모듈 구조

```
shared/cross-platform/
├── INTENT.md
├── DETAIL.md
├── package.json                     # name: @ogham/cross-platform
├── src/
│   ├── index.ts                     # barrel
│   ├── spawn/                       # spawn 추상화
│   │   ├── index.ts
│   │   ├── spawnCli.ts              # cross-spawn 래퍼 + 타임아웃 + EOL 정규화
│   │   ├── execCli.ts               # Promise 래퍼 (stdin 옵션 포함)
│   │   └── osTimeout.ts             # win32: 3x, 그 외 1x
│   ├── paths/                       # 경로 추상화
│   │   ├── index.ts
│   │   ├── home.ts                  # os.homedir() 단일 진입
│   │   ├── config.ts                # config dir (env-paths)
│   │   ├── cache.ts                 # cache dir
│   │   ├── tmp.ts                   # os.tmpdir()
│   │   └── normalize.ts             # 경로 정규화 (\\→/)
│   ├── env/
│   │   ├── index.ts
│   │   ├── readEnv.ts               # HOME/USERPROFILE 등 통합 read
│   │   └── isWindows.ts
│   ├── eol/
│   │   ├── index.ts
│   │   └── normalizeEol.ts          # \r\n → \n, BOM strip
│   ├── binaries/
│   │   ├── index.ts
│   │   ├── discover.ts              # which/where + 1회 캐시
│   │   ├── ensureNode.ts
│   │   ├── ensureGit.ts
│   │   └── installHints.ts          # OS 별 안내 메시지
│   ├── hooks/
│   │   ├── index.ts
│   │   ├── bootstrap.ts             # run.cjs 의 정식 generalize
│   │   ├── selfProbe.ts             # node/git/PATH 자가 진단
│   │   └── errorLog.ts              # silent failure 기록
│   └── shim/
│       ├── index.ts
│       └── generateWindowsCmd.ts    # .cmd shim 자동 생성 (build step)
└── __tests__/
    └── ...                          # process.platform mocking + fake binary suite
```

#### 4.2.2 핵심 인터페이스 (TypeScript signature 만)

```ts
// src/spawn/spawnCli.ts
export interface SpawnOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number; // 자동으로 osMultiplier 적용
  input?: string | Buffer;
  encoding?: BufferEncoding;
  normalizeEol?: boolean; // 기본 true
}
export interface SpawnResult {
  code: number | null;
  stdout: string; // 항상 \n 정규화
  stderr: string;
  timedOut: boolean;
  spawnError?: Error;
}
export function spawnCli(
  bin: string,
  args: readonly string[],
  options?: SpawnOptions,
): Promise<SpawnResult>;
// 내부: cross-spawn 사용 → .cmd/.bat 자동 해석. shell:true 우회.

// src/paths/index.ts
export const paths: {
  home(): string; // os.homedir()
  tmp(): string; // os.tmpdir()
  configDir(scope: string): string; // ~/.config/<scope> or %APPDATA%\<scope>
  cacheDir(scope: string): string;
  pluginCache(pkg: string, version?: string): string;
  normalize(p: string): string; // \\→/
};

// src/env/index.ts
export const env: {
  home(): string; // HOME ∪ USERPROFILE 통합
  isWindows: boolean;
  isMacOS: boolean;
  isLinux: boolean;
  pathDelimiter: ":" | ";";
  eol: "\n" | "\r\n";
};

// src/eol/index.ts
export function normalizeEol(s: string): string; // CRLF → LF, strip BOM

// src/binaries/index.ts
export interface BinaryStatus {
  bin: string;
  available: boolean;
  path?: string;
  version?: string;
  installHint?: string; // OS 별 설치 안내
}
export function discover(
  bin: string,
  opts?: { timeoutMs?: number },
): Promise<BinaryStatus>;
export const binaries: {
  ensureNode(): Promise<BinaryStatus>;
  ensureGit(): Promise<BinaryStatus>;
  ensure(bin: string): Promise<BinaryStatus>;
};
// 내부: 1회 디스커버리 후 결과를 ~/.claude/plugins/<pkg>/binaries.json 에 캐시.

// src/hooks/bootstrap.ts
export function runHookEntry(target: string, argv: string[]): Promise<number>;
// run.cjs 의 정식 export. process.execPath 로 child node 실행.

// src/hooks/selfProbe.ts
export interface ProbeResult {
  nodeOk: boolean;
  gitOk: boolean;
  pathLen: number;
  pluginRootResolved: boolean;
  errors: string[];
}
export function selfProbe(opts?: { writeLog?: boolean }): Promise<ProbeResult>;

// src/hooks/errorLog.ts
export function logHookFailure(pkg: string, hook: string, error: unknown): void;
// ~/.claude/plugins/<pkg>/error-log.json 에 append (rotation 포함).
```

### 4.3 Windows hook bootstrap (C2 해결)

#### 4.3.1 문제 재확인

Claude Code 가 `hooks.json` 의 `"command": "node \"...\""` 를 시스템 셸로 실행. Windows 에서 훅이 받는 환경의 `PATH` 가 비어있거나 `node` 가 없으면 ENOENT → harness 가 silent 처리 → `additionalContext` 미주입.

#### 4.3.2 해결 옵션 (선택 사항, Part 8 결정 대기)

| 옵션                                                  | 동작                                                                                                                           | 장점                                                                                   | 단점                                                                          |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **A. `.cmd` shim 자동 생성**                          | 빌드 시 `bridge/run-hook.cmd` 생성, hooks.json 에서 `${CLAUDE_PLUGIN_ROOT}/bridge/run-hook.cmd` 호출 (Windows 한정 매니페스트) | PATH 전혀 의존 안 함. `.cmd` 가 `%~dp0..\..\..\node\node.exe` 같은 상대 node 탐색 가능 | node.exe 위치 추정 로직 필요. 사용자별 설치 위치 다름                         |
| **B. hooks.json 분기 매니페스트**                     | `hooks.win32.json` + `hooks.unix.json` 후 빌드/설치 시 선택                                                                    | 단순                                                                                   | Claude Code 가 분기 매니페스트 지원 안 함 — 빌드 시 OS 별로 다른 patches 필요 |
| **C. `run.cjs` 를 PowerShell launcher 로 교체**       | `run.ps1` 가 Node 자동 발견 → 실행                                                                                             | PowerShell 표준 PATH 보강 (`Get-Command` 등)                                           | macOS/Linux 호환 깨짐, 두 launcher 유지                                       |
| **D. hooks.json command 단순화 + harness 측 wrapper** | `"command": "claude-hook"` (가상)                                                                                              | 가장 깔끔                                                                              | Claude Code 의 hook spec 변경 필요 — 외부 의존                                |
| **E. 현 `run.cjs` 유지 + 진단 강화**                  | hooks.json 변경 없음, 다만 `selfProbe` 호출 + 진단 메시지 출력 (PATH/Node 결손 시 사용자 가시 경고)                            | 변경 최소                                                                              | 근본 문제 미해결, 사용자에게 PATH 추가 요청                                   |

권장: **A + E 병용** — `.cmd` shim 으로 PATH 의존 제거, 동시에 self-probe 로 진단 가시화.

### 4.4 cross-spawn 도입 정책 (C1 해결)

- 의존성: 모든 spawn 사용 패키지의 `dependencies` (devDependencies X) 에 `cross-spawn ^7`.
- import 패턴 통일:
  ```ts
  // 금지
  import { spawn } from "node:child_process";
  // 허용 (직접 사용)
  import spawn from "cross-spawn";
  // 권장 (어댑터 경유)
  import { spawnCli } from "@ogham/cross-platform";
  ```
- eslint rule (또는 filid pre-tool-use hook 확장) 으로 `node:child_process` 의 `spawn`/`exec` 직접 import 차단 (allow-list: cross-platform 내부만).

### 4.5 라인 엔딩/경로 분리자 (C3/C4)

- 모든 외부 CLI stdout 진입점에 `normalizeEol()` 의무.
- 경로 검증 (filid ast-grep-replace 같은 화이트리스트) 은 OS-aware 화이트리스트 + `path.parse` 활용:
  ```ts
  function isSystemPath(p: string): boolean {
    const parsed = path.parse(path.resolve(p));
    if (env.isWindows) {
      return /^[A-Z]:\\(Windows|Program Files|Program Files \(x86\)|System32)/i.test(
        parsed.dir,
      );
    }
    return /^\/(usr|bin|sbin|etc|var\/lib)(\/|$)/.test(parsed.dir);
  }
  ```
- `cwd.split('/').pop()` 같은 패턴은 `path.basename(cwd)` 로 일괄 치환.

### 4.6 외부 바이너리 디스커버리/캐싱 (C6)

- 첫 호출 시 `which`/`where` (cross-spawn) 로 발견 → 결과를 `~/.claude/plugins/<pkg>/binaries.json` 캐시 (TTL 24h).
- 발견 실패 시 OS 별 설치 안내 메시지:
  - `node`: macOS `brew install node`, Windows `winget install OpenJS.NodeJS`, Linux 배포판별 가이드.
  - `git`: macOS `xcode-select --install`, Windows `winget install Git.Git`, Linux 동.
  - `codex`/`gemini`: `npm i -g @openai/codex` 등.
- `cogair/checkExecutable` 는 이 디스커버리의 thin wrapper 가 됨.

### 4.7 타임아웃 OS-aware (C7)

```ts
function osTimeout(ms: number): number {
  return env.isWindows ? Math.max(ms * 3, 5000) : ms;
}
// cogair DEFAULT_TIMEOUT_MS = 1500 → Windows 시 4500ms, 단 floor 5000ms
```

### 4.8 Silent failure 로깅 (C8)

- 모든 hook entry 가 try/catch 로 감싸고 실패 시 `logHookFailure(pkg, hook, err)` 호출.
- `selfProbe()` 를 SessionStart 첫 hook 에서 1회 실행, 결과를 `~/.claude/plugins/<pkg>/error-log.json` 에 기록. 한 항목이라도 실패면 즉시 사용자 가시 경고를 띄움 (silent skip 금지).
- **fallback 채널 미도입 (결정됨)**: hook 실행 컨텍스트가 죽으면 MCP 서버·lifecycle dispatcher·vault committer·layer guard 가 모두 함께 죽는다. 그 상태에서 페르소나만 `CLAUDE.md` 등 별도 채널로 살려놔도 vault 도구가 전무하므로 사용자에게 의미가 없다. 따라서 자원은 hook bootstrap 무결화(4.3) + silent failure 로깅 자체에만 투입한다. report3 의 4번 요청은 "가시화 + bootstrap 보강" 으로 본질적 충족.

---

## Part 5. 마이그레이션 로드맵

각 Phase 는 독립 PR. 의존성 순서대로.

### Phase 0 — Audit lock-in (0.5d, PR-Z)

- 본 문서(`report-cross-platform-plan.md`) 와 3개 bug 리포트(`bug-windows-*.md`) 를 `.metadata/cross-platform/` 디렉토리로 이동 후 git 추적.
- 각 패키지 `INTENT.md` 에 한 줄: `Windows compatibility tracked under @ogham/cross-platform (see .metadata/cross-platform/).`
- `.metadata/cross-platform/INTENT.md` 신설 — 본 문서의 TL;DR + 인덱스.

### Phase 1 — `shared/cross-platform` 워크스페이스 신설 (3d, PR-A + PR-B)

**PR-A (1d) — 워크스페이스 + 빌드 파이프라인 골격**

| 변경 파일                                         | 변경 내용                                                                                                                                                                                                       |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shared/cross-platform/package.json`            | `private: true`, `name: "@ogham/cross-platform"`, `type: "module"`, `main: "./dist/index.js"`, `types: "./dist/index.d.ts"`, `devDependencies` 에 `cross-spawn ^7`, `which ^4`, `env-paths ^3` (또는 자체 구현) |
| `shared/cross-platform/tsconfig.build.json`     | ESM declaration true, outDir `./dist`                                                                                                                                                                           |
| `shared/cross-platform/INTENT.md` + `DETAIL.md` | FCA-AI 규약대로 — 50 line 이내, 3-tier 경계                                                                                                                                                                     |
| `shared/cross-platform/src/index.ts`            | barrel only (서브 모듈 도착 시점에 채워짐)                                                                                                                                                                      |
| `vitest.config.ts`                                | 워크스페이스 추가                                                                                                                                                                                               |
| `.github/workflows/ci.yml`                        | 매트릭스 확장: `os: [ubuntu-latest, macos-latest, windows-latest]` × `node: [20, 22]`                                                                                                                           |

**완료 기준 (PR-A)**: 빈 워크스페이스가 빌드되고 매트릭스 CI 가 green.

**PR-B (2d) — 7개 helper 구현 + 단위 테스트**

| 서브 모듈  | 파일                                                                                 | 기능                                                        | 단위 테스트 시나리오                                                              |
| ---------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `spawn`    | `spawnCli.ts`, `execCli.ts`, `osTimeout.ts`                                          | cross-spawn 래퍼, stdin 옵션, EOL 정규화, win32 ×3 타임아웃 | fake `bin/codex.cmd` + `bin/codex` 양쪽 호출, timeout, exit code, stderr 수집     |
| `paths`    | `home.ts`, `tmp.ts`, `configDir.ts`, `cacheDir.ts`, `pluginCache.ts`, `normalize.ts` | OS 별 위치, separator 정규화                                | `process.platform` mock 후 `paths.home()` 결과가 `USERPROFILE`/`HOME` 일치        |
| `env`      | `readEnv.ts`, `isWindows.ts` 등                                                      | OS 분기, PATH delimiter, EOL                                | win32 mock 시 `pathDelimiter === ';'`, `eol === '\r\n'`                           |
| `eol`      | `normalizeEol.ts`                                                                    | CRLF→LF, BOM strip                                          | `"﻿a\r\nb\r\n"` → `"a\nb\n"`                                                      |
| `binaries` | `discover.ts`, `ensureNode.ts`, `ensureGit.ts`, `installHints.ts`                    | which/where 호출, 24h 캐시, 설치 가이드 메시지              | fake PATH 에서 `which codex.cmd` 가 .cmd 발견, 미발견 시 hint 출력                |
| `hooks`    | `bootstrap.ts`, `selfProbe.ts`, `errorLog.ts`                                        | run.cjs 의 정식 ESM export, self-probe, error-log rotation  | broken `CLAUDE_PLUGIN_ROOT` 에서 fallback scan, error-log JSON append 후 size cap |
| `shim`     | `generateWindowsCmd.ts`                                                              | 빌드 step 에서 `.cmd` 파일 생성기                           | `%~dp0` 기반 상대 node 탐색 스크립트 정확성                                       |

- 모든 helper 는 `process.platform` mock 으로 양 OS 동작 단위 테스트.
- `__tests__/fixtures/bin-fake/` 에 `codex`, `codex.cmd`, `git`, `git.exe`, `npm`, `npm.cmd` 더미 스크립트 (stdout 고정).
- `process.execPath` 사용으로 PATH 비의존 — 매트릭스 CI 에서 자체 검증.

**완료 기준 (PR-B)**: `yarn cross-platform test:run` 이 ubuntu/macos/windows × Node 20/22 매트릭스 모두 green. 호출 측 0건 (다음 Phase 에서 소비 시작).

### Phase 2 — cogair 전환 (2d, PR-C)

cross-platform 의 첫 소비자. Part 1.1 의 1–9번 항목 일괄 해소.

| 변경 파일                                                               | 변경 내용                                                                                                                                                                                                  |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/cogair/package.json`                                          | `devDependencies` 에 `"@ogham/cross-platform": "workspace:^"` 추가                                                                                                                                         |
| `packages/cogair/scripts/buildMcpServer.mjs`                            | esbuild `external` 에서 `@ogham/cross-platform` 제외 (inline). `cross-spawn` 도 자동 inline (transitively)                                                                                                 |
| `packages/cogair/scripts/buildHooks.mjs`                                | 10 KB LIGHT cap 재검증. hook 번들에는 light 서브 진입점만 inline (`spawn`/`paths`/`env`/`eol`). `FORBIDDEN_PATTERNS` 에 `@ogham/cross-platform/heavy` 추가하여 무거운 helper 가 hook 에 들어가는 것을 차단 |
| `src/lib/checkExecutable.ts:23`                                         | `spawn(bin, ['--version'], {...})` → `spawnCli(bin, ['--version'], { timeoutMs: 1500 })`. 타임아웃은 helper 내부에서 win32 자동 ×3 → 4500ms                                                                |
| `src/lib/checkExecutable.ts:8`                                          | `DEFAULT_TIMEOUT_MS = 1500` 유지 (`osTimeout` 가 알아서 처리)                                                                                                                                              |
| `src/dispatcher/codex/operations/spawn.ts:21`                           | `spawn(...)` → `spawnCli(...)`. Promise 기반 반환                                                                                                                                                          |
| `src/dispatcher/gemini/operations/spawn.ts:28`                          | 동일                                                                                                                                                                                                       |
| `src/dispatcher/gemini/utils/normalizeResponse.ts:2`                    | `stdout.replace(/\n+$/, '')` 앞에 `normalizeEol()` 호출                                                                                                                                                    |
| `src/dispatcher/gemini/sessionResolver/queries/parseListSessions.ts:12` | `stdout.split('\n')` 앞에 `normalizeEol(stdout)`                                                                                                                                                           |
| `src/dispatcher/codex/jsonlParser/jsonlParser.ts:18`                    | 동일                                                                                                                                                                                                       |
| `src/mcp/tools/openSettings/utils/openBrowser.ts`                       | 그대로 유지 (이미 안전). 향후 통일 원하면 `paths.openUrl()` helper 격상 검토                                                                                                                               |
| `tests/scripts/install-fake-cli.{sh,ps1}`                               | Windows runner 에 codex/gemini fake CLI 설치 (PowerShell + bash)                                                                                                                                           |
| `src/**/__tests__/*`                                                    | E2E: `/cogair:setup` Providers 패널, `/cogair:codex`, `/cogair:gemini`, `/cogair:crosscheck` 4개 시나리오 자동                                                                                             |

**완료 기준 (PR-C)**: `bug-windows-cogair-checkexec.md` / `bug-windows-cogair-comprehensive.md` 의 Acceptance criteria (Part 7 cogair) 모두 통과. macOS/Linux 회귀 0.

### Phase 3 — maencof / maencof-lens hook bootstrap (3d, PR-D + PR-E)

**PR-D (2d) — maencof**

| 변경 파일                                       | 변경 내용                                                                                                                                                                                                                                                                   |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/maencof/package.json`                 | `devDependencies` 에 `@ogham/cross-platform` 추가                                                                                                                                                                                                                           |
| `packages/maencof/scripts/build-mcp-server.mjs` | esbuild inline 정책 + `cross-platform.shim.generateWindowsCmd` 호출하여 `bridge/run-hook.cmd` 자동 출력                                                                                                                                                                     |
| `packages/maencof/scripts/build-hooks.mjs`      | 동일                                                                                                                                                                                                                                                                        |
| `packages/maencof/hooks/hooks.json`             | OS-aware 빌드 단계로 분리. 빌드 시점에 두 가지 command 라인 생성 후 install step (또는 SessionStart 첫 진입) 에서 `process.platform === 'win32'` 이면 `${CLAUDE_PLUGIN_ROOT}/bridge/run-hook.cmd "${CLAUDE_PLUGIN_ROOT}/bridge/<hook>.mjs"` 로, 아니면 기존 `node ...` 유지 |
| `packages/maencof/libs/run.cjs`                 | `@ogham/cross-platform.hooks.bootstrap()` 호출로 단순화. 기존 fallback scan 로직은 cross-platform 내부로 이관 (단일 진실 소스)                                                                                                                                              |
| `packages/maencof/bridge/session-start.mjs`     | 진입 첫 줄에서 `selfProbe()` 호출 → 실패 항목 있으면 `logHookFailure()` + `hookSpecificOutput.additionalContext` 에 사용자 가시 경고 추가                                                                                                                                   |
| `packages/maencof/bridge/vault-committer.mjs`   | `execSync("git ...")` → `spawnCli("git", [...])`. git 미발견 시 `binaries.ensureGit()` 의 installHint 를 stderr 로 출력                                                                                                                                                     |
| `packages/maencof/bridge/changelog-gate.mjs`    | 동일                                                                                                                                                                                                                                                                        |
| `packages/maencof/bridge/*.mjs` (전체)          | try/catch + `logHookFailure(pkg, hook, err)` wrap. 모든 hook 진입점에서 무결한 실패 기록 보장                                                                                                                                                                               |

**PR-E (1d) — maencof-lens**

| 변경 파일                                                   | 변경 내용                                                                                                                                                                                  |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/maencof-lens/package.json`                        | `devDependencies` 에 `@ogham/cross-platform` 추가                                                                                                                                          |
| `packages/maencof-lens/libs/run.cjs`                        | `@ogham/cross-platform.hooks.bootstrap()` 호출로 단순화. `targetPath.slice(pluginRoot.length)` 위험 로직은 bootstrap 내부에서 `path.posix` 기반 정규화 처리 (혼합 separator 입력에 robust) |
| `packages/maencof-lens/hooks/hooks.json`                    | OS-aware command 매니페스트                                                                                                                                                                |
| `packages/maencof-lens/__tests__/.../config-loader.test.ts` | `/tmp/vault` 하드코딩 → `paths.tmp()`                                                                                                                                                      |
| `packages/maencof-lens/__tests__/.../hook-bundles.test.ts`  | `spawnSync('node', ...)` → `spawnCli(process.execPath, ...)`                                                                                                                               |

**완료 기준 (PR-D + PR-E)**: Windows 환경에서 hook 부팅 무결 + silent failure 가시화. `bug-windows-maencof-hook.md` 의 페르소나 미주입 증상이 hook bootstrap 정상화로 자연 해소. (fallback 채널 미도입은 의도된 결정 — 4.8 참조.)

### Phase 4 — filid / imbas / atlassian 정리 (2d, PR-F + PR-G + PR-H)

**PR-F (1d) — filid**

| 변경 파일                                                   | 변경 내용                                                                                                                                                  |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/filid/package.json`                               | `devDependencies` 에 `@ogham/cross-platform` 추가                                                                                                          |
| `packages/filid/scripts/buildMcpServer.mjs`                 | esbuild inline                                                                                                                                             |
| `packages/filid/scripts/buildHooks.mjs`                     | 10 KB cap 재검증 (filid 도 동일 cap 사용 시)                                                                                                               |
| `packages/filid/libs/run.cjs`                               | `cross-platform.hooks.bootstrap()` 호출                                                                                                                    |
| `packages/filid/hooks/hooks.json`                           | OS-aware command (Phase 3 와 동일 패턴)                                                                                                                    |
| `src/mcp/tools/ast-grep-replace/ast-grep-replace.ts:73`     | 화이트리스트를 `env.isWindows` 분기로 — Unix `/usr,/bin,/sbin,/etc,/var/lib` + Windows `C:\Windows\System32`, `C:\Program Files`, `C:\Program Files (x86)` |
| `src/core/infra/config-loader/utils/resolve-git-root.ts:19` | `execSync('git rev-parse ...')` → `spawnCli('git', [...])`. 미발견 시 `binaries.ensureGit()` 결과 graceful fallback                                        |
| `src/mcp/tools/review-manage/utils/content-hash.ts:9`       | `execFileAsync('git', args)` → `spawnCli('git', args)`                                                                                                     |
| `src/hooks/*/entry.ts` (6개)                                | shebang 유지 (번들 단계에서 제거됨을 명시적으로 확인). 직접 실행이 필요한 경우 cross-platform 의 launcher 사용 안내 INTENT 추가                            |

**PR-G (0.5d) — imbas**

| 변경 파일                                        | 변경 내용                                                                                                                                         |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/imbas/package.json`                    | `devDependencies` 에 `@ogham/cross-platform` 추가                                                                                                 |
| `packages/imbas/src/hooks/setup/setup.ts:21`     | `process.env['HOME'] \|\| ''` → `env.home()`                                                                                                      |
| `packages/imbas/src/hooks/setup/setup.ts:23`     | `cwd.split('/').pop() \|\| 'default'` → `path.basename(cwd) \|\| 'default'`                                                                       |
| `packages/imbas/scripts/build-mcp-server.mjs:44` | Method 1 (`process.execPath`) 우선 유지. Method 2 (`execSync('npm root -g')`) 는 `binaries.discover('npm')` 로 교체 (PATH 미설정 환경에서도 안전) |

**PR-H (0.5d) — atlassian (docs only, 코드 무수정)**

| 변경 파일                                              | 변경 내용                                                         |
| ------------------------------------------------------ | ----------------------------------------------------------------- |
| `packages/atlassian/src/core/auth-manager/INTENT.md`   | chmod 0o600 가 Windows 에서 무시되어 ACL 기본값으로 보호됨을 명기 |
| `packages/atlassian/src/core/config-manager/INTENT.md` | 동일                                                              |
| `packages/atlassian/README.md` Security 섹션           | OS 별 토큰 보호 수준 차이 한 문단 추가                            |

**완료 기준 (PR-F + PR-G + PR-H)**: 잔존 항목 zero. 모든 패키지에서 `node:child_process` 직접 `spawn`/`exec`/`execSync`/`execFile` import 0건 (Phase 5 lint 가드로 보장).

### Phase 5 — lint 가드 + 회귀 방지 (1d, PR-I)

**금지 패턴** (severity: error)

- `import { spawn|exec|execSync|execFile|fork } from 'node:child_process'` — allow-list: `shared/cross-platform/src/spawn/**` 내부만
- `process.env.HOME`, `process.env.USERPROFILE`, `process.env.TMPDIR`, `process.env.TEMP` 직접 사용 — allow-list: `shared/cross-platform/src/env/**`, `shared/cross-platform/src/paths/**` 내부만

**경고 패턴** (severity: warning)

- 문자열 리터럴 `'/tmp/'`, `'/var/'`, `'/usr/'`, `'/etc/'`, `'/bin/'` (false positive 가능, advisory)
- `<str>.split('/')` 패턴 — `path.sep` / `path.posix` / `path.basename` 사용 권장 메시지

**구현 방법**

- 모노레포 root `eslint.config.js` 에 custom rule 추가 (`no-restricted-imports`, `no-restricted-syntax`, `no-restricted-globals` 활용)
- `yarn lint` 실행 시 일괄 검출. CI 의 lint job 도 동일.
- 보완책: `packages/filid/src/hooks/pre-tool-use/` 의 validator 에도 동일 패턴 추가하여 코드 작성 시점에 즉시 경고 (IDE 통합 없는 사용자 보호).

**완료 기준 (PR-I)**: 전 패키지 `yarn lint` green. CI lint job green. 신규 PR 에서 위 패턴 도입 시 자동 차단.

### Phase 6 — 회귀 보장 (continuous)

- **Changeset 정책**: `cross-platform` 자체에는 changeset 발행 안 함. 대신 changeset 검증 step 에서 cross-platform 변경 감지 시 모든 의존 플러그인을 자동 patch bump 후보로 등록.
- **분기별 Windows runner 회귀 스위트**: 실제 codex/gemini/git/node 설치 후 모든 패키지의 E2E 통과 확인.
- **dependabot/renovate**: `cross-spawn`, `which`, `env-paths` 의 보안 패치 자동 추적.

### PR 분할 요약

| PR   | Phase | 패키지                                  | 분량 | 의존        | 병렬화                  |
| ---- | ----- | --------------------------------------- | ---- | ----------- | ----------------------- |
| PR-Z | 0     | meta/.metadata                          | 0.5d | none        | 단독 진행 가능          |
| PR-A | 1     | cross-platform (워크스페이스 + 빌드)    | 1d   | PR-Z        | —                       |
| PR-B | 1     | cross-platform (7 helper + 단위 테스트) | 2d   | PR-A        | —                       |
| PR-C | 2     | cogair                                  | 2d   | PR-B        | PR-D~G 와 병렬          |
| PR-D | 3     | maencof                                 | 2d   | PR-B        | PR-C, E~G 와 병렬       |
| PR-E | 3     | maencof-lens                            | 1d   | PR-B        | PR-C, D, F, G 와 병렬   |
| PR-F | 4     | filid                                   | 1d   | PR-B        | PR-C, D, E, G 와 병렬   |
| PR-G | 4     | imbas                                   | 0.5d | PR-B        | PR-C~F 와 병렬          |
| PR-H | 4     | atlassian (docs only)                   | 0.5d | none        | 어느 시점이든 진행 가능 |
| PR-I | 5     | repo-wide lint                          | 1d   | PR-C~G 완료 | —                       |

- **총 작업량**: 약 11.5 영업일.
- **단축 가능 일정**: PR-Z → PR-A → PR-B → (PR-C/D/E/F/G 병렬, 최대 2d) → PR-I → 약 **6.5 영업일** (병렬 진행 시).
- **PR-H 는 어느 단계에서도 진행 가능** (코드 무수정, 문서만).

---

## Part 6. 테스트 전략

### 6.1 CI matrix

```yaml
# .github/workflows/cross-platform.yml (개념)
strategy:
  matrix:
    os: [ubuntu-latest, macos-latest, windows-latest]
    node: [20, 22]
```

- 모노레포 전체 `yarn test:run` + 패키지별 E2E.
- Windows runner 에는 `codex`/`gemini` fake CLI 설치 스크립트 추가.

### 6.2 단위 — process.platform mocking

```ts
vi.mock('node:os', () => ({ ... homedir: () => '/Users/test' }));
vi.stubGlobal('process', { ...process, platform: 'win32' });
```

- 모든 paths/env/spawn 헬퍼는 platform mock 으로 양쪽 동작 검증.

### 6.3 Integration — fake binary suite

- `tests/fixtures/bin-fake/` 에 `codex` (shell script + `.cmd` 양쪽), `git`, `npm` fake 제공.
- PATH 를 fake bin 으로만 채워 spawn 호출이 fake 로 라우팅됨을 검증.

### 6.4 E2E — Windows runner real binary

- 별도 workflow (`cross-platform-real.yml`) — windows-latest 에서 `winget install OpenJS.NodeJS` 후 `npm i -g @openai/codex @google/gemini-cli` 실제 설치 → cogair `/setup` Providers 패널이 `installed` 표시되는지 검증.

### 6.5 회귀 케이스 (report 기반)

- report1/2: 설정 UI Providers, `/cogair:codex|gemini|crosscheck` 디스패치, 타임아웃.
- report3: SessionStart 페르소나 주입, hook silent failure 시 error-log 기록, vault git 미설치 graceful 처리.

---

## Part 7. Acceptance Criteria

### per-package

- **cogair**
  - [ ] `/cogair:setup` Providers 패널이 Windows 11 + Node 20/22 환경에서 `codex` / `gemini` 둘 다 `installed` 로 표시.
  - [ ] `/cogair:codex`, `/cogair:gemini`, `/cogair:crosscheck` 가 Windows 에서 정상 응답.
  - [ ] DEP0190 등 Node deprecation 경고 미발생.
  - [ ] CRLF 환경 mock 에서 JSONL/sessions 파서 모두 통과.

- **filid**
  - [ ] `mcp__plugin_filid_t__*` MCP 도구가 Windows MCP 서버 부팅 후 호출 가능.
  - [ ] git 미설치 Windows 환경에서 `resolve-git-root` 가 graceful fallback (error-log 기록 + 도구별 적절한 fallback 응답).
  - [ ] ast-grep-replace 의 시스템 경로 화이트리스트가 Windows 시스템 경로(`C:\Windows\System32` 등) 도 차단.

- **maencof**
  - [ ] SessionStart 시 Windows 환경에서도 페르소나가 일관되게 로드됨 (실측 응답 검증).
  - [ ] hook 실행 자체가 실패한 경우에도 `~/.claude/plugins/maencof/error-log.json` 에 명시 기록 + 다음 세션 진입 시 사용자 가시 경고.
  - [ ] vault git 미설치 시 `vault-committer` 가 silent skip 대신 사용자 메시지 출력.
  - [ ] SessionStart `selfProbe` 가 lifecycle-dispatcher / vault-committer / context-injector / layer-guard 등 모든 hook 의 부팅 가능성을 사전 확인 → 하나라도 실패면 즉시 사용자 가시 경고.

- **imbas**
  - [ ] Windows 에서 `setup.ts` 가 `process.env.HOME` 부재에 대해 USERPROFILE fallback → 캐시 디렉토리 위치 정상 계산.
  - [ ] `cwd.split('/').pop()` 위치가 `path.basename` 으로 치환되어 Windows 경로에서도 base 추출 정상.
  - [ ] `build-mcp-server.mjs` 가 `npm` 미PATH 환경에서도 Method 1(`process.execPath`) 로 빌드 성공.

- **atlassian**
  - [ ] chmod 0o600 가 Windows 에서 무시되는 사실을 `auth-manager` INTENT 에 명기.
  - [ ] 토큰 파일 보호 수준이 OS 별로 다름을 README/INTENT 명시.

- **maencof-lens**
  - [ ] `libs/run.cjs` 의 `targetPath.slice` / `cacheBase + scriptRelative` 가 Windows 경로(혼합 separator) 입력에 대해 정상 동작 (unit test 추가).
  - [ ] config-loader.test.ts 가 Windows runner 에서도 통과 (`/tmp` → `os.tmpdir()`).
  - [ ] hook-bundles.test.ts 의 spawnSync 가 `.cmd` shim 환경에서 통과.

### overall

- [ ] 모든 패키지가 `cross-spawn` 또는 `@ogham/cross-platform.spawnCli` 만 사용 (`node:child_process` 직접 spawn/exec/execSync/execFile import 0건).
- [ ] CI matrix (`ubuntu`+`macos`+`windows`) × Node `20`+`22` 모두 green.
- [ ] Windows 신규 사용자가 `node`/`git`/`codex`/`gemini` 일부 미설치 상태에서 플러그인을 활성화해도 진단 메시지가 명확히 출력 (silent failure 0건).
- [ ] macOS/Linux 동작에 회귀 없음 (기존 vitest 스위트 그대로 통과).
- [ ] `cross-platform-audit.md` 가 `.metadata/cross-platform/` 에 git 추적.

---

## Part 8. 사용자 결정 필요 항목

다음은 본 보고서가 단정하지 않은, **사용자가 선택해야 하는 결정점**입니다.

1. **공유 모듈 위치** — **결정됨: (a) 신규 워크스페이스 `shared/cross-platform`**
   - 거부됨: (b) 각 패키지 내 복제 — drift 위험.
   - 거부됨: (c) cogair helper 격상 — cogair 책임 비대화.
   - 번들 정책: 모노레포 내부 전용 워크스페이스, esbuild inline (4.2.0 참조).

2. **`cross-spawn` 채택 여부** — **결정됨: 채택**
   - `@ogham/cross-platform.spawnCli` 내부에서만 사용. 호출 측은 cross-platform 만 사용.
   - `cross-platform/devDependencies` 에 등록 → esbuild 가 각 플러그인 산출물에 inline.

3. **Windows hook bootstrap 옵션** (Part 4.3.2)
   - 권장: 옵션 A(`.cmd` shim) + 옵션 E(self-probe) 병용.
   - 대안: 옵션 B(분기 매니페스트) — Claude Code hooks.json 사양 의존성 추가 조사 필요.

4. **CI Windows runner 비용**
   - 분기/주기적 실행 빈도, 비용, GitHub Actions 무료 한도 검토 필요.

5. **외부 바이너리 설치 가이드 톤**
   - 패키지가 `winget` 명령을 자동 제안할지, 단순 링크만 제공할지.

6. **lint 가드 강도** (Phase 5)
   - error vs warning, 어떤 패턴까지 자동 차단할지.

> **이미 결정된 항목**: maencof 페르소나 fallback 채널은 도입하지 않는다. hook 실패가 곧 플러그인 전체 (MCP/dispatcher/vault) 실패이므로 페르소나만 별도 채널로 살려도 사용자에게 의미가 없다. 자원은 hook bootstrap 무결화와 silent failure 가시화에 집중. (근거: Part 4.3, 4.8)

---

## 부록 A. 카테고리×패키지 hit matrix

각 셀은 해당 패키지에서 해당 카테고리가 발견된 건수. 0 = 안전 또는 미발생.

|                        |                     cogair |       filid |         maencof |        imbas |    atlassian | maencof-lens |
| ---------------------- | -------------------------: | ----------: | --------------: | -----------: | -----------: | -----------: |
| C1 spawn shell         |                          3 |           2 |               2 |            1 |            0 |            1 |
| C2 hooks.json node     |                          ✓ |           ✓ |               ✓ | 0 (no hooks) | 0 (no hooks) |            ✓ |
| C3 라인 엔딩           |                          3 |           0 |               0 |            0 |            0 |            0 |
| C4 경로 분리자         |                          0 |           1 |               0 |            1 |            0 |            2 |
| C5 환경변수            |                          0 |           0 |               0 |            1 |            0 |            0 |
| C6 외부 바이너리       | 4 (codex/gemini/node/open) | 2 (git/npm) |    2 (node/git) | 2 (node/npm) |            0 |     1 (node) |
| C7 타임아웃            |                          1 |           0 |               0 |            0 |            0 |            0 |
| C8 silent failure 로깅 |                          0 |           0 | 1 (보고서 명시) |            0 |            0 |            0 |
| **합계**               |                    **11+** |      **5+** |          **5+** |        **5** |        **0** |       **4+** |

## 부록 B. 영향도 우선순위

1. **P0 (사용자 즉시 인지)**: cogair C1+C7 (provider 감지 실패), maencof C2+C8 (hook 실패 = MCP/dispatcher/vault/페르소나 등 플러그인 전체 무력화).
2. **P1 (silent degradation)**: filid C1 (git 명령 실패), imbas C4+C5 (캐시 경로 오류).
3. **P2 (정합성)**: cogair C3 (라인 엔딩), filid C4 (Unix 절대경로 검증).
4. **P3 (관측성/문서)**: atlassian chmod 문서화, lint 가드.

---

본 문서는 코드 수정 없이 계획만 담음. 다음 단계는 Part 8 결정 → Phase 0 시작.
