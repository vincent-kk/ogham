# Agent Artifacts 구현 계획

> 이 계획은 `/seiri:execute`로 실행한다. 각 구현 단위 전에 `/seiri:implement`를
> 로드하고, 완료를 주장하기 전에 `/seiri:verify`를 로드한다.

## 목표

`@ogham/agent-artifacts`를 도입한다. 이 패키지는 경로/파일 시스템/실행에
전적으로 `@ogham/cross-platform`을 사용한다. 그런 다음 외부에 노출된 설정
계약을 변경하지 않고 Filid 및 Seiri 규칙 배포, Maencof 지침 섹션,
Cennad의 Codex 사용자 MCP 프로비저닝을 마이그레이션한다.

## 작업 1 — 기존 계약 특성화

먼저 문서를 업데이트한다.

- `plugins/filid/src/core/infra/configLoader/DETAIL.md`
- `plugins/seiri/DETAIL.md`
- `plugins/seiri/src/core/ruleDocs/INTENT.md`
- `plugins/maencof/src/core/claudeMdMerger/INTENT.md`
- `plugins/cennad/src/core/youtubeMcp/INTENT.md`

공유 구현에 앞서 특성화 테스트를 추가하거나 확장한다.

- `plugins/filid/src/__tests__/unit/core/ruleDocsChannel.test.ts`
- `plugins/seiri/src/core/ruleDocs/__tests__/orphanRetirement.test.ts`
- `plugins/seiri/src/core/ruleDocs/__tests__/ruleDocsChannel.test.ts` (신규)
- `plugins/maencof/src/__tests__/unit/mergeSection.test.ts`
- `plugins/maencof/src/__tests__/unit/readRemoveSection.test.ts`
- `plugins/maencof/src/__tests__/unit/instructionsChannel.test.ts`
- `plugins/cennad/src/core/youtubeMcp/operations/__tests__/provisionCodex.test.ts`

다음 동작을 고정한다.

- Claude 규칙 파일, Codex 마커 섹션, 멱등성, 사용자 텍스트 보존
- 드리프트 보존 및 명시적 재동기화
- 네임스페이스로 제한된 고아 아티팩트 폐기
- Maencof의 기존 마커 및 형제 백업
- Cennad의 정확한 `codex mcp add/remove` argv 및 ENOENT 발생 시 조용한
  저하 처리

구현 전에 다음을 실행한다.

```bash
yarn workspace @ogham/filid test:run ruleDocsChannel
yarn workspace @ogham/seiri test:run ruleDocs
yarn workspace @ogham/maencof test:run claudeMdMerger
yarn workspace @ogham/cennad test:run provisionCodex
```

예상 결과: 기존 케이스는 통과한다. Seiri가 여전히 `.claude/rules/`에만
쓰기 때문에 새 Seiri Codex 채널 케이스는 실패한다.

## 작업 2 — Cross-platform 파일 시스템 및 명시적 루트 프리미티브 추가

코드보다 먼저 계약을 업데이트하거나 추가한다.

- `shared/cross-platform/INTENT.md`
- `shared/cross-platform/DETAIL.md` (신규)
- `shared/cross-platform/src/INTENT.md`
- `shared/cross-platform/src/paths/INTENT.md`
- `shared/cross-platform/src/hostRegistry/INTENT.md`
- `shared/cross-platform/src/filesystem/INTENT.md` (신규)

파일 시스템 구현을 추가한다.

- `shared/cross-platform/src/filesystem/index.ts`
- `shared/cross-platform/src/filesystem/read/*.ts`
- `shared/cross-platform/src/filesystem/mutation/*.ts`
- `shared/cross-platform/src/filesystem/locking/*.ts`
- `shared/cross-platform/src/filesystem/safety/*.ts`
- `shared/cross-platform/src/filesystem/helpers/*.ts`
- `shared/cross-platform/src/filesystem/types/types.ts`
- `shared/cross-platform/src/filesystem/__tests__/filesystem.test.ts`
- `shared/cross-platform/src/filesystem/__tests__/structure.test.ts`

프로덕션 파일은 함수 선언을 하나만 가지며 역할별 organ 디렉터리에 배치한다.

공개 함수:

