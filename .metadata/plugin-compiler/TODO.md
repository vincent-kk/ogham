# TODO — 훅/MCP 플러그인 상태 경로(plugin-data path) 면밀 검토

> **2026-07-21 착수 · 2026-07-22 Q1 실측 종료 + 호스트 레지스트리 리팩터 완료.** 배경 원장: [README.md](./README.md) §현재 상태·남은 작업 · 호스트 env 사실은 [host-capability-matrix.md](./host-capability-matrix.md).
> 이 문서는 세션-복원 덤프가 아니라 **이 단일 이슈**(훅/MCP 상태 디렉터리 호스트 정합성)의 열린 질문 추적기다.

## 이미 한 것 (재작업 금지)

### 1차 — 훅 상태 `~/.claude` 누수 봉합 (커밋 `541f8877`)

- `paths.ts` `stateRoot()` 가 훅에서도 Codex 를 감지 · `errorLog.ts` 와 imbas setup 을 `pluginCache` 경유로 정정 · fail-first 테스트 3건.

### 2차 — Q1 실측 + 호스트 레지스트리 분리 (2026-07-22)

- **Q1 종료** (아래 §실측 확정). 판별자 `Boolean(PLUGIN_DATA) === Codex` 는 **안전 확정**.
- **`shared/cross-platform/src/hostRegistry/` 신설** — 호스트 이름·마커·상태 루트 env·기본 디렉터리·훅 신호를 담는 **데이터 테이블 단일 진실원**. 내부 의존 0 인 leaf 라 `paths`·`hostPaths` 가 사이클 없이 공유한다(`hostPaths → paths` 엣지가 이미 있어 leaf 가 아니면 순환).
  - `paths.ts` `stateRoot()` 에서 **호스트 리터럴 전면 제거** — `$HOME` 상대 조립만 담당.
  - `detectHost.ts` 의 사설 `KNOWN_HOSTS` 제거 → 레지스트리 위임. `Host` 타입 정본도 레지스트리로 이동.
  - **agy 가 명시적 행이 됐다** — 종전엔 분기 자체가 없어 조용히 claude 경로를 탔다(부재 → 결정).
- 검증: 특성화 테스트 66건 **무수정 통과**(리팩터 계약) · 신규 11건 · 전체 **4476 통과** · typecheck·lint 클린 · 훅 번들 가드 5 플러그인 전부 통과.
- **filid HEAVY 훅 캡 28→32KB 상향** (`buildHooks.mjs`, 날짜·사유 주석 병기 — 2026-07-17 의 24→28KB 선례 방식). 레지스트리가 훅 번들에 +275B(순수 데이터+순수함수, 모듈 유입 0). 28KB 티어는 잔여 여유가 258B 뿐이라 **포화를 알린 것이지 우발적 의존 유입을 잡은 게 아니었다.**

## 실측 확정 — Claude 훅 env (2026-07-22, `--plugin-dir` 프로브)

프로브 플러그인 + `--settings` 훅을 붙여 헤드리스 `claude -p` 로 SessionStart 훅 env 를 덤프하고, 부모 Bash 프로세스 env 를 대조군으로 차분했다.

| 항목                                    | 플러그인 훅                                                                      | settings 훅 |
| --------------------------------------- | -------------------------------------------------------------------------------- | ----------- |
| Claude 가 **추가**한 변수 (대조군 대비) | `CLAUDE_PLUGIN_ROOT`·`CLAUDE_PLUGIN_DATA`·`CLAUDE_PROJECT_DIR`·`CLAUDE_ENV_FILE` | 뒤의 2개만  |
| un-prefixed `PLUGIN_DATA`/`PLUGIN_ROOT` | **없음**                                                                         | 없음        |

⇒ Claude 는 **`CLAUDE_` 접두만** 준다. Codex 는 4종을 모두 주입(matrix §1, "OOTB compat"). **un-prefixed 존재 = Codex** 가 정확한 판별자다. TODO Q1 의 "Claude 상태가 `~/.codex` 로 오라우팅" 리스크는 **소멸**.

