# @ogham/cogair

Claude 가 필요에 따라 **OpenAI Codex CLI** 또는 **Google 의 Gemini / Antigravity CLI** 로 작업을 위임할 수 있게 해주는 Claude Code 플러그인입니다. MCP 도구 4개, 사용자 호출 가능 스킬 5개, 라이프사이클 훅 2개로 구성됩니다.

`atlassian` 이나 `filid` 가 도메인 지식을 캡슐화한다면, cogair 는 **위임 표면(delegation surface)** 입니다. 다른 모델 패밀리가 더 적합한 작업(무거운 코드 → codex, 실시간 웹 검색 → gemini 또는 antigravity)에서 Claude 가 위임을 결정하면, 플러그인이 세션 관리·비율 추적·세션별 호출 카운터를 처리합니다.

---

## 설치

### Marketplace 를 통한 설치 (권장)

```bash
# 1. Marketplace 에 저장소 등록
claude plugin marketplace add https://github.com/vincent-kk/ogham

# 2. 플러그인 설치
claude plugin install cogair
```

설치 후 별도 설정 없이 모든 컴포넌트(MCP, Skills, Hooks)가 자동 등록됩니다.

### 개발자용 로컬 설치

```bash
yarn install
cd plugins/cogair
yarn build
claude --plugin-dir ./plugins/cogair
```

빌드하면 `bridge/mcp-server.cjs`, `bridge/injectStatic.mjs`, `bridge/injectDynamic.mjs` 가 생성됩니다.

### 사전 조건

플러그인은 외부 CLI 를 spawn 합니다. 직접 설치·인증해야 합니다:

- `codex` (OpenAI Codex CLI) — `codex login` 실행
- `gemini` (Google Gemini CLI) — `gemini auth login` 실행. **Gemini CLI 서비스는 2026-06-18 종료**되며, cogair 는 아래 Antigravity CLI 로 이전합니다.
- `agy` (Google Antigravity CLI) — `curl -fsSL https://antigravity.google/cli/install.sh | bash` 로 설치 후, `agy` 를 한 번 실행해 로그인합니다(Google OAuth, API key 없음). gemini 와 antigravity 는 상호 배타적인 Google 엔진으로, `/setup` 에서 하나만 활성화합니다.

cogair 는 절대 설치하거나 대신 로그인하지 않습니다. 인증이 누락된 경우 실패 응답에 `error.code: 'auth'` 가 담기고, 해당 스킬이 적절한 로그인 명령을 안내합니다.

---

## 사용법

### 초기 설정

```
/setup
```

로컬 웹 UI 를 띄워 provider 비율(target % + provider 별 활성화 토글), Google 엔진 토글(gemini ↔ antigravity), intervention strength(`-2` … `+2`), 키워드 라우팅 힌트, 기본 모델 alias, antigravity tier 별 모델 매핑, 기본 옵션을 설정합니다. UI 는 `127.0.0.1` 에서 일회용 토큰과 함께 실행되며 5분 idle 후 자동 종료됩니다.

### Codex 위임

```
/codex -- "src/auth 의 OTP 흐름을 상태 머신으로 리팩토링해줘"
/codex --model high -- "샌드박스 안에서 오래 걸리는 리팩토링 작업"
/codex --continue <session_id> -- "이제 모듈 B 의 diff 를 만들어줘"
```

무거운 코드 생성·리팩토링·샌드박스 셸 작업, 또는 다른 모델 패밀리의 second opinion 에 사용하세요.

### Gemini 위임 (레거시 — 서비스 2026-06-18 종료)

```
/gemini -- "최근 Next.js 15 릴리즈 노트를 요약해줘"
/gemini --model high -- "이 RFC 초안 3개를 비교해줘"
/gemini --continue <session_id> -- "그 분석을 ... 까지 확장해줘"
```

실시간 웹 그라운딩 리서치, 매우 큰 컨텍스트의 다문서 종합, YouTube/URL 입력, 또는 Claude 학습 컷오프 이후의 지식이 필요할 때 사용하세요. Gemini CLI 서비스는 **2026-06-18** 종료되므로 새 작업은 아래 Antigravity 를 권장합니다.

