# ecmascript adapter — Contract

## Requirements

- adapter는 현재 생태계 source file과 package/framework evidence를 탐지한다.
- source discovery는 git이 무시하고 추적하지도 않는 파일을 제외한다. 이 결과가 dependency와 verification evidence의 입력이므로, 무시되는 build 산출물이 discovery에 남으면 DAG와 verification 계약이 산출물을 대상으로 판정한다. git이 없거나 project root가 work tree 밖이면 제외 없이 전부 탐지한다.
- source discovery는 symlink를 따라가지 않는다. `discoverSourceTree()`는 소스 파일과 함께, 같은 순회에서 건너뛴 symlink 중 실제 위치가 project root 밖인 것을 돌려준다. 대상은 소스 확장자를 가진 파일 symlink와 제외 이름이 아닌 디렉터리 symlink다. root 안을 가리키는 symlink는 대상이 실제 경로로 이미 탐지되므로 돌려주지 않고, 끊어진 symlink와 loop는 분석할 내용이 없으므로 돌려주지 않는다. 무시·제외 규칙은 source discovery와 같다.
- module, executable, framework과 manifest entry point를 exact path와 adapter ID로 보고한다.
- 디렉터리에 `package.json`이 있으면 그것을 `kind: 'manifest'` entry point로 보고한다. 이 생태계에서 패키지의 공개 표면을 선언하는 자리는 `exports`·`main`·`bin`이고, 배럴이 없는 패키지 루트도 그 선언으로 소비자를 받는다 — 진입점이 없는 것이 아니라 module 파일이 아닌 곳에 있는 것이다. 상위 디렉터리의 `package.json`은 대상이 아니다(그건 framework 탐지용 조회다).
- manifest는 `kind: 'module'`이 아니다. module은 분류기가 읽는 유일한 kind이므로, manifest가 module이면 `package.json`을 가진 모든 디렉터리가 fractal이 된다 — 저장소 루트까지 포함해서다. `surface`는 선언을 열거할 수 있으므로 `enumerated`이고, `framework`의 `opaque`를 쓰면 패키지 루트마다 영구 `entry-point-surface` 경고가 생긴다.
- manifest entry의 inspection은 lexical scan이 아니라 JSON 파싱이다. `exports` 키 집합이 named surface이며, `exports`가 없으면 `main`·`bin`이 선언한 단일 진입을 `.` 하나로 보고한다.
- 파싱은 되었으나 세 필드가 모두 없는 매니페스트는 **표면이 빈 `exact`**다. 스펙시파이어로 가져올 것이 없다는 것은 확정된 사실이며, 그것을 `indeterminate`로 보고하면 아무것도 노출하지 않기로 한 private 패키지마다 영구 `entry-point-surface` 경고가 생긴다. `indeterminate`는 파싱이 실패해 선언을 읽지 못한 경우로 한정한다 — "노출하지 않는다"와 "읽을 수 없다"는 다른 사실이다.
- config가 이 adapter에 전달한 exact peer filename은 declared entry override로 해석하며 **`kind: 'module'`로 보고하지 않는다.** module은 adapter가 스스로 알아본 module index에만 쓰는 kind이고, 분류기는 그 kind 하나만 읽는다. override가 module이면 config 한 줄이 디렉터리를 fractal로 바꿔버린다.
- override는 `kind: 'executable'`, `surface: 'enumerated'`로 보고한다. `framework`는 surface를 `opaque`로 끌어내려 정당한 override마다 영구적인 `entry-point-surface` 경고를 만든다 — override는 그 규칙의 입력이지 위반 원인이 아니다.
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
- `certainty: 'indeterminate'`인 참조는 1부터 시작하는 `line`도 함께 보고한다. offset을 줄 번호로 바꾸는 계산은 `structure/lexing/lineAt.ts`의 `lineAt(source, offset)` 하나가 맡고, semantic case 계수 사유도 같은 도우미를 쓴다.
- **탐지하지 못하는 lexer 한계.** 짝수로 어긋난 아포스트로피가 산문에 있을 때(`Rock 'n' roll`)나, 이모지 바로 뒤에 따옴표가 올 때는 lexer가 신뢰할 수 없는 줄로 잡지 못한다. 이런 문맥은 진단을 낼 수 없으므로 scan·restructure skill 문서가 LLM 호출자에게 직접 알린다.
- entry point inspection은 경계 상실이나 숨은 `export`가 있으면 certainty를 indeterminate로 보고한다.
- verification 동작은 작업 2의 15/32와 contract-marker 계약을 구현한다.
- verification role은 **파일명 접미사가 후보를 고르고 파일 내용이 확정한다.** `.spec`/`.test` stem은 후보일 뿐이며, 인식 가능한 case/suite 호출이 하나도 없는 파일은 `unsupported`다. 접미사만으로 역할을 주면 프로덕션 파일을 `x.spec.ts`로 개명하는 것만으로 boundary와 DAG 면제를 얻는다 — 개명은 증거가 아니다. 경계 상실만으로 생긴 indeterminate는 검증 구문을 봤다는 증거가 아니므로 role을 주지 않는다. 그런 literal은 JSX 텍스트의 아포스트로피처럼 프로덕션 코드에도 흔하다. 신뢰할 수 없는 텍스트에서 보인 case 호출 텍스트도 계수를 indeterminate로 만들 뿐 role의 증거는 아니다. JSX 텍스트의 `Don't touch it (please)`처럼 영어 문장이 case 호출로 읽히기 때문이다. 그 텍스트 안에서 제목을 가진 호출(`it('…'`, `test("…"`)만 role의 증거로 인정한다. 문자열이든 template이든 같다.

