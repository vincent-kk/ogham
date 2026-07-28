# configLoader — Filid 1.0 Contract

## Requirements

- `.filid/config.json` schema version은 `2.0`이며 문서 출력 언어, adapter 선택, rule override와 언어 중립 구조 옵션을 관리한다.
- `language`는 문서 출력 언어일 뿐 프로그래밍 언어 선택값이 아니다.
- adapter mode `auto`는 등록 adapter claim을 사용하고 `explicit`은 `enabled` ID만 사용한다. explicit의 빈 목록과 미등록 ID는 validation finding이다.
- v1 config는 메모리에서 v2로 변환하고 `config-migration-required`와 제거된 key 진단을 반환한다. 사용자가 settings 저장을 승인하기 전에는 파일을 쓰지 않는다.
- 기존 organ, depth, allowed peer와 entry point 설정은 대응하는 v2 필드로 옮긴다. naming, route, complexity, promotion 설정은 진단 후 버린다.
- config discovery는 git/project root를 기준으로 하며 plugin 설치 경로를 project fallback으로 사용하지 않는다.
- managed rule 문서는 host가 실제로 읽는 target을 `@ogham/agent-artifacts`로 동기화하고 Filid owner 주소 밖의 내용을 보존한다.
- rule 문서 배포 레이어는 config 레이어와 같은 축이다. `project`는 `<gitRoot>` 채널에, `user`는 호스트 상태 루트(`~/.claude/rules/`)에 쓴다. 레이어를 지정하지 않은 호출은 `project`로 해석한다.
- 레이어를 명시한 sync는 선택한 레이어에 먼저 쓴 다음 반대편 레이어의 `filid_` 소유 문서를 회수한다. 순서가 뒤집히면 중간 실패가 규칙이 어느 레이어에도 없는 상태를 남긴다. 레이어를 명시하지 않은 호출은 배치를 결정한 적이 없으므로 반대편을 건드리지 않는다.
- required rule drift는 복구하고 optional rule drift는 명시적 resync에서만 덮어쓴다.
- template 또는 plugin root를 읽지 못하면 throw 대신 진단과 skipped 상태로 저하한다.

## API Contracts

```ts
interface FilidConfigV2 {
  version: '2.0';
  language?: string;
  adapters: { mode: 'auto' | 'explicit'; enabled: string[] };
  rules: Record<string, RuleOverride>;
  structure?: {
    maxDepth?: number;
    additionalOrganNames?: string[];
    additionalAllowedPeers?: AllowedPeerOverride[];
    entryPointOverrides?: Record<string, string[]>;
  };
}
```

- `loadConfig(projectRoot)` — v2 config 또는 in-memory migrated v1, warnings와 diagnostics를 반환한다.
- `migrateConfigV1(input)` — source를 쓰지 않고 대응 필드와 discarded key 목록을 반환한다.
- `createDefaultConfig(language?, adapterIds?)` — 15개 built-in rule을 roster 기본 severity 그대로 실은 v2 config를 auto adapter mode로 만든다. severity 정본은 `constants/builtinRuleSeverities`이며 이 함수는 그것을 옮겨 적을 뿐이다.
- `initProject(projectRoot, options)` — 부재한 config만 생성하며 기존 파일을 덮어쓰지 않는다.
- `syncRuleDocs(projectRoot, selection, options)` — `options.scope`가 정한 레이어의 managed rule channel을 동기화하고, 회수한 반대편 문서를 `result.otherScope`로 보고한다.
- `getRuleDocsStatus(projectRoot, pluginRoot?)` — mutation 없이 project 레이어의 active host target 상태를 반환한다. 레이어 인자를 아직 받지 않으므로 `user`로 저장한 뒤의 상태 조회는 project 채널을 본다.
- `loadRuleDocsManifest(pluginRoot)` / `resolvePluginRoot(pluginRoot?)` — canonical manifest와 설치 root를 해석한다.

## Acceptance Criteria

### AC-config-v2 — schema 2.0

- auto/explicit adapter 선택과 structure option을 round-trip한다.
- explicit empty와 unknown adapter ID는 성공 설정으로 처리되지 않는다.

### AC-config-migration — 비파괴 migration

- v1 대응 필드는 v2 memory value로 보존되고 제거된 key마다 진단이 있다.
- load만으로 config 파일의 byte content가 바뀌지 않는다.

### AC-config-roots — root 격리

- nested project와 worktree에서 project config를 찾고 plugin cache/config를 project로 오인하지 않는다.

### AC-rule-docs — managed 문서

- build hash와 active host 배포 상태가 일치하며 owner marker 밖 사용자 내용은 보존된다.
- template/root read failure는 예외 대신 진단 가능한 저하 결과다.
- manifest는 4개 rule 문서를 선언하고 전부 `required`다 — filid 규칙은 부분 채택 대상이 아니므로 optional 엔트리가 없고, 체크박스 UI에는 아무것도 렌더되지 않는다.
- manifest 엔트리는 `legacyFilename`을 선언하지 않는다. 접두사 이전 이름 `fca.md`는 오래전에 은퇴해 더 이상 승계 대상이 아니다.
- manifest에서 사라진 구 문서 `filid_fca-policy.md`는 `filid_` 접두사 기반 owned orphan 스윕이 회수한다. 별도의 마이그레이션 경로를 두지 않는다.

### AC-rule-docs-scope — 배포 레이어

- `scope: 'user'`는 호스트 상태 루트 아래로, `scope: 'project'`는 `<gitRoot>/.claude/rules`로 해석한다. 인자를 생략한 해석은 `project`와 같은 값이다.
- 레이어를 바꿔 저장하면 문서는 새 레이어에만 남고, 회수한 파일명이 `result.otherScope`에 실린다. 회수할 것이 없으면 필드 자체가 없다.
- 반대편 회수는 `filid_` 소유 주소만 건드린다. 같은 디렉터리의 다른 owner 문서는 살아남는다.
- 레이어를 명시하지 않은 sync 뒤에도 반대편 레이어의 문서는 그대로다.

## Boundary Exemptions

### loaders — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`, `**/__tests__/**`
- **Direct import**: allowed
- **Reason**: 훅 번들은 배럴을 import할 수 없다 — esbuild 가 배럴이 재노출하는 모듈 전체를 번들로 끌어오고, `scripts/buildHooks.mjs` 의 바이트 캡이 이를 빌드 실패로 막는다.

## History

- 2026-07-28 — `createDefaultConfig`가 자체 severity 집합을 버리고 rule roster와 같은 `constants/builtinRuleSeverities` 정본을 읽는다.

## Last Updated

2026-07-29 — rule 문서 배포 레이어를 config 레이어와 같은 축으로 묶었다. 설정 페이지 토글이 이미 결정하는 값을 그대로 흘려보내면 사용자가 같은 질문에 두 번 답하지 않는다.
