# cross-platform Public Contract

## Requirements

- 모든 파일·경로·CLI 시스템 호출은 상위 공유 패키지가 재사용할 수 있는
  이름 있는 루트 API로 제공한다.
- 사용자 상태 루트는 호출자가 선택한 임의 경로가 아니라 명시적 host와
  `CLAUDE_CONFIG_DIR`/`CODEX_HOME` 환경 계약으로만 해석한다.
- 프로젝트 출력 경로는 절대 루트, lexical containment, 기존 descendant
  symlink 검사를 통과해야 한다.
- 파일 교체는 sibling 임시 파일을 사용하고, 동시 변경 적용은 owner-token
  lock과 호출자 리비전 검사로 보호할 수 있어야 한다.
- ENOENT만 정상적인 부재로 취급하고 그 밖의 파일 시스템 오류는 보존한다.
- 공식 Codex patch 입력은 모든 파일 연산을 보존하며 불완전한 parse를 성공으로 축소하지 않는다.

## API Contracts

### Host registry

```ts
resolveRuntimeHost(
  env: Readonly<Record<string, string | undefined>>,
): Host;
```

미인식 marker 또는 서로 충돌하는 훅 신호는 `unknown`이며 Claude로 추측하지
않는다.

### Codex hook normalization

`normalizeCodexToolUses`는 원래 물리 호출과 입력 순서의 non-empty 논리 도구 호출을 함께 반환한다. add/update/delete는 `Write`/`Edit`/`Delete`가 되며, command나 section 하나라도 불완전하면 연산 prefix 대신 명시적 실패가 반환된다. 다른 tool name은 patch-looking command가 있어도 해석하지 않는다.

### Paths

```ts
hostStateRoot(
  host: KnownHost,
  env?: Readonly<Record<string, string | undefined>>,
): string;
resolveContainedPath(root: string, ...segments: string[]): string;
```

`resolveContainedPath`는 절대 root만 받고 절대 segment, `..` component,
다른 drive 및 root 밖 결과를 거부한다.

모든 소비자는 패키지 루트를 사용한다. `sideEffects: false`와 이름 있는 구체
파일 재노출이 비기여 경로 연산을 번들에서 제거한다.

### Host paths

```ts
requireAbsoluteRoot(value: string): string;
```

POSIX와 Windows 절대 경로 문자열을 현재 실행 OS와 무관하게 정규화한다.

### Config scope

```ts
type ConfigScope = "user" | "project";

resolveConfigLayers(options: {
  pluginName: string;
  projectRoot: string | null;
  fileName?: string;
  projectDirName?: string;
  userDir?: string;
}): ConfigLayerPaths;
readConfigLayers(paths: ConfigLayerPaths): ConfigLayerDocuments;
writeConfigLayer(
  paths: ConfigLayerPaths,
  scope: ConfigScope,
  document: Record<string, unknown>,
  options?: { fileMode?: number; directoryMode?: number },
): string;
buildConfigScopeState(paths: ConfigLayerPaths): ConfigScopeState;

mergeConfigLayers(
  base: Record<string, unknown> | null,
  override: Record<string, unknown> | null,
): Record<string, unknown>;
listOverriddenPaths(
  override: Record<string, unknown> | null,
): readonly string[];
clearConfigPaths(
  source: Record<string, unknown>,
  paths: readonly string[],
): Record<string, unknown>;
```

`FORBIDDEN_KEYS`, `isPlainObject`, `stripForbiddenKeys`, `paths` facade는 루트
계약에서 뺐다. 앞의 셋은 `./config-scope/merge` 하위 주소로만 닿던 병합 하위
단계이고, `mergeConfigLayers`와 `writeConfigLayer`가 이미 그 단계를 적용한다.
`paths`는 같은 경로 함수 8개를 묶은 두 번째 주소라, import 하면 개별 함수 81 B
대신 8개 전부인 3,007 B를 retain 한다. 네 심볼 모두 파일은 그대로 두고 루트
재수출만 멈춘다 — 패키지 내부 소비는 계속 concrete 파일을 쓴다.

user 레이어는 `pluginCache(pluginName)` 아래의 설정 파일, project 레이어는
`<projectRoot>/.<pluginName>/config.json`이며 project가 user를 재정의한다.

레이어 읽기는 throw하지 않는다. 부재와 손상은 모두 `null`이고 손상만
`warnings`를 남긴다. project 레이어 쓰기 요청인데 경로가 `null`이면 던진다 —
조용히 user에 쓰지 않는다.

