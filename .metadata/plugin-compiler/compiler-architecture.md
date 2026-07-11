# Compiler Architecture — 파이프라인 · 프로파일 · emitter · 배포 트리

정본(IR) + 호스트 프로파일 → 호스트별 플러그인 산출물. `tsc` 가 한 소스를 ESM/CJS 로 emit 하듯, 한 정본을 Claude / Codex / Antigravity 로 emit 한다.

## 1. 파이프라인 (5단계)

```
definitions/  ──①parse──►  IR 객체  ──②validate──►  검증된 IR
                                                        │
                     host profile (claude|codex|agy) ──③bind──► 바인딩된 모델
                                                        │
                                  ──④emit──►  targets/<host>/  ──⑤verify──►  스냅샷/스모크
```

| 단계       | 입력             | 출력                            | 실패 조건                                                                     |
| ---------- | ---------------- | ------------------------------- | ----------------------------------------------------------------------------- |
| ① parse    | `definitions/**` | IR 객체 (yaml + md frontmatter) | yaml/frontmatter 파싱 오류                                                    |
| ② validate | IR               | 검증된 IR                       | 스키마 위반, 미해결 토큰, `fallback` 누락 ([ir-schema.md](./ir-schema.md) §5) |
| ③ bind     | IR + 프로파일    | 호스트 바인딩 모델              | 프로파일에 없는 `model` 등급, 번역 불가                                       |
| ④ emit     | 바인딩 모델      | `targets/<host>/` 산출물 트리   | I/O                                                                           |
| ⑤ verify   | 산출물           | 합/불                           | 스냅샷 불일치, Claude 동등성 게이트(§6), 스모크 실패                          |

## 2. 호스트 프로파일 (3종)

```
profiles/
├── claude.ts
├── codex.ts
└── agy.ts        # Antigravity
```

프로파일 인터페이스(개념):

```ts
interface HostProfile {
  id: "claude" | "codex" | "agy";
  manifest: { path: string; render(ir): object }; // 파일 위치+스키마
  mcp: {
    filename: string;
    wrap(server, cfg): object;
    toolRef(server, logical): string;
    pathStrategy: "plugin-root-var" | "cwd-dot";
  };
  skill: { ref(name): string; dropFrontmatterKeys: string[] };
  hooks: {
    emit: "claude-json" | "agy-named-groups" | "none"; // codex = none (§4.2 매트릭스)
    supports: Set<LogicalEvent>;
    rewrite(event, fallback): HostEvent | null;
    matcherMap(claudeMatcher): string; // 도구명 어휘 번역
    stdinAdapter: "claude" | "agy"; // 러너가 정규화할 계약 (§5)
  };
  agents: {
    strategy: "bundle-md" | "external-toml" | "bundle-md-asis";
    modelSlug(level): string;
    capability(cap): object;
  };
  marketplace?: { path: string; render(plugins): object }; // 루트 레벨 emitter
}
```

### 2.1 핵심 차이 (프로파일이 캡슐화 — 실측 기반)

| 관심사        | claude.ts                               | codex.ts                                        | agy.ts                                                                                |
| ------------- | --------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------- |
| manifest      | `.claude-plugin/plugin.json`            | `.codex-plugin/plugin.json` (+`interface` 메타) | `plugin.json` (루트, name 만 필수)                                                    |
| MCP 파일/래퍼 | `.mcp.json` / `mcpServers`              | `.mcp.json` / `mcpServers` (동일)               | `mcp_config.json` / `mcpServers` (동일)                                               |
| MCP 경로 전략 | `${CLAUDE_PLUGIN_ROOT}` args            | **`cwd: "."` + 상대 args** (변수 미전개 실측)   | 상대 args (공식 스키마에 cwd 없음 — 해석 기준 실측 대기, 실패 시 setup 절대경로 주입) |
| 도구명 포맷   | `mcp__plugin_<plugin>_<server>__<tool>` | `mcp__<server>.<tool>` (실측)                   | `mcp_<server>_<tool>` (추정)                                                          |
| MCP 서버명    | `plugin.yaml: mcp.server` 그대로        | **플러그인명으로 오버라이드** (전역충돌 회피)   | `mcp.server` 그대로 (플러그인 네임스페이스)                                           |
| skill 참조    | `/<plugin>:<name>`                      | `$<name>` (재확인)                              | 스킬명 서술 참조                                                                      |
| hooks         | `hooks/hooks.json` 그대로               | **emit 안 함** (선언=세션 행, 실측)             | 루트 `hooks.json`, named-group 재구성                                                 |
| agent 전략    | `agents/<n>.md` 번들                    | `.codex/agents/<n>.toml` + setup 설치 스텝      | `agents/<n>.md` **무변환 번들**                                                       |
| rules         | (플러그인 규약 없음 — 스킬로 안내)      | `AGENTS.md`                                     | `rules/*.md` 플러그인 컴포넌트                                                        |

## 3. emitter (산출물별)

