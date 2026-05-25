# Handoff — Windows-Unix 호환성 작업 (cross-platform 워크스페이스)

다음 세션이 0 컨텍스트로 들어와도 이 한 문서만 읽으면 즉시 이어서 작업할 수 있도록 설계됨.

---

## TL;DR (한 문단)

ogham 모노레포 6개 플러그인의 Windows-Unix 호환성을 한 곳에 모으기 위해 **`shared/cross-platform` 모노레포 내부 워크스페이스** 신설 + 9 도구별 sub-entry (`env`/`eol`/`paths`/`spawn`/`binaries`/`shim`/`error-log`/`self-probe`/`bootstrap`) 구현 + tree-shaking 으로 hook bundle 최소화 + 단위 테스트 57 + `spawnCliSync` (sync caller cascade 회피용). **PR-C / PR-D / PR-E / PR-F 모두 완료** 후 cross-platform 자체 디자인 개선 2회 (도구별 exports + sideEffects:false, spawnCliSync 추가). 남은 마이그레이션: **PR-G / PR-H**. 마지막: **PR-I** lint 가드. **단, 프로덕션 ship 전에 추가 검증 3건 (CI 매트릭스 / hook bootstrap 실제 연결 / Windows native dogfood) 이 필수** — 본 문서 § "🔍 프로덕션 ship 전 추가 검증" 참조.

---

## ⏭️ 다음 세션 첫 메시지 템플릿 (복사용)

다음 PR 부터 즉시 시작하려면 다음을 그대로 paste:

```
/Users/Vincent/Workspace/ogham/HANDOFF.md 읽고 Windows-Unix 호환성 작업 이어서 진행해줘.

PR-G 부터 시작. 각 패키지 적용 일관 절차 (HANDOFF "🔁 적용 절차" 섹션) 준수. PR 단위로 끝나면 멈추고 결과 보고.
```

> 다른 PR 부터 시작하려면 "PR-H 만 끼워넣기" / "V1 부터 진행" 같이 명시.

> **프로덕션 검증 단계로 바로 진입하려면**: "추가 검증 단계 (V1 CI 매트릭스 / V2 hook bootstrap 실 연결 / V3 Windows dogfood) 부터 진행해줘. HANDOFF § '🔍 프로덕션 ship 전 추가 검증' 준수."

---

## 📂 핵심 입력 문서 (절대 경로)

1. **마스터 플랜** — `/Users/Vincent/Workspace/ogham/.metadata/cross-platform/PLAN.md`
   - Part 1 인벤토리 / Part 2 카테고리 / Part 3 Unix↔Windows / Part 4 시스템 설계 / Part 5 PR 분할 / Part 6 테스트 / Part 7 합격 기준 / Part 8 결정 (모두 확정).
2. **원 bug 리포트** — `.metadata/cross-platform/bug-windows-{cogair-checkexec,cogair-comprehensive,maencof-hook}.md`
3. **메타데이터 인덱스** — `.metadata/cross-platform/INTENT.md`
4. **본 핸드오프** — `HANDOFF.md`

`PLAN.md` 가 단일 진실 소스. 본 핸드오프는 그것의 진입점이며 PR 적용 절차를 표준화한다.

---

## 🔒 이미 확정된 결정 (재논의 금지)

