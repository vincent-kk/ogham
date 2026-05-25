# Handoff — Windows-Unix 호환성 작업 (cross-platform 워크스페이스)

다음 세션이 0 컨텍스트로 들어와도 이 한 문서만 읽으면 즉시 이어서 작업할 수 있도록 설계됨.

---

## TL;DR (한 문단)

ogham 모노레포 6개 플러그인 패키지의 Windows-Unix 호환성 결함을 일괄 해결하기 위해, **`packages/cross-platform` 모노레포 내부 워크스페이스**를 신설하고 모든 플랫폼 분기를 한 곳에 가둘 것. 분석·계획·결정의 대부분은 완료되어 있고, 4가지 미결정 항목만 확정되면 곧바로 PR-Z(메타데이터 이전) → PR-A(워크스페이스 골격) → PR-B(7 helper 구현) → PR-C~H(패키지별 전환, 병렬 가능) → PR-I(lint 가드) 순으로 진행한다. 직렬 11.5d, 병렬 진행 시 약 6.5d 예상.

---

## ⏭️ 다음 세션 첫 메시지 템플릿 (복사용)

권장안을 그대로 받아들이는 경우 — 아래를 그대로 복사해 다음 세션 첫 메시지로 보내면 즉시 작업 시작.

```
/Users/Vincent/Workspace/ogham/HANDOFF.md 읽고 Windows-Unix 호환성 작업 이어서 진행해줘.

결정사항:
- #3 hook bootstrap: A+E (.cmd shim + self-probe) 권장 채택
- #4 CI Windows matrix: 매 PR ubuntu/macos/windows × Node 20 + 분기별 full matrix (Node 20+22)
- #5 외부 바이너리 설치 가이드: winget/brew 자동 제안 + 링크 병기
- #6 lint 가드 강도: 금지 패턴 = error, 경고 패턴 = warning

PR-Z 부터 순서대로 진행. PR-A 까지 끝나면 멈추고 결과 보고.
```

> 결정을 바꾸고 싶으면 위 4줄 중 해당 줄만 수정해서 보내면 됨. 끝의 "PR-Z 부터 ..." 부분은 진행 범위 조정 (예: "PR-B 까지 진행" 또는 "PR-C 만 먼저 띄워줘").

---

## 📂 핵심 입력 문서 (절대 경로)

1. **마스터 플랜** — `/Users/Vincent/Workspace/ogham/report-cross-platform-plan.md` (748줄)
   - Part 1 패키지별 인벤토리 / Part 2 카테고리 분석 / Part 3 Unix↔Windows 매칭 / Part 4 시스템 설계 / Part 5 Phase + PR 분할표 / Part 6 테스트 / Part 7 합격 기준 / Part 8 결정 항목 / 부록 A·B
2. **원 bug 리포트** (사용자 실측)
   - `/Users/Vincent/Workspace/ogham/bug-windows-cogair-checkexec.md`
   - `/Users/Vincent/Workspace/ogham/bug-windows-cogair-comprehensive.md`
   - `/Users/Vincent/Workspace/ogham/bug-windows-maencof-hook.md`
3. **본 핸드오프** — `/Users/Vincent/Workspace/ogham/HANDOFF.md`

`report-cross-platform-plan.md` 가 단일 진실 소스. 본 핸드오프는 그것의 진입점일 뿐.

---

## 🔒 이미 확정된 결정 (재논의 금지)

| #   | 항목                      | 결정                                                | 근거                                                                                                                                            |
| --- | ------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 공유 모듈 위치            | **신규 워크스페이스 `packages/cross-platform`**     | drift 방지, 단일 책임. (a) 채택 / (b)(c) 거부.                                                                                                  |
| 2   | `cross-spawn` 채택        | **채택** (cross-platform 내부에서만 사용)           | `.cmd`/`.bat` 자동 해석, DEP0190 회피.                                                                                                          |
| —   | 번들 정책                 | **모노레포 내부 전용 워크스페이스, esbuild inline** | npm publish 안 함. 각 플러그인 `devDependencies` + esbuild inline → 사용자 머신에 별도 디렉토리 0, 추가 다운로드 0, 버전 drift 0. (4.2.0 참조)  |
| —   | maencof 페르소나 fallback | **미도입**                                          | hook 실패 = MCP/dispatcher/vault 전체 실패. 페르소나만 별도 채널로 살려도 사용자에게 의미 없음. 자원은 hook bootstrap 무결화에 집중. (4.8 참조) |

