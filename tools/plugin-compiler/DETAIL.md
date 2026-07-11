## Requirements

`@ogham/plugin-compiler` 는 4대 요구를 기계적으로 충족한다.

1. **Claude 무결손** — `verify/claudeEquivalence` 가 `targets/claude/**` 를 현행 커밋 산출물과 바이트 비교, 불일치 시 실패. 컴파일러가 Claude 에 무해함을 매 실행 증명.
2. **정본 단일 수정점** — `definitions/` 만 사람이 편집. `compilePlugin` 이 전 호스트 산출물 재생성.
3. **설치 격리** — 호스트별 `targets/<host>/` 자기완결 트리 emit. 마켓플레이스가 해당 트리만 지목.
4. **Windows/POSIX** — 훅/서버 진입은 `node <script>` 직접 호출로 emit. 경로는 변수/상대.

## API Contracts

### 프로그램 API (`src/index.ts` 배럴 — 없음; 진입은 pipeline)

- `compilePlugin(pkgDir: string): CompileResult`
  - 입력: 플러그인 디렉터리(절대경로). `definitions/` 필수.
  - 출력: `{ targets: Record<HostId, FileMap>, diagnostics: Diagnostic[] }` (순수 — 디스크 미접촉).
  - 실패: 스키마 위반 · 미해결 토큰 · `fallback` 누락 · Codex 훅 잔존 시 `diagnostics` 에 error, throw 안 함(호출자 판단).
- `writeTargets(pkgDir, targets): void` — FileMap → `targets/<host>/` 원자적 쓰기.
- `claudeEquivalence(pkgDir): Diff[]` — 빈 배열이면 통과.

### CLI (`src/main.ts`, `tsx src/main.ts`)

```
plugin-compiler compile <pkgDir> [--host claude|codex|agy|all] [--check]
  compile        : definitions → targets/ 쓰기
  --check        : 쓰기 없이 등가/재생성 검증만 (CI clean-regen 게이트)
plugin-compiler verify <pkgDir>   : claudeEquivalence + 구조 린트
```

### FileMap 계약

- `FileMap = Map<string, Buffer>` — 키는 타깃 루트 기준 상대경로(POSIX 구분자), 값은 바이트.
- 결정성: 동일 입력 → 동일 FileMap(순서 무관, 바이트 동일). 스냅샷/등가 게이트의 전제.

### 토큰 규약 (본문 → 호스트)

| 토큰                           | claude                               | codex                              | agy                             |
| ------------------------------ | ------------------------------------ | ---------------------------------- | ------------------------------- |
| `{{tool:<t>}}`                 | `mcp__plugin_<plugin>_<server>__<t>` | `mcp__<plugin>.<t>`                | `mcp_<server>_<t>`              |
| `{{skill:<s>}}`                | `/<plugin>:<s>`                      | `$<s>`                             | `<s>`                           |
| `{{pluginRoot}}` (프로즈 본문) | `${CLAUDE_PLUGIN_ROOT}`              | `${CLAUDE_PLUGIN_ROOT}`(주입 별칭) | `${CLAUDE_PLUGIN_ROOT}`(캐비엇) |

- codex 서버명은 플러그인명으로 오버라이드(전역 도구명 충돌 회피, 실측 근거). MCP args 경로는 `cwd: "."`+상대(프로즈 pluginRoot 와 별개).
- codex 도구명(`mcp__deilen.render_viewer`)은 실 스모크로 확정. agy 도구명은 인터랙티브 스모크로 재확정 대기(현재 추정값).

## Acceptance Criteria

검증은 커밋된 테스트가 아니라 **재현 절차**([`.metadata/plugin-compiler/reproduction.md`](../../.metadata/plugin-compiler/reproduction.md))로 확인한다 — `extract → compile → verify` 를 실 플러그인에 실행:

- 정본 → `targets/claude` 가 현행 커밋 산출물(`CLAUDE_INSTALL_ENTRIES`)과 **JSON 의미 동일 + 그 외 바이트 동일** (`verify` 가 빈 diff). deilen(L1)·maencof-lens/filid/maencof(L2) 재현 확인됨.
- `compile` 진단: 미해결 예약토큰 0(error), Codex hooks 파일 0, agy SessionEnd 드롭(warning), 서버명 오버라이드·frontmatter 드롭.
- `mcp-lifecycle` 오버라이드 시 SessionEnd 가 Claude 포함 전 호스트에서 미emit + 손실경고 없음.