```ts
readUtf8FileIfExistsSync(path: string): string | null;
readFileIfExistsSync(path: string): Uint8Array | null;
listDirectoryIfExistsSync(path: string): readonly string[];
ensureDirectorySync(path: string, options?: { mode?: number }): void;
removeFileIfExistsSync(path: string): boolean;
writeFileAtomicallySync(
  path: string,
  content: string | Uint8Array,
  options?: { fileMode?: number; directoryMode?: number },
): void;
withFileLockSync<T>(
  targetPath: string,
  operation: () => T,
  options?: { timeoutMs?: number; staleMs?: number },
): { acquired: true; value: T } | { acquired: false };
```

잠금은 원자적 디렉터리 생성과 소유권 토큰을 함께 사용한다. 훅 캐시 잠금과
달리 제한 시간이 초과되면 잠금 없이 계속해서는 안 되며, 아티팩트 변경은
`conflict`를 반환한다.

명시적 호스트/경로 해석을 확장한다.

- `shared/cross-platform/src/hostRegistry/types.ts`
- `shared/cross-platform/src/hostRegistry/resolveRuntimeHost.ts` (신규)
- `shared/cross-platform/src/hostRegistry/index.ts`
- `shared/cross-platform/src/hostRegistry/__tests__/hostRegistry.test.ts`
- `shared/cross-platform/src/paths/paths.ts`
- `shared/cross-platform/src/paths/index.ts`
- `shared/cross-platform/src/paths/__tests__/paths.test.ts`
- `shared/cross-platform/src/hostPaths/absoluteRoot.ts`
- `shared/cross-platform/src/hostPaths/index.ts`
- `shared/cross-platform/src/hostPaths/__tests__/hostPaths.test.ts`
- `shared/cross-platform/src/index.ts`
- `shared/cross-platform/package.json`

다음을 추가한다.

```ts
resolveRuntimeHost(
  env: Readonly<Record<string, string | undefined>>,
): Host;

hostStateRoot(
  host: KnownHost,
  env?: Readonly<Record<string, string | undefined>>,
): string;

requireAbsoluteRoot(value: string): string;
resolveContainedPath(root: string, ...segments: string[]): string;
```

`resolveContainedPath`는 절대 경로 세그먼트, 경로 순회, `root` 밖으로 해석된
경로를 거부한다.

다음을 실행한다.

```bash
yarn workspace @ogham/cross-platform test:run
yarn workspace @ogham/cross-platform typecheck
```

예상 결과: 모든 cross-platform 테스트가 네이티브 경로와 이식 가능한
Windows/POSIX 픽스처에서 통과한다.

## 작업 3 — `@ogham/agent-artifacts` 스캐폴딩

소스보다 먼저 문서를 만든다.

- `shared/agent-artifacts/INTENT.md`
- `shared/agent-artifacts/DETAIL.md`
- `shared/agent-artifacts/src/INTENT.md`
- `shared/agent-artifacts/src/project/INTENT.md`
- `shared/agent-artifacts/src/user/INTENT.md`
- `shared/agent-artifacts/src/rules/INTENT.md`
- `shared/agent-artifacts/src/instructions/INTENT.md`
- `shared/agent-artifacts/src/mcp/INTENT.md`
- `shared/agent-artifacts/src/targets/INTENT.md`
- `shared/agent-artifacts/src/transactions/INTENT.md`

패키지/빌드 파일을 만든다.

- `shared/agent-artifacts/package.json`
- `shared/agent-artifacts/tsconfig.json`
- `shared/agent-artifacts/tsconfig.build.json`
- `shared/agent-artifacts/vitest.config.ts`
- `scripts/buildAll.mjs`
- `scripts/typecheckAll.mjs`
- `yarn.lock`

다음을 선언한다.

- `@ogham/cross-platform: workspace:^`
- `smol-toml ^1.6.1`: 마커 소유 텍스트 편집 전후에 Codex 프로젝트 구성을
  검증하는 용도로만 사용한다. 파싱 전에 입력 크기를 제한하고 전체 문서를
  직렬화하지 않는다.

두 저장소 오케스트레이터 모두에 `@ogham/agent-artifacts`를 공유 공급자로
등록하여 해당 선언이 `cross-platform` 뒤, 플러그인 소비자 앞에 출력되게
한다. `cross-platform`, `agent-artifacts` 순으로 빌드하여 공급자 DAG를
보존한다.

순수 공개 배럴을 만든다.