## API Contracts

- `ecmascriptStructureAdapter: StructureAdapter` — registry에 등록되는 초기 structure adapter.
- `scanLexicalTokens(source)` — comment/string/template/regex와 delimiter nesting을 보존한 lexical token stream. 첫 줄 shebang은 건너뛰고, 닫히지 않은 문자열·template 토큰은 `unterminated: true`를 가진다.
- `extractDependencyReferences(filePath)` — adapter 중립 `DependencyReference[]`. 숨었거나 경계 상실 뒤에 있는 참조는 `certainty: 'indeterminate'`를 가진다.
- `findEntryPoints(directoryPath, overrides?)` — module/executable/framework/manifest/configured descriptor 배열.
- `ecmascriptVerificationAdapter` — spec/test role, semantic case count와 contract group marker를 분석하는 초기 verification adapter.
- `countSemanticCases(source)` — 일반/skip/todo/property와 정적 parameterized rows를 의미론적 case 수로 계산하고 동적 구조를 indeterminate로 반환.
- `extractContractGroupIds(source)` — comment의 `filid:contract` marker 추출.
- `ECMASCRIPT_ADAPTER_ID` — config와 evidence가 공유하는 안정 adapter ID.

## Acceptance Criteria

### AC-ecmascript-detection — 생태계 claim

- package 또는 지원 source evidence가 있으면 양수 confidence를 반환한다.
- 알 수 없는 파일만 있는 project는 ownership을 주장하지 않는다.
- git이 무시하는 source file은 `discoverSourceFiles()` 결과에 없고, ignore pattern에 걸려도 추적되는 파일은 남는다. git이 없으면 전부 남는다.
- root 밖을 가리키는 소스 파일 symlink와 디렉터리 symlink는 `discoverSourceFiles()`에 없고 `discoverSourceTree()`의 `unfollowedLinks`에 있다. `discoverSourceTree()`의 `files`는 `discoverSourceFiles()`와 같다. root 안을 가리키는 symlink는 둘 다에 없다.

### AC-ecmascript-structure — entry와 dependency