| #   | 항목                         | 결정                                                                                                                                                                  |
| --- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 공유 모듈 위치               | **`shared/cross-platform` 신규 워크스페이스**                                                                                                                         |
| 2   | `cross-spawn` 채택           | **채택** (cross-platform 내부에서만)                                                                                                                                  |
| 3   | Windows hook bootstrap       | **A + E 병용** (`.cmd` shim + self-probe). 단 PR-D/E 에서 .cmd 만 생성, hooks.json 연결은 검증 V2 에서                                                                |
| 4   | CI Windows runner            | **매 PR full matrix** (3 OS × Node 20+22). 검증 V1 에서 실제 PASS 확인 필수                                                                                           |
| 5   | 외부 바이너리 설치 가이드    | **명령 + 링크 병기** (winget/brew + 공식 링크)                                                                                                                        |
| 6   | lint 가드 강도               | **금지=error / 경고=warning** (PR-I 에서 적용)                                                                                                                        |
| —   | 번들 정책                    | **모노레포 내부 전용 + esbuild inline**                                                                                                                               |
| —   | maencof 페르소나 fallback    | **미도입** (hook 무결화로 수렴)                                                                                                                                       |
| 7   | cross-platform sub-exports   | **도구별 9 entry** (light/heavy 분류 폐기) — `./env` `./eol` `./paths` `./spawn` `./binaries` `./shim` `./error-log` `./self-probe` `./bootstrap` + sideEffects:false |
| 8   | esbuild ESM CJS-shim 회피    | **모든 hook 번들에 `banner.js` 로 `createRequire(import.meta.url)` 주입** — cross-spawn 같은 CJS 의존을 ESM 환경에서 실행 가능하게 함                                 |
| 9   | hook 번들 cap (maencof 패턴) | LIGHT 10K / MEDIUM 15K (spawnCli 호출) / HEAVY 12K (자체 src 무게) / SESSION_START 40K (selfProbe + meta-skill-body)                                                  |
| 10  | .gitattributes               | `*.cmd text eol=crlf`, `*.bat text eol=crlf` — cmd.exe LF 거부 방지                                                                                                   |

근거 / 세부 디테일은 `PLAN.md` Part 8 + 4.2.0 + 4.8, 본 문서 § "🚨 PR-D/E 후 발견된 회귀와 학습".

---

## 🛠️ PR 분할 및 진행 상태

| 순서 | PR         | 패키지                                                                        | 분량 | 의존   | 상태      | 커밋      |
| ---- | ---------- | ----------------------------------------------------------------------------- | ---- | ------ | --------- | --------- |
| 1    | **PR-Z**   | meta — `.metadata/cross-platform/` 신설 + 4개 문서 이전                       | 0.5d | none   | ✅ 완료   | (이전)    |
| 2    | **PR-A**   | `shared/cross-platform` 워크스페이스 + 빌드 + CI 매트릭스                     | 1d   | PR-Z   | ✅ 완료   | (이전)    |
| 3    | **PR-B**   | 7 helper 구현 + 단위 테스트 (57 tests passing)                                | 2d   | PR-A   | ✅ 완료   | (이전)    |
| 4    | **PR-C**   | cogair 전환 (3 spawn + EOL 정규화 + 타임아웃 + light hook 가드)               | 2d   | PR-B   | ✅ 완료   | `8c1f6c4` |
| 5    | **PR-D**   | maencof hook bootstrap (.cmd shim + selfProbe + git spawnCli)                 | 2d   | PR-B   | ✅ 완료   | `9260d5f` |
| 5.5  | **PR-D.1** | cross-platform 도구별 exports (tree-shaking 회복)                             | —    | PR-D   | ✅ 완료   | `5ba0c35` |
| 6    | **PR-E**   | maencof-lens hook bootstrap + run.cjs 안전화 + 테스트 경로 정리               | 1d   | PR-B   | ✅ 완료   | `4d4c421` |
| 6.5  | **chore**  | gitattributes + vitest devDeps + esbuild banner + prettier                    | —    | PR-D/E | ✅ 완료   | `e7d54c1` |
| 7    | **PR-F.1** | cross-platform `spawnCliSync` 추가 (sync 호출자 cascade 회피)                 | —    | PR-B   | ✅ 완료   | `8f3f36c` |
| 7.5  | **PR-F**   | filid (ast-grep 화이트리스트 OS-aware + git spawnCli{,Sync} + hook bootstrap) | 1d   | PR-F.1 | ✅ 완료   | `5c33286` |
| 8    | **PR-G**   | imbas (`setup.ts` HOME/basename + npm fallback)                               | 0.5d | PR-B   | ⏳ 다음   | —         |
| 9    | **PR-H**   | atlassian — docs only (chmod Windows 무시 명기)                               | 0.5d | none   | ⏳ 대기   | —         |
| 10   | **V1**     | 추가 검증 — CI 매트릭스 push & 결과 확인                                      | 0.5d | PR-F/G | ⏳ 대기   | —         |
| 11   | **V2**     | 추가 검증 — hook bootstrap 실 연결 (hooks.json win32 분기)                    | 1d   | V1     | ⏳ 대기   | —         |
| 12   | **V3**     | 추가 검증 — Windows native dogfood (실 사용자 머신 1회)                       | 0.5d | V2     | ⏳ 대기   | —         |
| 13   | **PR-I**   | repo-wide lint 가드 (eslint custom rules + import resolver)                   | 1d   | V3     | ⏳ 마지막 | —         |