- `shared/agent-artifacts/src/index.ts`
- `shared/agent-artifacts/src/project/index.ts`
- `shared/agent-artifacts/src/user/index.ts`
- `shared/agent-artifacts/src/rules/index.ts`
- `shared/agent-artifacts/src/instructions/index.ts`
- `shared/agent-artifacts/src/mcp/index.ts`
- `shared/agent-artifacts/src/targets/index.ts`
- `shared/agent-artifacts/src/transactions/index.ts`

공유 공개 타입을 만든다.

- `shared/agent-artifacts/src/types/artifacts.ts`
- `shared/agent-artifacts/src/types/instructions.ts`
- `shared/agent-artifacts/src/types/mcp.ts`
- `shared/agent-artifacts/src/types/rules.ts`

패키지는 이름 있는 심벌만 내보낸다. 아키텍처 테스트를 추가한다.

- `shared/agent-artifacts/src/__tests__/architecture.test.ts`

프로덕션 소스가 `node:fs`, `node:path`, `node:os`, `node:child_process`를
가져오면 이 테스트가 실패해야 한다.

다음을 실행한다.

```bash
yarn workspace @ogham/agent-artifacts typecheck
yarn workspace @ogham/agent-artifacts test:run
```

이 단계의 예상 결과: 스캐폴딩/타입 테스트는 통과한다. 다음 작업에서 추가하는
동작 테스트는 해당 구현 단위가 반영될 때까지 계속 실패한다.

## 작업 4 — 범위 대상 및 리비전 구현

대상 해석을 추가한다.

- `shared/agent-artifacts/src/targets/targets.ts`
- `shared/agent-artifacts/src/targets/maps/projectTargets.ts`
- `shared/agent-artifacts/src/targets/maps/userTargets.ts`
- `shared/agent-artifacts/src/targets/maps/effectiveInstructionFile.ts`
- `shared/agent-artifacts/src/targets/__tests__/projectTargets.test.ts`
- `shared/agent-artifacts/src/targets/__tests__/userTargets.test.ts`

트랜잭션 지원을 추가한다.

- `shared/agent-artifacts/src/transactions/transactions.ts`
- `shared/agent-artifacts/src/transactions/planning/createRevision.ts`
- `shared/agent-artifacts/src/transactions/apply/applyFilePlan.ts`
- `shared/agent-artifacts/src/transactions/__tests__/transactions.test.ts`

인수 케이스:

- 프로젝트 루트는 절대 경로여야 한다.
- 사용자 대상 해석은 루트를 받지 않는다.
- `CODEX_HOME`과 `CLAUDE_CONFIG_DIR`는 사용자 지침/규칙 대상을
  재배치한다.
- Claude 사용자 MCP는 `$CLAUDE_CONFIG_DIR/.mcp.json`이 아니라 CLI 대상이다.
- 비어 있지 않은 Codex override는 유효하고, 빈 override는 다음 후보로
  넘어간다.
- 새로 가려진 파일의 소유 섹션은 `relocate`를 계획한다.
- 대상 리비전이 일치하지 않으면 `conflict`를 반환하고 아무것도 쓰지 않는다.
- 잠금 제한 시간이 초과되면 `conflict`를 반환한다.

다음을 실행한다.

```bash
yarn workspace @ogham/agent-artifacts test:run targets transactions
```

예상 결과: 대상 매트릭스 및 오래된 계획 테스트가 통과한다.

## 작업 5 — 지침 섹션 구현

구현을 추가한다.

- `shared/agent-artifacts/src/instructions/instructions.ts`
- `shared/agent-artifacts/src/instructions/planning/decideInstructionAction.ts`
- `shared/agent-artifacts/src/instructions/planning/planInstructionSection.ts`
- `shared/agent-artifacts/src/instructions/status/inspectInstructionSection.ts`
- `shared/agent-artifacts/src/instructions/__tests__/instructions.test.ts`

`sectionMarkers`, `mergeSection`, `readSection`, `removeSection`을
`@ogham/cross-platform/instructions`에서 가져와 사용한다. 이를 중복
구현하지 않는다.

다음을 테스트한다.

- absent/copy/update/remove/unchanged/drift
- 잘못된 형식의 마커가 충돌함
- 마커 외부 텍스트가 바이트 단위로 동일하게 유지됨
- 쓰기가 발생할 때만 형제 백업이 생성됨
- 유효 지침 후보 사이에서 재배치됨
- 여러 소유자가 같은 파일에 공존함

