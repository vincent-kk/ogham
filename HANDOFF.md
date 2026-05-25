# Handoff — Windows-Unix 호환성 작업 (cross-platform 워크스페이스)

다음 세션이 0 컨텍스트로 들어와도 이 한 문서만 읽으면 즉시 이어서 작업할 수 있도록 설계됨.

---

## TL;DR (한 문단)

ogham 모노레포 6개 플러그인의 Windows-Unix 호환성을 한 곳에 모으기 위해 **`shared/cross-platform` 모노레포 내부 워크스페이스** 신설 + 7 helper (`env`/`eol`/`paths`/`spawn`/`binaries`/`hooks`/`shim`) 구현 + 단위 테스트 57 개까지 완료. 결정 대기 항목 4가지는 모두 확정. 다음 단계는 **PR-C ~ PR-G** (각 플러그인 마이그레이션) — 패키지마다 동일 6단계 절차. **PR-H** 는 atlassian docs-only 로 어느 시점이든 가능. **PR-I** 는 모든 패키지 전환 완료 후 lint 가드. 남은 분량 ≈ 8 영업일, 병렬 진행 시 ≈ 4 영업일.

---

## ⏭️ 다음 세션 첫 메시지 템플릿 (복사용)

다음 PR 부터 즉시 시작하려면 다음을 그대로 paste:

```
/Users/Vincent/Workspace/ogham/HANDOFF.md 읽고 Windows-Unix 호환성 작업 이어서 진행해줘.

PR-C 부터 시작. 각 패키지 적용 일관 절차 (HANDOFF "🔁 적용 절차" 섹션) 준수. PR 단위로 끝나면 멈추고 결과 보고.
```

> 다른 PR 부터 시작하려면 "PR-D 만 진행" / "PR-C, PR-G 만 병렬 진행" / "PR-H 만 먼저 끼워넣기" 같이 명시.

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

| #   | 항목                      | 결정                                                |
| --- | ------------------------- | --------------------------------------------------- |
| 1   | 공유 모듈 위치            | **`shared/cross-platform` 신규 워크스페이스**       |
| 2   | `cross-spawn` 채택        | **채택** (cross-platform 내부에서만)                |
| 3   | Windows hook bootstrap    | **A + E 병용** (`.cmd` shim + self-probe)           |
| 4   | CI Windows runner         | **매 PR full matrix** (3 OS × Node 20+22)           |
| 5   | 외부 바이너리 설치 가이드 | **명령 + 링크 병기** (winget/brew + 공식 링크)      |
| 6   | lint 가드 강도            | **금지=error / 경고=warning** (PR-I 에서 적용)      |
| —   | 번들 정책                 | **모노레포 내부 전용 + esbuild inline**             |
| —   | maencof 페르소나 fallback | **미도입** (hook 무결화로 수렴)                     |

근거 / 세부 디테일은 `PLAN.md` Part 8 + 4.2.0 + 4.8.

---

## 🛠️ PR 분할 및 진행 상태

| 순서 | PR       | 패키지                                                                | 분량 | 의존   | 상태       |
| ---- | -------- | --------------------------------------------------------------------- | ---- | ------ | ---------- |
| 1    | **PR-Z** | meta — `.metadata/cross-platform/` 신설 + 4개 문서 이전               | 0.5d | none   | ✅ 완료    |
| 2    | **PR-A** | `shared/cross-platform` 워크스페이스 + 빌드 + CI 매트릭스             | 1d   | PR-Z   | ✅ 완료    |
| 3    | **PR-B** | 7 helper 구현 + 단위 테스트 (57 tests passing)                        | 2d   | PR-A   | ✅ 완료    |
| 4    | **PR-C** | cogair 전환 (3 spawn + EOL 정규화 + 타임아웃 + light hook 가드)       | 2d   | PR-B   | ⏳ 다음    |
| 5    | **PR-D** | maencof hook bootstrap (.cmd shim + selfProbe + git spawnCli)         | 2d   | PR-B   | ⏳ 대기    |
| 6    | **PR-E** | maencof-lens hook bootstrap + run.cjs 안전화 + 테스트 경로 정리       | 1d   | PR-B   | ⏳ 대기    |
| 7    | **PR-F** | filid (ast-grep 화이트리스트 OS-aware + git spawnCli + run.cjs)       | 1d   | PR-B   | ⏳ 대기    |
| 8    | **PR-G** | imbas (`setup.ts` HOME/basename + npm fallback)                       | 0.5d | PR-B   | ⏳ 대기    |
| 9    | **PR-H** | atlassian — docs only (chmod Windows 무시 명기)                       | 0.5d | none   | ⏳ 대기    |
| 10   | **PR-I** | repo-wide lint 가드 (eslint custom rules)                             | 1d   | PR-C~G | ⏳ 마지막  |

