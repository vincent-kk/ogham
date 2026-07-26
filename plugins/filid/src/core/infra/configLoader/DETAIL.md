## Requirements

- 빌드 시 `scripts/syncRuleHashes.mjs`가 각 rule doc 템플릿의 SHA-256 해시를 `templates/rules/manifest.json`의 `templateHash` 필드에 주입한다.
- **배포 채널은 호스트가 정한다**: 목적별 project rule target resolver가 Claude의 `.claude/rules/<filename>` 파일과 Codex의 유효 `AGENTS*.md` 마커 구간을 선택한다. sync만 rule manager를 만들고 status는 read-only entry를 사용한다. agy는 기존 호환성을 위해 Claude로 명시 매핑하며 unknown host는 쓰지 않고 skip한다.
- drift 감지: 디렉터리 채널은 배포 파일 해시 vs `templateHash`, 병합 채널은 **구간 본문 vs 템플릿 본문(trim)** 을 비교한다 (병합은 trim 후 삽입하므로 원본 바이트 해시와는 절대 일치할 수 없다).
- 병합 채널은 **재실행 안전** — 같은 규칙을 두 번 배포해도 `AGENTS.md` 에 중복 누적되지 않는다. 마커 밖 사용자 내용은 보존된다.
- 병합 채널에서 Filid가 소유하는 주소는 `<!-- FILID:START:<filename> -->` / `<!-- FILID:END:<filename> -->` 쌍이다. 동기화는 해당 주소만 변경하며 다른 소유자의 마커 구간도 사용자 텍스트와 함께 보존한다.
- 병합 채널의 쓰기는 **전 항목 처리 후 파일 1회 원자적 쓰기** — 항목별 쓰기는 실패 시 사용자의 지침 파일을 반쯤 갱신된 상태로 남긴다.
- required rule: drift 발생 시 `syncRuleDocs`가 자동으로 템플릿으로 덮어써 재동기화한다.
- optional rule: `resync` 파라미터에 해당 rule id를 포함해야만 재동기화된다. 포함하지 않으면 drift만 보고된다.
- Claude directory의 legacy optional rule이 drift 상태이면 배포 바이트를 보존한 채 current filename으로 이동하고 결과는 `drift`로 보고한다.
- 플러그인 루트는 `resolvePluginRoot`가 단일 해석 지점이다: 호출자 인자 우선, 부재 시 `@ogham/cross-platform/host-paths`의 `pluginRoot()`(env → Codex cwd → 자기 위치 상향 탐색), 그래도 없으면 `null`.
- 플러그인 루트 해석 실패 시 `syncRuleDocs`는 throw 없이 `skipped` 배열로, `getRuleDocsStatus`는 `pluginRootResolved: false`로 graceful degradation한다.
- 템플릿 본문 판독이 ENOENT 외 오류로 실패하면 `getRuleDocsStatus`는 throw 대신 resolved manifestPath와 빈 `entries`/`autoDeployed`를 반환한다.
- directory template이 누락되어도 manifest hash와 deployed hash가 같으면 `inSync`는 true다. status 필드의 hash 불변식이 inspection 내부 상태보다 우선한다.
- 공유 디렉터리 어댑터는 매니페스트 순회 뒤 Filid 소유 네임스페이스인 `filid_*.md` 중 매니페스트에 없는 파일을 orphan rule doc으로 간주해 삭제한다. 다른 접두사의 플러그인 파일과 접두사 없는 사용자 파일은 보존한다. 삭제 성공은 기존 `removed` 목록에, 실패는 `skipped`에 `{ id: <filename>, reason }`으로 보고한다.
- 소유자는 항상 `filid`로 명시하며 첫 manifest 항목에서 추론하지 않는다.
- 이 정리는 소유 파일명 패턴만으로 판별하므로, 매니페스트에 없는 `filid_*.md` 파일은 예외 없이 삭제 대상이 된다 — 사용자가 직접 작성한 `filid_custom.md` 같은 파일도 함께 삭제된다.
- Codex 병합 채널도 `FILID` namespace의 manifest 외 고아 구간만 폐기한다.
- **읽기 채널 동조**: 설정 UI와 훅은 공유 target 해석을 사용한다. optional 체크박스 선택은 canonical-first 저장본으로 보존하되, 배포 여부·경로·source·hash·동기화 상태는 현재 host가 실제로 읽는 effective target의 active inspection으로 보고한다.

## API Contracts

### 공개 함수

| 함수                   | 시그니처                                                                                              | 설명                                                                                                            |
| ---------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `syncRuleDocs`         | `(projectRoot: string, selection: Iterable<string>, opts?: SyncRuleDocsOptions) => RuleDocSyncResult` | 공유 project rule manager를 통해 호스트 채널을 선택 상태에 맞게 동기화하는 setup 전용 호환 facade.              |
| `getRuleDocsStatus`    | `(projectRoot: string, pluginRoot?: string) => RuleDocsStatus`                                        | 호스트 채널을 읽어 rule doc 현황 스냅샷 반환. 뮤테이션 없음.                                                    |
| `loadRuleDocsManifest` | `(pluginRoot: string) => RuleDocsManifest`                                                            | `templates/rules/manifest.json` 로드 및 유효성 검사. `templateHash` 누락 시 throw.                              |
| `resolvePluginRoot`    | `(pluginRoot?: string) => string \| null`                                                             | 플러그인 설치 디렉터리 해석. 인자 → 호스트 채널(`pluginRoot()`) 순. 미해석 시 `null` (throw 없음).              |
| `initProject`          | `(projectRoot: string, language?: string) => InitResult`                                              | `.filid/config.json`을 git root에 생성(부재 시). `language` 제공 시 config에 기록. 기존 config는 덮어쓰지 않음. |
| `createDefaultConfig`  | `(language?: string) => FilidConfig`                                                                  | 8개 내장 규칙 기본 config 생성. `language` 제공 시 최상위 `language` 키 포함.                                   |