다음을 실행한다.

```bash
yarn workspace @ogham/agent-artifacts test:run instructions
```

예상 결과: 모든 지침 섹션 테스트가 통과한다.

## 작업 6 — 규칙 문서 구현

구현을 추가한다.

- `shared/agent-artifacts/src/rules/rules.ts`
- `shared/agent-artifacts/src/rules/planning/decideRuleAction.ts`
- `shared/agent-artifacts/src/rules/planning/planRuleDocuments.ts`
- `shared/agent-artifacts/src/rules/status/inspectRuleDocuments.ts`
- `shared/agent-artifacts/src/rules/adapters/directoryRules.ts`
- `shared/agent-artifacts/src/rules/adapters/sectionRules.ts`
- `shared/agent-artifacts/src/rules/__tests__/decideRuleAction.test.ts`
- `shared/agent-artifacts/src/rules/__tests__/directoryRules.test.ts`
- `shared/agent-artifacts/src/rules/__tests__/sectionRules.test.ts`

두 물리적 어댑터에 동일한 사실표를 적용하여 테스트한다.

| 원하는 상태 | 존재 여부 | 일치 여부 | 드리프트 교체 | 동작      |
| ----------- | --------- | --------- | --------------- | --------- |
| 아니요      | 아니요    | —         | —               | unchanged |
| 아니요      | 예        | —         | —               | remove    |
| 예          | 아니요    | —         | —               | copy      |
| 예          | 예        | 예        | —               | unchanged |
| 예          | 예        | 아니요    | 아니요          | drift     |
| 예          | 예        | 아니요    | 예              | update    |

다음 항목도 테스트한다.

- 레거시 파일명 재배치
- 소유자로 제한된 고아 아티팩트 폐기
- 원시 파일과 공백을 제거한 섹션의 해시가 동등한 배포 본문으로 비교됨
- 모든 규칙 섹션을 조합한 뒤 Codex 파일을 한 번만 씀
- 두 번째 소유자를 건드리지 않음

다음을 실행한다.

```bash
yarn workspace @ogham/agent-artifacts test:run rules
```

예상 결과: 디렉터리 및 섹션 어댑터가 동등한 논리적 결과를 생성한다.

## 작업 7 — 구분된 프로젝트 및 사용자 생성자 구현

다음을 추가한다.

- `shared/agent-artifacts/src/project/project.ts`
- `shared/agent-artifacts/src/project/__tests__/project.test.ts`
- `shared/agent-artifacts/src/user/user.ts`
- `shared/agent-artifacts/src/user/__tests__/user.test.ts`

Signatures:

```ts
createProjectArtifactManager(
  options: ProjectArtifactManagerOptions,
): ArtifactManager;

createUserArtifactManager(
  options: UserArtifactManagerOptions,
): ArtifactManager;
```

각 생성자에서 소유자 ID를 한 번 검증한다. `rules`와 `instructions`를 해당
범위의 대상 집합에 연결한다. 사용자 생성자에는 경로 옵션을 두지 않는다.

다음을 실행한다.

```bash
yarn workspace @ogham/agent-artifacts test:run project user
yarn workspace @ogham/agent-artifacts typecheck
```

예상 결과: 컴파일 타임 픽스처가 누락된 프로젝트 루트, 상대 프로젝트 루트,
모든 사용자 루트 속성을 거부한다.

## 작업 8 — Filid 규칙 마이그레이션

먼저 계약을 업데이트한다.

- `plugins/filid/DETAIL.md` (신규)
- `plugins/filid/INTENT.md`
- `plugins/filid/src/core/infra/configLoader/DETAIL.md`
- `plugins/filid/src/core/infra/configLoader/INTENT.md`

어댑터/공개 동작을 업데이트한다.

- `plugins/filid/package.json`
- `plugins/filid/src/core/infra/configLoader/loaders/syncRuleDocs.ts`
- `plugins/filid/src/core/infra/configLoader/loaders/getRuleDocsStatus.ts`
- `plugins/filid/src/core/infra/configLoader/loaders/manifestTypes.ts`
- `plugins/filid/src/constants/ruleDocs.ts`
- `plugins/filid/src/hooks/userPromptSubmit/utils/buildMinimalContext.ts`
- `plugins/filid/src/hooks/userPromptSubmit/utils/injectContext.ts`
- `plugins/filid/src/mcp/tools/ruleDocsSync/ruleDocsSync.ts`
- `plugins/filid/src/mcp/pages/settings/index.html`
- `plugins/filid/src/mcp/pages/settings/scripts/app.js`

