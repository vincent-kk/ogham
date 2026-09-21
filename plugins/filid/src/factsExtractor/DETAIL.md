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
- 레코드는 `FileFacts` 형식이다(스펙 §2.1).
  - `path`는 프로젝트 상대 POSIX다.
  - `contentHash`는 `sha256:<hex>`다.
  - 모든 파일에 `references`, `entrySurface`, `verification`을 싣는다. role이 `unsupported`인 파일의 `verification`도 싣는다.
  - `verification.contractGroupIds`는 주석 안의 `filid:contract <group-id>` marker를 중복 없이, marker 순서로 싣는다. marker가 없으면 빈 배열이다 — 필드의 부재는 "모름"이고 빈 배열은 "없음"이라, 서버가 그 둘을 가른다.
  - id 문법의 정본은 이 스캐너다: `[A-Za-z][A-Za-z0-9._-]*`. 서버 스키마가 같은 모양과 길이 상한으로 조기 거부하므로, 스캐너가 낼 수 없는 id는 줄을 읽기 전에 걸린다.
  - `sourceText`는 adapter가 specifier의 원문(구분자 포함)을 보고할 때만 싣는다. escape 때문에 `specifier`가 파일 byte에 없을 때다.
  - `resolved.path`도 프로젝트 상대 POSIX다. adapter가 root 밖 파일로 푼 참조는 패키지와 같은 "밖"으로 보고 `{ external: <specifier> }`로 싣는다. 프로젝트 루트가 분석의 경계이기 때문이다. 서버의 경로 봉쇄는 루트 밖 `path`를 언제나 거부하므로, `path`로 실으면 어떤 도구로 다시 제출해도 거부가 반복된다.
- 경계 예외는 소유 fractal이 선언한다: `adapters/ecmascript/DETAIL.md`의 `## Boundary Exemptions`가 이 프로그램을 소비자로 적고 직접 import하는 모듈을 나열한다.
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
- 코어는 루트 밖으로 풀린 같은 참조에 `unowned-local-dependency` 진단을 내되 graph certainty는 내리지 않는다 — 소유 fractal이 없는 끝에는 노드가 없어 간선이 서지 않기 때문이다. S3c의 비교는 adapter 쪽의 루트 밖 resolved 경로도 `external`로 정규화하므로, 두 경로의 결론은 이 참조에서 갈리지 않는다.
- stdout에는 요약 JSON 한 줄만 쓴다: 파일 수, `toolError` 수, 거부 수, 출력 경로, 걸린 시간.

### 소스 판독 (`analysis/`)