### 타입 계약

**`RuleDocEntry`** — manifest.json 단일 항목.

- `templateHash: string` — 빌드 시 주입된 템플릿 파일의 SHA-256 hex digest.

**`RuleDocStatusEntry`** — 상태 스냅샷 단일 항목.

- `target` / `displayTarget` — 공유 manager가 판독한 active 실제 경로와 UI용 project-relative effective host target.
- `source` — active target의 현재 주소, legacy 주소, 또는 미배포를 뜻하는 `current | legacy | null`.
- `deployed: boolean` — effective host 채널에서 규칙이 실제 활성인지 여부 (디렉터리 채널=파일 존재, 병합 채널=active target 마커 구간 존재).
- `selected: boolean` — optional은 canonical-first managed candidate에 저장본이 있는지 여부; required는 항상 `true`. Codex override가 저장본을 가려도 optional 체크박스 선택은 보존된다.
- `templateHash: string` — **배포본이 일치해야 할 템플릿 해시**. 디렉터리 채널은 manifest 값(원본 바이트), 병합 채널은 삽입되는 본문(trim)의 해시 — 양쪽 채널에서 `inSync` 불변식이 성립하도록 같은 방식으로 계산한다.
- `deployedHash: string | null` — active 배포본의 SHA-256 hex; 미배포 또는 읽기 불가 시 `null`.
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

## `.filid/config.json` Schema Reference

SSoT: `FilidConfigSchema` / `RuleOverrideSchema` / `AllowedEntrySchema` in `loaders/configSchemas.ts`. `FilidConfig = z.infer<typeof FilidConfigSchema>`.

### Placement rules (most confused)

- **`additional-allowed` is a TOP-LEVEL key**, never nested under individual rules. Nested forms (`rules["<id>"].additional-allowed`) are warn+dropped by `loadConfig` via `parseWithAllowlistWarn` — pass-through is forbidden.
- **`additional-entry-points` is a TOP-LEVEL key**, never nested under individual rules. Nested forms (`rules["<id>"].additional-entry-points`) are warn+dropped by `RuleOverrideSchema.strict()` — pass-through is forbidden.
- **`additional-route-patterns` is a TOP-LEVEL key**, never nested under individual rules. Nested forms (`rules["<id>"].additional-route-patterns`) are warn+dropped by `RuleOverrideSchema.strict()` — pass-through is forbidden.
- **`additional-organ-names` is a TOP-LEVEL key**, never nested under individual rules. Nested forms (`rules["<id>"].additional-organ-names`) are warn+dropped by `RuleOverrideSchema.strict()` — pass-through is forbidden.
- **`exempt` is a per-rule key** on `RuleOverride`, accepting path globs (`packages/**`, `src/legacy/**`). Invalid glob syntax and the bare `**` wildcard are warn+dropped at load time (use a concrete scope instead).

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
  "additional-organ-names": ["docs", "plans"],
  "scan": { "maxDepth": 10 }
}
```

`additional-allowed` entries may be either a bare basename string (applied globally) or an object `{ basename, paths? }` that restricts the allowance to specific path globs. The object branch is consumed by the `zero-peer-file` rule body (`ruleEngine.ts`).

`additional-entry-points` is a flat array of filenames that the `module-entry-point` rule accepts as valid module entry points alongside `index.*`/`main.*` and a detected framework's entry files (Next.js `page.*`/`route.*`). Use it for project conventions the framework defaults miss (e.g. `api.tsx`).

`additional-route-patterns` is a flat array of regular-expression strings; a directory name matching any of them is accepted by `naming-convention`. Uncompilable patterns are warn-dropped at config load. Use it for framework route-segment naming the built-in framework patterns do not cover.

`additional-organ-names` is a flat array of directory names that classify as `organ` alongside `KNOWN_ORGAN_DIR_NAMES`, reaching `classifyNode` through `ScanOptions.additionalOrganNames`. The built-in list holds code organs only (`utils`, `types`, `hooks`, …); docs-as-code compartments (`references`, `docs`, `plans`, `skills`, `agents`) are an open set and belong here, because a name shipped in the constant silently reclassifies a real code module of that name as an organ, muting the rules that would apply to it. Only directories with subdirectories need an entry — a leaf compartment is already an organ by classification priority 6. Declaring a name here does not override `INTENT.md`/`DETAIL.md`: priority 1–2 still wins, so a directory that documents itself stays fractal. The hook layer does not read config — these names apply to scan/validate tools only.

### `loadConfig` return

`loadConfig(projectRoot)` returns `{ config: FilidConfig | null, warnings: string[] }`. Every MCP tool that loads config also surfaces the warnings array as `configWarnings` in its response (`structureValidate`, `ruleQuery`, `driftDetect`).

### Review patch validation

cross-review fix-requests that propose `.filid/config.json` patches are validated via `mcp__plugin_filid_tools__config_patch_validate` (calls `validateConfigPatch` which uses the shared schema — no local redefinition) before reaching `resolve`. Hallucinated keys such as `rules[*].allowed-no-entry` cannot slip through as no-op commits.

## Last Updated

2026-07-26 — 저장 선택과 active rule 배포 상태의 호환 매핑 명시.
