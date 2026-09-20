# ecmascript adapter — Contract

## Requirements

- adapter는 현재 생태계 source file과 package/framework evidence를 탐지한다.
- source discovery는 git이 무시하고 추적하지도 않는 파일을 제외한다. 이 결과가 dependency와 verification evidence의 입력이므로, 무시되는 build 산출물이 discovery에 남으면 DAG와 verification 계약이 산출물을 대상으로 판정한다. git이 없거나 project root가 work tree 밖이면 제외 없이 전부 탐지한다.
- source discovery는 symlink를 따라가지 않는다. `discoverSourceTree()`는 소스 파일과 함께, 같은 순회에서 건너뛴 symlink 중 실제 위치가 project root 밖인 것을 돌려준다. 대상은 소스 확장자를 가진 파일 symlink와 제외 이름이 아닌 디렉터리 symlink다. root 안을 가리키는 symlink는 대상이 실제 경로로 이미 탐지되므로 돌려주지 않고, 끊어진 symlink와 loop는 분석할 내용이 없으므로 돌려주지 않는다. 무시·제외 규칙은 source discovery와 같다.
- module, executable, framework과 manifest entry point를 exact path와 adapter ID로 보고한다. descriptor는 호출자 소유의 새 객체다 — 스캐너가 결과를 그 자리에서 정렬·필터하므로 공유 배열을 돌려주면 다음 호출자가 앞 호출자의 변형을 본다.
- 요청 스코프 메모가 열려 있으면 소스 트리 워크, git ignore 질의, 디렉터리별 entry point 판독은 한 스코프 안에서 각각 한 번만 실제로 일어난다. 키는 **호출자가 준 경로 문자열 그대로**이며 entry point는 정렬된 override 목록까지 포함한다. 결과 경로가 그 문자열에 `join`으로 붙어 만들어지므로, 키를 해석된 형태로 정규화하면 같은 디렉터리를 다른 철자로 부른 호출자가 남의 철자를 받는다. override는 멤버십으로만 읽혀 순서가 결과를 바꾸지 않으므로 키에서 정렬한다. 스코프가 없으면 매번 파일 시스템을 다시 읽는다. 한 스냅샷이 같은 트리를 여러 번 읽는 것은 지금도 "읽는 동안 트리가 움직이지 않는다"를 전제하므로, 메모는 그 전제를 완화하지 않고 강제한다.
- 디렉터리에 `package.json`이 있으면 그것을 `kind: 'manifest'` entry point로 보고한다. 이 생태계에서 패키지의 공개 표면을 선언하는 자리는 `exports`·`main`·`bin`이고, 배럴이 없는 패키지 루트도 그 선언으로 소비자를 받는다 — 진입점이 없는 것이 아니라 module 파일이 아닌 곳에 있는 것이다. 상위 디렉터리의 `package.json`은 대상이 아니다(그건 framework 탐지용 조회다).
- manifest는 `kind: 'module'`이 아니다. module은 분류기가 읽는 유일한 kind이므로, manifest가 module이면 `package.json`을 가진 모든 디렉터리가 fractal이 된다 — 저장소 루트까지 포함해서다. `surface`는 선언을 열거할 수 있으므로 `enumerated`이고, `framework`의 `opaque`를 쓰면 패키지 루트마다 영구 `entry-point-surface` 경고가 생긴다.
- manifest entry의 inspection은 lexical scan이 아니라 JSON 파싱이다. `exports` 키 집합이 named surface이며, `exports`가 없으면 `main`·`bin`이 선언한 단일 진입을 `.` 하나로 보고한다.
- 파싱은 되었으나 세 필드가 모두 없는 매니페스트는 **표면이 빈 `exact`**다. 스펙시파이어로 가져올 것이 없다는 것은 확정된 사실이며, 그것을 `indeterminate`로 보고하면 아무것도 노출하지 않기로 한 private 패키지마다 영구 `entry-point-surface` 경고가 생긴다. `indeterminate`는 파싱이 실패해 선언을 읽지 못한 경우로 한정한다 — "노출하지 않는다"와 "읽을 수 없다"는 다른 사실이다.
- config가 이 adapter에 전달한 exact peer filename은 declared entry override로 해석하며 **`kind: 'module'`로 보고하지 않는다.** module은 adapter가 스스로 알아본 module index에만 쓰는 kind이고, 분류기는 그 kind 하나만 읽는다. override가 module이면 config 한 줄이 디렉터리를 fractal로 바꿔버린다.
- override는 `kind: 'executable'`, `surface: 'enumerated'`로 보고한다. `framework`는 surface를 `opaque`로 끌어내려 정당한 override마다 영구적인 `entry-point-surface` 경고를 만든다 — override는 그 규칙의 입력이지 위반 원인이 아니다.
- verification file discovery는 **이름만** 읽는다. `.spec`/`.test` stem과 지원 확장자를 가진 파일이 후보이고, 그 후보가 실제로 verification인지는 파일의 facts 레코드가 말한다 — adapter는 파일을 열지 않는다. 개명만으로 boundary·DAG 면제를 얻지 못하는 것은 레코드의 role이 내용에서 나오기 때문이다(`src/factsExtractor/DETAIL.md`).
- entry point inspection은 **manifest만** 읽는다. 소스 진입점의 표면은 그 파일의 레코드에서 오고, adapter에 물으면 `unsupported`로 답한다.

## API Contracts


