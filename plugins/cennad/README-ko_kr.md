# @ogham/cennad

> **`cogair` 에서 이름이 변경되었습니다.** 이 플러그인은 이전에 `cogair` 로 제공되었습니다. 이름 변경으로 기존 `/cogair:*` 스킬, `cogair` MCP 서버, 그리고 `~/.claude/plugins/cogair/` 의 디스크 설정은 더 이상 적용되지 않습니다 — 자동 마이그레이션은 없습니다. `cennad` 로 다시 설치한 뒤 `/cennad:setup` 을 실행해 프로바이더 비율·키워드·옵션을 다시 설정하세요.

Claude 가 필요에 따라 **OpenAI Codex CLI**, **Google Antigravity CLI**, 또는 **Anthropic Claude CLI** 로 작업을 위임할 수 있게 해주는 Claude Code 플러그인입니다. MCP 도구 3개, 사용자 호출 가능 스킬 5개, 라이프사이클 훅 2개로 구성됩니다.

`atlassian` 이나 `filid` 가 도메인 지식을 캡슐화한다면, cennad 는 **위임 표면(delegation surface)** 입니다. 다른 모델 패밀리가 더 적합한 작업(무거운 코드 → codex, 실시간 웹 검색 → antigravity, 추론·리뷰 → claude)에서 Claude 가 위임을 결정하면, 플러그인이 세션 관리·비율 추적·세션별 호출 카운터를 처리합니다.

---

## 설치

### Marketplace 를 통한 설치 (권장)

```bash
# 1. Marketplace 에 저장소 등록
claude plugin marketplace add https://github.com/vincent-kk/ogham

# 2. 플러그인 설치
claude plugin install cennad
```

설치 후 별도 설정 없이 모든 컴포넌트(MCP, Skills, Hooks)가 자동 등록됩니다.

### 개발자용 로컬 설치

```bash
yarn install
cd plugins/cennad
yarn build
claude --plugin-dir ./plugins/cennad
```

빌드하면 `bridge/mcp-server.cjs`, `bridge/injectStatic.mjs`, `bridge/injectDynamic.mjs` 가 생성됩니다.

### 사전 조건

플러그인은 외부 CLI 를 spawn 합니다. 직접 설치·인증해야 합니다:

- `codex` (OpenAI Codex CLI) — `codex login` 실행
- `agy` (Google Antigravity CLI) — `curl -fsSL https://antigravity.google/cli/install.sh | bash` 로 설치 후, `agy` 를 한 번 실행해 로그인합니다(Google OAuth, API key 없음).
- `claude` (Anthropic Claude CLI) — Claude Code 설치 시 자동으로 포함됩니다. 별도 인증 없이 현재 세션 자격증명이 사용됩니다.

cennad 는 절대 설치하거나 대신 로그인하지 않습니다. 인증이 누락된 경우 실패 응답에 `error.code: 'auth'` 가 담기고, 해당 스킬이 적절한 로그인 명령을 안내합니다.

---

## 사용법

### 초기 설정

```
/setup
```

로컬 웹 UI 를 띄워 provider 비율(target % + provider 별 활성화 토글), intervention strength(`-2` … `+2`), 키워드 라우팅 힌트, tier 별 모델·옵션 매핑을 설정합니다. 3개 레인(codex / antigravity / Anthropic)이 각각 독립적으로 구성됩니다. UI 는 `127.0.0.1` 에서 일회용 토큰과 함께 실행되며 5분 idle 후 자동 종료됩니다.

### Codex 위임

```
/codex -- "src/auth 의 OTP 흐름을 상태 머신으로 리팩토링해줘"
/codex --tier high -- "샌드박스 안에서 오래 걸리는 리팩토링 작업"
/codex --continue <session_id> -- "이제 모듈 B 의 diff 를 만들어줘"
```

무거운 코드 생성·리팩토링·샌드박스 셸 작업, 또는 다른 모델 패밀리의 second opinion 에 사용하세요.

### Antigravity 위임

```
/antigravity -- "최근 Next.js 15 릴리즈 노트를 요약해줘"
/antigravity --tier high -- "이 RFC 초안 3개를 비교해줘"
/antigravity --continue <session_id> -- "그 분석을 ... 까지 확장해줘"
```

실시간 웹 그라운딩 리서치, 대용량 컨텍스트 다문서 종합, YouTube/URL 입력에 사용하세요. 여러 모델 패밀리(Gemini, Claude, GPT-OSS)를 `/setup` 에서 tier 별로 선택할 수 있습니다.

### Claude 위임

```
/claude -- "이 PR 설계가 합리적인지 검토해줘"
/claude --tier high -- "이 마이그레이션 RFC 를 깊이 분석해줘"
/claude --continue <session_id> -- "이전 분석을 이어서 계속해줘"
```

