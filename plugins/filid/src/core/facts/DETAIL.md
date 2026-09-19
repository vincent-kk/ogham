# facts — Contract

## Requirements

- 사실은 에이전트가 제출한다. 이 fractal은 코드를 해석하지 않고 검사할 수 있는 성질만 본다: hash 결속, 문자열 존재, 해석 경로의 유효성.
- 파일마다 레코드 하나이고 제출은 교체다. 합집합·충돌·투표·분쟁 상태는 없고, 레코드를 지우는 동작도 없다.
- 레코드는 두 조건이 함께 맞을 때 유효하다. 구문 유효는 레코드의 `contentHash`가 현재 byte와 같다는 것이고, 해석 유효는 레코드가 받아들여진 epoch가 현재 epoch와 같다는 것이다.
- `resolutionEpoch`는 스캔된 경로 목록과 **프로젝트 기본 해석 입력**(manifest·lockfile basename 패턴에 걸린 스캔 경로)의 내용으로만 만든다. 소스 파일의 내용은 들어가지 않는다 — 본문만 바뀌면 해석은 그대로 맞고, 파일이 늘거나 줄거나 옮겨지면 형제 이름 하나로 같은 specifier의 정답이 바뀌므로 모든 레코드의 해석이 한꺼번에 무효가 된다.
- 레코드가 선언한 `provenance.resolutionInputs`는 epoch에 **들어가지 않고 그 레코드 자신을 묶는다**. 제출 시 선언된 입력마다 현재 hash가 선언된 값과 같아야 하고(아니면 그 레코드 거부), 분류 시 달라졌거나 읽을 수 없으면 그 레코드의 파일이 `needs-resolution`이다. 선언 입력은 프로젝트 밖을 가리킬 수 있다.
- epoch digest는 원소마다 길이를 붙여 먹인다. 구분자만 쓰면 `"a\0b"` 한 개와 `"a"`,`"b"` 두 개가 같은 digest가 된다.
- 레코드는 경로 digest 앞 2 hex로 나눈 shard 파일에 모여 있다. 쓰기는 원자적 치환과 `(shard, 이전 byte digest)`의 compare-and-set이며, **CAS 단위는 레코드가 아니라 shard**다. 스키마를 벗어난 **항목 하나**는 그 파일만 `missing`으로 읽히고 shard는 그대로 다시 쓸 수 있다. shard의 JSON 자체가 깨지면 그 shard의 항목 전부가 `missing`이 되고, shard digest가 CAS token으로 남아 재제출로 복구된다.
- 제출 파일은 절대 경로이고, **정규화한 실제 위치**가 프로젝트 트리 밖이며, 일반 파일이고 크기 상한 안이어야 한다. 경로는 비교·검사·열기 전에 모두 정규화하므로 프로젝트 밖으로 이어지는 symlink는 통과하고 안으로 이어지는 symlink는 거절된다.
- **서버가 여는 모든 경로는 먼저 정규화하고 그 다음에 연다.** 제출 파일과 해석 입력에 같은 규칙이 적용된다. 정규화하지 않으면 ancestor symlink 검사가 파일시스템 루트부터 걷기 때문에, macOS `/tmp`·`/var` 아래의 프로젝트나 `node_modules`의 workspace 링크처럼 흔한 배치가 통째로 거절된다. 해석 입력에서 그 거절은 최악이다 — 영구히 `null`로 읽혀 manifest를 고쳐도 epoch가 움직이지 않고 레코드가 낡은 해석 위에서 `exact`로 남는다. 제출 파일에는 정규화 뒤 containment를 보고, 해석 입력에는 보지 않는다(스펙 §2.2가 프로젝트 밖 입력을 허용하고 서버는 hash만 한다).
- 서버가 여는 모든 파일은 `O_NONBLOCK`으로 연다. FIFO나 문자 장치를 이것 없이 열면 서버가 영원히 멈춘다 — 서버는 모든 도구와 모든 프로젝트를 하나의 동기 프로세스로 섬긴다. 열린 뒤 `fstat`으로 일반 파일과 크기를 확인한다. **제출 파일, 레코드가 선언한 해석 입력, 그리고 레코드의 `path`가 가리키는 프로젝트 소스 파일 셋 다** 이 한 통로를 지난다 — 에이전트가 준 경로가 보호되지 않은 읽기에 닿는 지점은 없다. 소스 파일에는 프로젝트 **안** containment를 함께 본다(해석 입력에는 보지 않는다).
- `O_NOFOLLOW`·`O_NONBLOCK`은 Windows의 `fs.constants`에 없어 각각 0이 되어 OR에서 빠진다. `O_NONBLOCK`의 부재는 무해하다(막는 대상이 POSIX FIFO다). `O_NOFOLLOW`의 부재는 아니므로, 그 플래그가 없는 플랫폼에서는 마지막 구성요소를 먼저 `lstat`해 symlink면 거절한다. 원자적이지 않아서 규칙이 아니라 대체 수단이고, 종류·크기 판정은 여전히 열린 fd의 `fstat`이 한다 — 그 사이의 교체는 거절을 낳을 뿐 일반 파일 아닌 것을 읽게 만들지 못한다.
- 응답에는 제출 파일의 byte도, JSON parser나 schema validator의 원문 메시지도 싣지 않는다.
- 서버는 어떤 명령도 실행하지 않는다.

