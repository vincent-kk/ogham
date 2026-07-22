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

## 열린 질문

### Q2. 호스트 **정식** per-plugin data 디렉터리를 쓸 것인가 — **재구성됨 (최우선)**

Q1 프로브가 부수적으로 밝힌 사실이 이 질문의 전제를 바꿨다. **Codex 만의 문제가 아니라 대칭 문제다.**

- `CLAUDE_PLUGIN_DATA` = `~/.claude/plugins/data/<plugin>-<marketplace>` (실측: `filid-ogham`·`deilen-inline`·`cennad-ogham` …). Codex 도 동형 — `~/.codex/plugins/data/ponytail-ponytail`.
- 즉 **두 호스트 모두 정식 data dir 을 제공하고 env 로 알려주는데, 우리는 어느 쪽에서도 안 쓴다.** 우리 컨벤션 `~/.claude/plugins/<pkg>` 는 정식 `data/` 의 **형제로 무단 점유**한 디렉터리이고, 정식 디렉터리들은 **전부 비어 있다**.
- 채널별 가용성: Claude 는 **MCP·훅 양쪽** `CLAUDE_PLUGIN_DATA` 보유(matrix §9). Codex 는 **훅만** `PLUGIN_DATA`, MCP 엔 없음.
- **결정 필요**: (a) 현행 컨벤션 유지 — MCP↔훅 정합, 단 무단 점유 + uninstall 시 미정리. (b) 정식 dir 채택 — Claude 는 양 채널 가능하나 **Codex 는 MCP 가 값을 못 얻어 채널이 갈린다**. (c) 호스트별 분기 — 일관성 요구는 *호스트 내부*이지 호스트 간이 아니므로 성립하나, Claude 사용자 기존 상태(atlassian·entrez 자격증명 등)가 **고아화**된다.
- 마이그레이션 위험이 실질적이라 (a) 가 현실적 — 다만 이제 **근거 있는 결정**이지 사고가 아니다. 채택 시 `hostRegistry` 에 `dataDirEnv` 필드 1개 추가로 끝난다.

### Q3. 남은 하드코딩 힌트 문자열

훅 부트스트랩 실패 메시지 4곳이 `~/.claude/plugins/<pkg>/error-log.json` 하드코딩 → Codex 에선 오안내:

- `plugins/imbas/src/hooks/setup/setup.entry.ts:35` (+ `:14` 주석) · `plugins/filid/src/hooks/setup/setup.entry.ts:35`
- `plugins/maencof-lens/src/hooks/sessionStart/sessionStart.entry.ts:29` · `plugins/maencof/src/hooks/sessionStart/helpers/probeAdvisory/probeAdvisory.ts:28`

→ `errorLog` 에 `errorLogPath(pkg)` export 후 실제 경로 보간. 레지스트리 도입으로 **경로 산출은 이미 호스트 정합** — 남은 건 문자열 보간뿐이다.

### Q4. 전 플러그인 상태-경로 전수 감사

- C4-3 이 통합했다는 **deilen·r-statistics** 로컬 `claudeRoot()` 가 실제 `pluginCache` 경유하는지 재확인.
- 훅 도달 코드의 `homedir()+.claude` / `CLAUDE_CONFIG_DIR` 잔존 하드코딩 재스윕. (`maencof graphCache.ts:19` 의 `~/.claude` 는 **BLOCKED_PREFIXES 보안**이라 정상·제외.)

### Q5. agy 훅 상태 채널 — **부분 해소**

레지스트리에서 agy 는 이제 claude 채널을 **명시 차용하는 행**이다(부재 아님). 남은 건 agy 고유 상태 신호 실측 — agy 러너 훅이 받는 env 미측정.

### ~~Q1. Claude 는 정말 `PLUGIN_DATA` 를 안 주는가~~ — **종료** (위 §실측 확정)

### ~~Q6. 판별자 robustness~~ — **해소**

판별식이 `hostRegistry` 의 `hookSignalEnv` 필드가 됐다. 조이려면 한 필드만 고치면 된다. Copilot=`COPILOT_PLUGIN_DATA`(별개)→무영향.

## 부수 발견 (미처리)

- `~/.claude/plugins/errlog-pkg/error-log.json` — 1차 봉합의 fail-first **RED 단계 잔재**(2026-07-20T17:52Z). 현재 코드는 tmpdir 로 가므로 버그 아님. 단 `errorLog.test.ts` 의 claude 분기는 격리되지 않아 **회귀 시 실제 홈 디렉터리에 쓴다** — 테스트 위생 개선 여지.
- `shared/cross-platform/src/INTENT.md` 의 Structure 표가 하위 fractal 을 **일부만 나열**한다(`agyHooks`·`agyRunner`·`codexHooks`·`instructions` 누락). 50줄 cap 때문에 전부 담을 수 없다 — FCA 규칙상 **모듈 분해 신호**.

## 참조

- 판별 근거는 `hostRegistry/registry.ts` 주석 + `INTENT.md` 에 인라인.
- 호스트 훅 env 실측: 위 §실측 확정 (Claude) · matrix (Codex `discovery.rs` OOTB compat) · ponytail `hooks/ponytail-runtime.js`.
