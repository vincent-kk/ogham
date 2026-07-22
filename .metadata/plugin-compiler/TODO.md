# 훅/MCP 플러그인 상태 경로(plugin-data path) — 종결 원장

> **2026-07-21 착수 · 2026-07-23 전 항목 종료.** 열린 질문 Q1–Q6 이 모두 닫혔다. 이 문서는 이제 추적기가 아니라 **무엇을 어떻게 재서 무엇을 결정했는지의 기록**이다.
> 배경 원장: [README.md](./README.md) §현재 상태·남은 작업 · 호스트 능력 사실 정본: [host-capability-matrix.md](./host-capability-matrix.md).

## 결론 한 줄

플러그인 상태는 **호스트별 루트(`~/.claude` · `~/.codex`) 밑 우리 컨벤션 `plugins/<pkg>`** 에 쓰고, 어느 호스트인지는 **`hostRegistry` 테이블 하나**가 답한다. Codex 라이브 E2E 로 훅·MCP 양 채널 수렴과 `~/.claude` 무누수를 관측했다.

## 구현 (커밋)

| 커밋       | 내용                                                                                          |
| ---------- | --------------------------------------------------------------------------------------------- |
| `541f8877` | 1차 봉합 — `stateRoot()` 가 훅에서도 Codex 감지, `errorLog`·imbas setup 을 `pluginCache` 경유 |
| `40b9a805` | `hostRegistry` 신설 — 호스트 지식 단일 진실원, `paths` 에서 호스트 리터럴 제거, agy 명시적 행 |
| `3ae5d9cb` | 런타임 산출물(`bridge/`) 동기화 + filid HEAVY 훅 캡 28→32KB (근거 주석 병기)                  |
| `4161a5d9` | 호스트 정식 data 영역을 쓰지 않는 근거를 `paths/INTENT.md`·`types.ts` 에 기록                 |
| `71b4ce6e` | 부트스트랩 경고가 `errorLogPath(pkg)` 를 보간 — 안내 문구와 기록 경로가 어긋날 수 없음        |

**핵심 설계**: `hostRegistry` 는 내부 의존 0 인 leaf 다. `hostPaths → paths` 엣지가 이미 있어 leaf 가 아니면 순환이 된다. 호스트 추가는 `HOSTS` 에 행 하나 — 말단 유틸의 `if` 수정이 아니다.

## 실측 기록

### Claude 훅 env (`--plugin-dir` 프로브)

플러그인 훅에 `CLAUDE_PLUGIN_ROOT`·`CLAUDE_PLUGIN_DATA`·`CLAUDE_PROJECT_DIR`·`CLAUDE_ENV_FILE`(settings 훅은 뒤 2개만). **un-prefixed `PLUGIN_DATA`/`PLUGIN_ROOT` 없음** ⇒ un-prefixed 존재 = Codex 판별자 안전 확정. MCP 프로세스도 `CLAUDE_PLUGIN_DATA` 보유(`ps eww` 실측).

### Codex 라이브 E2E (codex-cli 0.145.0)

이 체크아웃을 로컬 마켓플레이스로 등록 → imbas·filid 실설치(스냅샷 SHA256 = 브랜치 빌드본) → `codex exec`.

| 채널    | 관측된 산출물                                                                                            | 판별 신호     |
| ------- | -------------------------------------------------------------------------------------------------------- | ------------- |
| **훅**  | `~/.codex/plugins/imbas/ogham_mk2/` · `~/.codex/plugins/filid/<cwdHash>/{session,prompt,turn}-context-*` | `PLUGIN_DATA` |
| **MCP** | `~/.codex/plugins/filid/<cwdHash>/run-codexprobe.hash` (`cache_manage save-hash`)                        | `OGHAM_HOST`  |