- 남은 분량 직렬: **약 5 영업일**
- PR-F/G/H 병렬 가능
- 검증 V1/V2/V3 는 마이그레이션 완료 후 직렬

---

## 🚨 PR-D/E 후 발견된 회귀와 학습 (재발 방지 필수)

다음 PR 진행 시 반드시 따라야 할 4가지 규칙. PR-D 작업 중 vitest 도구 부재로 검증을 우회한 결과 runtime crash 회귀가 잠재. follow-up 커밋 `e7d54c1` 에서 모두 잡았지만 PR-F/G 에서는 사전 적용 필수.

### 학습 1 — 검증 도구 부재 시 작업 우회 금지

- maencof / maencof-lens 의 `vitest` devDep 누락을 PR-D 시점에 인지하고도 "사전 누락 → 별도 이슈" 로 우회 → runtime 회귀 detect 불가.
- 새 패키지 마이그레이션 시작 시 **합격 기준 4개 (typecheck/build/test:run/hook cap) 중 하나라도 실행 불가하면 그 도구부터 복구** 후 마이그레이션 진행.

### 학습 2 — esbuild ESM 출력의 CJS-shim 시그니처

- esbuild 가 ESM 출력에 `require` 를 throw shim 으로 wrap 함: `Error: Dynamic require of "X" is not supported`. cross-spawn (CJS) 같은 패키지가 inline 되면 import 시점에 즉시 crash.
- **해결 패턴**: 모든 hook 번들 esbuild config 에 다음 banner 주입.
  ```js
  const ESM_CJS_REQUIRE_BANNER =
    "import { createRequire as __cpCreateRequire } from 'node:module';\n" +
    "const require = __cpCreateRequire(import.meta.url);\n";
  esbuild.build({ ..., banner: { js: ESM_CJS_REQUIRE_BANNER } });
  ```
- **FORBIDDEN_PATTERN `/Dynamic require of/` 는 banner 적용 패키지에서는 제거**. banner 없는 패키지 (cogair PR-C 의 hook 처럼 cross-platform 미사용) 에서는 가드 유지.
- PR-F filid 진행 시 hook 에 cross-platform helper 가 들어가면 banner 동시 적용.

### 학습 3 — 도구별 sub-exports 사용

- `import { logHookFailure } from '@ogham/cross-platform'` 같은 barrel import 는 paths/binaries/shim 까지 tree-shaking 불가능 (객체 export 의 한계).
- **모든 호출자는 도구별 sub-export 경로 사용 필수**:
  ```ts
  import { spawnCli } from "@ogham/cross-platform/spawn";
  import { logHookFailure } from "@ogham/cross-platform/error-log";
  import { selfProbe } from "@ogham/cross-platform/self-probe";
  import { generateWindowsCmd } from "@ogham/cross-platform/shim";
  // ...
  ```
