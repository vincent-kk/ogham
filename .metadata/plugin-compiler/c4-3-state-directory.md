# C4-3 — 런타임 상태 디렉터리의 호스트 인지 (2026-07-20 설계)

> **문제 한 줄**: 여러 플러그인이 런타임 상태/설정/캐시를 `~/.claude/plugins/<pkg>/`
> 에 쓴다. Codex/agy 로 돌려도 `~/.claude` 에 쌓인다 — 호스트 부적절. **기능은
> 동작**(플러그인이 같은 경로를 쓰고·읽어 자기일관적)하므로 파손은 아니나, 위생·격리
> 부채다. `ruleDocsTarget()`(C4)·`pluginRoot()`(9-A)와 같은 **호스트 인지 경로** 축의
> 마지막 미해결 지점.

## 핵심 발견 — 중앙화 지점은 이미 있다

`shared/cross-platform/src/paths/paths.ts` 의 **`pluginCache(pkg)`** 가 바로 그 단일
진입점이다. 모듈 INTENT.md 가 못박아 둠: _"호출자는 `~/.claude/plugins/<pkg>` 하드코딩
대신 본 모듈만 사용"_, Never do: _"`~/.claude/plugins/` 경로 문자열 하드코딩"_.

```
pluginCache(pkg, version?) → join(claudeRoot(), "plugins", pkg[, version])
claudeRoot()               → process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude")   ← 호스트 무지
```

⇒ **C4-3 = `claudeRoot()` 한 곳을 호스트 인지로 만들고, 우회 복제본을 `pluginCache()`
로 통합**한다. 플러그인 곳곳에 분기를 흩뿌리지 않는다 — `shared/cross-platform` 에 집약.

## Census (전수·분류, 2026-07-20)

### A. 이미 중앙 경유 — `claudeRoot()` 수정만으로 자동 호스트 인지

| 플러그인  | 지점                                                                 | 상태         |
| --------- | -------------------------------------------------------------------- | ------------ |
| atlassian | `constants/paths.ts` `pluginCache("atlassian")`                      | ✅ 중앙 경유 |
| cennad    | `constants/paths.ts`·`hooks/shared/paths.ts` `pluginCache('cennad')` | ✅ 중앙 경유 |
| entrez    | `constants/paths.ts` `pluginCache("entrez")`                         | ✅ 중앙 경유 |
| filid     | `core/infra/cacheManager/.../getCacheDir.ts` `pluginCache('filid')`  | ✅ 중앙 경유 |

### B. 중앙 우회 — 로컬 복제 → `pluginCache()` 통합 필요

| 지점                                          | 현재                                                      | 조치                                              |
| --------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------- |
| `plugins/deilen/src/constants/paths.ts`       | 로컬 `claudeRoot()` → `DEILEN_HOME`                       | `pluginCache('deilen')` 로 교체                   |
| `plugins/r-statistics/src/constants/paths.ts` | 로컬 `claudeRoot()` → `R_STATISTICS_HOME`                 | `pluginCache('r-statistics')`                     |
| `shared/cross-platform/src/hooks/errorLog.ts` | `join(homedir(),".claude","plugins",pkg…)`                | `pluginCache(pkg)` 로 교체                        |
| `plugins/imbas/src/hooks/setup/setup.ts`      | `CLAUDE_CONFIG_DIR\|\|~/.claude` + `/plugins/imbas/<cwd>` | 베이스를 `pluginCache('imbas')` 로 (훅 한계 아래) |

### C. C4-3 아님 (분류 확정 — 건드리지 말 것)