- 남은 분량 직렬: **8 영업일**
- PR-C/D/E/F/G 병렬: **약 4 영업일**
- PR-H 어느 시점이든 끼워넣기 가능

---

## 🔁 각 패키지 cross-platform 적용 일관 절차

cogair / maencof / maencof-lens / filid / imbas 모두 동일 6단계. PR-H (atlassian) 는 코드 변경 없으므로 docs 단계만.

### Step 1 — `package.json` 의 devDependency 등록

```jsonc
{
  "devDependencies": {
    "@ogham/cross-platform": "workspace:^"
  }
}
```

`dependencies` 가 아닌 `devDependencies` 만. 외부 노출 차단.

### Step 2 — esbuild config 확인

`scripts/buildMcpServer.mjs`, `scripts/buildHooks.mjs` 등:

- `external` 배열에서 `@ogham/cross-platform` **제외** (inline 핵심).
- LIGHT hook cap 가드 (`FORBIDDEN_PATTERNS`) 재검증:
  - **허용**: `env`, `eol`, `paths`, `spawn` 의 light helper 만 LIGHT 번들에 inline.
  - **차단**: `binaries.discover`, `hooks.bootstrap`, `selfProbe`, `logHookFailure`, `generateWindowsCmd` 는 MCP 서버 번들 전용.

### Step 3 — src 코드 마이그레이션

| Before (직접 사용)                                                  | After (`@ogham/cross-platform`)                          |
| ------------------------------------------------------------------- | -------------------------------------------------------- |
| `import { spawn|exec|execSync|execFile } from "node:child_process"` | `import { spawnCli } from "@ogham/cross-platform"`       |
| `process.env.HOME ?? process.env.USERPROFILE`                       | `env.home()`                                             |
| `process.env.TMPDIR ?? process.env.TEMP`                            | `paths.tmp()`                                            |
| `os.homedir()` / `os.tmpdir()` 직접 호출                            | `paths.home()` / `paths.tmp()`                           |
| 외부 CLI stdout 의 `.split('\n')` / `.replace(/\n+$/, '')`          | 진입점에서 `normalizeEol(stdout)` 먼저                   |
| `'/usr'`, `'/bin'` 절대경로 화이트리스트                            | `env.isWindows` 분기 OS-aware 화이트리스트               |
| 하드코딩 타임아웃 (`1500ms`)                                        | `spawnCli({ timeoutMs: 1500 })` (내부 `osTimeout` 적용)  |
| `which(bin)` / `where bin` 직접 호출                                | `binaries.discover(bin, { pkg })` / `binaries.ensureXxx` |
| `cwd.split('/').pop()`                                              | `path.basename(cwd)`                                     |

### Step 4 — hooks.json + Windows shim (hook 보유 패키지만)

