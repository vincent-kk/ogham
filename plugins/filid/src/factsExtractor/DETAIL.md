# factsExtractor contract

## Requirements

- 입력은 프로젝트 루트(`--root`)와 파일 목록이다.
  - 목록은 위치 인자, `--files-from <path>`(줄 구분 또는 JSON 문자열 배열), `--files-from -`(stdin)로 받는다.
  - 목록이 없으면 사용 오류(종료 코드 2)다. 범위는 서버가 정한다: `facts status`의 `extractionList.path`를 `--files-from`으로 넘긴다.
  - `--part <i>/<n>`은 그 목록의 i번째 몫만 추출한다. 목록에서의 위치를 `n`으로 나눈 나머지가 `i-1`인 항목이 i번째 몫이다. 결정적이고, 몫들은 서로소이며 합치면 목록 전체다. 제출이 `facts-file-too-large`로 거부될 때 에이전트가 목록을 읽지 않고도 나눌 수 있게 하는 유일한 수단이다.
  - `i`와 `n`은 정수이고 `1 ≤ i ≤ n`이다. 그 밖은 사용 오류(종료 코드 2)다.
  - 사용 오류는 모두 `filid-facts: <이유>` 한 줄과 종료 코드 2로 끝나고 stack을 내지 않는다: 기존 디렉터리인 `--out`, 읽을 수 없는 `--files-from` 파일, 정규 파일이 아닌 `--files-from`(FIFO·장치 — 열기 전에 `stat`으로 거른다. 읽기가 끝나지 않거나 끝없이 읽히기 때문이다), 16 MiB를 넘는 `--files-from` 파일, 줄 목록도 문자열 배열도 아닌 JSON 목록, 30초 안에 끝나지 않은 stdin. stdin이 끝나지 않으면 읽은 부분으로 추출하지 않고 출력도 쓰지 않는다 — 반쪽 목록의 부분 제출은 나머지 파일을 옛 레코드로 남긴다.
  - 목록 읽기는 `utils/input/readListText.ts`가 맡고 거부를 `ExtractorUsageError`로 돌려준다. entry는 그것을 `refuse`로 넘긴다. stdin 제한 시간은 그 함수의 선택 인자(기본 30초)이고 CLI 인자나 환경 변수가 아니다.
- 출력 경로(`--out`)는 필수다. 경로 문자열로나 가장 가까운 기존 조상의 실제 위치로나 프로젝트 루트 안이면 거부한다(종료 코드 2). 트리 안의 미추적 파일은 서버의 경로 목록에 들어가 `resolutionEpoch`를 흔든다(스펙 §2.2). 같은 경로를 덮어쓰는 것은 허용한다.
- 입력 경로 처리
  - 루트 기준으로 해석한다.
  - 문자열이 루트 밖(`../`, 다른 절대 경로)이거나, symlink를 따라간 실제 위치가 루트의 실제 위치 밖이면 `outside-project`로 거부한다.
  - 없는 경로는 `missing`, 파일이 아닌 경로는 `not-a-file`로 거부한다.
  - 루트 안의 symlink를 지나는 경로(파일 link, 디렉터리 link)는 `symlink`로 거부한다. 서버의 scan이 symlink를 제외하기 때문이다.
  - 받아들인 경로는 실제 위치의 디스크 철자로 적는다. 대소문자만 다른 입력(`A.TS`와 `a.ts`)은 한 레코드가 된다.
  - 거부한 항목은 레코드가 되지 않고 요약의 `rejected`에 센다.
- 레코드는 `FileFacts` 형식이다(스펙 §2.1). adapter 값과의 대응은 task evidence `s3b-mapping.md`에 있다.
  - `path`는 프로젝트 상대 POSIX다.
  - `contentHash`는 `sha256:<hex>`다.
  - 모든 파일에 `references`, `entrySurface`, `verification`을 싣는다. role이 `unsupported`인 파일의 `verification`도 싣는다.
  - `sourceText`는 adapter가 specifier의 원문(구분자 포함)을 보고할 때만 싣는다. escape 때문에 `specifier`가 파일 byte에 없을 때다.
  - `resolved.path`도 프로젝트 상대 POSIX다. adapter가 root 밖 파일로 푼 참조는 패키지와 같은 "밖"으로 보고 `{ external: <specifier> }`로 싣는다. 프로젝트 루트가 분석의 경계이기 때문이다. 서버의 경로 봉쇄는 루트 밖 `path`를 언제나 거부하므로, `path`로 실으면 어떤 도구로 다시 제출해도 거부가 반복된다.
- 경계 예외는 소유 fractal이 선언한다: `adapters/ecmascript/DETAIL.md`의 `## Boundary Exemptions`가 이 프로그램을 소비자로 적고 직접 import하는 네 모듈을 나열한다.
- 하위 프로세스 불변식: 추출 프로그램은 어떤 프로세스도 띄우지 않는다. 빌드 가드(`scripts/factsExtractorBundle.mjs`)가 번들에서 강제하고, 같은 가드를 메모리 번들에 적용하는 단위 테스트가 있다.
  - 번들에 `node:child_process`·`child_process` import나 require가 없다.
  - `spawnSync(`·`spawn(`·`detached:`·`execFileSync`·`execSync(`·`spawnDetached`·`fork(`·`execFile(`·member 호출이 아닌 `exec(` 0회. `x.exec(`는 `RegExp.prototype.exec`와 철자가 같아 가리지 못한다.
  - 소스 import 방향 테스트는 bare specifier를 따라가지 않으므로 이 가드가 정본이다.
  - 출력은 `utils/paths/writeExtractionOutput.ts`가 쓴다. 공유 패키지의 `writeFileAtomicallySync`를 쓰면 패키지 루트를 통해 cross-spawn(CommonJS라 tree shaking되지 않는다)이 실려 오기 때문이다.