## API Contracts

- `listScannedFilePaths`와 `scanFileSetOptions`는 이 fractal이 소유하지 않는다. `core/tree/fractalTree`의 entry point에서 가져온다 — 규칙의 정본을 scan 쪽에 한 벌만 두기 위해서다.
- `computeResolutionEpoch(projectRoot, scannedPaths, resolutionInputPaths): ResolutionEpochSnapshot` — epoch와 그것을 만든 입력을 함께 돌려준다.
- `diffEpochSnapshots(previous, current): EpochDifference` — `added`·`removed`·바뀐 해석 입력. `previous`가 null이면 셋 다 빈 목록이며 추측하지 않는다.
- `resolveFactsScope(config): FactsScope` — `facts.covers`가 없으면 `declared: false`이고 모든 경로가 범위 밖이다.
- `readFactsStore(directory)` / `writeFactsShardFile(directory, shardFileName, entries, expectedDigest)` — 레코드 key는 프로젝트 상대 경로의 digest다. 경로에서 이름을 직접 만들면 구분자와 길이 한계가 그대로 조작면이 된다.
- `createDeclaredInputHasher(projectRoot)` — 호출당 memo. 저장소 전체 배치는 같은 manifest를 수천 번 선언한다.
- `readSubmissionFile(projectRoot, filePath)` · `parseSubmittedRecords(entries)` — 신뢰 경계. 전자는 거부 사유만, 후자는 JSON pointer만 돌려준다.
- `validateFactsRecord(context, facts, pointer): FactsValidationResult` — 레코드 단위 거부와 참조 단위 거부를 구분한다.
- `classifyFactsFile(evidence, currentEpoch)` · `selectUnknownFiles(states)` — 순수 함수.
- `recordEpochDrift(path, newEpoch | null)` — 연속으로 서로 다른 새 epoch를 통보한 횟수. 성공한 제출이 초기화한다.

## Design Decisions

- **스키마는 모든 층에서 `strict`다.** 모르는 key를 조용히 버리면 철자가 틀린 `resolved`가 신호 없이 그래프를 좁힌다 — §2.4가 금지하는 조용한 축소다. 거부는 JSON pointer를 주므로 고칠 수 있고, 앞으로의 필드 추가는 `schemaVersion`이 맡는다.
- **schema 검사는 문서 전체가 아니라 항목마다 한다.** 레코드 하나가 틀렸다고 저장소 전체 배치를 버리면 다음 행동이 수천 개의 멀쩡한 레코드까지 덮어 P5를 어긴다.
- **`line`은 거부 사유가 아니다.** 문자열이 파일에 있으면 참조는 남고, 보고된 줄에 없을 때만 `line`을 비우고 모든 출현 줄을 `candidateLines`에 담는다. `line`과 `candidateLines`는 받아들인 뒤 서버 소유이므로 제출값을 믿지 않고 다시 쓴다.
- **epoch 흔들림 계수는 프로젝트별로 디스크에 남긴다.** `submit`에 actor가 없어 서버가 호출자를 식별할 방법이 없으므로 프로젝트가 정직한 단위다. 서버 메모리에 두면 세션마다 일어나는 MCP 재시작이 무한 재시도를 막는 장치를 조용히 초기화한다.
- **레코드 선언 입력은 epoch에서 뺐다.** 넣어 두면 레코드를 받아들이는 것이 다음 epoch를 움직여, 분할 제출의 두 번째 배치가 첫 배치가 옮긴 epoch에 거부된다. 세 번 반복하면 `facts-tree-unstable`이 되고 그 다음 행동은 거짓이다(트리는 움직이지 않았다). 레코드마다 자기 선언을 검사하면 같은 보장을 유지하면서 무효화 범위도 그 파일을 선언한 레코드로 좁아진다.
- **기본 해석 입력 목록은 상수 한 벌이다.** conventions pack(§7)이 이 자료의 정본이 될 자리이고, pack을 만드는 것은 뒤 단계다. 그때 이 상수는 pack의 기본값으로 옮겨 간다.

