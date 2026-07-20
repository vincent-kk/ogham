## Requirements

- 빌드 시 `scripts/syncRuleHashes.mjs`가 각 rule doc 템플릿의 SHA-256 해시를 `templates/rules/manifest.json`의 `templateHash` 필드에 주입한다.
- **배포 채널은 호스트가 정한다** (`ruleDocsTarget()`): Claude 는 `.claude/rules/<filename>` **파일 1개씩**, Codex 는 `AGENTS.md` **한 파일에 마커 구간**으로 병합한다 (Codex 는 rules 디렉터리를 읽지 않으므로 거기 쓰면 에러가 아니라 **조용한 무효**). agy 는 **미실측** — Claude 와 동일 채널.
- drift 감지: 디렉터리 채널은 배포 파일 해시 vs `templateHash`, 병합 채널은 **구간 본문 vs 템플릿 본문(trim)** 을 비교한다 (병합은 trim 후 삽입하므로 원본 바이트 해시와는 절대 일치할 수 없다).
- 병합 채널은 **재실행 안전** — 같은 규칙을 두 번 배포해도 `AGENTS.md` 에 중복 누적되지 않는다. 마커 밖 사용자 내용은 보존된다.
- 병합 채널의 쓰기는 **전 항목 처리 후 파일 1회 원자적 쓰기** — 항목별 쓰기는 실패 시 사용자의 지침 파일을 반쯤 갱신된 상태로 남긴다.
- required rule: drift 발생 시 `syncRuleDocs`가 자동으로 템플릿으로 덮어써 재동기화한다.
- optional rule: `resync` 파라미터에 해당 rule id를 포함해야만 재동기화된다. 포함하지 않으면 drift만 보고된다.
- 플러그인 루트는 `resolvePluginRoot`가 단일 해석 지점이다: 호출자 인자 우선, 부재 시 `@ogham/cross-platform/host-paths`의 `pluginRoot()`(env → Codex cwd → 자기 위치 상향 탐색), 그래도 없으면 `null`.
- 플러그인 루트 해석 실패 시 `syncRuleDocs`는 throw 없이 `skipped` 배열로, `getRuleDocsStatus`는 `pluginRootResolved: false`로 graceful degradation한다.
- **읽기 채널 동조**: 훅(`buildMinimalContext`)은 `OGHAM_HOST` 를 못 받으므로 호스트 분기 대신 **모든 채널을 합집합으로 판독**한다. 쓰기만 바꾸고 읽기를 놔두면 훅이 방금 배포한 규칙을 "미배포"로 오판한다.

## API Contracts

### 공개 함수

| 함수                   | 시그니처                                                                                              | 설명                                                                                                                          |
| ---------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `syncRuleDocs`         | `(projectRoot: string, selection: Iterable<string>, opts?: SyncRuleDocsOptions) => RuleDocSyncResult` | 호스트의 rule doc 채널을 선택 상태에 맞게 동기화. setup 전용. 채널별 실행은 `syncRuleDocsToDirectory` / `syncRuleDocsToFile`. |
| `getRuleDocsStatus`    | `(projectRoot: string, pluginRoot?: string) => RuleDocsStatus`                                        | 호스트 채널을 읽어 rule doc 현황 스냅샷 반환. 뮤테이션 없음.                                                                  |
| `loadRuleDocsManifest` | `(pluginRoot: string) => RuleDocsManifest`                                                            | `templates/rules/manifest.json` 로드 및 유효성 검사. `templateHash` 누락 시 throw.                                            |
| `resolvePluginRoot`    | `(pluginRoot?: string) => string \| null`                                                             | 플러그인 설치 디렉터리 해석. 인자 → 호스트 채널(`pluginRoot()`) 순. 미해석 시 `null` (throw 없음).                            |
| `initProject`          | `(projectRoot: string, language?: string) => InitResult`                                              | `.filid/config.json`을 git root에 생성(부재 시). `language` 제공 시 config에 기록. 기존 config는 덮어쓰지 않음.               |
| `createDefaultConfig`  | `(language?: string) => FilidConfig`                                                                  | 8개 내장 규칙 기본 config 생성. `language` 제공 시 최상위 `language` 키 포함.                                                 |

### 타입 계약

**`RuleDocEntry`** — manifest.json 단일 항목.

- `templateHash: string` — 빌드 시 주입된 템플릿 파일의 SHA-256 hex digest.

**`RuleDocStatusEntry`** — 상태 스냅샷 단일 항목.

- `deployed: boolean` — 호스트 채널에 배포돼 있는지 여부 (디렉터리 채널=파일 존재, 병합 채널=마커 구간 존재).
- `selected: boolean` — optional은 `deployed`와 동일; required는 항상 `true`.
- `templateHash: string` — **배포본이 일치해야 할 템플릿 해시**. 디렉터리 채널은 manifest 값(원본 바이트), 병합 채널은 삽입되는 본문(trim)의 해시 — 양쪽 채널에서 `inSync` 불변식이 성립하도록 같은 방식으로 계산한다.
- `deployedHash: string | null` — 배포본의 SHA-256 hex; 미배포 또는 읽기 불가 시 `null`.
- `inSync: boolean` — `deployed && deployedHash === templateHash` (두 채널 공통).