### Antigravity 위임

```
/antigravity -- "최근 Next.js 15 릴리즈 노트를 요약해줘"
/antigravity --model high -- "이 RFC 초안 3개를 비교해줘"
/antigravity --continue <session_id> -- "그 분석을 ... 까지 확장해줘"
```

gemini 와 동일한 웹 그라운딩 리서치·대용량 컨텍스트 작업에 사용하되, 여러 모델 패밀리(Gemini, Claude, GPT-OSS)를 `/setup` 에서 tier 별로 선택할 수 있습니다. gemini 와 antigravity 는 상호 배타적인 Google 엔진으로, 설정 UI 에서 전환합니다.

### 양쪽 Provider 교차 검증

```
/crosscheck -- "이 마이그레이션에 A 와 B 중 무엇이 더 안전한가?"
/crosscheck --model high -- "이 RFC 를 코드·리서치 양 관점에서 리뷰해줘"
```

두 모델 패밀리의 독립적 second opinion 이 가치 있을 때 사용하세요 (아키텍처 결정, 스펙/PR 리뷰). 동일 프롬프트가 codex 와 활성 Google 엔진(gemini 또는 antigravity) 양쪽에 병렬 전달되며, 응답은 Agreed / Conflicting / Final direction / Action checklist 4개 섹션으로 합성됩니다. 단일 호출 only — multi-turn follow-up 은 `/codex --continue` 또는 `/gemini --continue` / `/antigravity --continue` 로 진행하세요.

---

## 아키텍처

```
Claude Code session
   │
   ├── Skills (/setup, /codex, /gemini, /antigravity, /crosscheck)   Layer 3 (user)
   │       │
   │       ▼
   ├── MCP "tools" 서버                          Layer 2 (logic) — 4 MCP 도구
   │       │
   │       ▼
   ├── Dispatcher (codex / gemini / antigravity)  외부 CLI spawn + 출력 파싱
   │       │
   │       ▼
   ├── Core storage                             ~/.claude/plugins/cogair/...
   │
   └── Hooks (SessionStart, UserPromptSubmit)   Layer 1 (auto) — read-only 컨텍스트 주입
```

단일 dispatch 레이어 — 스킬과 MCP 서버 사이에 agent 가 없습니다. Hook 은 격리된 얇은 스크립트로, `src/core/` 나 `src/types/` 를 import 하지 않습니다 (zod·MCP SDK 가 번들에 들어가면 cap 위반).

### MCP 도구

| 도구                      | 역할                                                                        |
| ------------------------- | --------------------------------------------------------------------------- |
| `start_conversation`      | `codex` / `gemini` / `antigravity` 를 spawn 해 정규화된 envelope 응답 반환. |
| `continue_conversation`   | `session_id` 로 기존 세션 재개 (project-hash 단위 격리).                    |
| `open_settings`           | 로컬 설정 UI 를 띄우고 일회용 토큰이 포함된 URL 을 반환.                    |
| `list_antigravity_models` | 현재 계정에서 사용 가능한 `agy` 모델 풀네임 목록 반환 (auto-tier 선택용).   |

### 스킬

| 스킬           | 트리거 키워드                                             |
| -------------- | --------------------------------------------------------- |
| `/setup`       | "cogair 설정", "open cogair settings", "개입 강도"        |
| `/codex`       | "ask codex", "codex 호출", "코덱스에게"                   |
| `/gemini`      | "ask gemini", "gemini 호출", "제미니에게"                 |
| `/antigravity` | "ask antigravity", "antigravity 호출", "안티그래비티에게" |
| `/crosscheck`  | "crosscheck", "cross check", "교차검증", "양쪽에 물어봐"  |

#### 충돌 정책

