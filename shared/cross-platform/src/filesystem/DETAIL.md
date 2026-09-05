# filesystem — Contract

## Requirements

- "없음"만 부재값으로 낮춘다. ENOENT 일 때 판독은 `null`(텍스트·바이트)·`[]`(디렉터리), 삭제는 `false`, mode 판독은 `undefined` 를 돌려주고, 권한·형식 등 그 밖의 오류는 그대로 throw 한다.
- 파일 교체는 같은 디렉터리의 고유 임시 파일(`<path>.tmp-<uuid>`)에 쓴 뒤 rename 한다. 도중 실패하면 그 임시 파일만 지우고 원래 오류를 전파해, 대상 디렉터리에 잔여물을 남기지 않는다.
- 기존 파일 권한은 보존한다. `fileMode` 를 명시하지 않으면 기존 파일의 mode(하위 9비트)를 그대로 다시 쓰고, 명시하면 그 값이 이긴다.
- 잠금 실패는 예외가 아니라 결과다. timeout 에 도달하면 operation 을 실행하지 않고 `acquired: false` 를 반환한다.
- symlink 검사는 신뢰한 root 자체를 허용하고 그 아래 존재하는 symlink segment 만 거부한다. root 밖으로 나가는 target 도 거부하며, 아직 존재하지 않는 경로는 통과다.
- target canonicalization은 가장 가까운 기존 ancestor를 `realpath`로 해석하고 suffix를 다시 붙인다. 기존 symlink의 referent가 없어도 link target을 따라가며, 순환 link의 native `ELOOP`는 전파한다. `preserveTerminalEntry`는 terminal basename을 suffix로 먼저 분리해 unlink 위치를 보존한다. ENOENT만 fallback을 허용하며 다른 filesystem 오류는 보존한다.
- 공개 함수든 내부 보조 함수든 production 파일 하나에 함수 하나만 선언한다(`types/`·`__tests__/` 제외).
- `helpers/` 는 organ 조직과 자식 fractal 이 함께 쓰는 내부 함수만 담는 이 fractal 의 organ 이다. `hasCode` 는 `read/`·`mutation/`·`safety/` 와 자식 fractal `locking/` 이 함께 쓰고, `readModeIfExists` 의 소비자 `mutation/writeFileAtomicallySync.ts` 는 `locking/` 밖에 있다. 두 함수의 소비자를 모두 담는 가장 낮은 fractal 이 `filesystem` 이라 여기 둔다 — `locking/helpers/` 에 두면 그 organ 을 소유자 밖에서 직접 읽는 소비자가 생긴다.
- 자식 fractal 이 `helpers/` 의 concrete 파일을 직접 import 하는 것은 소유자 subtree 안이라 면책이 필요 없다.

## API Contracts

이 fractal의 외부 공개 주소는 `@ogham/cross-platform` 패키지 루트 하나다. `filesystem/index.ts`, 하위 organ의 concrete 파일, `hookIo/`·`locking/` 자식 fractal entry는 패키지 내부 조직과 루트의 이름 있는 재노출 source일 뿐 별도 외부 공개 주소가 아니다. 같은 패키지 subtree는 concrete 파일을 직접 import할 수 있다. Hook 번들은 루트에서 필요한 심볼만 고르고, `sideEffects: false` tree-shaking과 emitted byte·output forbidden-pattern guard로 사용하지 않은 파일 I/O·잠금 코드가 출력에 기여하지 않음을 검증한다.

- `readUtf8FileIfExistsSync(path)` — UTF-8 텍스트 또는 `null`.
- `readFileIfExistsSync(path)` — `Uint8Array` 또는 `null`.
- `listDirectoryIfExistsSync(path)` — 엔트리 이름 배열, 없으면 `[]`.
- `canonicalizeTargetPathSync(cwd, targetPath, options?)` — host-canonical 기존 ancestor와 정규화된 suffix를 합친 절대 target 경로. `preserveTerminalEntry`는 terminal symlink를 역참조하지 않는다.
- `ensureDirectorySync(path, options?)` — 중첩 디렉터리 생성(recursive), `mode` 선택.
- `removeFileIfExistsSync(path)` — 삭제하면 `true`, 원래 없었으면 `false`.
- `writeFileAtomicallySync(path, content, options?)` — 임시 파일 + rename 교체. `fileMode`·`directoryMode` 선택.
- `assertNoSymlinkDescendantsSync(root, targetPath)` — 위반 시 throw, 통과 시 반환값 없음.
- `withFileLockSync(path, operation, options?)` — `locking/` 자식 fractal 이 소유하는 유일한 공개 함수. `FileLockResult<T>` 반환.
- 타입 `AtomicWriteOptions`·`EnsureDirectoryOptions`·`FileLockOptions`·`FileLockResult` — `types/` organ 선언, 배럴이 이름으로 재수출.
- `hookIo/` 자식 fractal — 패키지 내부에서 훅용 일반 `writeUtf8FileSync`·`copyFileSync` 와 판독을 조직한다. atomic write·잠금을 제공하지 않는다.