병합은 재귀이며 배열·원시값·`null`은 override가 **통째로** 교체한다. 배열을
인덱스 단위로 병합하지 않으므로 project 레이어가 목록을 줄일 수 있다. 병합은
입력 둘 다 변형하지 않고 새 객체를 반환한다. 다만 얕은 복사라 override가
건드리지 않은 중첩 객체는 base와 참조를 공유한다.

병합은 `__proto__` / `constructor` / `prototype` 키를 버린다. 입력이 디스크의
JSON이고 `JSON.parse`가 `__proto__`를 own key로 만들기 때문에 실제 벡터다.

`writeConfigLayer`도 쓰기 전에 같은 키를 턴다(`stripForbiddenKeys`). 한번 파일에
들어가면 정상 경로로는 빠져나올 길이 없기 때문이다 — 병합은 매번 버리고, 설정
페이지는 자기가 아는 키만 보내며, 저장된 문서를 펴서 되쓰는 저장 경로는 오히려
그 키를 보존한다. 두 함수의 재귀 범위는 같다: plain object 안으로만 들어가고
배열은 건드리지 않는다.

읽기는 정화하지 않는다. 레이어 원문을 그대로 노출하고 해당 키를 발견하면
`warnings`에만 남긴다 — 손편집으로 들어온 키를 UI가 감추면 "파일에는 있는데 왜
안 먹지"의 답이 사라진다.

레이어 각각은 스키마 검증하지 않는다. 병합 결과 하나만 소비자의 스키마로
검증한다. project 레이어는 재정의된 키만 담은 부분 문서라 단독으로는 strict
스키마를 통과할 수 없다.

`projectRoot` 해석은 호출자 책임이다. 앵커 규칙이 플러그인마다 다르므로
(git root / repo root / 인자 cwd) 해석된 절대 경로를 넘긴다.

설정 병합 구현은 node 내장을 import하지 않는다. 브라우저 설정 페이지 번들과
훅 번들의 공용 경계이며, `src/configScope/merge/__tests__/pureImports.test.ts`가 이를 강제한다.
소비자는 다른 공개 함수와 마찬가지로 패키지 루트에서 가져온다.

### 설정 페이지 계약

두 네임스페이스를 구분해 편집하는 화면은 각 플러그인이 자기 페이지에서
구현한다. 공유 UI 패키지를 두지 않으므로 **이 절이 7곳의 정본**이고,
`plugins/deilen/src/mcp/pages/settings/`가 참조 구현이다.

```
GET  /api/config
  → { ok: true, state: ConfigScopeState }

POST /api/config
  body { scope: "user" | "project", config: Record<string, unknown> }
  → { ok: true, state: ConfigScopeState } | { ok: false, message, errors? }
```

`scope: "user"`는 전체 필드를 담은 완결 문서를 보낸다. `scope: "project"`는
재정의된 키만 담으며, 키를 빼는 것이 곧 재정의 해제다 — 별도 clear 라우트를
두지 않는다. 응답은 항상 갱신된 상태를 돌려줘 클라이언트가 재조회 없이 배지를
다시 그린다.

저장 검증은 제출 레이어를 저장된 반대편 레이어 위에 병합한 미리보기 결과를
소비자 스키마로 확인하고, 통과할 때만 파일을 쓴다.

스코프 토글은 페이지 헤더의 브레드크럼 세 번째 마디에 둔다 —
`<플러그인> / settings / User Project`. 선택은 밑줄로 표시하고 채도로 표시하지
않는다. 라디오 `<input>`은 DOM에 남기고 시각적으로만 감춘다 — 화살표 키 탐색과
radiogroup 시맨틱이 거기서 나온다.

선택된 레이어가 무엇을 뜻하는지와 그 절대 경로는 헤더 마지막에 **두 줄**로
둔다(`.scope-hint__meaning` · `.scope-hint__path`). 한 줄에 좌우로 벌리면 절대
경로가 대개 접혀 오른쪽 정렬이 도리어 어그러진다.

토글을 옮기면 폼은 그 레이어의 값으로 **다시 채워진다**. `user`는 user 레이어
단독을 그 플러그인의 기본값 위에 얹은 문서를, `project`는 effective(project를
user 위에 병합한 결과)를 보여준다. project에서 그 레이어가 말하지 않은 필드는
상속된 유효값이 앉고 출처는 `data-scope-state`가 말한다 — 기본값으로 되돌리면
전체 문서를 쓰는 페이지에서 user 설정이 기본값으로 덮인다.