- `ecmascriptStructureAdapter: StructureAdapter` — registry에 등록되는 초기 structure adapter.
- `findEntryPoints(directoryPath, overrides?)` — module/executable/framework/manifest/configured descriptor 배열. 매 호출이 새 배열과 새 descriptor를 돌려준다.
- `ecmascriptVerificationAdapter` — 이름으로 verification 후보를 찾는 초기 verification adapter.
- `SOURCE_EXTENSIONS`·`ECMASCRIPT_ADAPTER_ID` 등 `structure/ecmascriptConventions.ts`의 생태계 상수 — 이 디렉터리가 확장자·entry 이름·framework 이름의 유일한 출처다.
- `verificationRoleFromName(filePath)` — 이름이 제안하는 role. 파일을 열지 않는다.

## Acceptance Criteria

### AC-ecmascript-detection — 생태계 claim

- package 또는 지원 source evidence가 있으면 양수 confidence를 반환한다.
- 알 수 없는 파일만 있는 project는 ownership을 주장하지 않는다.
- git이 무시하는 source file은 `discoverSourceFiles()` 결과에 없고, ignore pattern에 걸려도 추적되는 파일은 남는다. git이 없으면 전부 남는다.
- root 밖을 가리키는 소스 파일 symlink와 디렉터리 symlink는 `discoverSourceFiles()`에 없고 `discoverSourceTree()`의 `unfollowedLinks`에 있다. `discoverSourceTree()`의 `files`는 `discoverSourceFiles()`와 같다. root 안을 가리키는 symlink는 둘 다에 없다.

### AC-ecmascript-structure — entry point

- module·executable·framework·manifest entry point를 구분한다.
- `package.json`을 가진 디렉터리는 `kind: 'manifest'` descriptor를 얻고, 그 kind는 분류를 유발하지 않는다 — `package.json`만 있는 디렉터리는 organ으로 남는다.
- manifest inspection은 `exports` 키를 named surface로 반환하고, `exports` 없이 `main`만 있으면 `.` 하나를 반환한다.
- 선언이 하나도 없는 매니페스트는 빈 표면의 `exact`이고, 파싱 실패만 `indeterminate`다.
- 소스 진입점을 물으면 `unsupported` 표면을 돌려준다 — 그 표면은 레코드에서 온다.
- 다른 adapter ID의 override와 섞지 않고 전달된 exact filename만 인식한다.
- override로 주입된 경로는 `module`이 아닌 kind로 보고하고, 같은 호출에서 실제 module index는 계속 `module`로 보고한다.


### AC-ecmascript-verification-role — 이름이 후보를 고른다

- `.spec`/`.test` 접미사와 지원 확장자를 가진 파일만 후보가 된다.
- 후보는 내용과 무관하게 `discover()` 결과에 남는다. 그 파일이 정말 verification인지는 레코드의 role이 가르며, 개명만 한 프로덕션 파일은 role이 `unsupported`라 분석에서 빠진다.
- 상위 디렉터리와 dependency 디렉터리는 후보에서 제외한다.


## Boundary Exemptions

### `structure/` — 생태계 상수와 entry point 발견

- **Consumers**: `src/factsExtractor/**`
- **Direct import**: `allowed` — `structure/ecmascriptConventions.ts`, `structure/findEntryPoints.ts`, `structure/inspectManifestEntry.ts`
- **Reason**: 파싱은 추출 프로그램이 소유하지만 확장자·entry 이름 같은 생태계 상수는 이 디렉터리가 유일한 출처다(INTENT의 Never do). 레코드의 `entrySurface`는 manifest 파일에 대해 manifest 선언을 실어야 하므로 그 두 모듈도 함께 필요하다. 진입점은 discovery를 함께 노출하고 그 ignore 필터가 `git ls-files`를 하위 프로세스로 부르는데, 추출기는 번들 가드로 "프로세스 시작 0"을 강제하므로 진입점을 지날 수 없다. 상수를 복제하면 두 벌이 말없이 갈라진다.

### `verification/verificationRoleFromName.ts` — 이름이 제안하는 role

- **Consumers**: `src/factsExtractor/**`
- **Direct import**: `allowed`
- **Reason**: `.spec`·`.test` 접미사는 이 디렉터리가 소유하는 생태계 규칙이고, 서버의 discovery와 추출기의 role 확정이 **같은 규칙**을 써야 한다. 두 벌로 두면 이름 규칙이 갈려 discovery가 고른 후보와 레코드의 role이 서로 다른 파일을 말하게 된다.

## History

- 2026-09-20 — 파일 내용을 읽는 모듈(lexer, 참조 추출, entry surface 판독, case 계수, contract marker)의 소유를 추출 프로그램으로 넘겼다. 서버가 소스를 해석하지 않는다는 것이 이 단계의 계약이고(스펙 §11-8), adapter에 남는 일은 파일과 entry point의 발견이다.
- 2026-09-20 — discovery와 entry point 판독을 요청 스코프 메모 뒤에 두고, entry point descriptor를 호출자 소유 복사본으로 돌려준다. 같은 디렉터리를 파일 수만큼 다시 읽고 있었는데, 캐시를 공유 배열로 돌려주면 결과를 정렬하는 스캐너가 캐시를 오염시킨다.
- 2026-07-28 — source discovery에서 git이 무시하는 경로를 제외했다.

## Last Updated

2026-09-20 — 파싱 소유를 추출기로 넘기고 discovery·manifest만 남겼다.