## Acceptance Criteria

### AC-absence-vs-error — 부재와 오류 구분

- 텍스트·바이트 판독이 파일 부재에만 `null` 을 돌려주고, 없는 디렉터리 나열은 `[]` 이며, 존재하지 않는 파일 삭제는 `false` 다.

### AC-atomic-replace — 원자적 교체와 권한 보존

- 중첩 경로 생성과 재기록 후 대상 디렉터리에 임시 파일이 남지 않는다.
- 교체가 실패해도 sibling 임시 파일이 정리된 채 오류가 전파된다.
- `fileMode` 를 주지 않은 재기록이 기존 mode 를 유지하고, 명시하면 그 값으로 바뀐다(POSIX 한정).

### AC-lock-timeout — 잠금 timeout 보고

- live lock 이 timeout 에 도달하면 operation 이 호출되지 않고 `acquired: false` 가 반환된다.
- 정상 획득은 operation 결과를 `acquired: true` 와 함께 돌려주고 lock 디렉터리를 남기지 않는다.
- stale lock 은 quarantine 후 재획득되며, 다른 writer 가 소유한 교체 lock 은 해제하지 않는다.

### AC-symlink-containment — symlink 봉쇄

- root 아래의 기존 symlink segment 를 거부하면서 root 자체는 통과시킨다.

### AC-target-canonicalization — host target 해석

- 기존 case alias와 symlink ancestor는 실제 target spelling으로 canonicalize되고, 존재하지 않는 leaf는 canonical parent 아래에 유지된다.
- referent가 아직 없는 terminal·ancestor symlink도 상대·절대 target과 link chain을 해석한다. 상대 target의 `..`는 symlink의 물리 parent를 기준으로 해석하며, link가 아닌 missing path의 suffix는 그대로 보존한다.
- 입력 path와 link target은 root만 기준 경로에 고정하고 남은 component를 native lookup까지 보존한다. 따라서 `directory-alias/..`는 alias를 따라간 뒤 계산하며 Windows root-relative target은 symlink parent의 drive에 고정한다.
- terminal symlink entry 보존 옵션은 parent alias만 해석하고 symlink basename을 유지해 unlink 대상과 같은 경로를 반환한다.
- terminal entry 보존은 dangling symlink도 역참조하지 않으며, 기본 해석의 순환 link는 native `ELOOP` 오류를 전파한다.
- ENOENT 이외의 realpath 오류는 조용히 lexical path로 낮추지 않는다.

### AC-lean-read-entries — 루트 공개와 hook 출력 격리

- 매니페스트에 filesystem 하위 공개 주소가 없고 공개 filesystem 심볼은 패키지 루트에서 이름으로 재노출된다.
- 루트 import를 쓰는 hook 번들이 정해진 byte cap 이내이며 output forbidden pattern을 포함하지 않는다.
- 같은 패키지 subtree의 concrete import는 외부 공개 주소나 면책으로 취급하지 않는다.

### AC-one-function-per-file — 파일당 함수 하나

- `types/`·`__tests__/` 를 뺀 모든 production 파일이 함수 선언을 하나만 갖는다.

## Boundary Exemptions

### `read` — Package root의 lean named export

- **Consumers**: `**/src/index.ts`
- **Direct import**: `allowed`
- **Reason**: package manifest의 유일한 외부 주소가 각 공개 symbol을 concrete source에서 이름으로 재노출한다. 중간 aggregate barrel을 건너뛰어 제한 훅의 tree-shaken output이 실제 사용한 filesystem operation만 retain하도록 하며, bundle byte·forbidden-pattern guards가 이 결정을 검증한다.

## Last Updated

2026-09-05 — missing referent의 symlink target 해석과 반복 link 종료 조건을 명시했다.