| emitter         | 소비 정본          | Claude                            | Codex                                                   | Antigravity                               |
| --------------- | ------------------ | --------------------------------- | ------------------------------------------------------- | ----------------------------------------- |
| **manifest**    | `plugin.yaml`      | `.claude-plugin/plugin.json`      | `.codex-plugin/plugin.json`                             | `plugin.json`                             |
| **mcp**         | `plugin.yaml: mcp` | `.mcp.json` (변수 args)           | `.mcp.json` (`cwd: "."`)                                | `mcp_config.json`                         |
| **skill**       | `skills/*.md`      | `skills/<n>/SKILL.md`             | `skills/<n>/SKILL.md` (키 드롭, embed agent 인라인)     | `skills/<n>/SKILL.md` (키 정책 실측 후)   |
| **agent**       | `agents/*.yaml`    | `agents/<n>.md`                   | `.codex-agents/<n>.toml` (타깃 내 스테이징, setup 설치) | `agents/<n>.md`                           |
| **hook**        | `hooks/*.yaml`     | `hooks/hooks.json`                | — (생성 금지) + 대체 채널 주입(skill lazy-init 등)      | `hooks.json` (named-group, matcher 번역)  |
| **runtime**     | `bridge/` `libs/`  | 복사                              | 복사                                                    | 복사                                      |
| **marketplace** | 루트 정본          | `.claude-plugin/marketplace.json` | `.agents/plugins/marketplace.json`                      | `.agents/plugins.json` (declared entries) |

## 4. 디렉터리 레이아웃 — 배포 격리 (핵심 결정)

**요구**: 설치 시 그 호스트의 산출물만 전달 (타 호스트 파일 미포함). 실측상 세 호스트 모두 설치 = "지정 디렉터리 통째 복사" 이므로, **설치 단위 디렉터리를 호스트별로 분리**해야 달성된다.

```
plugins/<pkg>/
├── definitions/                 ← 정본 SSoT (사람이 수정, 커밋)
├── src/                         ← 런타임 소스 (커밋)
├── bridge/ · libs/              ← 런타임 번들 정본 (esbuild 산출, 커밋 — 현행 유지)
├── package.json · tsconfig.*    ← 개발 인프라 (배포 제외)
└── targets/                     ← 호스트별 배포 트리 (compile-plugin 생성물, 커밋)
    ├── claude/
    │   ├── .claude-plugin/plugin.json
    │   ├── .mcp.json
    │   ├── skills/ · agents/ · hooks/hooks.json
    │   └── bridge/ · libs/      ← 복사본 (설치 디렉터리는 자기완결이어야 함)
    ├── codex/
    │   ├── .codex-plugin/plugin.json
    │   ├── .mcp.json            ← cwd 전략
    │   ├── skills/
    │   ├── .codex-agents/       ← standalone TOML 스테이징 (setup 이 ~/.codex/agents 로 설치)
    │   ├── AGENTS.md            ← 훅 대체 규칙 서술
    │   └── bridge/ · libs/
    └── agy/
        ├── plugin.json
        ├── mcp_config.json
        ├── hooks.json
        ├── skills/ · agents/ · rules/
        └── bridge/ · libs/
```

루트 마켓플레이스 매니페스트가 타깃 트리를 가리킨다:

- `.claude-plugin/marketplace.json` → `"source": "./plugins/<pkg>/targets/claude"`
- `.agents/plugins/marketplace.json` → `"path": "./plugins/<pkg>/targets/codex"`
- agy → 3경로: (a) `agy plugin install <repo>/plugins/<pkg>/targets/agy`, (b) **repo 체크인 `.agents/plugins.json` declared entries** 가 `plugins/*/targets/agy` 를 지목(클론만으로 활성화 — 팀/모노레포 내 사용 최적), (c) agy 가 Claude marketplace.json 규약을 재사용하므로 `plugin@marketplace` 문법으로도 설치 가능(실측 대기).

### 4.1 결정 근거와 마이그레이션 주의

- **커밋한다** (기존 open question 종결): `bridge/` 정책과 일관. 설치자가 git URL 만으로 빌드 없이 설치. 손편집 금지 — 정본만 수정.
- 커밋 노이즈 완화(교차검증 지적 반영): `targets/**` 를 `.gitattributes` 에 `linguist-generated` 로 표시(PR diff 접힘) + CI 가 "재생성 시 무변경(clean regen)" 을 검증해 소스-산출물 desync 를 차단. 대안으로 **배포 전용 브랜치/릴리스 아티팩트** 방식(main 은 소스만, CI 가 release 브랜치에 targets 푸시)이 있으나 마켓플레이스 add 가 브랜치 지정을 지원하는지 호스트별 확인이 선행 — 기본안은 커밋, 이 대안은 릴리스 전략 결정 시 재평가.
- bridge/libs 복사 중복(호스트당 1벌)은 배포 격리의 대가. 수십 KB 수준(캡 가드 유지)이라 수용.
- **Claude 소스 경로 변경**(`./plugins/<pkg>` → `./plugins/<pkg>/targets/claude`)은 기존 설치자의 marketplace update 경로를 바꾼다 — Stage 3 에서 (a) 산출물 바이트 동일성 게이트 통과 후 (b) 플러그인 name 불변 확인 후 전환. 전환 전까지 Claude 는 현행 루트 산출물을 유지(이중 기간 허용, §6 게이트가 동기화 보증).
- `plugins/<pkg>/` 루트의 현행 산출물(skills/, agents/, .claude-plugin/, .mcp.json, hooks/)은 Stage 3 전환 완료 시 targets/claude 로 대체되고 루트에서 제거된다.

