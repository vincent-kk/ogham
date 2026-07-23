# CLAUDE.md — @ogham/cennad

`@ogham/cennad` 패키지 작업 가이드. 패키지 contract 는 [INTENT.md](./INTENT.md), src 내부 구조는 [src/INTENT.md](./src/INTENT.md) 참조.

## Commands

```bash
yarn build              # clean → version:sync → settingsHtml → tsc → mcpServer → hooks
yarn build:plugin       # MCP + hook 번들만 (tsc / version:sync 생략)
yarn typecheck          # 타입 체크 (emit 없음)
yarn test               # vitest watch
yarn test:run           # 단일 실행 (CI)
yarn test:coverage      # 커버리지
yarn test:e2e:run       # E2E (in-process + 번들 stdio)
yarn test:e2e:real      # CENNAD_E2E_REAL_CLI=1 real CLI 호출
yarn format && yarn lint
yarn version:sync       # package.json → src/version.ts
```

## Architecture (Layered Flow)

```
Skills (/setup, /codex, /antigravity, /claude, /crosscheck)  Layer 3 (user) — thin dispatch mappers
        │  background spawn (디스패치 스킬 4종; setup 은 open_settings 직접 호출)
        ▼
Agent "courier" (agents/courier.md)               provider 대화 실행 · 판단 (refine ≤3콜) — 메인 세션 비블로킹
        │
        ▼
MCP "tools" server                                Layer 2 (logic) — 3 MCP 도구
        │
        ▼
Dispatcher (codex / antigravity / claude)         외부 CLI spawn, JSONL 파싱, envelope 빌드
        │
        ▼
Core storage                                      ~/.claude/plugins/cennad/{config, runtime, sessions}
        │
        ▲
Hooks (SessionStart, UserPromptSubmit)            Layer 1 (auto) — read-only context injection
```

의존성 방향은 단방향. 훅은 thin script (Node builtins 만) 이며 `src/core/` / `src/types/` 를 import 하지 않음 — zod 또는 MCP SDK 가 들어오면 10 KB LIGHT cap 초과.

## Plugin Runtime

- 스킬 이름에 플러그인 prefix 없음 (`setup`, `codex`, `antigravity`, `claude`, `crosscheck`) — 디렉토리 이름 = 스킬 이름
- **Agent**: `courier` 1개 (`agents/courier.md`, 서브에이전트 타입 `cennad:courier`, model sonnet) — 디스패치 스킬 4종이 background spawn. 관점(정교화 루프 `refine: true` 시 동일 세션 ≤3콜 · 실패 remedy · tier 의미론)은 courier 가 보유, 스킬은 행동(파싱→spawn→릴레이)만. `plugin.json` 에 `agents` 필드는 추가하지 않는다 (`agents/` 디렉토리 자동 발견)
- MCP 서버 이름은 `tools` — 스킬·에이전트에서 `mcp__plugin_cennad_tools__<name>` full-form 으로 참조
- **훅 번들 cap**: 10 KB LIGHT (enforced by `scripts/buildHooks.mjs`). injectStatic / injectDynamic 모두 ~3.3 KB minified
- **훅 번들 금지 import**: `zod`, `@modelcontextprotocol/sdk`, `fast-glob`, `lodash`, `moment`, `date-fns` — `FORBIDDEN_PATTERNS` in `scripts/buildHooks.mjs` 가 강제

## Development Notes