- barrel `@ogham/cross-platform` 은 외부 (test fixture, 통합) 에서만 허용. hook 번들에는 절대 사용 금지.
- 새 helper 추가 시 `shared/cross-platform/package.json` 의 `exports` 필드에 sub-entry 등록.

### 학습 4 — Windows .cmd shim 의 실제 hooks.json 연결은 별도 작업 (V2)

- PR-D/E 에서 `bridge/run-hook.cmd` 를 자동 생성하지만 **hooks.json 의 `command` 는 여전히 `node "..."` 형식 그대로**. Win32 PATH 결손 시 .cmd 가 자동 호출되지 않음 → PR-D 의 hook bootstrap 의도 미충족.
- 검증 V2 에서 다음 옵션 중 하나로 실제 연결:
  - 옵션 A: `hooks.json` 자체를 OS-agnostic command 로 — 예: `${CLAUDE_PLUGIN_ROOT}/bridge/run-hook` (PATHEXT 가 Windows 에서 `.cmd` 자동 해석, Unix shebang launcher 별도 필요)
  - 옵션 B: install step 또는 SessionStart 진입에서 `process.platform === 'win32'` 분기로 hooks.json 동적 수정 (Claude Code 가 plugin install 시점 hook 지원하면)
  - 옵션 C: 빌드 시점에 win32 매니페스트 분리 생성 (Claude Code 의 분기 매니페스트 지원 여부 확인)
- PLAN Part 4.3.2 옵션 A 의 원래 의도. V2 에서 결정 + 적용.

---

## 🔁 각 패키지 cross-platform 적용 일관 절차

cogair / maencof / maencof-lens / filid / imbas 모두 동일 6단계. PR-H (atlassian) 는 코드 변경 없으므로 docs 단계만.

### Step 1 — `package.json` 의 devDependency 등록

```jsonc
{
  "devDependencies": {
    "@ogham/cross-platform": "workspace:^",
    "vitest": "^4.1.2", // 누락 시 추가 (학습 1)
  },
}
```

`dependencies` 가 아닌 `devDependencies` 만. 외부 노출 차단.

### Step 2 — esbuild config 확인

`scripts/buildMcpServer.mjs`, `scripts/buildHooks.mjs` 등:

- `external` 배열에서 `@ogham/cross-platform` **제외** (inline 핵심).
- **hook 빌드에 banner.js 주입 필수** (학습 2):
  ```js
  banner: {
    js: "import { createRequire as __cpCreateRequire } from 'node:module';\n" +
      "const require = __cpCreateRequire(import.meta.url);\n";
  }
  ```
- LIGHT hook cap 가드 (`FORBIDDEN_PATTERNS`) 재검증:
  - **차단**: `binaries.discover`, `runHookEntry`, `generateWindowsCmd` 는 MCP 서버 번들 전용.
  - **banner 적용한 경우**: `/Dynamic require of/` 가드 **제거** (의도된 shim).
  - **cogair 와 같이 banner 없고 hook 에 cross-platform 미사용**: `/Dynamic require of/` 가드 **유지**.
- Windows shim 생성:
  ```js
  import { generateWindowsCmd } from "@ogham/cross-platform/shim";
  generateWindowsCmd({
    outputPath: resolve(root, "bridge/run-hook.cmd"),
    scriptRelativePath: "../libs/run.cjs",
  });
  ```

### Step 3 — src 코드 마이그레이션