- module·executable·framework·manifest entry point를 구분하고 named surface를 검사한다.
- `package.json`을 가진 디렉터리는 `kind: 'manifest'` descriptor를 얻고, 그 kind는 분류를 유발하지 않는다 — `package.json`만 있는 디렉터리는 organ으로 남는다.
- manifest inspection은 `exports` 키를 named surface로 반환하고, `exports` 없이 `main`만 있으면 `.` 하나를 반환한다.
- 선언이 하나도 없는 매니페스트는 빈 표면의 `exact`이고, 파싱 실패만 `indeterminate`다.
- 다른 adapter ID의 override와 섞지 않고 전달된 exact filename만 인식한다.
- override로 주입된 경로는 `module`이 아닌 kind로 보고하고, 같은 호출에서 실제 module index는 계속 `module`로 보고한다.
- 주석과 문자열 안의 가짜 import/export를 무시한다.
- 중첩 template이나 정규식·따옴표·객체를 담은 template 표현식 뒤의 토큰 경계가 유지되고, shebang 줄은 토큰을 만들지 않는다.
- 표현식 안에서 경계를 잃은 template은 `unterminated`다.
- 외부 package import는 project DAG를 indeterminate로 만들지 않으며 해석되지 않은 local import는 숨기지 않는다.
- dotted basename은 지원 확장자를 덧붙여 해석하며, 짧은 이름의 형제 파일이 있어도 그 파일로 잘못 연결하지 않는다. 명시적 source 확장자 치환과 directory index 탐색을 유지한다.
- `import.meta.url`을 쓰는 경로 계산은 dependency로 잡히지 않는다.
- `from`이라는 파라미터를 쓰는 exported 함수는 re-export dependency를 만들지 않고, `export * from`·`export * as ns from`·`export type {…} from`은 계속 추출된다.
- 따옴표를 담은 정규식 리터럴 뒤의 re-export와 dynamic import도 추출된다.
- 신뢰할 수 없는 줄의 첫 따옴표 뒤 import(코드로 읽힌 것 포함)와 경계 상실 뒤의 import는 `certainty: 'indeterminate'`로 한 번만 보고한다. 첫 따옴표 앞에서 코드로 읽힌 import는 exact로 남는다.
- `indeterminate` 참조는 1-based `line`을 함께 보고하고, 나머지 참조는 `line`을 싣지 않는다.
- 숨은 `export`가 있는 entry point는 surface certainty가 indeterminate다.

### AC-ecmascript-portability — 외부 parser 불필요

- Node 20과 repository dependency만으로 adapter 테스트가 통과한다.

### AC-ecmascript-verification — Semantic case evidence

- 정적 parameterized row와 suite multiplier를 exact count에 반영한다.
- 타입 인자를 동반한 `it.each<T>([…])`의 정적 row도 exact count에 반영한다. 타입 인자 안의 함수 타입도 table 판정을 흐리지 않는다.
- 행 내부 객체·배열·함수 인자의 spread와 문자열·주석 속 `...`가 있어도 고정 행 수와 suite multiplier를 exact count에 반영한다.
- 바깥 배열 table의 spread는 indeterminate로 유지하며, 별도로 확인한 일반 case는 known lower bound에 남긴다.
- 허용한 읽기 사용만 가진 최상위 const 배열은 직접 table과 같은 행 수로 계수한다. 반복 참조와 parameterized suite에도 같은 수를 적용한다.
- 배열 값의 문자열이 괄호나 쉼표여도 문법 구분자로 취급하지 않고 한 행으로 계수한다.
- 상수 table의 길이를 확신할 수 없는 변경·참조 전달·이름 가려짐·동적 초기값은 indeterminate로 보존한다.
- 동적 table, alias와 알 수 없는 문법은 indeterminate이며 skip, todo와 property declaration은 각각 1 case다.
- 따옴표를 담은 정규식 리터럴 앞뒤의 case를 모두 exact count에 반영한다. 나눗셈 `/`(후위 `!`·`++`·`--` 뒤 포함)와 `</` 닫는 태그는 정규식을 열지 않으므로, 한 줄짜리 JSX table도 행 수대로 센다.
- 닫히지 않은 문자열이 case 구문을 숨기면 indeterminate이며, 그 줄 뒤의 case는 known lower bound에 남는다. 같은 줄 앞쪽 따옴표와 잘못 짝지어진 문자열이 숨긴 case도 마찬가지다.
- 아무것도 숨기지 않은 JSX 텍스트 아포스트로피는 exact를 유지한다.
- 경계를 잃은 template, 신뢰할 수 없는 문자열 속 `/*`는 indeterminate다. 같은 줄의 앞선 문자열이 정규식처럼 보여도 마찬가지다.
- 수 KB 한 줄의 닫히지 않은 literal과 template 중첩이 상한을 넘는 입력은 5초 안에 끝나고 예외를 던지지 않는다. 아무것도 숨기지 않은 긴 문자열은 exact를 유지한다.

### AC-ecmascript-verification-role — 내용이 역할을 확정한다

