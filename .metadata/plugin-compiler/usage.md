# Usage — plugin-compiler 사용 가이드

> 다른 세션·개발자를 위한 사용 규칙. 이 도구는 **하나의 호스트 중립 정본**을 Claude Code · Codex · Antigravity 배포 트리로 컴파일한다. 설계 근거는 이 디렉터리의 나머지 문서, 능력 매트릭스는 [host-capability-matrix.md](./host-capability-matrix.md).

## 1. 멘탈 모델

```
plugins/<pkg>/definitions/   ← 정본 SSoT (사람이 편집)
        │  plugin-compiler
        ▼
plugins/<pkg>/targets/{claude,codex,agy}/   ← 산출물 (생성물, 손편집 금지)
```

- **정본만 수정한다.** `targets/` 는 생성물 — 손대면 다음 컴파일에 덮인다.
- 런타임(`src/`·`bridge/`·`libs/`)은 **호스트 중립**이라 무수정으로 전 호스트가 공유한다. 정본은 워크플로 본문(skill)·페르소나(agent)·훅 의도만 기술한다.

## 2. CLI

repo 루트에서:

```bash
node --import tsx tools/plugin-compiler/src/main.ts <cmd> <pkgDir>
```

| cmd                | 동작                                                                                                                                     |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `extract <pkgDir>` | 현행 커밋 산출물(`.claude-plugin`·`.mcp.json`·`skills`·`agents`·`hooks`) → `definitions/` 역추출(도구명 토큰화). **마이그레이션 1회용.** |
| `compile <pkgDir>` | `definitions/` → `targets/<host>/` 생성. 진단(error/warning) 출력.                                                                       |
| `compile --check`  | 쓰기 없이 Claude 등가만 검증.                                                                                                            |
| `verify <pkgDir>`  | Claude 등가 게이트(현행 산출물과 JSON 의미 + 그 외 바이트 동일).                                                                         |

## 3. 정본 작성 (`definitions/`)

```
definitions/
├── plugin.yaml            # 매니페스트 + mcp 선언 (+ 선택: store, hooks 오버라이드)
├── skills/<name>/SKILL.md # 스킬 본문 (+ references/*.md 등 지원파일)
├── agents/<name>.md       # 서브에이전트 (frontmatter + 본문)
└── hooks.json             # 훅 (Claude hooks.json 형식, 토큰화)
```

### plugin.yaml

```yaml
name: deilen # 플러그인 id (kebab-case)
description: "..."
keywords: [markdown, viewer]
author: { name: "Vincent K. Kelvin" }
license: MIT
repository: https://github.com/vincent-kk/ogham
homepage: https://github.com/vincent-kk/ogham/tree/main/plugins/deilen
mcp:
  server: tools # 논리 서버명 (도구명 조립 기준; Codex 는 플러그인명으로 오버라이드)
  entry: bridge/mcp-server.cjs # 플러그인 루트 기준 상대경로
  # transport: stdio             # 현행 .mcp.json 에 "type":"stdio" 가 있을 때만
hooks: # 선택: event 별 fallback 오버라이드 (§5)
  SessionEnd: mcp-lifecycle
```

- version 은 `plugin.yaml` 에 두지 않는다 — `package.json` 이 단일 소스(inject-version 관례).

### 토큰 규약 (본문 = 호스트 중립)

본문(SKILL.md·agent .md·`.md` 지원파일)은 **리터럴 도구명·경로를 쓰지 않고 토큰**을 쓴다. 컴파일러가 호스트별로 조립한다.

| 토큰             | Claude                               | Codex                         | agy                             |
| ---------------- | ------------------------------------ | ----------------------------- | ------------------------------- |
| `{{tool:<t>}}`   | `mcp__plugin_<plugin>_<server>__<t>` | `mcp__<plugin>.<t>`           | `mcp_<server>_<t>`              |
| `{{skill:<s>}}`  | `/<plugin>:<s>`                      | `$<s>`                        | `<s>`                           |
| `{{pluginRoot}}` | `${CLAUDE_PLUGIN_ROOT}`              | `${CLAUDE_PLUGIN_ROOT}`(별칭) | `${CLAUDE_PLUGIN_ROOT}`(캐비엇) |