## 실측 확정 — Codex 라이브 E2E (2026-07-22, codex-cli **0.145.0**)

이 체크아웃을 로컬 마켓플레이스로 등록하고 imbas·filid 를 실제 설치해 `codex exec` 세션을 돌렸다. 설치 스냅샷의 `bridge/*.mjs`·`mcp-server.cjs` 는 이 브랜치 빌드본과 **SHA256 동일** 확인.

| 채널    | 관측된 산출물                                                                                            | 판별 신호     |
| ------- | -------------------------------------------------------------------------------------------------------- | ------------- |
| **훅**  | `~/.codex/plugins/imbas/ogham_mk2/` · `~/.codex/plugins/filid/<cwdHash>/{session,prompt,turn}-context-*` | `PLUGIN_DATA` |
| **MCP** | `~/.codex/plugins/filid/<cwdHash>/run-codexprobe.hash` (`cache_manage save-hash`)                        | `OGHAM_HOST`  |

- **두 채널이 같은 디렉터리(`<cwdHash>` = `0664f1532b7d1fab`)로 수렴** — MCP↔훅 상태 공유가 Codex 에서 실제로 성립한다.
- **`~/.claude` 누수 0** — 동시에 돌던 Claude 세션이 같은 프로젝트에 쓰고 있었음에도 `~/.claude/plugins/{filid,imbas}` 에 신규 항목 0건. 같은 프로젝트가 호스트별로 **같은 해시·다른 루트**로 갈린다.
- 훅은 `--dangerously-bypass-hook-trust` 로 발화(미신뢰 시 무음 스킵은 기지 사실). 부수효과 MCP 도구는 headless 승인 게이트에 막혀 `--dangerously-bypass-approvals-and-sandbox` 필요.
- 실측 후 `~/.codex` 원복 완료(플러그인·마켓플레이스·config.toml·스냅샷 캐시). **부수 발견**: `codex plugin remove` 는 `~/.codex/plugins/cache/<mp>/` 스냅샷을 정리하지 않는다 — 수동 삭제 필요.

⇒ **"Codex 설치 플러그인은 `~/.codex` 에 상태를 쓰고 훅도 거기서 읽는다"가 코드 추론이 아니라 관측 사실이 됐다.**

## 열린 질문

### Q5. agy 훅 상태 채널 — **부분 해소**

레지스트리에서 agy 는 이제 claude 채널을 **명시 차용하는 행**이다(부재 아님). 남은 건 agy 고유 상태 신호 실측 — agy 러너 훅이 받는 env 미측정.

### ~~Q3. 하드코딩 힌트 문자열~~ — **종료 (2026-07-23)**

`errorLog` 이 `errorLogPath(pkg)` 를 export 하고, 훅 부트스트랩 경고 4곳이 그 값을 보간한다 — 안내 문구와 실제 기록 경로가 **어긋날 수 없는 구조**가 됐다(`filid`·`imbas` setup.entry · `maencof-lens` sessionStart.entry · `maencof` probeAdvisory).

- fail-first: pre-fix RED 확인 — maencof 케이스가 정확히 증상으로 실패했다(`기대 /custom/codex/... ↔ 실제 See ~/.claude/...`). cross-platform 케이스는 신규 심볼 부재로 실패.
- 부수 효과: 하드코딩 리터럴이 계산식보다 길어 **훅 번들 4종이 각각 24–25 B 작아졌다.**
- `errorLogPath` 는 **표시 전용** — 파일 read/write 는 여전히 `errorLog` 모듈 내부에만 있다(`hooks/INTENT.md` Never do 유지).

### ~~Q4. 전 플러그인 상태-경로 전수 감사~~ — **종료 (2026-07-23): 우회 0건**