- 빌드 단계에서 `generateWindowsCmd({ outputPath: 'bridge/run-hook.cmd', scriptRelativePath: '../libs/run.cjs' })` 호출.
- `hooks.json` 의 `command` 가 Windows 일 때 `.cmd` shim 경유하도록 분기 (빌드 시 OS-aware 매니페스트 생성).
- SessionStart 첫 entry 에서 `selfProbe({ writeLog: true, pkg: '<pkg>' })` 호출 — 진단 결과를 `error-log.json` 에 자동 기록.
- 모든 hook entry 를 try/catch 로 감싸고 실패 시 `logHookFailure('<pkg>', '<hook-name>', err)`.

### Step 5 — 테스트

- 기존 vitest 스위트 통과 (macOS/Linux 회귀 0).
- 신규 단위 테스트 — `process.platform` mock 으로 win32 분기 검증.
- 외부 바이너리 호출 경로는 committed fake fixture (예: `tests/fixtures/bin-fake/<bin>` + `.cmd`, `print-hello.mjs` 형태) 로 라우팅 검증.

### Step 6 — 빌드 검증 + 커밋

| 검증                                                    | 통과 기준         |
| ------------------------------------------------------- | ----------------- |
| `yarn workspace @ogham/<pkg> build`                     | exit 0            |
| `yarn workspace @ogham/<pkg> typecheck`                 | no errors         |
| `yarn workspace @ogham/<pkg> test:run`                  | all green         |
| Hook bundle size cap (`FORBIDDEN_PATTERNS` + byte cap)  | 통과              |
| macOS/Linux 회귀                                        | 0 건              |

커밋 메시지 패턴:

```
feat(<pkg>): migrate to @ogham/cross-platform for windows compatibility

- replace child_process spawn sites with spawnCli (cross-spawn underneath)
- normalise external CLI stdout via normalizeEol where pipes are parsed
- ...
```

### 패키지별 특수사항

| PR   | 패키지       | 특수사항                                                                                                                                                                                                                                            |
| ---- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PR-C | cogair       | **LIGHT cap 10240 bytes**. 3 spawn site (`checkExecutable` + `dispatcher/codex/operations/spawn` + `dispatcher/gemini/operations/spawn`), EOL 정규화 3 곳, gemini 콜드스타트 타임아웃 ×3 (`spawnCli` 내부 osTimeout 가 자동 처리).                  |
| PR-D | maencof      | hook silent failure 해결의 본진 — `.cmd` shim + selfProbe + `vault-committer` / `changelog-gate` 의 git execSync → spawnCli. 페르소나 fallback 채널은 결정대로 도입 안 함.                                                                          |
| PR-E | maencof-lens | hook bootstrap + `libs/run.cjs` path slice 안전화 + `__tests__` 의 `/tmp` 하드코딩을 `paths.tmp()` 로 교체.                                                                                                                                          |
| PR-F | filid        | `src/mcp/tools/ast-grep-replace/ast-grep-replace.ts:73` 시스템 경로 화이트리스트 OS-aware (Unix `/usr,/bin,/sbin,/etc,/var/lib` + Windows `C:\Windows\System32`, `C:\Program Files`, `C:\Program Files (x86)`). `resolve-git-root` + `content-hash` 의 git execSync → spawnCli. |
| PR-G | imbas        | `setup.ts:21` `process.env.HOME` → `env.home()`. `setup.ts:23` `cwd.split('/').pop()` → `path.basename(cwd)`. `build-mcp-server.mjs:44` `execSync('npm root -g')` fallback → `binaries.ensure('npm')`.                                              |
| PR-H | atlassian    | docs only — chmod 0o600 가 Windows 에서 무시되어 ACL 기본값으로 보호됨을 `auth-manager` / `config-manager` INTENT.md + README Security 섹션에 명기.                                                                                                  |

---

## 🧭 작업 환경 / 컨벤션