| 지점                                       | 이유                                                                                                                                     |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| maencof `graphCache.ts` `BLOCKED_PREFIXES` | 상태 저장 아님 — vault 가 `~/.claude`·`~/.config` 가 되는 걸 막는 **보안 블록리스트**. (선택: Codex 대칭 위해 `~/.codex` 추가 검토 가능) |
| cennad `constants/paths.ts` `AGY_HOME`     | cennad 가 **agy 의 실제 홈**(`~/.gemini/antigravity-cli`)을 읽는 의도적 타호스트 접근 — 위임 플러그인 본연. 고정 위치 유지               |
| entrez `buildPathSuggestions.ts`           | 상태 아님 — settings 폼의 다운로드 경로 **자동완성 제안**(user 폴더)                                                                     |
| maencof 상태 (`.maencof-meta/`)            | 프로젝트 스코프 — 홈 디렉터리 아님                                                                                                       |
| `configDir()`·`cacheDir()` (env-paths)     | 호스트 중립(XDG/AppData) — `~/.claude` 오염 무관                                                                                         |

## Fix 설계

### 1. 호스트 인지 `claudeRoot()` (중앙 1곳)

```
claude → process.env.CLAUDE_CONFIG_DIR ?? ~/.claude      ← 현재와 완전 동일 (불변)
codex  → process.env.CODEX_HOME       ?? ~/.codex        ← 신규
agy    → (미실측) claude 채널 유지 — hostPaths 관례와 동일 (근거 생기면 승격)
```

**Claude 파괴 방지 — 최우선**: `claude` 분기 = `CLAUDE_CONFIG_DIR ?? ~/.claude` 로
**바이트 동일**. `detectHost()` 는 `OGHAM_HOST` 부재 시 claude 를 반환하므로, Claude
런타임은 경로가 1비트도 바뀌지 않는다. 오직 codex 분기만 신규.

### 2. 순환 의존 주의 (구조)

`detectHost()` 는 현재 `hostPaths/` 안에 있고 `hostPaths → paths`(portableResolve)
의존이 이미 있다. `paths` 가 `hostPaths` 를 import 하면 **cycle**. 해소: `detectHost`
(+`Host` 타입, `OGHAM_HOST` 읽기뿐인 무의존 leaf)을 **양쪽이 import 하는 하위 leaf**
로 두거나 `paths` 에서 `OGHAM_HOST` 를 인라인 판독. 분기 로직 자체는 `paths`(또는 그
leaf) **한 곳**에만 존재 — 원칙 준수.

### 3. 우회 4곳 통합

로컬 `claudeRoot()`(deilen·r-statistics) 삭제 → `pluginCache('<pkg>')`. `errorLog.ts`
· imbas 훅도 동일. **중복 제거 = 호스트 인지 자동 상속.**

## 잔여 경계 (정직 고지)

1. **훅 컨텍스트엔 `OGHAM_HOST` 가 없다** (어댑터는 MCP env 에만 주입 — 반복 주제).
   ⇒ 훅에서 `detectHost()` = 항상 claude. `imbas/hooks/setup`·`errorLog`(훅 호출) 이
   쓰는 상태는 Codex 에서도 `~/.claude` 로 간다. **MCP 컨텍스트 상태만 호스트 인지
   가능** — 규칙 읽기 채널의 합집합 우회와 동형인 구조적 한계.
2. **상태 분절**: 호스트 인지 = Claude(`~/.claude`)와 Codex(`~/.codex`) 상태가 **분리**.
   config 가 호스트 간 공유 안 됨. Codex 는 신규 타깃이라 이관할 기존 상태가 없어 수용
   가능 — 단, 한 머신에서 두 호스트로 같은 플러그인을 쓰면 config 를 각각 설정해야 함.
3. **agy base 미확정**: 보수적으로 claude 채널 유지(미실측). 근거 확보 시 `~/.gemini`
   등으로 승격.

## 구현 순서 (Task ③ 에서)

1. `detectHost` leaf 화(순환 회피) 또는 `paths` 인라인 판독.
2. `paths.ts` `claudeRoot()` 호스트 인지 + 회귀 테스트(claude 분기 불변 assert).
3. deilen·r-statistics 로컬 `claudeRoot()` → `pluginCache()`.
4. `errorLog.ts`·imbas 훅 통합.
5. `build:all`·`test:run`·`typecheck` + **Claude 경로 불변** 검증(가장 중요).