| Before (직접 사용)                                         | After (`@ogham/cross-platform/<helper>`)                            |
| ---------------------------------------------------------- | ------------------------------------------------------------------- | -------- | ------------------------------------- | -------------------------------------------------------- |
| `import { spawn                                            | exec                                                                | execSync | execFile } from "node:child_process"` | `import { spawnCli } from "@ogham/cross-platform/spawn"` |
| `process.env.HOME ?? process.env.USERPROFILE`              | `env.home()` from `@ogham/cross-platform/env`                       |
| `process.env.TMPDIR ?? process.env.TEMP`                   | `paths.tmp()` from `@ogham/cross-platform/paths`                    |
| `os.homedir()` / `os.tmpdir()` 직접 호출                   | `paths.home()` / `paths.tmp()`                                      |
| 외부 CLI stdout 의 `.split('\n')` / `.replace(/\n+$/, '')` | 진입점에서 `normalizeEol(stdout)` from `@ogham/cross-platform/eol`  |
| `'/usr'`, `'/bin'` 절대경로 화이트리스트                   | `env.isWindows` 분기 OS-aware 화이트리스트                          |
| 하드코딩 타임아웃 (`1500ms`)                               | `spawnCli({ timeoutMs: 1500 })` (내부 `osTimeout` 가 win32 ×3 자동) |
| `which(bin)` / `where bin` 직접 호출                       | `discover` / `binaries` from `@ogham/cross-platform/binaries`       |
| `cwd.split('/').pop()`                                     | `path.basename(cwd)`                                                |

### Step 4 — hooks.json + Windows shim (hook 보유 패키지만)

- 빌드 단계에서 `generateWindowsCmd` 호출 — bridge/run-hook.cmd 자동 생성.
- SessionStart 첫 entry 에서 `selfProbe({ writeLog: true, pkg: '<pkg>' })` 호출 — 진단 결과를 `~/.claude/plugins/<pkg>/error-log.json` 에 기록 + `hookSpecificOutput.additionalContext` 에 가시 경고.
- 모든 hook entry 를 try/catch 로 감싸고 catch 에서 `logHookFailure('<pkg>', '<hook-name>', err)`.
- **hooks.json 의 `command` 변경은 V2 에서 일괄** (학습 4 — 현재 PR 단계에서는 .cmd 만 빌드).

### Step 5 — 테스트

- 기존 vitest 스위트 통과 (macOS/Linux 회귀 0).
- spawnCli 도입 시 기존 `vi.mock('node:child_process', ...)` → `vi.mock('@ogham/cross-platform/spawn', () => ({ spawnCli: vi.fn() }))` 패턴 변경 + `await` 추가. (maencof PR-D/E follow-up `e7d54c1` 의 vault-committer.test / changelog-gate.test 참조)
- bundle smoke 테스트 (`hook-bundles.test.ts` 패턴) — `spawnSync(process.execPath, [bundle], { input, windowsHide: true })` 사용. `'node'` PATH 의존 금지.

### Step 6 — 빌드 검증 + 커밋

| 검증                                                   | 통과 기준                          |
| ------------------------------------------------------ | ---------------------------------- |
| `yarn workspace @ogham/<pkg> typecheck`                | no errors                          |
| `yarn workspace @ogham/<pkg> build`                    | exit 0                             |
| `yarn workspace @ogham/<pkg> test:run`                 | all green                          |
| Hook bundle size cap (`FORBIDDEN_PATTERNS` + byte cap) | 통과                               |
| manual smoke: `node bridge/<hook>.mjs` 직접 실행       | exit 0 + valid JSON / stderr clean |
| macOS/Linux 회귀                                       | 0 건                               |

> **manual smoke 단계 누락 금지** — PR-D 의 ESM CJS-shim 회귀가 이 단계 부재로 통과해버렸음.

커밋 메시지 패턴:

```
feat(<pkg>): migrate to @ogham/cross-platform for windows compatibility

- replace child_process spawn sites with spawnCli (cross-spawn underneath)
- normalise external CLI stdout via normalizeEol where pipes are parsed
- esbuild banner injects createRequire to keep cross-spawn (CJS) loadable in ESM hooks
- ...
```

### 패키지별 특수사항

