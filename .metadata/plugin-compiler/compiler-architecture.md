# Compiler Architecture — 파이프라인 · 프로파일 · emitter

정본(IR) + 호스트 프로파일 → 호스트별 플러그인 산출물. `tsc` 가 한 소스를 ESM/CJS 로 emit 하듯, 한 정본을 Claude/Codex 로 emit 한다.

## 1. 파이프라인 (5단계)

```
definitions/  ──①parse──►  IR 객체  ──②validate──►  검증된 IR
                                                        │
                              host profile (claude|codex) ──③bind──► 바인딩된 모델
                                                        │
                                          ──④emit──►  산출물 트리  ──⑤verify──►  스냅샷/스모크
```

| 단계       | 입력             | 출력                            | 실패 조건                                                                     |
| ---------- | ---------------- | ------------------------------- | ----------------------------------------------------------------------------- |
| ① parse    | `definitions/**` | IR 객체 (yaml + md frontmatter) | yaml/frontmatter 파싱 오류                                                    |
| ② validate | IR               | 검증된 IR                       | 스키마 위반, 미해결 토큰, `fallback` 누락 ([ir-schema.md](./ir-schema.md) §5) |
| ③ bind     | IR + 프로파일    | 호스트 바인딩 모델              | 프로파일에 없는 `model` 등급, 번역 불가                                       |
| ④ emit     | 바인딩 모델      | 산출물 파일                     | I/O                                                                           |
| ⑤ verify   | 산출물           | 합/불                           | 스냅샷 불일치, 스모크 실패                                                    |

## 2. 호스트 프로파일

한 타깃 호스트의 규칙 집합. 새 호스트 추가 = 새 프로파일 1개 (+ 필요한 emitter 보강).

```
profiles/
├── claude.ts
└── codex.ts
```

프로파일 인터페이스(개념):

```ts
interface HostProfile {
  id: "claude" | "codex";
  manifest: { dir: string; filename: string; field(map): object }; // .claude-plugin/plugin.json ...
  mcp: { wrap(server, cfg): object; toolRef(server, logical): string }; // 래퍼 + 도구명 포맷
  skill: { ref(name): string; dropFrontmatterKeys: string[] }; // {{skill}} 포맷, 드롭 키
  pluginRoot: string; // ${CLAUDE_PLUGIN_ROOT} | ${PLUGIN_ROOT}
  hooks: {
    supports: Set<Event>;
    matcherMap: Map;
    rewrite(fallback): Event | null;
  };
  agents: {
    strategy(bundle): "file" | "embed";
    modelSlug(level): string;
    capability(cap): object;
    supportsMaxTurns: boolean;
  };
}
```

### 2.1 핵심 차이 (프로파일이 캡슐화)

| 관심사            | claude.ts                    | codex.ts                                         |
| ----------------- | ---------------------------- | ------------------------------------------------ |
| manifest dir/file | `.claude-plugin/plugin.json` | `.codex-plugin/plugin.json`                      |
| `.mcp.json` 래퍼  | `{mcpServers:{...}}`         | `{<server>:{...}}` (direct)                      |
| 도구명 포맷       | `mcp_<server>_<tool>`        | `mcp__<server>__<tool>` ⚠️실측                   |
| skill 참조        | `/<plugin>:<name>`           | `$<name>`                                        |
| pluginRoot        | `${CLAUDE_PLUGIN_ROOT}`      | `${PLUGIN_ROOT}`                                 |
| hook 이벤트       | 전체                         | `SessionEnd` 제외                                |
| agent 전략        | 항상 `file`(번들)            | `standalone→file(.codex/agents)`, `embed→inline` |
| model 슬러그      | `standard→sonnet, deep→opus` | 프로파일 매핑 테이블                             |
| maxTurns          | 지원                         | 미지원(드롭)                                     |

## 3. emitter (산출물별)