## 5. 훅 러너 어댑터 (런타임 0-수정의 열쇠)

기존 훅 구현(`bridge/*.mjs`)은 Claude stdin 계약(snake_case, `session_id`, `hook_event_name`)을 가정한다. agy 는 camelCase + 다른 필드/응답 계약. 훅 로직 소스를 건드리지 않기 위해 **어댑터를 러너 층에 둔다**:

```
agy hooks.json:  node libs/run.cjs --host=agy --event=SessionStart bridge/setup.mjs
                          │
                          ├─ stdin(agy camelCase) → Claude 계약으로 정규화 (conversationId→session_id, …)
                          ├─ tool_name 역매핑 (agy 도구명 → Claude full-form; maencof PostToolUse 가 full-form 매칭 — 실측 2개 파일)
                          ├─ 기존 훅 번들 실행 (무수정)
                          └─ stdout(Claude 계약) → agy 응답 계약으로 역변환 (additionalContext→injectSteps.ephemeralMessage, …)
```

- `libs/run.cjs` 는 이미 크로스 플랫폼 스폰 러너(process.execPath) — 어댑터 기능을 이 층에 추가(또는 자매 파일 `libs/run-agy.cjs`). 15KB 훅 캡 정책 준수.
- 세션당 1회 근사(`SessionStart` → `PreInvocation`)의 once-guard 는 **락 파일이 아니라 "마지막 실행 conversationId 기록 + 불일치 시 실행"** 방식 — Stop 미발화·비정상 종료에도 좀비 상태가 없다 (교차검증 지적 반영).
- stdin/stdout 은 **UTF-8 명시** (Windows `cmd /c` 경유 시 코드페이지 오염 방지 — 교차검증 지적 반영).
- Codex 는 훅이 없으므로 어댑터 불필요 — 대체 채널(matrix §4.5)은 emit 시 주입.

## 6. 검증 전략 (⑤)

- **스냅샷**: `definitions/` + 프로파일 → `targets/**` 골든 파일 (vitest).
- **Claude 동등성 게이트 (요구 1 의 기계적 보장)**: Stage 3 전환 시 `targets/claude/**` 가 현행 수동 산출물과 **바이트 동일**해야 통과. 차이가 나면 정본이 아니라 emitter 를 고친다. 통과 후 루트 산출물 제거.
- **시맨틱 린트**: 미해결 토큰 0, 리터럴 `mcp_`/`mcp__` 본문 금지, 비-공통 이벤트 `fallback` 보유, Codex 타깃에 hooks 파일 부재 확인(생성 자체가 결함).
- **스모크** (호스트별): claude — 기존 CI. codex — `codex plugin marketplace add`+`add`+`exec` 도구 목록 확인 (도구명 `mcp__<server>.<tool>` 존재). agy — `agy plugin validate`(5 컴포넌트 processed) + 인터랙티브 MCP 기동 1회 수동 확인.
- **Windows 매트릭스** (요구 4): CI `windows-latest` 에서 (a) 빌드 재현, (b) run.cjs 훅 스폰, (c) MCP 서버 stdio 왕복. POSIX 는 기존 macOS/linux 러너.

## 7. 기존 빌드 통합

```
clean → version:sync → tsc → esbuild(mcp-server/hooks) → compile-plugin → verify
                                                            └ definitions/ + profiles → targets/{claude,codex,agy}
```

- `compile-plugin` 은 esbuild **뒤** (bridge/ 를 타깃으로 복사해야 하므로).
- `version:sync`(`inject-version.mjs`) 확장: `package.json: version` → `definitions/plugin.yaml` 주입 → 각 타깃 매니페스트 3종은 emit 이 담당. (장기적으로 inject-version 은 compile-plugin 에 흡수.)
- 도구 후보: yaml 파서 + `gray-matter` + TOML 직렬화(Codex agent) + vitest 스냅샷. 경량 토큰 치환 + emitter 함수로 시작.
- 훅 도달 코드 규칙(배럴 import 금지, 바이트 캡)은 타깃 복사본에도 그대로 적용 — 복사만 하므로 자동 준수.

## 8. 새 호스트 추가 절차 (확장성)

1. `profiles/<host>.ts` 작성.
2. 호스트 고유 산출물이 있으면 emitter 보강.
3. `targets/<host>/` 스냅샷 골든 추가 + 루트 마켓플레이스/설치 안내 갱신.
   정본(`definitions/`)·런타임(src/bridge/libs) 무수정. Cursor(`.cursor-plugin/`)·OpenCode(`.opencode/`) 등이 후보 (superpowers 가 대상 호스트 폭의 실증 사례).
