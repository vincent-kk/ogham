## Requirements

- 빌드 시 `scripts/sync-rule-hashes.mjs`가 각 rule doc 템플릿의 SHA-256 해시를 `templates/rules/manifest.json`의 `templateHash` 필드에 주입한다.
- 런타임에서 `.claude/rules/<filename>`의 배포 파일 해시와 `templateHash`를 비교해 drift를 감지한다.
- required rule: drift 발생 시 `syncRuleDocs`가 자동으로 템플릿으로 덮어써 재동기화한다.
- optional rule: `resync` 파라미터에 해당 rule id를 포함해야만 재동기화된다. 포함하지 않으면 drift만 보고된다.
- `CLAUDE_PLUGIN_ROOT` 미설정 시 `syncRuleDocs`는 throw 없이 `skipped` 배열로 graceful degradation한다.

## API Contracts

### 공개 함수

| 함수                   | 시그니처                                                                                              | 설명                                                                                                            |
| ---------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `syncRuleDocs`         | `(projectRoot: string, selection: Iterable<string>, opts?: SyncRuleDocsOptions) => RuleDocSyncResult` | `.claude/rules/`를 선택 상태에 맞게 동기화. setup 전용.                                                         |
| `getRuleDocsStatus`    | `(projectRoot: string, pluginRoot?: string) => RuleDocsStatus`                                        | 파일시스템을 읽어 rule doc 현황 스냅샷 반환. 뮤테이션 없음.                                                     |
| `loadRuleDocsManifest` | `(pluginRoot: string) => RuleDocsManifest`                                                            | `templates/rules/manifest.json` 로드 및 유효성 검사. `templateHash` 누락 시 throw.                              |
| `initProject`          | `(projectRoot: string, language?: string) => InitResult`                                              | `.filid/config.json`을 git root에 생성(부재 시). `language` 제공 시 config에 기록. 기존 config는 덮어쓰지 않음. |
| `createDefaultConfig`  | `(language?: string) => FilidConfig`                                                                  | 8개 내장 규칙 기본 config 생성. `language` 제공 시 최상위 `language` 키 포함.                                   |

### 타입 계약

**`RuleDocEntry`** — manifest.json 단일 항목.

- `templateHash: string` — 빌드 시 주입된 템플릿 파일의 SHA-256 hex digest.

**`RuleDocStatusEntry`** — 상태 스냅샷 단일 항목.

- `deployed: boolean` — `.claude/rules/`에 파일이 존재하는지 여부.
- `selected: boolean` — optional은 `deployed`와 동일; required는 항상 `true`.
- `templateHash: string` — manifest의 템플릿 해시.
- `deployedHash: string | null` — 배포 파일의 SHA-256 hex; 미배포 또는 읽기 불가 시 `null`.
- `inSync: boolean` — `deployed && deployedHash === templateHash`.

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
- `pluginRoot?: string` — `CLAUDE_PLUGIN_ROOT` 환경 변수 대신 사용할 경로.

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
validated via `mcp__plugin_filid_t__config_patch_validate` (calls `validateConfigPatch`
which uses the shared schema — no local redefinition) before reaching
`resolve`. Hallucinated keys such as `rules[*].allowed-no-entry`
cannot slip through as no-op commits.