추론·분석·작성·코드 리뷰에서 부모 세션의 대화와 사용자 정의로부터 분리된 새 Anthropic 모델 호출이 필요할 때 사용하세요. `--strict-mcp-config` 와 `--safe-mode` 가 항상 부착되어 자식 프로세스가 부모 세션의 MCP 서버, 훅, CLAUDE.md, 스킬을 상속하지 않습니다. 다만 설정된 `permission_mode`(기본값: `dontAsk`)에 따라 Claude Code 내장 도구로 실행 작업 디렉터리에 접근할 수 있습니다.

### Provider 교차 검증

```
/crosscheck -- "이 마이그레이션에 A 와 B 중 무엇이 더 안전한가?"
/crosscheck --tier high -- "이 RFC 를 코드·리서치·추론 관점에서 리뷰해줘"
```

여러 모델 패밀리의 독립적 second opinion 이 가치 있을 때 사용하세요 (아키텍처 결정, 스펙/PR 리뷰). 동일 프롬프트가 활성화된 provider(codex, antigravity, claude) 전체에 병렬 전달되며, 비활성 provider 는 제외됩니다. 2개 이상 활성 시 응답은 Agreed / Conflicting / Final direction / Action checklist 4개 섹션으로 합성되고, 1개만 활성 시 해당 provider 응답을 그대로 제시합니다. 단일 호출 only — multi-turn follow-up 은 `/codex --continue`, `/antigravity --continue`, `/claude --continue` 로 진행하세요.

---

## 아키텍처

```
Claude Code session
   │
   ├── Skills (/setup, /codex, /antigravity, /claude, /crosscheck)   Layer 3 (user)
   │       │
   │       ▼
   ├── MCP "tools" 서버                          Layer 2 (logic) — 3 MCP 도구
   │       │
   │       ▼
   ├── Dispatcher (codex / antigravity / claude)  외부 CLI spawn + 출력 파싱
   │       │
   │       ▼
   ├── Core storage                             ~/.claude/plugins/cennad/...
   │
   └── Hooks (SessionStart, UserPromptSubmit)   Layer 1 (auto) — read-only 컨텍스트 주입
```

단일 dispatch 레이어 — 스킬과 MCP 서버 사이에 agent 가 없습니다. Hook 은 격리된 얇은 스크립트로, `src/core/` 나 `src/types/` 를 import 하지 않습니다 (zod·MCP SDK 가 번들에 들어가면 cap 위반).

### MCP 도구

| 도구                    | 역할                                                                        |
| ----------------------- | --------------------------------------------------------------------------- |
| `start_conversation`    | `codex` / `antigravity` / `claude` 를 spawn 해 정규화된 envelope 응답 반환. |
| `continue_conversation` | `session_id` 로 기존 세션 재개 (project-hash 단위 격리).                    |
| `open_settings`         | 로컬 설정 UI 를 띄우고 일회용 토큰이 포함된 URL 을 반환.                    |

### 스킬

| 스킬           | 트리거 키워드                                             |
| -------------- | --------------------------------------------------------- |
| `/setup`       | "cennad 설정", "open cennad settings", "개입 강도"        |
| `/codex`       | "ask codex", "codex 호출", "코덱스에게"                   |
| `/antigravity` | "ask antigravity", "antigravity 호출", "안티그래비티에게" |
| `/claude`      | "ask claude", "claude 호출", "anthropic", "클로드에게"    |
| `/crosscheck`  | "crosscheck", "cross check", "교차검증", "양쪽에 물어봐"  |

#### 충돌 정책

`/setup`, `/codex`, `/antigravity`, `/claude`, `/crosscheck` 는 플러그인 접두사 없이 전역 등록됩니다. 다른 플러그인이 동일한 이름을 사용할 경우, Claude Code 의 스킬 해석 순서(플러그인 등록 순)에 따라 먼저 등록된 스킬이 우선합니다. 충돌이 의심될 때는 `claude config` 로 활성 스킬 목록을 확인하거나, 네임스페이스 형식(`cennad:setup` 등)을 사용하십시오.

### Hook

| 이벤트             | Bridge 번들         | 주입 내용                                                      |
| ------------------ | ------------------- | -------------------------------------------------------------- |
| `SessionStart`     | `injectStatic.mjs`  | Provider 비율·tone phrase·키워드 맵·라우팅 가이드.             |
| `UserPromptSubmit` | `injectDynamic.mjs` | 세션별 호출 카운터·현재 비율·목표 비율·drift, parent-PID 감지. |