---

## ⏳ 결정 대기 항목 (4가지)

> 권장안을 받아들이면 위 "다음 세션 첫 메시지 템플릿" 을 그대로 paste.

### #3 Windows hook bootstrap 옵션 (Part 4.3.2)

- ☑ **권장: A + E 병용** — `.cmd` shim 자동 생성 (PATH 의존 제거) + self-probe (silent failure 가시화)
- ☐ B 단독 — hooks.json 분기 매니페스트 (Claude Code 사양 의존성)
- ☐ C 단독 — PowerShell launcher (macOS/Linux 호환 깨짐)
- ☐ E 단독 — 진단 강화만 (PATH 추가 사용자 요청, 근본 해결 X)

### #4 CI Windows runner 비용

- ☑ **권장: 매 PR 마다 `ubuntu/macos/windows` × Node 20** + **분기별 full matrix (Node 20+22)**
- ☐ 매 PR full matrix (3 OS × 2 Node = 6 jobs)
- ☐ 분기별만 (PR 빠르지만 회귀 늦게 발견)
- 참고: GitHub Actions 무료 한도 + windows-latest = Linux 의 약 2x 분 소비

### #5 외부 바이너리 설치 가이드 톤

- ☑ **권장: winget(Windows) / brew(macOS) / 배포판별(Linux) 자동 명령 제안 + 공식 링크 병기**
- ☐ 링크만 (광고성 부담 X, 사용자 자동 진행 어려움)
- ☐ 명령만 (링크 없음, 직접 실행 어려운 사용자 배제)

### #6 lint 가드 강도 (Phase 5, PR-I)

- ☑ **권장: 금지 패턴 = error / 경고 패턴 = warning**
  - error: `node:child_process` 의 `spawn`/`exec`/`execSync`/`execFile` 직접 import, `process.env.HOME|USERPROFILE|TMPDIR|TEMP` 직접 사용
  - warning: `/tmp/`,`/var/`,`/usr/`,`/etc/`,`/bin/` 문자열 리터럴, `.split('/')` 패턴
- ☐ 모두 error (false positive 시 작업 중단 위험)
- ☐ 모두 warning (CI gate 없음 → 회귀 위험)

---

## 🛠️ 결정 후 즉시 시작할 PR 순서 (PR 분할표 요약)

| 순서 | PR       | 패키지                                                                                        | 분량 | 의존   | 병렬화          |
| ---- | -------- | --------------------------------------------------------------------------------------------- | ---- | ------ | --------------- |
| 1    | **PR-Z** | meta — `.metadata/cross-platform/` 신설 + 4개 문서 이전                                       | 0.5d | none   | 단독            |
| 2    | **PR-A** | `packages/cross-platform` 워크스페이스 + 빌드 파이프라인 + CI 매트릭스                        | 1d   | PR-Z   | —               |
| 3    | **PR-B** | cross-platform 7 helper (`spawn`/`paths`/`env`/`eol`/`binaries`/`hooks`/`shim`) + 단위 테스트 | 2d   | PR-A   | —               |
| 4    | **PR-C** | cogair 전환 (3 spawn + EOL 정규화 + 타임아웃)                                                 | 2d   | PR-B   | D~G 와 병렬     |
| 5    | **PR-D** | maencof hook bootstrap (.cmd shim + selfProbe + git spawnCli)                                 | 2d   | PR-B   | C/E~G 와 병렬   |
| 6    | **PR-E** | maencof-lens hook bootstrap + run.cjs 안전화 + 테스트 경로 정리                               | 1d   | PR-B   | C/D/F/G 와 병렬 |
| 7    | **PR-F** | filid (ast-grep 화이트리스트 OS-aware + git spawnCli + run.cjs)                               | 1d   | PR-B   | C~E/G 와 병렬   |
| 8    | **PR-G** | imbas (`setup.ts` HOME/basename + npm fallback)                                               | 0.5d | PR-B   | C~F 와 병렬     |
| 9    | **PR-H** | atlassian — docs only (chmod Windows 무시 명기)                                               | 0.5d | none   | 어느 시점이든   |
| 10   | **PR-I** | repo-wide lint 가드 (eslint custom rules)                                                     | 1d   | PR-C~G | —               |