- 모노레포: **yarn 4.12 workspaces** (`packages/*` + `shared/*`)
- TypeScript ^5.7, Node.js ≥ 20, ESM
- 빌드: `tsc -p tsconfig.build.json` + `esbuild` + `scripts/inject-version.mjs`
- 테스트: **vitest 4.1.2** (`yarn test:run`)
- Lint: `yarn lint`
- 현재 브랜치: **`bugfix/win32-support`** (main 에서 분기)
- 작업 디렉토리: `/Users/Vincent/Workspace/ogham`
- Git 사용자: Vincent K. Kelvin
- 커밋: co-author 추가 금지 (사용자 글로벌 룰)
- 응답 언어: 한국어 존댓말

---

## ⚠️ 작업 중 절대 잊지 말아야 할 제약 (체크리스트)

- [ ] **cogair 의 10 KB LIGHT hook cap** (`scripts/buildHooks.mjs` `FORBIDDEN_PATTERNS`) — light helper 만 hook 번들. 무거운 helper (`binaries.discover`, `hooks.bootstrap`, `selfProbe`, `logHookFailure`) 는 MCP 서버 번들 전용.
- [ ] **cross-platform 은 npm publish 금지** (`private: true`). 각 플러그인의 `devDependencies` 에만 등록.
- [ ] **esbuild `external` 에 `@ogham/cross-platform` 넣지 말 것** — inline 번들이 핵심.
- [ ] **모든 외부 CLI stdout 진입점에 `normalizeEol()`** — CRLF 정규화 빠뜨리면 CRLF 환경에서 파싱 실패.
- [ ] **`process.platform` 분기를 호출 측에 두지 말 것** — 모두 cross-platform 내부에서. 호출자는 `env.isWindows` 만 사용.
- [ ] **`process.env.HOME|USERPROFILE|TMPDIR|TEMP` 직접 사용 금지** — `env.home()` / `paths.tmp()` 경유.
- [ ] **macOS/Linux 회귀 0** — 기존 vitest 스위트 모두 통과 (Acceptance overall).
- [ ] **페르소나 fallback 채널 시도 금지** — hook 무결화에만 자원 투입.

---

## 📊 작업 상태 스냅샷

| 단계                                                 | 상태       |
| ---------------------------------------------------- | ---------- |
| 6개 패키지 인벤토리 분석                             | ✅ 완료    |
| 카테고리 통합 (C1–C8)                                | ✅ 완료    |
| `shared/cross-platform` 모듈 설계 (PLAN Part 4.2)    | ✅ 완료    |
| 번들 정책 (PLAN Part 4.2.0)                          | ✅ 완료    |
| Hook bootstrap 옵션 비교 (PLAN Part 4.3)             | ✅ 완료    |
| Phase 0–6 PR 분할 (PLAN Part 5)                      | ✅ 완료    |
| 합격 기준 (PLAN Part 7)                              | ✅ 완료    |
| 결정 #1 ~ #6 + 번들 / fallback                       | ✅ 완료    |
| PR-Z 메타데이터 이전                                 | ✅ 완료    |
| PR-A 워크스페이스 + CI 매트릭스                      | ✅ 완료    |
| PR-B 7 helper + 57 단위 테스트                       | ✅ 완료    |
| PR-C cogair 전환                                     | ⏳ 다음    |
| PR-D / E / F / G / H                                 | ⏳ 대기    |
| PR-I lint 가드                                       | ⏳ 마지막  |

---

## 🚦 다음 세션 진입 시 점검 순서 (Claude 용)

1. 이 핸드오프 파일을 먼저 읽기.
2. 결정 4개는 이미 확정 — 재논의 X.
3. 사용자가 어떤 PR (PR-C/D/E/F/G/H) 부터 진행할지 명시했는지 확인. 미명시 시 권장 = PR-C.
4. 선택된 PR 의 "🔁 각 패키지 적용 일관 절차" 6단계를 그대로 따름. 패키지별 특수사항 반영.
5. 각 PR 종료 시 결과 보고 + 다음 PR 진행 의사 확인 (병렬 가능 옵션 포함).
6. 사용자 글로벌 룰: Continuous Execution — 작업 중 yield 금지, 결정 필요 시에만 질문.