| PR      | 패키지       | 특수사항                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ✅ PR-C | cogair       | LIGHT cap 10240 bytes. 3 spawn site + EOL 3곳. hook 에는 cross-platform 미사용 → `/Dynamic require of/` 가드 유지. 결과: 227 tests pass.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ✅ PR-D | maencof      | hook silent failure 본진 — git spawnCli 변환 (vault-committer/changelog-gate async), 모든 entry에 try/catch + logHookFailure + selfProbe (session-start only). 결과: 891 tests pass (banner + sub-exports 도입 후).                                                                                                                                                                                                                                                                                                                                                                                                        |
| ✅ PR-E | maencof-lens | single session-start hook + selfProbe + logHookFailure. hook-bundles.test 의 `spawnSync('node')` → `process.execPath` 교체. 결과: 54 tests pass.                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ✅ PR-F | filid        | `src/mcp/tools/ast-grep-replace/ast-grep-replace.ts:73` 시스템 경로 화이트리스트 OS-aware (Unix `/usr,/bin,/sbin,/etc,/var/lib` + Windows `System32` / `SysWOW64` / `Program Files` / `Program Files (x86)`). `resolve-git-root` 은 sync caller cascade 회피를 위해 새 `spawnCliSync` 사용 (PR-F.1 에서 cross-platform 에 추가); `content-hash.gitExec` 은 `spawnCli` (async). 5 hook entry 에 `logHookFailure`, setup entry 에 `selfProbe` 추가 + ESM CJS banner 적용. HEAVY cap 17 KB 로 상향 (logHookFailure 인라인 시 ~16 KB). pre-existing prune-throttle 경계 테스트 race 1초 buffer 로 수정. 결과: 1012 tests pass. |
| ⏳ PR-G | imbas        | `setup.ts:21` `process.env.HOME` → `env.home()`. `setup.ts:23` `cwd.split('/').pop()` → `path.basename(cwd)`. `build-mcp-server.mjs:44` `execSync('npm root -g')` fallback → `binaries.ensure('npm')`.                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ⏳ PR-H | atlassian    | docs only — chmod 0o600 가 Windows 에서 무시되어 ACL 기본값으로 보호됨을 `auth-manager` / `config-manager` INTENT.md + README Security 섹션에 명기.                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

---

## 🔍 프로덕션 ship 전 추가 검증 (V1 / V2 / V3)

PR-D/E 후 자체 분석에서 미보장으로 노출된 영역. PR-I lint 가드 전에 반드시 통과.

### V1 — CI 매트릭스 실제 PASS 확인 (0.5d)

- 현재 상태: 모든 PR-C/D/E + follow-up 커밋 (`8c1f6c4` ~ `e7d54c1`) 이 **origin/bugfix/win32-support 에 push 안 됨** → `.github/workflows/ci.yml` 의 3 OS × Node 20/22 매트릭스 미실행.
- 작업:
  1. `git push origin bugfix/win32-support`
  2. PR 생성 (선택) 또는 push 만으로 workflow 트리거 확인
  3. ubuntu-latest / macos-latest / **windows-latest** 매트릭스 모두 green 확인
  4. Windows runner 에서 fail 발생 시 별도 작업 — V1 의 합격 기준은 6 매트릭스 모두 green.
- **manual smoke 가 macOS 만 검증** 했으므로 V1 이 진짜 Linux/Windows 보장의 첫 단계.

### V2 — hook bootstrap 실 연결 (1d)

- 현재 상태: `bridge/run-hook.cmd` 생성은 됐지만 `hooks.json` 이 호출하지 않음 → Win32 PATH 결손 시 PR-D 의 hook bootstrap fallback 미작동.
- 작업: 학습 4 의 옵션 A/B/C 중 하나로 hooks.json 연결.
  - **권장**: 옵션 A (PATHEXT 자동 해석) 시도. `hooks.json command` 를 `${CLAUDE_PLUGIN_ROOT}/bridge/run-hook "${CLAUDE_PLUGIN_ROOT}/bridge/<hook>.mjs"` (확장자 없이) 로 변경 + Unix용 shebang launcher (`bridge/run-hook` chmod +x) 도 함께 생성.
  - 실패하면 옵션 C — 빌드 시점에 hooks.linux.json + hooks.win32.json 분리하고 install/SessionStart 첫 진입에서 plugin.json 분기 (Claude Code 지원 여부 사전 확인).