- 읽지 못한 파일은 레코드를 내지 않는다. 요약의 `unreadable`(개수)과 `unreadablePaths`(앞 20개)에 싣고 종료 코드는 0이다. 파일의 byte 없이 만든 레코드는 서버의 hash 결속에서 언제나 거부되어 같은 거부만 반복되기 때문이다.
- NUL byte가 있는 파일은 소스 텍스트가 아니다. adapter에 넘기지 않고 그 byte의 `contentHash`와 `toolError.message`(`binary content: …`)를 가진 레코드로 만든다(`references: []`, 다른 축 없음). adapter는 예외를 내지 않는 scanner라 그대로 두면 그런 파일도 `exact`가 된다.
- 읽었지만 adapter가 예외를 낸 파일은 그 byte의 `contentHash`와 `toolError.message`를 가진 레코드가 된다(`references: []`, 다른 축 없음). 메시지에서 그 파일과 루트는 프로젝트 상대 경로로, 나머지 절대 경로는 `<path>`로 바꾼다.
- 출력은 결정적이다.
  - 레코드는 `path` 순이고, 참조는 adapter의 소스 순서다.
  - 시각과 절대 경로를 싣지 않는다. `provenance.command`의 argv에서 루트는 `.`, 루트 안 경로는 상대 경로, 루트 밖 경로는 `<outside>`로 바꾼다. 대상은 절대 경로인 토큰과 `--root`·`--out`·`--files-from`의 값(`-` 제외)이고, 상대 경로인 값은 작업 디렉터리 기준으로 푼 뒤 같은 규칙을 적용한다. 위치 인자의 상대 경로는 루트 기준이라 그대로 둔다.
- `provenance.resolutionInputs`는 비어 있다. adapter의 해석은 후보 경로의 존재만 보고 설정 파일을 읽지 않는다.
- 선언된 한계: tsconfig `paths`나 package `exports`로 닿는 참조는 이 공급자가 보고하지 않는다. bare specifier는 참조로 내지 않는다(`resolved.external` 없음). 비-literal `import(x)`도 내지 않는다(`resolved.nonLiteral` 없음).
- 선언된 한계: 문법이 틀린 텍스트는 parse되지 않고 scan된다. 그 파일의 facts는 scanner가 읽어 낸 값이고 syntax error 신호를 싣지 않는다.
- 지금 코어는 루트 밖으로 풀린 같은 참조에 `unowned-local-dependency` 진단을 내고 그래프를 indeterminate로 둔다. S3c의 비교는 adapter 쪽의 루트 밖 resolved 경로도 `external`로 정규화한다. 그 차이(루트 밖 상대 import가 더는 분석을 막지 않음)는 선언된 동작 변화다.
- stdout에는 요약 JSON 한 줄만 쓴다: 파일 수, `toolError` 수, 거부 수, 출력 경로, 걸린 시간.

## API Contracts

- `extractFileFacts(projectRoot, requestedPaths, command): Promise<FileFactsExtraction>` — 레코드(경로 순), 거부 목록, 읽지 못한 파일 목록을 돌려준다. 출력 파일은 쓰지 않는다.
- `parseExtractorArguments(argv): ExtractorArguments | ExtractorUsageError` — CLI 인자 해석.
- `FileFacts`, `Reference`, `ExportedName`, `FactsCertainty` — 레코드 타입(스펙 §2.1).

## Acceptance Criteria

### AC-facts-equivalence — adapter와 같은 값

- 같은 파일에 대해 adapter를 직접 부른 결과와 레코드를 거꾸로 옮긴 값이 references·entrySurface·verification에서 같다. `indeterminate` 참조, entry surface, 검증 case 수를 포함한다.

### AC-facts-containment — 밖을 읽거나 쓰지 않는다

- 루트 밖 입력(`../`, 절대 경로, 밖을 가리키는 symlink)은 레코드가 되지 않고 거부로 세어진다.
- 루트 안 symlink를 지나는 입력은 `symlink`로 거부되고, 한 물리 파일은 레코드 하나다.
- 어떤 입력 모드도 하위 프로세스를 띄우지 않는다.
- 루트 안 출력 경로는 종료 코드 2로 거부된다.

### AC-facts-determinism — 같은 트리, 같은 byte

- 같은 트리에서 두 번 추출한 출력이 byte 단위로 같다. 출력 디렉터리가 달라도, 그 경로를 상대 경로로 주어도 같다.

### AC-facts-tool-error — 파일 하나의 실패

- 읽을 수 없는 파일은 레코드 없이 `unreadable`에 실리고 나머지 레코드는 정상이다.
- 읽은 byte에서 adapter가 실패한 파일과 NUL byte가 있는 파일은 그 byte의 hash를 가진 `toolError` 레코드다.

## Last Updated

2026-09-20