- 직렬 합계: **11.5 영업일**
- PR-C/D/E/F/G 병렬 진행 시: **약 6.5 영업일**
- PR-H 는 코드 무수정 — 어느 단계든 끼워넣기 가능

---

## 🧭 작업 환경 / 컨벤션

- 모노레포: **yarn 4.12 workspaces** (`packages/*`)
- TypeScript ^5.7, Node.js ≥ 20, ESM
- 빌드: `tsc -p tsconfig.build.json` + `esbuild` + `scripts/inject-version.mjs`
- 테스트: **vitest 3.2** (`yarn test:run`)
- Lint: `yarn lint`
- 현재 브랜치: **`bugfix/win32-support`** (main 에서 분기)
- 작업 디렉토리: `/Users/Vincent/Workspace/ogham`
- Git 사용자: Vincent K. Kelvin
- 커밋: co-author 추가 금지 (사용자 글로벌 룰)
- 응답 언어: 한국어 존댓말

---

## ⚠️ 작업 중 절대 잊지 말아야 할 제약 (체크리스트)

- [ ] **cogair 의 10 KB LIGHT hook cap** (`scripts/buildHooks.mjs` `FORBIDDEN_PATTERNS`) — 가벼운 helper 만 hook 번들에 들어가야 함. 무거운 helper (`binaries.discover`, `hooks.bootstrap`) 는 MCP 서버 번들 전용.
- [ ] **cross-platform 은 npm publish 금지** (`private: true`). 각 플러그인의 `devDependencies` 에만 등록.
- [ ] **esbuild `external` 에 `@ogham/cross-platform` 넣지 말 것** — inline 번들이 핵심.
- [ ] **모든 외부 CLI stdout 진입점에 `normalizeEol()`** — CRLF 정규화 빠뜨리면 CRLF 환경에서 파싱 실패.
- [ ] **`process.platform` 분기를 호출 측에 두지 말 것** — 모두 cross-platform 내부에서. 호출자는 `paths.home()`, `env.isWindows` 만 사용.
- [ ] **macOS/Linux 회귀 0** — 기존 vitest 스위트 모두 통과 (Acceptance overall).
- [ ] **페르소나 fallback 채널 시도 금지** — hook 무결화에만 자원 투입.

---

## 📊 작업 상태 스냅샷 (이 시점 기준)

| 단계                                      | 상태                   |
| ----------------------------------------- | ---------------------- |
| 6개 패키지 인벤토리 분석                  | ✅ 완료                |
| 카테고리 통합 (C1–C8)                     | ✅ 완료                |
| Unix↔Windows 명령어 매칭표                | ✅ 완료                |
| `packages/cross-platform` 모듈 설계 (4.2) | ✅ 완료                |
| 번들 정책 (4.2.0)                         | ✅ 완료                |
| Hook bootstrap 5 옵션 비교 (4.3)          | ✅ 완료                |
| Phase 0–6 PR 분할 (Part 5)                | ✅ 완료                |
| 합격 기준 (Part 7)                        | ✅ 완료                |
| 결정 #1, #2 + 페르소나 fallback 거부      | ✅ 완료                |
| 결정 #3, #4, #5, #6                       | ⏳ 사용자 확정 대기    |
| 코드 수정                                 | ⏳ PR-Z 부터 시작 예정 |

---

## 🚦 다음 세션 진입 시 점검 순서 (Claude 용)

1. 이 핸드오프 파일을 먼저 읽기.
2. 사용자가 결정 4개를 한 줄로 줬다면 `report-cross-platform-plan.md` 의 Part 8 #3~#6 에 결정을 반영하는 Edit 수행.
3. PR-Z 부터 시작 (단, 사용자가 "어디까지 진행" 명시했으면 그 범위 준수).
4. 각 PR 종료 시점에 결과 보고 + 다음 PR 진행 의사 확인.
5. 사용자 글로벌 룰: Continuous Execution — 작업 중 yield 금지, 결정 필요 시에만 질문.