## Declared Limits

- 공급자가 선언하지 않은 프로젝트 밖 입력, git이 무시하는 생성 파일, lockfile이 바뀌지 않은 `node_modules` 내부 변경은 epoch에 잡히지 않는다.
- 줄 단위로 묶인 판정은, 그 줄이 그대로인 채 다른 줄의 블록 주석 구분자가 사라져 주석이던 참조가 코드가 되는 경우를 놓친다.
- `kind`는 type-only import와 value import를 구분하지 않는다. 도구마다 type-only를 보고하는지가 달라 그 차이는 독립 비교에서만 드러난다.
- 한 도구가 체계적으로 빠뜨리는 참조는 그 도구만으로는 드러나지 않는다.

## Acceptance Criteria

### AC-facts-epoch — 해석은 경로 목록에 묶인다

- 파일 내용만 바뀌면 epoch는 그대로다.
- 파일이 추가·삭제되면 epoch가 달라지고 `added`·`removed`가 그 경로를 이름으로 든다.
- 해석 입력 파일의 내용이 바뀌면 epoch가 달라진다.

### AC-facts-acceptance — 검사 없이 받지 않는다

- `contentHash`가 현재 byte와 다른 레코드는 저장되지 않는다.
- 문자열이 파일에 없는 참조만 거부되고 그 레코드의 나머지는 저장된다.
- 프로젝트 밖으로 나가거나 symlink를 건너거나 디렉터리를 가리키는 `resolved.path`는 그 참조만 거부된다.
- 선언한 해석 입력이 선언된 hash와 다르면 그 레코드는 저장되지 않는다(`facts-resolution-input-stale`, 다음 행동은 재추출).
- 선언한 해석 입력을 서버가 아예 읽지 못하면(부재·일반 파일 아님·상한 초과·권한) 다른 코드로 거절한다(`facts-resolution-input-unreadable`). 재추출은 같은 거절을 재생산하므로 다음 행동이 다르다: 그 선언을 빼거나, 파일을 읽을 수 있게 하거나, 그 파일을 attested로 낸다(P5).
- 레코드의 `path`가 가리키는 소스 파일을 서버가 읽지 못하면 `facts-source-file-unreadable`이다. 다음 행동은 파일을 읽을 수 있게 만들거나 `facts.excludes`로 범위에서 빼는 것이다. 그런 파일은 구문 유효한 레코드를 가질 수 없어 `status`에서 `missing`으로 남고, 범위에서 빼면 `unsupported`가 된다.
- 검사를 통과했지만 스캔 목록에 없는 경로는 `external`로 저장되어 간선을 만들지 않는다.
- 범위 밖 파일의 레코드는 받지 않는다.

### AC-facts-boundary — 호출자가 준 경로

- 제출 파일은 정규화한 실제 위치로 판정한다: 프로젝트 안으로 이어지면 거절하고, symlink를 거쳐도 프로젝트 밖의 일반 파일이면 읽는다. 상한 초과, 일반 파일이 아닌 것, 호스트가 거부하는 경로는 읽지 않는다.
- JSON이 아닌 파일의 내용은 응답의 어느 필드에도 나타나지 않는다.
- 레코드의 `path`가 `../`로 탈출하거나 `resolved.path`가 symlink를 경유해 탈출하면 저장되지 않는다.

### AC-facts-state — 모르는 것은 원인 파일에 남는다

- 구문 유효한 레코드가 없으면 `missing`, epoch가 다르거나 선언 입력이 움직였으면 `needs-resolution`, `toolError`가 있으면 `tool-error`, `indeterminate` 참조나 거부된 참조가 있으면 `uncertain`이다.
- `unknownFiles`는 그 넷의 합집합이며 `unsupported`를 포함하지 않는다.

## Last Updated

2026-09-20 — 사실 저장소, epoch, 제출 검사와 파일 상태 모델의 최초 계약. 독립 검토를 반영해 epoch를 기본 입력으로 좁히고, 저장소를 shard로 나누고, 여는 모든 파일을 non-blocking으로 만들었다.