- 합격 기준:
  - Win32 에서 `PATH=` (node 결손) 로 강제 후에도 hook 작동
  - Unix 에서 기존 동작 회귀 0

### V3 — Windows native dogfood (0.5d)

- 현재 상태: 실 Windows 환경에서 plugin install → SessionStart → MCP 도구 호출 → vault-committer 흐름 1회도 미실행.
- 작업: V1/V2 통과 후 실 Windows 머신 (또는 Win11 VM) 에서:
  1. plugin install (cogair / maencof / maencof-lens / filid / imbas)
  2. Claude Code 새 세션 시작 — `[maencof] hook bootstrap diagnostic` 가시 경고 부재 확인
  3. cogair `/codex` 호출 — 30ms cli_error 없음 + 정상 응답
  4. maencof `kg_search` MCP 도구 호출 — 정상
  5. `~/.claude/plugins/<pkg>/error-log.json` 비어있음 확인
  6. CRLF/LF 가 `.cmd` 에 의도된 형태 (CRLF) 로 적용됐는지 확인
- **합격 기준**: report1/2/3 의 모든 reproducer 가 Win32 에서 통과.

---

## 🧭 작업 환경 / 컨벤션

- 모노레포: **yarn 4.12 workspaces** (`packages/*` + `shared/*`), nodeLinker: node-modules
- TypeScript ^5.7, Node.js ≥ 20, ESM
- 빌드: `tsc -p tsconfig.build.json` + `esbuild` + `scripts/inject-version.mjs`
- 테스트: **vitest 4.1.2** (`yarn test:run`)
- Lint: `yarn lint` (root)
- Prettier: root devDep, stop hook 이 자동 적용 (`.claude/.pending-format`)
- 현재 브랜치: **`bugfix/win32-support`** (main 에서 분기)
- 작업 디렉토리: `/Users/Vincent/Workspace/ogham`
- Git 사용자: Vincent K. Kelvin
- 커밋: co-author 추가 금지 (사용자 글로벌 룰)
- 응답 언어: 한국어 존댓말

### 워크스페이스 명령 PATH 주의

- yarn 4 hoist 가 workspace .bin 에 link 안 함. 일부 명령은 root binary 직접 호출 필요:
  - `./node_modules/.bin/prettier --write <files>`
  - root scripts 또는 `yarn workspace <pkg> run <script>` (자체 devDep 만 PATH)

---

## ⚠️ 작업 중 절대 잊지 말아야 할 제약 (체크리스트)

- [ ] **vitest devDep 모든 패키지 존재 확인** — 누락 시 마이그레이션 시작 전 보강.
- [ ] **hook 번들 esbuild banner 적용** — cross-platform inline 시 필수.
- [ ] **도구별 sub-export 사용** — barrel `@ogham/cross-platform` hook 번들 금지.
- [ ] **`Dynamic require of` 가드는 banner 적용 패키지에서만 제거** — banner 없으면 가드 유지.
- [ ] **cogair 의 10 KB LIGHT hook cap** — light helper 만 hook 번들. 무거운 helper (`binaries.discover`, `runHookEntry`, `generateWindowsCmd`) 는 MCP 서버 번들 전용.
- [ ] **cross-platform 은 npm publish 금지** (`private: true`). 각 플러그인의 `devDependencies` 에만 등록.
- [ ] **esbuild `external` 에 `@ogham/cross-platform` 넣지 말 것** — inline 번들이 핵심.
- [ ] **모든 외부 CLI stdout 진입점에 `normalizeEol()`** — CRLF 정규화 빠뜨리면 CRLF 환경에서 파싱 실패.
- [ ] **`process.platform` 분기를 호출 측에 두지 말 것** — 모두 cross-platform 내부에서. 호출자는 `env.isWindows` 만 사용.
- [ ] **`process.env.HOME|USERPROFILE|TMPDIR|TEMP` 직접 사용 금지** — `env.home()` / `paths.tmp()` 경유.
- [ ] **manual smoke 1회 (`node bridge/<hook>.mjs`)** — typecheck/build 통과만으로 ship 금지.
- [ ] **macOS/Linux 회귀 0** — 기존 vitest 스위트 모두 통과 (Acceptance overall).
- [ ] **페르소나 fallback 채널 시도 금지** — hook 무결화에만 자원 투입.