- `pluginCache()` 호출점 12곳이 8개 플러그인 상태 루트 전부를 덮는다. **`claudeRoot` 심볼 0건** — C4-3 의 deilen·r-statistics 통합이 실제로 완료돼 있다.
- 훅 도달 코드의 `CLAUDE_CONFIG_DIR` 잔존 **0건**(hostRegistry 제외). 남은 `join(homedir(), …)` 4곳은 전부 상태 루트가 아니다 — cennad `AGY_HOME`(agy CLI 설치 위치) · entrez 출력 경로 *제안* UI · `paths.ts` 의 레지스트리 구동 stateRoot 자신 · `absoluteRoot` 의 `~` 전개.
- `maencof graphCache.ts:19` 의 `~/.claude` 는 `BLOCKED_PREFIXES` **보안 denylist**(볼트 스캔 차단)라 대상 아님. filid `scanDefaults.ts` 는 스캔 무시 glob.

### ~~Q2. 호스트 정식 per-plugin data 디렉터리를 쓸 것인가~~ — **종료: 안 쓴다 (2026-07-23, Vincent 결정)**

호스트 data 영역에 쓰지 않는 것은 **원래부터 의도된 설계**였다. 이번 세션은 그 선택을 뒤집지 않고 **측정된 근거를 붙였다**:

- 정식 경로는 `~/{.claude,.codex}/plugins/data/<plugin>-<marketplace>` 로 **install-source 마다 갈린다** — `filid-ogham` 과 `filid-inline` 이 실제로 공존한다. 재설치·출처 변경 시 자격증명·설정이 유실된다. 우리 `<pkg>` 컨벤션은 안정적이다.
- Codex 는 그 값을 **훅에만** 주고 MCP 엔 주지 않는다(Claude 는 양쪽 다 준다 — 이 세션 `ps eww` 실측). 채택하면 Codex 에서 MCP↔훅 채널이 갈려 라이브로 확인한 수렴이 깨진다.
- ⇒ 정식 dir 의 의미론은 **캐시에는 맞고 영속 상태(자격증명·설정)에는 맞지 않는다.** `PLUGIN_DATA` 는 **존재 여부만** 호스트 신호로 읽고 값은 버린다.
- 근거 정본: `shared/cross-platform/src/paths/INTENT.md` §Conventions + `hostRegistry/types.ts` `hookSignalEnv` 주석.
- **감수하는 대가**: uninstall 시 우리 상태 미정리 · `~/<host>/plugins/` 는 호스트 소유 네임스페이스인데 형제로 자리한다(향후 호스트가 동명 디렉터리를 도입하면 충돌 — 그때 `~/.claude/ogham/<pkg>` 류로 이전 검토).

### ~~Q1. Claude 는 정말 `PLUGIN_DATA` 를 안 주는가~~ — **종료** (위 §실측 확정)

### ~~Q6. 판별자 robustness~~ — **해소**

판별식이 `hostRegistry` 의 `hookSignalEnv` 필드가 됐다. 조이려면 한 필드만 고치면 된다. Copilot=`COPILOT_PLUGIN_DATA`(별개)→무영향.

## 부수 발견 (미처리)

- `~/.claude/plugins/errlog-pkg/error-log.json` — 1차 봉합의 fail-first **RED 단계 잔재**(2026-07-20T17:52Z). 현재 코드는 tmpdir 로 가므로 버그 아님. 단 `errorLog.test.ts` 의 claude 분기는 격리되지 않아 **회귀 시 실제 홈 디렉터리에 쓴다** — 테스트 위생 개선 여지.
- `shared/cross-platform/src/INTENT.md` 의 Structure 표가 하위 fractal 을 **일부만 나열**한다(`agyHooks`·`agyRunner`·`codexHooks`·`instructions` 누락). 50줄 cap 때문에 전부 담을 수 없다 — FCA 규칙상 **모듈 분해 신호**.

## 참조

- 판별 근거는 `hostRegistry/registry.ts` 주석 + `INTENT.md` 에 인라인.
- 호스트 훅 env 실측: 위 §실측 확정 (Claude) · matrix (Codex `discovery.rs` OOTB compat) · ponytail `hooks/ponytail-runtime.js`.