유일한 소비자를 옮긴 후 다음 파일을 삭제한다.

- `plugins/filid/src/core/infra/configLoader/loaders/syncRuleDocsToDirectory.ts`
- `plugins/filid/src/core/infra/configLoader/loaders/syncRuleDocsToFile.ts`
- `plugins/filid/src/core/infra/configLoader/loaders/retireOrphanedRuleDocs.ts`
- `plugins/filid/src/core/infra/configLoader/loaders/migrateLegacyFilenames.ts`
- `plugins/filid/src/core/infra/configLoader/utils/writeFileAtomically.ts`
- `plugins/filid/src/core/infra/configLoader/utils/writeTextAtomically.ts`

`syncRuleDocs`와 `getRuleDocsStatus` 시그니처를 안정적으로 유지한다. 이들은
Filid 매니페스트/UI 메타데이터를 로드하고 required/selected/resync를 공유
의도에 매핑하며, 공유 결과를 기존 결과 타입으로 다시 매핑한다.

훅에서 `.claude/rules`와 지침 파일의 합집합을 스캔하는 방식을 실제
호스트 대상 상태로 교체한다. 그러면 Codex에서 오래된 Claude 파일로 인한
오탐이 제거된다.

기존 빌드 스크립트로 체크인된 설정 HTML을 다시 생성한다. 생성된
`plugins/filid/public/settings.html`을 직접 편집하지 않는다. 생성 파일은 이
작업의 예상 출력이다.

다음을 실행한다.

```bash
yarn workspace @ogham/filid test:run
yarn workspace @ogham/filid typecheck
```

예상 결과: 기존 공개 결과가 안정적으로 유지되고 두 호스트 채널이 모두
통과한다.

## 작업 9 — Seiri 규칙 마이그레이션

먼저 계약을 업데이트한다.

- `plugins/seiri/DETAIL.md`
- `plugins/seiri/INTENT.md`
- `plugins/seiri/src/INTENT.md`
- `plugins/seiri/src/core/INTENT.md`
- `plugins/seiri/src/core/ruleDocs/INTENT.md`

다음을 업데이트한다.

- `plugins/seiri/package.json`
- `plugins/seiri/src/core/ruleDocs/index.ts`
- `plugins/seiri/src/core/ruleDocs/loaders/loadManifest.ts`
- `plugins/seiri/src/core/ruleDocs/status/getRuleDocsStatus.ts`
- `plugins/seiri/src/core/ruleDocs/sync/planRuleDocs.ts`
- `plugins/seiri/src/core/ruleDocs/sync/applyRuleDocs.ts`
- `plugins/seiri/src/types/manifest.ts`
- `plugins/seiri/src/hooks/shared/renderStatusLines.ts`
- `plugins/seiri/src/mcp/pages/settings/index.html`
- `plugins/seiri/src/mcp/pages/settings/scripts/app.js`
- `plugins/seiri/src/mcp/tools/ruleDocsSync/ruleDocsSync.ts`
- `plugins/seiri/src/mcp/tools/openSettings/utils/persistSave.ts`

마이그레이션 후 다음 파일을 삭제한다.

- `plugins/seiri/src/core/ruleDocs/utils/collectRuleDocDecisions.ts`
- `plugins/seiri/src/core/ruleDocs/utils/decideRuleDocAction.ts`
- `plugins/seiri/src/core/ruleDocs/utils/detectOrphanedDocs.ts`
- `plugins/seiri/src/core/ruleDocs/__tests__/decideRuleDocAction.test.ts`

기존 공개 `resolveRulesDir`는 deprecated Claude-only wrapper로 유지하되 새
배포·상태 경로에서는 사용하지 않는다.

Seiri의 현재 공개 함수 시그니처와 UI 결과 어휘를 얇은 매핑으로 유지한다.
하드코딩된 `.claude/rules/` 레이블을 공유 계획의 표시 대상으로 교체한다.

`plugins/seiri/public/settings.html`을
`scripts/build-settings-html.mjs`를 통해 다시 생성한다. 공개 HTML은 예상
생성 출력이지 직접 편집할 대상이 아니다.