- 리터럴 `mcp__…` 는 쓰지 않는다(호스트마다 깨진다). **예외**: 다른 플러그인/호스트의 외부 도구를 가리키는 참조(예: `mcp__jira__`)는 자기 플러그인 토큰이 아니므로 그대로 둔다.
- 미해결 예약토큰(`{{tool:…}}` 잔존)은 컴파일 **error**. 자기 템플릿용 `{{ComponentName}}` 등 비예약 `{{…}}` 는 통과.

## 4. Agent / Hook 처리 (L2)

- **Agent**: Claude/agy 는 `.md` 그대로(토큰만 치환). Codex 는 `.codex-agents/<n>.toml`(frontmatter `tools:` → `sandbox_mode` read-only/workspace-write, 본문 → `developer_instructions`). Codex 는 플러그인 번들이 아니라 **별도 설치**(setup 스킬 담당 — 마이그레이션 시).
- **Hook**: Claude 는 `hooks/hooks.json` 재현. Codex 는 **생성 안 함**(플러그인 훅 불가 — 선언 시 세션 행). agy 는 `hooks.json`(named-group)로 이벤트 매핑.

## 5. Hook fallback 어휘

`plugin.yaml: hooks:` 로 event 별 오버라이드(미지정 시 event 기본값). 값:

| fallback              | 의미                                                                                                                                                                                |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pre-invocation-once` | agy `PreInvocation` + 러너 once-guard (SessionStart·UserPromptSubmit 기본)                                                                                                          |
| `stale-sweep`         | 정리성 — Claude 는 native 훅 유지, agy/codex 드롭 + 다음-부팅 MCP sweep 보상 (오버라이드 전용)                                                                                      |
| `stop`                | agy `Stop`(매 턴 종료) — **경량 작업 한정 opt-in**                                                                                                                                  |
| `mcp-lifecycle`       | **전 호스트(Claude 포함) 훅 미emit** — MCP 서버 수명주기가 소유(`@ogham/session-finalizer`: shutdown 등록 + detached finalizer + boot-sweep). **SessionEnd 기본값**. 손실 경고 없음 |
| `drop`                | 전 호스트 생략 + 손실 경고                                                                                                                                                          |

⚠️ **agy `Stop` 은 매 실행 루프(턴) 종료마다 발화** — Claude `SessionEnd`(세션당 1회)와 다르다. 무거운 SessionEnd(정리/커밋/recap)를 `stop` 으로 매핑하지 말 것. 정리성은 `stale-sweep`, 서버 이전은 `mcp-lifecycle`.

## 6. 규칙 (반드시)

- **정본만 편집. `targets/` 손편집 금지** — CI clean-regen 게이트가 표류를 잡는다.
- 새 워크플로·페르소나·훅은 `definitions/` 에만 추가한다(호스트별로 나눠 쓰지 않는다).
- `verify` 가 Claude 등가(무결손)를 보장한다 — 정본 변경 후 항상 `verify` 로 Claude 무해함 확인.
- 새 호스트 추가 = `tools/plugin-compiler/src/profiles/<host>.ts` + `profiles/index.ts` 등록(정본 무수정).

## 7. 빌드 통합 (마이그레이션 후)

각 플러그인 `package.json` 에 `compile:plugin` 스텝을 런타임 빌드 **뒤**에 넣는다:

```jsonc
"build": "... && node scripts/buildMcpServer.mjs && yarn compile:plugin",
"compile:plugin": "node --import tsx ../../tools/plugin-compiler/src/main.ts compile ."
```

- `bridge/` 가 만들어진 뒤 실행돼야 함(assets 를 targets 로 복사하므로).
- 마켓플레이스 매니페스트가 `targets/<host>` 를 가리키도록 전환하는 것은 [TODO.md](./TODO.md) 의 컷오버 단계.