- 두 채널이 **같은 `<cwdHash>` 디렉터리로 수렴**. 동시에 돌던 Claude 세션이 같은 프로젝트에 쓰는데도 `~/.claude` 신규 항목 **0건** — 같은 해시, 다른 루트.
- 훅 발화엔 `--dangerously-bypass-hook-trust`, 부수효과 MCP 도구엔 `--dangerously-bypass-approvals-and-sandbox` 필요(headless 게이트).
- **부수 발견**: `codex plugin remove` 는 `~/.codex/plugins/cache/<mp>/` 스냅샷을 정리하지 않는다.

### agy 훅 env (agy 1.1.5)

`~/.agents/plugins/` 에 프로브 플러그인 배치 → `agy plugin install` → `agy --print`, 훅 env 를 부모 프로세스 env 와 차분.

- agy 가 **추가하는 변수는 `ANTIGRAVITY_CONVERSATION_ID` 하나뿐**. 플러그인 루트도, 데이터 디렉터리도 주지 않는다. 훅 cwd = `hooks.json` 위치(`~/.gemini/config/plugins/<n>`).
- ⇒ agy 는 **상태 채널이 없다** — claude 채널 차용 유지. 다만 그 변수를 `hookSignalEnv` 로 배선해 agy 훅이 Claude 로 오인식되지 않게 했다.
- **문서 오류 정정**: matrix 가 기록하던 `{"<hookName>": {"enabled": bool, …}}` 의 `enabled` 키는 **파싱을 깨뜨린다**(`invalid hook "<name>": command hook must specify 'command'`). 우리 컴파일러 방출 포맷(= `enabled` 없음)은 1.1.5 에서 정상 로드 확인(`1 named hooks, 1 total handlers`).

## 결정

### 호스트 정식 per-plugin data 디렉터리는 쓰지 않는다 (Vincent, 원래부터 의도된 설계)

`CLAUDE_PLUGIN_DATA`/`PLUGIN_DATA` 값은 **존재 여부만** 호스트 신호로 읽고 위치로는 버린다.

- 그 경로는 `<plugin>-<marketplace>` 키라 **install-source 마다 갈린다** (`filid-ogham` ↔ `filid-inline` 실물 공존) — 재설치 시 자격증명 유실.
- Codex 는 훅에만 주고 MCP 엔 안 준다 ⇒ 채택하면 한 호스트 안에서 두 채널이 갈려 위 수렴이 깨진다.
- ⇒ 정식 dir 의 의미론은 **캐시용이지 영속 상태용이 아니다.** 근거 정본: `paths/INTENT.md` §Conventions · `hostRegistry/types.ts` `hookSignalEnv` 주석.
- **감수하는 대가**: uninstall 시 미정리 · `~/<host>/plugins/` 는 호스트 소유 네임스페이스인데 형제로 자리한다(향후 충돌 시 `~/.claude/ogham/<pkg>` 류 이전 검토).

### 전수 감사 결과 — 우회 0건

`pluginCache()` 호출점 12곳이 8개 플러그인 상태 루트 전부를 덮는다. `claudeRoot` 심볼 0건(C4-3 통합 완료), 훅 도달 코드의 `CLAUDE_CONFIG_DIR` 0건. 남은 `join(homedir(), …)` 4곳은 상태 루트가 아니다 — cennad `AGY_HOME` · entrez 출력경로 제안 UI · `stateRoot` 자신 · `~` 전개. maencof `graphCache` 의 `~/.claude` 는 `BLOCKED_PREFIXES` 보안 denylist.

## 남은 것 (이 이슈 바깥)

- **PR #89 머지 + 머지 후 라이브 게이트** — Claude 무결손 실설치 재확인, Codex 도구노출·훅 trust UX. Codex 축은 **상태 경로 E2E 만** 종료됨.
- **테스트 위생**: `errorLog.test.ts` 의 claude 분기가 격리되지 않아 회귀 시 실제 홈 디렉터리에 쓴다(`~/.claude/plugins/errlog-pkg/` 가 그 잔재).
- **구조**: `shared/cross-platform/src/INTENT.md` 의 Structure 표가 50줄 cap 때문에 하위 fractal 을 다 담지 못한다 — FCA 상 모듈 분해 신호.