`/setup`, `/codex`, `/gemini`, `/antigravity`, `/crosscheck` 는 플러그인 접두사 없이 전역 등록됩니다. 다른 플러그인이 동일한 이름을 사용할 경우, Claude Code 의 스킬 해석 순서(플러그인 등록 순)에 따라 먼저 등록된 스킬이 우선합니다. 충돌이 의심될 때는 `claude config` 로 활성 스킬 목록을 확인하거나, 네임스페이스 형식(`cogair:setup` 등)을 사용하십시오.

### Hook

| 이벤트             | Bridge 번들         | 주입 내용                                                      |
| ------------------ | ------------------- | -------------------------------------------------------------- |
| `SessionStart`     | `injectStatic.mjs`  | Provider 비율·tone phrase·키워드 맵·라우팅 가이드.             |
| `UserPromptSubmit` | `injectDynamic.mjs` | 세션별 호출 카운터·현재 비율·목표 비율·drift, parent-PID 감지. |

두 hook 번들 모두 minify 후 현재 약 3.3 KB 이며, Node 빌트인만 사용합니다 (zod·MCP SDK·glob 라이브러리 없음). 빌드 가드가 10 KB LIGHT tier cap 을 강제합니다.

---

## 디스크 레이아웃

cogair 의 모든 상태는 `~/.claude/plugins/cogair/` 하위에 저장됩니다:

```
~/.claude/plugins/cogair/
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

## 모델 Alias

각 provider 는 4개 tier alias 를 노출합니다. codex/gemini 는 구체 모델 ID 가 dispatcher (`src/dispatcher/<provider>/modelAlias.ts`) 에만 존재해 상류 CLI 변경 영향이 한 파일로 제한됩니다. antigravity 는 여러 모델 패밀리를 서빙하므로, 각 tier 가 `/setup` 에서 고른 모델 풀네임(`agy models` 목록 기반)에 매핑되어 config(`model_map.antigravity`)에 저장됩니다.

| alias  | 의미                                                                               |
| ------ | ---------------------------------------------------------------------------------- |
| `high` | provider 의 가장 강력한 모델 (antigravity: 매핑한 모델)                            |
| `mid`  | 균형 잡힌 모델                                                                     |
| `low`  | 가장 빠르고 저렴한 모델                                                            |
| `auto` | CLI 기본값 (`-m` 생략); antigravity 는 `list_antigravity_models` 로 Claude 가 선택 |

환경 변수 override (codex/gemini): `COGAIR_CODEX_{HIGH,MID,LOW}`, `COGAIR_GEMINI_{HIGH,MID,LOW}`. antigravity tier 는 env 가 아니라 `/setup` 에서 매핑합니다.

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

기술 세부사항 및 설계 결정은 [`.metadata/cogair/`](../../.metadata/cogair/) 참조:

| 문서                                                             | 내용                                        |
| ---------------------------------------------------------------- | ------------------------------------------- |
| [README](../../.metadata/cogair/README.md)                       | 스펙 인덱스 + 핵심 결정                     |
| [spec](../../.metadata/cogair/spec.md)                           | 책임 분리·데이터 흐름·비채택 사항           |
| [architecture](../../.metadata/cogair/architecture.md)           | 모듈 트리·의존 방향·빌드 파이프라인         |
| [mcp-tools](../../.metadata/cogair/mcp-tools.md)                 | 4 MCP 도구 (입력 스키마·동작·envelope)      |
| [skills](../../.metadata/cogair/skills.md)                       | 스킬 본문 + 도구 호출 매핑                  |
| [hooks](../../.metadata/cogair/hooks.md)                         | SessionStart / UserPromptSubmit 주입        |
| [provider-dispatch](../../.metadata/cogair/provider-dispatch.md) | codex-cli / gemini-cli / agy 호출 매트릭스  |
| [storage](../../.metadata/cogair/storage.md)                     | `~/.claude/plugins/cogair/` 디스크 레이아웃 |
| [web-ui](../../.metadata/cogair/web-ui.md)                       | 로컬 설정 UI 설계                           |
| [roadmap](../../.metadata/cogair/roadmap.md)                     | 단계별 구현 계획                            |

[English documentation (README.md)](./README.md) is also available.

---

## License

MIT