다음을 실행한다.

```bash
yarn workspace @ogham/seiri test:run
yarn workspace @ogham/seiri typecheck
```

예상 결과: Claude 동작은 변경되지 않고, 먼저 실패하도록 작성한 Codex
특성화 테스트가 이제 통과한다.

## 작업 10 — Maencof 지침 마이그레이션

계약을 업데이트한다.

- `plugins/maencof/DETAIL.md` (신규)
- `plugins/maencof/INTENT.md`
- `plugins/maencof/src/core/claudeMdMerger/INTENT.md`

다음을 업데이트한다.

- `plugins/maencof/package.json`
- `plugins/maencof/src/core/claudeMdMerger/index.ts`
- `plugins/maencof/src/core/claudeMdMerger/operations/claudeMdMerger.ts`
- `plugins/maencof/src/core/claudeMdMerger/operations/mergeMaencofSection.ts`
- `plugins/maencof/src/core/claudeMdMerger/operations/readMaencofSection.ts`
- `plugins/maencof/src/core/claudeMdMerger/operations/removeMaencofSection.ts`
- `plugins/maencof/src/core/claudeMdMerger/types/types.ts`
- `plugins/maencof/src/hooks/shared/instructionsPath.ts`
- `plugins/maencof/src/hooks/sessionStart/helpers/bootstrap/bootstrap.ts`
- `plugins/maencof/src/mcp/server/registrations/claudeMd.ts`
- `plugins/maencof/src/mcp/tools/claudemdMerge/claudemdMerge.ts`
- `plugins/maencof/src/mcp/tools/claudemdRead/claudemdRead.ts`
- `plugins/maencof/src/mcp/tools/claudemdRemove/claudemdRemove.ts`
- `plugins/maencof/src/__tests__/unit/mergeSection.test.ts`
- `plugins/maencof/src/__tests__/unit/readRemoveSection.test.ts`
- `plugins/maencof/src/__tests__/unit/instructionsChannel.test.ts`
- `plugins/maencof/src/__tests__/unit/sessionStartClaudemdInit.test.ts`

도구 이름과 응답 스키마를 보존한다. 호환성 클래스/함수는 프로젝트
지침 관리자를 감싸는 얇은 래퍼가 되며, Maencof의 ID 없는 마커와
`.bak` 동작을 유지한다.

다음을 실행한다.

```bash
yarn workspace @ogham/maencof test:run
yarn workspace @ogham/maencof typecheck
```

예상 결과: 기존 Claude 및 Codex 도구 계약이 통과하고 override 가림 테스트도
통과한다.

## 작업 11 — MCP 어댑터 구현

다음을 추가한다.

- `shared/agent-artifacts/src/mcp/mcp.ts`
- `shared/agent-artifacts/src/mcp/planning/decideMcpAction.ts`
- `shared/agent-artifacts/src/mcp/adapters/claudeProjectJson.ts`
- `shared/agent-artifacts/src/mcp/adapters/claudeUserCli.ts`
- `shared/agent-artifacts/src/mcp/adapters/codexProjectToml.ts`
- `shared/agent-artifacts/src/mcp/adapters/codexUserCli.ts`
- `shared/agent-artifacts/src/mcp/encoding/renderCodexMcpBlock.ts`
- `shared/agent-artifacts/src/mcp/__tests__/claudeProjectJson.test.ts`
- `shared/agent-artifacts/src/mcp/__tests__/claudeUserCli.test.ts`
- `shared/agent-artifacts/src/mcp/__tests__/codexProjectToml.test.ts`
- `shared/agent-artifacts/src/mcp/__tests__/codexUserCli.test.ts`

Codex 프로젝트 테스트는 다음 항목을 다뤄야 한다.

- 주석과 관련 없는 바이트를 건드리지 않음
- 소유 블록 하나의 추가/업데이트/제거
- 따옴표로 묶은 서버 이름 및 TOML 이스케이프
- 유효하지 않은 원본 TOML
- 같은 이름을 가진 비소유 서버와의 충돌
- 편집 후 유효한 전체 TOML
- 오래된 리비전 및 잠금 충돌

CLI 어댑터 테스트는 argv만 단언하고 주입된 실행기를 사용한다. 모든 실제
실행은 `spawnCli`를 통한다.

다음을 실행한다.