- `.spec`/`.test` 접미사와 지원 확장자를 가진 파일만 후보가 된다.
- 후보 중 인식 가능한 case/suite 호출이 하나도 없는 파일은 `unsupported`이며 `discover()` 결과에서 빠진다 — 따라서 boundary·DAG 면제를 받지 못한다.
- case를 담은 후보는 종전대로 `.spec` → `spec-document`, `.test` → `test-record`다. 정규식 리터럴이 짝 없는 따옴표를 담아도 역할은 유지된다.
- 검증 구문(신뢰할 수 없는 텍스트 안의 제목을 가진 case 호출 포함) 때문에 count가 `indeterminate`인 후보는 verification으로 남는다. 셀 수 없는 것과 없는 것은 다르다.
- 신뢰할 수 없는 텍스트에 제목 없는 case 호출 텍스트(`it (please)`)만 있는 후보는 `unsupported`다. template 안의 문장도 마찬가지다.
- 인식된 case가 없고 불확실성이 경계 상실뿐인 후보는 `unsupported`다.

## Boundary Exemptions

### structure·verification 파싱 모듈 — 추출기는 프로세스를 띄우지 않는다

- **Consumers**: `src/factsExtractor/**`
- **Direct import**: allowed — `structure/extractDependencyReferences.ts`, `structure/inspectEntrySurface.ts`, `verification/classifyVerificationPath.ts`, `verification/countVerificationCases.ts`
- **Reason**: 진입점은 discovery도 함께 노출하고, discovery의 ignore 필터가 `git ls-files`를 하위 프로세스로 부른다. 추출기는 번들 가드로 "프로세스 시작 0"을 강제하므로 진입점을 지날 수 없다. "프로세스를 띄우지 않는 파싱만"은 진입점이 표현할 수 없는 경계라 그 네 모듈만 직접 가져간다.

## History

- 2026-09-19 — indeterminate 참조와 semantic case 계수 사유가 byte offset 대신 1-based 줄 번호를 보고한다. LLM 호출자가 해당 줄을 직접 읽고 판단하게 하려면 offset보다 줄 번호가 필요하다.
- 2026-09-19 — 닫히지 않은 literal 신호를 경계 상실과 숨은 구문으로 나누고, 의존성 추출과 entry surface까지 넓혔다. unterminated 토큰을 모두 불확정으로 보면 JSX 텍스트 아포스트로피 하나가 cap 판정과 DAG를 흐린다. 처음에는 삼킨 구간을 코드로 다시 lex했다. 그런데 그 텍스트 안의 정규식·주석·URL과 같은 줄의 잘못 짝지어진 따옴표가 반례를 계속 만들었고, 틀린 exact와 3차 비용이 나왔다. 그래서 신뢰할 수 없는 텍스트를 원문 패턴으로만 본다. 과보고는 받아들이고 틀린 exact는 만들지 않는다. template 표현식을 같은 scanner로 건너뛰게 해서 중첩 template의 경계 상실도 없앴다.
- 2026-09-19 — lexer에 정규식 리터럴 상태를 추가하고 `'`·`"` 문자열을 줄바꿈에서 끝냈다. `/["']/` 같은 정규식의 따옴표가 여러 줄짜리 가짜 문자열을 열어 case와 import를 삼키면서도 exact로 보고되고 있었다. 정규식 판정이 틀리는 드문 문맥에 대비해, 닫히지 않은 literal은 case 계수를 indeterminate로 만든다. 다만 그것만으로 role을 주면 개명 면제가 다시 열리므로 role 판정에서는 제외했다.
- 2026-09-06 — 최상위 const 배열 참조의 제한적 해석을 추가했다. 공급자 목록을 여러 테스트에서 공유하는 정적 table을 계수하되, 선언의 길이만 믿지 않고 허용한 사용 형태를 확인한다.
- 2026-09-06 — spread를 바깥 배열 table의 행 확장 위치에서만 미확정으로 취급한다. 배열 원문 전체의 `...`를 찾는 방식은 행 내부 객체 속성 확장까지 동적 행으로 오인했다.
- 2026-08-23 — `.each`와 호출 괄호 사이의 TypeScript 타입 인자 목록을 건너뛰도록 정적 table 판정을 고쳤다. 타입 인자는 row 수를 바꾸지 않는데도 table을 못 읽게 만들어 파일 전체를 indeterminate로 떨어뜨리고 있었다.
- 2026-08-18 — re-export 탐지를 export 절 형태로 한정했다. `from`은 위치가 키워드를 만든다 — 절 경계 밖의 `from` 식별자는 재export가 아니다.
- 2026-07-28 — verification role 판정을 접미사 후보 + 내용 확정으로 좁히고, source discovery에서 git이 무시하는 경로를 제외했다.

## Last Updated

2026-09-19