병합은 서버가 한다. 페이지는 서버가 준 두 문서 중 **고르기만** 한다 — 레이어
원문을 페이지가 합치면 스키마를 모르는 쪽이 무엇을 이길지 정하게 된다. 스키마를
가진 서버가 레이어마다 정규화해 `configByScope: { user, project }`로 실어 보내는
것이 기본이고, `deilen`처럼 번들되어 기본값을 스스로 아는 페이지는
`ConfigScopeState`의 `layers.user`와 `effective`를 그대로 골라 쓴다. 어느 쪽이든
저장 문서도 **고른 그 문서에서 출발한다** — 병합 결과에서 출발하면 user 저장이
project의 재정의를 user 파일에 구워 넣는다. 떠나는 레이어의 미저장 편집은
따라오지 않는다.

`seiri`는 세 번째 형태다. 편집 대상이 한 키짜리 다이얼이라 병합할 문서가 없고,
서버가 `effective` 없는 자체 스냅샷을 실어 보내면 페이지가
`layers[scope] ?? layers.user ?? 기본 다이얼` 순으로 유효값을 정한다. 값 하나에
레이어를 합치는 단계를 두는 것이 오히려 군더더기라 택한 형태이며, "페이지가
레이어 원문을 합치지 않는다"는 위 규칙은 그대로 지킨다 — 고르는 것은 문서가
아니라 이미 정규화된 값 하나다.

`filid`와 `seiri`에서는 이 토글이 config 파일뿐 아니라 **규칙 문서가 배포되는
채널**까지 정한다. user는 호스트 상태 루트(`~/.claude/rules/`), project는 저장소
채널이다. 규칙이 한 곳에만 존재해야 호스트가 같은 규칙을 두 번 읽지 않으므로,
저장은 선택한 레이어에 **먼저 쓴 뒤** 반대편의 소유 문서를 거둬들인다 — 순서가
뒤집히면 중간 실패가 어느 레이어에도 규칙이 없는 상태를 남긴다. 거둬들일 목록은
저장 전에 보여준다.

설정 페이지는 두 형태 중 하나다. 어느 쪽이든 스코프 토글은 반드시 있다.

**A. 문서 단위** — 페이지가 레이어 하나의 문서 전체를 편집한다
(`atlassian`, `cennad`, `entrez`, `imbas`). 필드별 재정의 개념이 없으므로
토글과 경로 힌트만 둔다.

| 요소        | 규약                                                    |
| ----------- | ------------------------------------------------------- |
| 스코프 토글 | `<input name="config_scope" value="user" \| "project">` |
| 경로 힌트   | 뜻과 절대 경로를 두 줄로 표시                           |

**B. 필드 단위** — project 레이어가 부분 문서이고 필드마다 재정의를 켜고 끈다
(`deilen`, `filid`, `seiri`). 위에 더해:

| 요소           | 규약                                                                |
| -------------- | ------------------------------------------------------------------- |
| 필드 식별      | 소유 요소에 `data-config-path="renderers.mermaid"` (dot path)       |
| 상속 상태      | 같은 요소에 `data-scope-state="inherited" \| "overridden" \| "own"` |
| 배지·해제 버튼 | 표시 여부는 CSS가 `[data-scope-state=...]`로 결정                   |

해제 버튼은 project 레이어가 **부분 문서**인 곳에만 둔다. 키를 빼는 것이 곧
해제이기 때문이다. project 레이어가 커밋된 단일 결정인 곳(`seiri`, `filid`)은
배지만 두고 해제는 git 작업으로 남긴다 — 팀이 소유한 파일을 설정 클릭으로
지우게 하는 것이 잘못된 affordance다.

`data-config-path`의 세밀도는 페이지가 정한다. `deilen`은 필드마다, `filid`는
config를 소유한 섹션마다 붙이고 배지는 prefix로 판정한다 — 깊게 중첩된 config를
필드마다 쪼개는 비용이 그 값어치를 하지 않는 경우다.

`paths.project`가 `null`이면 Project 라디오는 `disabled`이고 이유를 한 줄
표시한다.

### Filesystem and hook helpers