```bash
yarn workspace @ogham/agent-artifacts test:run mcp
yarn workspace @ogham/agent-artifacts typecheck
```

예상 결과: 실제 사용자 구성을 건드리지 않고 네 가지 호스트/범위 어댑터가
모두 통과한다.

## 작업 12 — Cennad의 Codex 사용자 MCP 프로비저닝 마이그레이션

계약을 업데이트한다.

- `plugins/cennad/src/core/youtubeMcp/INTENT.md`

다음을 업데이트한다.

- `plugins/cennad/package.json`
- `plugins/cennad/src/core/youtubeMcp/operations/provisionYoutube.ts`
- `plugins/cennad/src/core/youtubeMcp/operations/provisionCodex.ts`
- `plugins/cennad/src/core/youtubeMcp/operations/provisionResult.ts`
- `plugins/cennad/src/core/youtubeMcp/operations/__tests__/provisionCodex.test.ts`

`resolveUserMcpTarget({ host: "codex" })`와 `createMcpServerManager`를
직접 조합하여 rules/instructions manager를 import graph에 넣지 않는다.
`agent-artifacts`가 측정된 Antigravity 계약을 갖출 때까지 Antigravity
어댑터를 Cennad에 남겨 둔다.

다음을 실행한다.

```bash
yarn workspace @ogham/cennad test:run provisionCodex
yarn workspace @ogham/cennad typecheck
```

예상 결과: 기존 프로비저닝 요약 및 로깅/저하 처리 동작이 변경되지 않는다.

## 작업 12 후속 — 훅 목적별 import graph 분리

훅은 tree-shaking 결과가 아니라 esbuild 입력 graph 자체에서 사용하지 않는
manager·filesystem·spawn 코드를 제외한다.

- rules: `rules/status`, `rules/presence`, `rules/presence/trusted`
- instructions: `instructions/hook/status`, `instructions/hook/apply`
- targets: project/user와 rules/instructions/mcp 조합별 직접 resolver
- cross-platform: `filesystem/read/*`, `paths/*`, `compat/*`,
  `host-registry/runtime|descriptor|hosts`, `error-log/path|write`,
  `self-probe/hook`

기존 aggregate API는 호환용으로 유지한다. Filid, Maencof, Cennad의
`buildHooks`는 metafile 입력 graph를 검사해 목적 밖 모듈 재유입 시 실패한다.
기존 훅 byte cap은 올리지 않는다.

Codex rules 상태는 두 사실을 함께 보존한다.

- stored facts: canonical/legacy 후보 어디엔가 존재하는지와 drift; UI 선택 및
  relocation 계획에 사용
- active facts: effective instruction file에서 실제로 읽히는 target/source/hash;
  훅의 Active rules 표시에 사용

가려진 규칙은 stored이지만 active가 아니며, UI는 선택과 drift를 잃지 않은 채
effective target으로 relocation을 계획한다.

## 작업 13 — 저장소 검증

먼저 패키지별 검사를 실행한다.

```bash
yarn workspace @ogham/cross-platform test:run
yarn workspace @ogham/agent-artifacts test:run
yarn workspace @ogham/filid test:run
yarn workspace @ogham/seiri test:run
yarn workspace @ogham/maencof test:run
yarn workspace @ogham/cennad test:run
```

그런 다음 다음을 실행한다.

```bash
yarn typecheck
yarn lint
yarn plugin:adapters:check
yarn test:run
```

아키텍처 검사:

```bash
rg -n "from ['\"]node:(fs|path|os|child_process)" shared/agent-artifacts/src
rg -n "ruleDocsTarget\\(" plugins/filid plugins/seiri
rg -n "\\.claude/rules/" plugins/seiri/src plugins/filid/src
```

예상 결과:

- 첫 번째 명령은 프로덕션 소스와 일치하는 항목이 없다.
- 두 번째 명령은 Filid/Seiri와 일치하는 항목이 없다.
- 세 번째 명령은 픽스처, 호환성 텍스트, 호스트별 테스트만 포함하고 대상
  결정은 절대 포함하지 않는다.

마지막으로 Filid를 실행한다.

```text
/filid:scan
```

예상 결과: 새로운 오류나 경고가 없다. 의존성 간선을 수동으로 추적한다.

```text
plugins -> agent-artifacts -> cross-platform
```

역방향 간선은 존재해서는 안 된다.