- 한 파일의 텍스트는 **한 번** scan한다. 참조, entry surface, verification role과 case 수가 같은 토큰을 묻기 때문이다 — 판독마다 scan하면 파일 하나가 네 번 토큰화된다. `scanSource(source)`가 토큰과 신뢰할 수 없는 구간까지 한 번에 만들고, 각 판독은 그것을 받는다. 경로만 받는 판독기는 스스로 읽고 scan한다.
- role과 case 수는 **같은 계수 하나**에서 나온다. role을 확정하는 것이 곧 계수이기 때문이다.
- entry point의 named exports, direct declarations와 certainty를 lexical scan으로 판정한다.
- static/dynamic import와 re-export 중 project-internal dependency를 추출하고 local specifier를 정규화한다.
- package-level external dependency는 project DAG 후보에서 제외하고, 해석할 수 없는 local dependency는 `resolvedPath: null`로 보존한다.
- local specifier의 마지막 접미사가 지원 source 확장자인 경우에만 확장자를 치환한다. `.helpers`, `.composition.fixtures` 같은 basename은 보존하며, 원래 경로와 directory index 탐색도 유지한다.
- strings, comments와 template text 안의 가짜 syntax를 dependency나 export로 세지 않는다.
- 정규식 리터럴 본문은 문자열이 아니다. `/`는 직전 유의미 토큰이 없을 때, `)`·`]`·`}`를 제외한 구두점일 때, 또는 피연산자 자리를 여는 키워드(`return`, `typeof`, `case`, `do`, `else`, `in`, `of`, `new`, `delete`, `void`, `throw`, `instanceof`, `yield`, `await`)일 때 정규식을 연다. 단 `<`에 바로 붙은 `/`(`</tag>` 닫는 태그)와 피연산자에 붙은 후위 `!`·`++`·`--` 뒤의 `/`는 정규식을 열지 않는다. lexer가 식별자로 읽지 않는 ASCII 밖 식별자 문자(`\p{ID_Continue}`) 뒤의 `/`와, `.` 뒤에 와서 속성 이름이 된 키워드 뒤의 `/`도 나눗셈이다. 본문은 이스케이프와 문자 클래스를 추적해 닫는 `/`와 플래그까지 `regex` 토큰 하나로 소비하고, 같은 줄에서 닫히지 않으면(이스케이프 뒤 줄바꿈 포함) 구두점 `/`로 되돌린다. 이를 구분하지 않으면 `/["']/`의 따옴표가 가짜 문자열을 열어 뒤따르는 case 선언과 import를 삼킨다. 반대로 닫는 태그나 후위 연산자 뒤의 나눗셈을 정규식으로 읽으면 같은 줄의 구분자와 따옴표를 삼킨다.
- `'`·`"` 문자열은 이스케이프되지 않은 줄바꿈에서 끝난다. 줄 이음 이스케이프는 LF와 CRLF를 모두 한 단위로 건너뛴다. 줄바꿈에서 끝난 문자열과 파일 끝까지 닫히지 않은 문자열·template 토큰은 `unterminated`로 표시한다. 닫는 따옴표를 찾아 여러 줄을 넘어가면 이후 코드와 문자열의 경계가 뒤바뀐다.
- template의 `${…}` 표현식은 같은 scanner로 읽고 짝이 맞는 `}`에서 template 본문으로 돌아온다. 표현식 안의 중첩 template, 정규식, 따옴표, 객체 중괄호가 template 경계를 바꾸지 않아야 하기 때문이다. template은 표현식을 포함해 토큰 하나로 남는다. 표현식이 닫히지 않거나, 닫히지 않은 주석이나 unterminated 토큰을 담으면 표현식의 경계를 믿을 수 없다. 이때 바깥 template을 `unterminated`로 표시한다.
- 첫 줄의 shebang(`#!…`)은 토큰이 아니다. 줄 끝까지 건너뛰지 않으면 `#!/usr/bin/env` 의 `/`가 정규식을 연다.
- `import.meta`는 dependency가 아니다. `import` 뒤에 `.`이 오면 메타 속성 참조이므로 뒤따르는 문자열을 specifier로 읽지 않는다. 이를 구분하지 않으면 `join(dirname(fileURLToPath(import.meta.url)), '../..')` 같은 경로 계산이 해석 불가 dependency로 잡혀 그래프 전체가 `indeterminate`가 된다.
- re-export 탐지는 export 절 형태로 한정한다. `export {…} from`과 `export * [as x] from`(각각 `type` 접두 허용)에서 절이 닫히는 바로 그 위치의 `from` 식별자만 재export 키워드다. 위치를 보지 않고 뒤따르는 아무 `from` 토큰이나 채택하면, `from`이라는 파라미터를 쓰는 exported 함수의 다음 문자열 리터럴이 유령 dependency로 잡혀 그래프 전체가 `indeterminate`가 된다.
- `.each`와 호출 괄호 사이의 TypeScript 타입 인자 목록은 table이 아니다. `it.each<T>([…])`에서 `<…>`를 건너뛰고 그 뒤의 정적 table을 읽는다. 건너뛰지 않으면 정적 배열 리터럴이 동적 table로 잡혀 파일 전체의 case count가 `indeterminate`가 된다 — 타입 인자는 row 수에 아무 영향이 없다.
- 배열 table의 spread는 바깥 행을 확장할 때만 계수를 미확정으로 만든다. 행 내부 객체·배열·함수 인자의 spread와 문자열·주석 속 `...`는 바깥 행 수를 바꾸지 않으므로 정적 계수를 유지한다.
- 같은 파일에서 사용보다 앞에 선언한 최상위 단일 `const NAME = [...]` table을 제한적으로 해석한다. 초기값은 직접 배열 리터럴이며 선택적인 `as const` 뒤에서 선언이 끝나야 한다. `as const`만으로 런타임 불변성을 가정하지 않는다.
- 상수 table의 모든 이름 사용을 확인한다. 지원하는 `.each`의 직접 인자, `for (const element of NAME)`, 단일 요소 인자를 받는 arrow callback의 표준 `.map`만 허용한다. 변경, alias, 외부 전달, export, 이름 가려짐 또는 그 밖의 사용은 indeterminate로 남긴다. `eval`·`Function` identifier가 있는 소스도 동적 접근을 배제할 수 없어 지원하지 않는다. import·중첩 선언·동적 초기값·범용 스코프 해석은 지원하지 않는다.
- 지원 불가능한 alias·동적 표현은 unsupported/indeterminate evidence를 남긴다.
- 닫히지 않은 literal은 **신뢰할 수 없는 텍스트**를 만들고, 그 안의 **경계 상실**과 **숨은 구문**을 구분해 보고한다.
  - 신뢰할 수 없는 텍스트는 두 가지다. 하나는 첫 따옴표부터 줄 끝(`\n` 또는 `\r`)까지다. 대상 줄은 닫히지 않은 `'`·`"`가 있는 줄, 그리고 예약어가 아닌 식별자 문자(ASCII 밖 `\p{ID_Continue}` 포함) 바로 뒤에서 `'`·`"`를 여는 줄(`Don't`, `café's`)이다. 유효한 코드에서 식별자 바로 뒤에 문자열이 오는 것은 `return"x"`, `case"a"` 같은 예약어 뒤뿐이다. 그래서 그런 따옴표는 짝수로 어긋나도 잘못 붙은 것이다. 줄바꿈을 넘는 literal(`\` 줄 연속)이 있으면 그 줄들을 한 구간으로 본다. 잘못 짝지어짐은 그 줄의 어느 따옴표에서든 시작할 수 있다(`<p>Don't</p>); it('x'`의 `'t</p>); it('`). 그래서 scanner가 그 구간에서 코드로 읽은 부분도 실제로는 문자열 내용일 수 있다. 다른 하나는 닫히지 않은 template의 내용이다.
  - 경계 상실: unterminated template이거나, 신뢰할 수 없는 문자열 내용에 `/*`나 backtick이 있는 경우다. 그것이 코드였다면 다음 줄부터 해석이 바뀐다.
  - 숨은 구문: 신뢰할 수 없는 텍스트 안에서 **시작하는** case 호출, `export`, 모듈 참조를 원문 패턴으로 찾는다. 다시 lex하지 않는다. 다시 lex하면 그 안의 정규식·주석·URL의 `//`가 또 다른 오판을 만들어 틀린 exact가 나온다. scanner가 그 구간에서 코드로 읽은 참조·`export`·case도 믿지 않고 indeterminate로 보고한다. role 증거는 그 구간의 문자열 내용 안에서 시작하는 제목 호출만이다.
  - 재귀가 없어 비용은 소스 길이에 선형이다. 줄 시작은 `\n`과 `\r` 모두에서 끊는다. `'`·`"` 문자열이 `\r`에서도 끝나기 때문이다. template 표현식 중첩만 `MAX_TEMPLATE_NESTING`을 넘으면 경계 상실로 본다.
  - 둘 다 아니면 exact를 유지한다. JSX 텍스트의 아포스트로피처럼 아무것도 숨기지 않은 literal이 cap과 DAG 판정을 흐리면 안 되기 때문이다. 원문 패턴은 영어 문장(`Don't touch it (please)`)에도 걸릴 수 있다. 그 경우 불확정을 과보고하지만, 신뢰할 수 없는 줄과 template에서 틀린 exact는 만들지 않는다.
  - 한계: 공백 뒤에서 짝수로 어긋난 따옴표(`Rock 'n' roll`)나, 줄 주석·정규식·template이 따옴표를 먹은 줄은 신뢰할 수 없는 줄로 잡히지 않는다.
- case 계수는 경계 상실이나 숨은 case 구문이 있으면 indeterminate다. 토큰 경계를 믿을 수 없는 파일을 exact로 세면 cap이 거짓 통과한다.
- 의존성 추출은 신뢰할 수 없는 텍스트에서 원문 패턴으로 찾은 참조(`from '…'`, `import('…')`, `import '…'`, `require('…')`)와 경계 상실 뒤의 본문 참조를 `certainty: 'indeterminate'`로 보고한다.
- `certainty: 'indeterminate'`인 참조는 1부터 시작하는 `line`도 함께 보고한다. offset을 줄 번호로 바꾸는 계산은 `analysis/lexing/lineAt.ts`의 `lineAt(source, offset)` 하나가 맡고, semantic case 계수 사유도 같은 도우미를 쓴다.
- **탐지하지 못하는 lexer 한계.** 짝수로 어긋난 아포스트로피가 산문에 있을 때(`Rock 'n' roll`)나, 이모지 바로 뒤에 따옴표가 올 때는 lexer가 신뢰할 수 없는 줄로 잡지 못한다. 이런 문맥은 진단을 낼 수 없으므로 scan·restructure skill 문서가 LLM 호출자에게 직접 알린다.
- entry point inspection은 경계 상실이나 숨은 `export`가 있으면 certainty를 indeterminate로 보고한다.
- contract group id는 주석 안의 `filid:contract <group-id>` marker를 중복 없이, marker 순서로 싣는다. 15/32 cap 판정은 `core/verification`이 레코드의 값으로 한다.
- verification role은 **파일명 접미사가 후보를 고르고 파일 내용이 확정한다.** `.spec`/`.test` stem은 후보일 뿐이며, 인식 가능한 case/suite 호출이 하나도 없는 파일은 `unsupported`다. 접미사만으로 역할을 주면 프로덕션 파일을 `x.spec.ts`로 개명하는 것만으로 boundary와 DAG 면제를 얻는다 — 개명은 증거가 아니다. 경계 상실만으로 생긴 indeterminate는 검증 구문을 봤다는 증거가 아니므로 role을 주지 않는다. 그런 literal은 JSX 텍스트의 아포스트로피처럼 프로덕션 코드에도 흔하다. 신뢰할 수 없는 텍스트에서 보인 case 호출 텍스트도 계수를 indeterminate로 만들 뿐 role의 증거는 아니다. JSX 텍스트의 `Don't touch it (please)`처럼 영어 문장이 case 호출로 읽히기 때문이다. 그 텍스트 안에서 제목을 가진 호출(`it('…'`, `test("…"`)만 role의 증거로 인정한다. 문자열이든 template이든 같다.

## API Contracts

- `extractFileFacts(projectRoot, requestedPaths, command): Promise<FileFactsExtraction>` — 레코드(경로 순), 거부 목록, 읽지 못한 파일 목록을 돌려준다. 출력 파일은 쓰지 않는다.
- `parseExtractorArguments(argv): ExtractorArguments | ExtractorUsageError` — CLI 인자 해석.
- `FileFacts`, `Reference`, `ExportedName`, `FactsCertainty` — 레코드 타입(스펙 §2.1).
- `scanSource(source)` — 한 파일의 텍스트, 토큰, 신뢰할 수 없는 구간. 판독기들이 공유한다.
- `scanLexicalTokens(source)` — comment/string/template/regex와 delimiter nesting을 보존한 token stream. 첫 줄 shebang은 건너뛰고, 닫히지 않은 문자열·template 토큰은 `unterminated: true`를 가진다.
- `extractDependencyReferences(filePath, scanned?)` — adapter 중립 `DependencyReference[]`. 숨었거나 경계 상실 뒤에 있는 참조는 `certainty: 'indeterminate'`를 가진다.
- `inspectEntrySurface(entryPointPath, scanned?)` — manifest면 JSON 선언, 소스면 텍스트에서 읽은 표면.
- `verificationFromSource(filePath, scanned)` — role과 case 수를 한 계수에서.
- `countSemanticCases(source, scanned?)` — 일반/skip/todo/property와 정적 parameterized rows를 의미론적 case 수로 계산하고 동적 구조를 indeterminate로 반환.
- `extractContractGroupIds(source)` — comment의 `filid:contract` marker 추출.

## Acceptance Criteria

### AC-facts-equivalence — 한 번 scan해도 값이 같다

- 한 번 scan한 결과를 나눠 쓴 레코드가 판독마다 따로 scan한 레코드와 byte 단위로 같다.
- 레코드는 모든 파일에 references·entrySurface·verification을 싣고, `indeterminate` 참조와 검증 case 수를 그대로 보존한다.

### AC-facts-source-reading — 텍스트가 말하는 것만

- 주석·문자열·template 안의 가짜 구문은 dependency도 export도 case도 아니다.
- 닫히지 않은 literal은 경계 상실과 숨은 구문을 나눠 보고하고, 아무것도 숨기지 않은 JSX 아포스트로피는 exact를 유지한다.
- 정적 parameterized row와 suite multiplier는 exact count에 들어가고, 동적 table·alias·알 수 없는 문법은 indeterminate다.
- 주석의 `filid:contract` marker만 contract group id가 되고, 문자열 안의 같은 글자는 아니다.
- Node 20과 repository dependency만으로 이 판독이 돌아간다 — 외부 parser를 쓰지 않는다.

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

## Boundary Exemptions

### `analysis/lexing/` — 사람 호출 문장 검사의 토큰 경계

- **Consumers**: `src/__tests__/integration/escalation/helpers/utils/sourceLiteralSentences.ts`
- **Direct import**: `allowed`
- **Reason**: 허용 목록 검사가 소스 문자열에서 문장을 뽑으려면 같은 토큰 경계를 봐야 한다. 그 헬퍼는 검증 파일이 아니라 검증 파일을 돕는 조직이라 `filid_fractal-boundaries` §5의 면제 대상이 아니고, 진입점으로 돌리려면 추출 프로그램의 공개 표면에 lexer를 테스트 하나를 위해 얹어야 한다 — 같은 조항이 더 나쁜 쪽이라고 말하는 선택이다. 그래서 선언하고 직접 가져간다.

## History

- 2026-09-20 — 파일 내용을 읽는 모듈의 소유를 adapter에서 넘겨받고, 파일당 토큰화를 한 번으로 합쳤다. 서버가 소스를 해석하지 않는 것이 이 단계의 계약이고(스펙 §11-8), 네 판독이 같은 텍스트를 각각 scan하고 있었다.
- 2026-09-19 — indeterminate 참조와 semantic case 계수 사유가 byte offset 대신 1-based 줄 번호를 보고한다. LLM 호출자가 해당 줄을 직접 읽고 판단하게 하려면 offset보다 줄 번호가 필요하다.
- 2026-09-19 — 닫히지 않은 literal 신호를 경계 상실과 숨은 구문으로 나누고, 의존성 추출과 entry surface까지 넓혔다. unterminated 토큰을 모두 불확정으로 보면 JSX 텍스트 아포스트로피 하나가 cap 판정과 DAG를 흐린다. 처음에는 삼킨 구간을 코드로 다시 lex했다. 그런데 그 텍스트 안의 정규식·주석·URL과 같은 줄의 잘못 짝지어진 따옴표가 반례를 계속 만들었고, 틀린 exact와 3차 비용이 나왔다. 그래서 신뢰할 수 없는 텍스트를 원문 패턴으로만 본다. 과보고는 받아들이고 틀린 exact는 만들지 않는다. template 표현식을 같은 scanner로 건너뛰게 해서 중첩 template의 경계 상실도 없앴다.
- 2026-09-19 — lexer에 정규식 리터럴 상태를 추가하고 `'`·`"` 문자열을 줄바꿈에서 끝냈다. `/["']/` 같은 정규식의 따옴표가 여러 줄짜리 가짜 문자열을 열어 case와 import를 삼키면서도 exact로 보고되고 있었다. 정규식 판정이 틀리는 드문 문맥에 대비해, 닫히지 않은 literal은 case 계수를 indeterminate로 만든다. 다만 그것만으로 role을 주면 개명 면제가 다시 열리므로 role 판정에서는 제외했다.
- 2026-09-06 — 최상위 const 배열 참조의 제한적 해석을 추가했다. 공급자 목록을 여러 테스트에서 공유하는 정적 table을 계수하되, 선언의 길이만 믿지 않고 허용한 사용 형태를 확인한다.
- 2026-09-06 — spread를 바깥 배열 table의 행 확장 위치에서만 미확정으로 취급한다. 배열 원문 전체의 `...`를 찾는 방식은 행 내부 객체 속성 확장까지 동적 행으로 오인했다.
- 2026-08-23 — `.each`와 호출 괄호 사이의 TypeScript 타입 인자 목록을 건너뛰도록 정적 table 판정을 고쳤다. 타입 인자는 row 수를 바꾸지 않는데도 table을 못 읽게 만들어 파일 전체를 indeterminate로 떨어뜨리고 있었다.
- 2026-08-18 — re-export 탐지를 export 절 형태로 한정했다. `from`은 위치가 키워드를 만든다 — 절 경계 밖의 `from` 식별자는 재export가 아니다.
- 2026-07-28 — verification role 판정을 접미사 후보 + 내용 확정으로 좁혔다. 개명만으로 boundary·DAG 면제를 얻지 못하게 하려면 내용이 역할을 확정해야 한다.

## Last Updated

2026-09-20 — 소스 판독의 소유와 단일 scan 규칙을 싣는다.