```ts
readUtf8FileIfExistsSync(path: string): string | null;
readFileIfExistsSync(path: string): Uint8Array | null;
listDirectoryIfExistsSync(path: string): readonly string[];
canonicalizeTargetPathSync(
  cwd: string,
  targetPath: string,
  options?: { preserveTerminalEntry?: boolean },
): string;
ensureDirectorySync(path: string, options?: { mode?: number }): void;
removeFileIfExistsSync(path: string): boolean;
writeFileAtomicallySync(
  path: string,
  content: string | Uint8Array,
  options?: { fileMode?: number; directoryMode?: number },
): void;
assertNoSymlinkDescendantsSync(root: string, targetPath: string): void;
withFileLockSync<T>(
  targetPath: string,
  operation: () => T,
  options?: { timeoutMs?: number; staleMs?: number },
): { acquired: true; value: T } | { acquired: false };
```

원자 쓰기는 지정 mode가 없으면 기존 파일 mode를 보존한다. 잠금 timeout은
operation을 호출하지 않고 `acquired: false`를 반환한다. stale lock은 고유
quarantine 이름으로 atomic rename한 프로세스만 정리하며 owner token이
일치하는 소유자만 live lock을 해제한다.

`assertNoSymlinkDescendantsSync`는 신뢰 경계인 `root` 자체가 아니라
`root`부터 `targetPath`까지 이미 존재하는 descendant segment를 검사한다.
`canonicalizeTargetPathSync`는 가장 가까운 기존 ancestor를 host `realpath`로
해석하고 suffix를 붙이며, referent가 아직 없는 기존 symlink도 target을 따라간다.
반복 link는 `ELOOP`로 종료한다. terminal entry 보존 옵션은 unlink가 제거할 마지막
directory entry를 역참조하지 않으면서 symlink ancestor와 case alias를 숨기지 않는다.

제한 훅도 패키지 루트에서 필요한 읽기·쓰기·host·section·error-log·portable
경로 심볼만 import한다. 이름 있는 구체 파일 재노출과 `sideEffects: false`가
나머지 구현을 출력에서 제거하며, 번들 바이트 캡과 출력 금지 패턴이 회귀를
검출한다. 일반 UTF-8 write와 sibling copy는 기존 hook 동작을 보존하고, 범용
artifact apply는 계속 atomic write와 lock을 사용한다.

`logHookFailure`의 파일 I/O는 best-effort이며 기록 실패를 호출 훅에 던지지
않는다.

`selfProbeHook`은 SessionStart의 node/git/PATH/plugin root 진단 의미를
유지하면서 Node builtin만 사용한다. tree-shaken 출력에는 범용 `spawnCli`,
`cross-spawn`, executable discovery가 포함되지 않는다.

## Acceptance Criteria

### CP-CODEX-BATCH — Complete hook boundary

- multi-file patch의 모든 target은 순서대로 소비 guard에 전달될 수 있다.
- malformed patch와 아직 destination을 판정하지 못하는 move patch는 성공한 빈 입력이 아니다.
- Claude `Write`/`Edit` identity와 기존 단일 파일·Bash read 의미는 유지된다.

## History

2026-08-23 — 첫 파일만 정규화하던 측정 기반 가정을 폐기했다. 하나의 patch 안에서 뒤쪽 target이 경계를 우회할 수 있으므로 전체 순서 보존과 보수적 parse 실패를 공개 계약으로 정했다.

2026-07-30 — 공개 주소를 패키지 루트 하나와 agy runner 빌드 진입점으로
통합했다. `sideEffects: false`와 출력 번들 가드가 목적별 subpath의 격리 역할을
대신한다.

2026-07-29 — user/project 두 네임스페이스를 병합해 읽는 `config-scope` 추가.
설정 페이지가 계층마다 폼을 다시 앉히도록 `configByScope` 규약을 함께 정했다.
병합을 서버가 전담하는 쪽을 택한 이유는, 런타임과 설정 페이지가 각자 합치면
"보이는 값"과 "먹는 값"이 갈라지기 때문이다.

2026-07-26 — agent artifact 프리미티브와 hook용 목적별 entry point 추가.
훅 번들이 aggregate 진입점을 잡으면 재노출 그래프를 통째로 끌어오므로,
목적별 subpath를 따로 냈다.

## Last Updated

2026-09-05 — 기존 target canonicalization의 missing symlink referent 해석과 반복 link 종료를 명시했다.