| emitter         | 소비 정본             | Claude 산출물                                             | Codex 산출물                                                             |
| --------------- | --------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------ |
| **manifest**    | `plugin.yaml`         | `.claude-plugin/plugin.json`                              | `.codex-plugin/plugin.json`                                              |
| **mcp**         | `plugin.yaml: mcp`    | `.mcp.json` (mcpServers 래퍼)                             | `.mcp.json` (direct/mcp_servers)                                         |
| **skill**       | `skills/*.md`         | `skills/<n>/SKILL.md` (토큰 치환·Claude frontmatter 유지) | `skills/<n>/SKILL.md` (토큰 치환·키 드롭, `embed` agent 인라인)          |
| **agent**       | `agents/*.yaml`       | `agents/<n>.md`                                           | `standalone`→`.codex/agents/<n>.toml`; `embed`→(skill emitter 가 인라인) |
| **hook**        | `hooks/*.yaml`        | `hooks/hooks.json` (그대로)                               | `hooks/hooks.json` (`SessionEnd`→`fallback` 재배선, 매처 번역)           |
| **marketplace** | 루트 marketplace 정본 | `.claude-plugin/marketplace.json`                         | `.agents/plugins/marketplace.json`                                       |

## 4. 디렉터리 레이아웃 (소스 → 산출물)

```
plugins/<pkg>/
├── definitions/                 ← 커밋 (정본 SSoT)
├── src/ · bridge/ · libs/       ← 커밋 (런타임, 무수정)
├── .claude-plugin/plugin.json   ← 생성물
├── .codex-plugin/plugin.json    ← 생성물
├── .mcp.json                    ← 생성물 (호스트별 빌드 산출; 또는 .mcp.<host>.json 분리)
├── skills/                      ← 생성물
├── agents/                      ← 생성물 (Claude)
└── .codex/agents/               ← 생성물 (Codex standalone) — 설치 시 repo/user 레벨로 배치
```

생성물 커밋 정책: 현재 ogham 은 `bridge/` 를 커밋(플러그인 런타임). 매니페스트·skill·agent 산출물도 동일하게 **커밋 대상**(설치자가 빌드 없이 사용)으로 둘지, `.gitignore` 후 릴리스 빌드로 생성할지는 릴리스 전략 결정사항 → [case-studies.md](./case-studies.md) §roadmap. 어느 쪽이든 **손편집 금지, 정본만 수정**.

## 5. 기존 빌드 통합

현재 각 패키지 파이프라인: `clean → version:sync → tsc → (mcp-server/hooks esbuild)`. 컴파일러는 한 단계로 삽입:

```
clean → version:sync → compile-plugin → tsc → esbuild(mcp-server/hooks)
                         └ definitions/ + profiles → 호스트별 매니페스트/skill/agent/hook
```

- `version:sync`(`inject-version.mjs`)는 컴파일러의 **값 1개 주입 특수 케이스**. 장기적으로 컴파일러가 흡수하거나, 컴파일러 입력으로 `package.json: version` 을 읽는다.
- 도구 후보: yaml 파서 + `gray-matter`(frontmatter) + TOML 직렬화(Codex agent) + 스냅샷 테스트(vitest). **경량 토큰 치환 + emitter 함수**로 시작하고, 풀 템플릿 엔진(handlebars)은 조건부가 많아질 때만.

## 6. 검증 전략 (⑤)

- **스냅샷**: `definitions/` + 프로파일 → 산출물 골든 파일. 정본/프로파일 변경의 영향 가시화.
- **스키마**: 산출물이 각 호스트 매니페스트 스키마(Codex `.codex-plugin/plugin.json`, Claude `plugin.json`)에 부합.
- **시맨틱 린트**: 미해결 토큰 0, 비-공통 이벤트는 `fallback` 보유, `embed` agent 는 호스트 skill 존재.
- **스모크**(실측 게이트): 생성된 Codex 플러그인을 실제 Codex 로 로드해 MCP 도구 1개 호출 — [host-capability-matrix.md](./host-capability-matrix.md) §5 의 ⚠️ 3건 확인.

## 7. 새 호스트 추가 절차 (확장성)

1. `profiles/<host>.ts` 작성 (위 인터페이스 구현).
2. 해당 호스트 고유 산출물이 있으면 emitter 보강.
3. 스냅샷 골든 추가.
   정본(`definitions/`)·런타임은 무수정. 이것이 "원천 코드 → 실제 플러그인 분리"의 확장성 배당이다.