---

## 📊 작업 상태 스냅샷

| 단계                                              | 상태                |
| ------------------------------------------------- | ------------------- |
| 6개 패키지 인벤토리 분석                          | ✅ 완료             |
| 카테고리 통합 (C1–C8)                             | ✅ 완료             |
| `shared/cross-platform` 모듈 설계 (PLAN Part 4.2) | ✅ 완료             |
| 번들 정책 (PLAN Part 4.2.0)                       | ✅ 완료             |
| Hook bootstrap 옵션 비교 (PLAN Part 4.3)          | ✅ 완료             |
| Phase 0–6 PR 분할 (PLAN Part 5)                   | ✅ 완료             |
| 합격 기준 (PLAN Part 7)                           | ✅ 완료             |
| 결정 #1 ~ #10 + 번들 / fallback                   | ✅ 완료             |
| PR-Z 메타데이터 이전                              | ✅ 완료             |
| PR-A 워크스페이스 + CI 매트릭스                   | ✅ 완료             |
| PR-B 7 helper + 57 단위 테스트                    | ✅ 완료             |
| PR-C cogair 전환                                  | ✅ 완료 (`8c1f6c4`) |
| PR-D maencof 전환                                 | ✅ 완료 (`9260d5f`) |
| PR-D.1 cross-platform sub-exports                 | ✅ 완료 (`5ba0c35`) |
| PR-E maencof-lens 전환                            | ✅ 완료 (`4d4c421`) |
| chore (infra + regression fix + prettier)         | ✅ 완료 (`e7d54c1`) |
| PR-F.1 cross-platform spawnCliSync                | ✅ 완료 (`8f3f36c`) |
| PR-F filid 전환                                   | ✅ 완료 (`5c33286`) |
| PR-G imbas 전환                                   | ⏳ 다음             |
| PR-H atlassian docs                               | ⏳ 대기             |
| V1 CI 매트릭스 push & 검증                        | ⏳ 대기             |
| V2 hook bootstrap 실 연결 (hooks.json win32 분기) | ⏳ 대기             |
| V3 Windows native dogfood                         | ⏳ 대기             |
| PR-I repo-wide lint 가드                          | ⏳ 마지막           |

---

## 🚦 다음 세션 진입 시 점검 순서 (Claude 용)

1. 이 핸드오프 파일을 먼저 읽기.
2. 결정 10개는 이미 확정 — 재논의 X.
3. 사용자가 어떤 PR (PR-G/H) 또는 검증 (V1/V2/V3) 부터 진행할지 명시했는지 확인. 미명시 시 권장 = PR-G.
4. 선택된 PR 의 "🔁 각 패키지 적용 일관 절차" 6단계를 그대로 따름. 패키지별 특수사항 반영. § "🚨 회귀와 학습" 4가지 규칙 사전 점검.
5. 각 PR 종료 시 결과 보고 + 다음 진행 의사 확인.
6. 사용자 글로벌 룰: Continuous Execution — 작업 중 yield 금지, 결정 필요 시에만 질문.
7. 마이그레이션 모두 완료되면 V1 → V2 → V3 순서대로 검증. V3 통과 후에만 PR-I 진입.