**`RuleDocsStatus`** — `getRuleDocsStatus` 반환값.

- `entries` — 체크박스 UI용 optional rule 목록.
- `autoDeployed` — 사용자 선택 없이 자동 적용되는 required rule 목록.

**`RuleDocSyncResult`** — `syncRuleDocs` 반환값.

- `copied` — 새로 복사된 파일명 목록.
- `removed` — 삭제된 파일명 목록.
- `unchanged` — 변경 없는 파일명 목록.
- `updated` — drift 후 재동기화된 파일명 목록 (required 자동 + optional resync opt-in).
- `drift` — drift가 감지됐으나 파일을 건드리지 않은 목록.
- `skipped` — `{ id, reason }` 형태의 처리 실패 항목.

**`SyncRuleDocsOptions`**

- `resync?: Iterable<string>` — drift된 optional rule을 덮어쓸 rule id 목록.
- `pluginRoot?: string` — 호스트가 제공하는 플러그인 루트 대신 사용할 경로.

**`RuleDocSyncPlan`** — `syncRuleDocs`가 1회 해석해 채널 실행기에 넘기는 내부 계약.

- `pluginRoot` / `projectRoot`(git root 해석 완료) / `manifest` / `selection: Set` / `resync: Set`.

## `.filid/config.json` Schema Reference

SSoT: `FilidConfigSchema` / `RuleOverrideSchema` / `AllowedEntrySchema`
in `loaders/configSchemas.ts`. `FilidConfig = z.infer<typeof FilidConfigSchema>`.

### Placement rules (most confused)

- **`additional-allowed` is a TOP-LEVEL key**, never nested under individual
  rules. Nested forms (`rules["<id>"].additional-allowed`) are warn+dropped
  by `loadConfig` via `parseWithAllowlistWarn` — pass-through is forbidden.
- **`additional-entry-points` is a TOP-LEVEL key**, never nested under
  individual rules. Nested forms (`rules["<id>"].additional-entry-points`)
  are warn+dropped by `RuleOverrideSchema.strict()` — pass-through is
  forbidden.
- **`additional-route-patterns` is a TOP-LEVEL key**, never nested under
  individual rules. Nested forms (`rules["<id>"].additional-route-patterns`)
  are warn+dropped by `RuleOverrideSchema.strict()` — pass-through is
  forbidden.
- **`exempt` is a per-rule key** on `RuleOverride`, accepting path globs
  (`packages/**`, `src/legacy/**`). Invalid glob syntax and the bare `**`
  wildcard are warn+dropped at load time (use a concrete scope instead).

### Full example

```json
{
  "version": "1.0",
  "language": "en",
  "rules": {
    "naming-convention": { "enabled": true, "severity": "warning" },
    "zero-peer-file": { "enabled": true, "severity": "warning" },
    "module-entry-point": {
      "enabled": true,
      "severity": "warning",
      "exempt": ["packages/**"]
    }
  },
  "additional-allowed": [
    "type.ts",
    { "basename": "CLAUDE.md", "paths": ["packages/**"] }
  ],
  "additional-entry-points": ["api.tsx"],
  "additional-route-patterns": ["^@[a-z]+$"],
  "scan": { "maxDepth": 10 }
}
```

`additional-allowed` entries may be either a bare basename string (applied
globally) or an object `{ basename, paths? }` that restricts the allowance
to specific path globs. The object branch is consumed by the
`zero-peer-file` rule body (`ruleEngine.ts`).

`additional-entry-points` is a flat array of filenames that the
`module-entry-point` rule accepts as valid module entry points alongside
`index.*`/`main.*` and a detected framework's entry files (Next.js
`page.*`/`route.*`). Use it for project conventions the framework defaults
miss (e.g. `api.tsx`).

`additional-route-patterns` is a flat array of regular-expression strings;
a directory name matching any of them is accepted by `naming-convention`.
Uncompilable patterns are warn-dropped at config load. Use it for framework
route-segment naming the built-in framework patterns do not cover.

### `loadConfig` return

`loadConfig(projectRoot)` returns `{ config: FilidConfig | null, warnings:
string[] }`. Every MCP tool that loads config also surfaces the warnings
array as `configWarnings` in its response (`structureValidate`,
`ruleQuery`, `driftDetect`).

### Review patch validation

cross-review fix-requests that propose `.filid/config.json` patches are
validated via `mcp__plugin_filid_tools__config_patch_validate` (calls `validateConfigPatch`
which uses the shared schema — no local redefinition) before reaching
`resolve`. Hallucinated keys such as `rules[*].allowed-no-entry`
cannot slip through as no-op commits.