- **버전**: `yarn version:sync` 만 사용. `src/version.ts` / `.claude-plugin/plugin.json` 은 `package.json` 미러
- **테스트**: `src/**/__tests__/**/*.test.ts`. cennad 데이터 경로를 건드리는 테스트는 `vitest.setup.ts` 의 temp dir 사용
- **Mock CLI**: dispatcher 통합 테스트는 fake `PATH` 의 scripted CLI 로 success / auth-fail / rate-limit / network-fail / cli-missing / ignored-options 커버
- **Sessions**: project-hash 스코프 (`sha256(cwd).slice(0, 12)`). `continue_conversation` 은 다른 cwd 세션이면 `error.code: 'unknown'` 반환 (자동 cross-project fallback 없음)
- **Antigravity 권한/sandbox**: `flags.skip_permissions`·`flags.sandbox` 둘 다 config 기본 **true** — **짝으로 켠다**. `skip_permissions`→`--dangerously-skip-permissions`, `sandbox`→`--sandbox`. skip_permissions 는 agy 1.1.3+ 가 headless `-p` 에서 권한 필요 도구(`run_command` 등)를 auto-deny(빈 stdout, exit 0)하므로 필요하고(미부착 시 도구 쓰는 코딩 프롬프트가 비결정적 실패, 모델이 도구를 안 쓰면 정상), sandbox 는 그 auto-approve 를 터미널 제약 안에 가둔다 — sandbox 없이 skip 만 켜면 unsandboxed 실행까지 무제한 우회가 된다. agy 는 자체 scratch 에서 작업해 사용자 트리를 오염하지 않는다. 기존 사용자 config 는 저장값이 기본값을 덮으므로(`mergeOptionFlags`) `/setup` 또는 설정 UI 에서 켜야 반영된다. sandbox wiring 은 과거 #76 악화로 미부착했다가 복원 — 이력은 [agy-upstream-watch.md](../../.metadata/cennad/agy-upstream-watch.md)
- **Antigravity 빈 stdout 복구 (구버전 #76 + 권한 auto-deny)**: `agy -p` 가 빈 stdout(exit 0)이면 `resolveTranscript`→`agyTranscriptStore` 가 brain transcript(`~/.gemini/antigravity-cli/brain/<convId>/.system_generated/logs/transcript.jsonl`)에서 마지막 `PLANNER_RESPONSE.content` 를 읽기 전용 복구. 완료 대화는 도구 사용 여부와 무관하게 복구된다(2026-07-23 실측 — 중간 도구 스텝은 content 없이 thinking+tool_calls 라 자동 제외될 뿐, "스키마 드리프트로 복구 불가"는 오진). 두 원인: (a) 구버전 #76 순수 stdout 드롭(agy 1.1.2 종결, 구버전 안전망으로 유지), (b) 권한 auto-deny 로 미완성된 대화 — 이건 최종 답변이 없어 복구 불가라 `skip_permissions` 기본 true 로 예방하고, 복구 실패 시 `callAgy` 가 stderr(agy 의 조치 안내)를 `cli_error` 에 반영. 비문서화 내부 구조 의존(SQLite 전환 시 깨지면 명확한 cli_error). 상태·재검증: [agy-upstream-watch.md](../../.metadata/cennad/agy-upstream-watch.md)
- **Tier 해석**: 다른 파일은 tier(`high` / `mid` / `low`)만 사용. 구체 해석은 provider 별 단일 지점에만 — codex `dispatcher/codex/operations/resolveTier.ts`(config `model_map.codex`, tier→`{model,effort}`), antigravity `dispatcher/antigravity/operations/modelAlias.ts`(config `model_map.antigravity`, tier→`{model,effort}` → agy 는 `model (effort)` 로 재조합), claude `dispatcher/claude/operations/resolveTier.ts`(config `model_map.claude`, tier→`{model,effort}`). MCP `tier` 는 optional — `start_conversation` 은 생략 시 provider 별 `config.default_tier`(기본 `mid`), `continue_conversation` 은 생략 시 `SessionMeta.tier`(세션 시작 tier)를 복원하고 그마저 없는 legacy 세션만 `default_tier` 로 떨어진다. tier 가 모델을 고르므로 복원하지 않으면 resume 중 모델이 갈린다(codex 는 `recorded with model X but is resuming with Y` 경고). 명시하면 해당 호출에서 override 한다.
- **model_map 레거시 마이그레이션**: `configManager/utils/mergeModelMap.ts` 의 `mergeTierConfig` 는 구버전 antigravity tier 스키마(`model_map.antigravity.{high,mid,low}` 가 전체 이름 문자열)를 만나면 DEFAULT_CONFIG 로 대체하지 않고 `parseLegacyAntigravityModel` 이 뒤쪽 `(variant)` 를 분해해 `{model, effort}` 로 마이그레이션한다 (괄호 없으면 `{model}`). settings UI 의 `parseAgyModel` 과 동일 규칙 — 저장 데이터가 base/variant 로 정규화돼야 UI 드롭다운(base 목록)과 일치한다.
- **codex effort**: 스케일은 `low<medium<high<xhigh<max<ultra` 이고 **지원 집합이 모델마다 다르다** (`ultra` 는 5.6-sol/terra 전용, 5.5/5.4 계열은 `xhigh` 가 상한). claude-code 와 달리 codex 는 미지원 effort 를 조용히 낮추지 않고 API 에러로 실패시키므로, 모델과 effort 는 항상 짝으로 해석하고 설정 UI 가 모델별 선택지를 제한한다. 모델 카탈로그는 `core/codexModels` 가 `codex debug models` 로 조회(1h TTL 캐시, 실패 시 `constants/codexModels.ts` 정적 fallback). 기본 매핑은 high 만 frontier 로 올리고 mid/low 는 같은 balanced 모델을 effort 로 가른다 — high=`gpt-5.6-sol`(frontier)/`max`, mid=`gpt-5.6-terra`(balanced)/`high`, low=`gpt-5.6-terra`/`medium`. `model`/`effort` 가 비면 해당 플래그를 생략해 사용자 `~/.codex/config.toml` 을 존중한다.

## References

`../../.metadata/cennad/`:

- [spec.md](../../.metadata/cennad/spec.md)
- [architecture.md](../../.metadata/cennad/architecture.md)
- [mcp-tools.md](../../.metadata/cennad/mcp-tools.md)
- [skills.md](../../.metadata/cennad/skills.md)
- [hooks.md](../../.metadata/cennad/hooks.md)
- [storage.md](../../.metadata/cennad/storage.md)
- [web-ui.md](../../.metadata/cennad/web-ui.md)
- [provider-dispatch.md](../../.metadata/cennad/provider-dispatch.md)
- [agy-upstream-watch.md](../../.metadata/cennad/agy-upstream-watch.md)
- [roadmap.md](../../.metadata/cennad/roadmap.md)