두 hook 번들 모두 minify 후 현재 약 3.3 KB 이며, Node 빌트인만 사용합니다 (zod·MCP SDK·glob 라이브러리 없음). 빌드 가드가 10 KB LIGHT tier cap 을 강제합니다.

---

## 디스크 레이아웃

cennad 의 영구 상태는 기본적으로 `~/.claude/plugins/cennad/` 디렉터리에
저장됩니다. 전용 위치가 필요하면 `CENNAD_CONFIG_PATH` 로 cennad 전용
디렉터리를 지정할 수 있습니다.
`CLAUDE_PLUGIN_DATA` 와 `CLAUDE_PLUGIN_DADA` 는 cennad 저장 경로로 사용하지
않습니다. 별도 home 의 config 를 읽을 수 없을 때는
`~/.claude/plugins/cennad/config.json` 을 읽기 전용 fallback 으로 시도할 수
있지만, 파일을 복사·마이그레이션하지 않으며 저장은 계속 active home 에
수행됩니다.

```
~/.claude/plugins/cennad/
├── config.json                    # 사용자 설정
├── runtime/
│   ├── counter.json               # parent-PID 기준 호출 카운터
│   └── settings_server.json       # 세션 중 활성 설정 UI 상태
└── sessions/
    └── <project_hash>/            # sha256(cwd).slice(0, 12)
        └── <session_id>.json
```

세션은 프로젝트 단위로 격리됩니다. 다른 `cwd` 에서 `continue_conversation` 을 호출하면 `error.code: 'unknown'` 을 반환 — 프로젝트 간 세션 상태 누설 방지.

---

## 티어

각 provider 는 3개 tier alias 를 노출합니다. codex 는 tier 를 reasoning effort 에 매핑합니다. antigravity 는 여러 모델 패밀리를 서빙하므로, 각 tier 가 `/setup` 에서 고른 모델 풀네임(`agy models` 목록 기반)에 매핑되어 config(`model_map.antigravity`)에 저장됩니다. claude 는 각 tier 가 model + effort 쌍으로 config(`model_map.claude`)에 저장됩니다.

| tier   | 의미                                                    |
| ------ | ------------------------------------------------------- |
| `high` | provider 의 가장 강력한 모델 (antigravity: 매핑한 모델) |
| `mid`  | 균형 잡힌 모델                                          |
| `low`  | 가장 빠르고 저렴한 모델                                 |

codex 는 tier 를 reasoning effort 에 매핑합니다(env 없음). antigravity tier 는 env 가 아니라 `/setup` 에서 매핑합니다. claude tier 는 env override `CENNAD_CLAUDE_{HIGH,MID,LOW}_MODEL` / `CENNAD_CLAUDE_{HIGH,MID,LOW}_EFFORT` 를 지원합니다.

---

## 개발

```bash
yarn dev            # TypeScript watch 모드
yarn test           # Vitest watch
yarn test:run       # 1회 실행 (CI)
yarn typecheck      # 타입 체크 (emit 없음)
yarn build          # clean → version:sync → settingsHtml → tsc → mcpServer → hooks
```

### 기술 스택

TypeScript 5.7, @modelcontextprotocol/sdk, esbuild, Vitest, Zod.

---

## 상세 문서

기술 세부사항 및 설계 결정은 [`.metadata/cennad/`](../../.metadata/cennad/) 참조:

| 문서                                                             | 내용                                       |
| ---------------------------------------------------------------- | ------------------------------------------ |
| [README](../../.metadata/cennad/README.md)                       | 스펙 인덱스 + 핵심 결정                    |
| [spec](../../.metadata/cennad/spec.md)                           | 책임 분리·데이터 흐름·비채택 사항          |
| [architecture](../../.metadata/cennad/architecture.md)           | 모듈 트리·의존 방향·빌드 파이프라인        |
| [mcp-tools](../../.metadata/cennad/mcp-tools.md)                 | 3 MCP 도구 (입력 스키마·동작·envelope)     |
| [skills](../../.metadata/cennad/skills.md)                       | 스킬 본문 + 도구 호출 매핑                 |
| [hooks](../../.metadata/cennad/hooks.md)                         | SessionStart / UserPromptSubmit 주입       |
| [provider-dispatch](../../.metadata/cennad/provider-dispatch.md) | codex-cli / agy / claude-cli 호출 매트릭스 |
| [storage](../../.metadata/cennad/storage.md)                     | 영구 데이터 레이아웃 및 config fallback    |
| [web-ui](../../.metadata/cennad/web-ui.md)                       | 로컬 설정 UI 설계                          |
| [roadmap](../../.metadata/cennad/roadmap.md)                     | 단계별 구현 계획                           |

[English documentation (README.md)](./README.md) is also available.

---

## License

MIT
