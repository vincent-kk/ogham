# filesystem — Contract

## Requirements

- "없음"만 부재값으로 낮춘다. ENOENT 일 때 판독은 `null`(텍스트·바이트)·`[]`(디렉터리), 삭제는 `false`, mode 판독은 `undefined` 를 돌려주고, 권한·형식 등 그 밖의 오류는 그대로 throw 한다.
- 파일 교체는 같은 디렉터리의 고유 임시 파일(`<path>.tmp-<uuid>`)에 쓴 뒤 rename 한다. 도중 실패하면 그 임시 파일만 지우고 원래 오류를 전파해, 대상 디렉터리에 잔여물을 남기지 않는다.
- 기존 파일 권한은 보존한다. `fileMode` 를 명시하지 않으면 기존 파일의 mode(하위 9비트)를 그대로 다시 쓰고, 명시하면 그 값이 이긴다.
- 잠금 실패는 예외가 아니라 결과다. timeout 에 도달하면 operation 을 실행하지 않고 `acquired: false` 를 반환한다.
- symlink 검사는 신뢰한 root 자체를 허용하고 그 아래 존재하는 symlink segment 만 거부한다. root 밖으로 나가는 target 도 거부하며, 아직 존재하지 않는 경로는 통과다.
- 공개 함수든 내부 보조 함수든 production 파일 하나에 함수 하나만 선언한다(`types/`·`__tests__/` 제외).
- `helpers/` 는 organ 조직과 자식 fractal 이 함께 쓰는 내부 함수만 담는 이 fractal 의 organ 이다. `hasCode` 는 `read/`·`mutation/`·`safety/` 와 자식 fractal `locking/` 이 함께 쓰고, `readModeIfExists` 의 소비자 `mutation/writeFileAtomicallySync.ts` 는 `locking/` 밖에 있다. 두 함수의 소비자를 모두 담는 가장 낮은 fractal 이 `filesystem` 이라 여기 둔다 — `locking/helpers/` 에 두면 그 organ 을 소유자 밖에서 직접 읽는 소비자가 생긴다.
- 자식 fractal 이 `helpers/` 의 concrete 파일을 직접 import 하는 것은 소유자 subtree 안이라 면책이 필요 없다.

## API Contracts

패키지 `exports` 가 선언하는 진입은 배럴 `./filesystem`, 목적별 판독 셋(`./filesystem/read/utf8`·`./filesystem/read/bytes`·`./filesystem/read/directory`), 그리고 자식 fractal 배럴 `./filesystem/hook-io` 다. `./filesystem/read` 묶음 진입은 의도적으로 없다.

- `readUtf8FileIfExistsSync(path)` — UTF-8 텍스트 또는 `null`. `./filesystem/read/utf8` 로도 노출된다.
- `readFileIfExistsSync(path)` — `Uint8Array` 또는 `null`. `./filesystem/read/bytes` 로도 노출된다.
- `listDirectoryIfExistsSync(path)` — 엔트리 이름 배열, 없으면 `[]`. `./filesystem/read/directory` 로도 노출된다.
- `ensureDirectorySync(path, options?)` — 중첩 디렉터리 생성(recursive), `mode` 선택.
- `removeFileIfExistsSync(path)` — 삭제하면 `true`, 원래 없었으면 `false`.
- `writeFileAtomicallySync(path, content, options?)` — 임시 파일 + rename 교체. `fileMode`·`directoryMode` 선택.
- `assertNoSymlinkDescendantsSync(root, targetPath)` — 위반 시 throw, 통과 시 반환값 없음.
- `withFileLockSync(path, operation, options?)` — `locking/` 자식 fractal 이 소유하는 유일한 공개 함수. `FileLockResult<T>` 반환.
- 타입 `AtomicWriteOptions`·`EnsureDirectoryOptions`·`FileLockOptions`·`FileLockResult` — `types/` organ 선언, 배럴이 이름으로 재수출.
- `hookIo/` 자식 fractal — 훅용 일반 `writeUtf8FileSync`·`copyFileSync` 와 판독 재수출. atomic write·잠금을 제공하지 않는다.

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

### AC-lean-read-entries — 목적별 판독 진입

- 매니페스트에 `./filesystem/read` 가 없고 목적별 세 진입이 있으며, `read/index.ts` 가 존재하지 않는다.
- `./filesystem/hook-io` 가 atomic mutation 과 분리된 진입으로 선언되어 있다.

### AC-one-function-per-file — 파일당 함수 하나

- `types/`·`__tests__/` 를 뺀 모든 production 파일이 함수 선언을 하나만 갖는다.

## Boundary Exemptions

### `read` — Hook bundle lean entry

- **Consumers**: `plugins/filid/src/**`, `plugins/seiri/src/**`, `shared/agent-artifacts/src/**`
- **Direct import**: `allowed`
- **Reason**: 이 organ 의 파일들은 `filesystem/read/utf8`·`read/bytes`·`read/directory` 서브패스로 패키지가 직접 선언한 진입이고, 소비자는 크기 가드를 받는 훅 도달 코드다. `filesystem` 배럴을 거치면 판독 한 줄에 `locking/`(대기·quarantine·`node:crypto`)과 `mutation/` 그래프가 함께 실린다. `INTENT.md` 의 "읽기 전용 hook 은 `filesystem/read/*` 목적별 entry 만 import 한다" 가 같은 계약을 선언한다.

## Last Updated

2026-07-30 — 부재/오류 구분·원자적 교체·잠금 보고 계약, `helpers/` 배치 근거와 판독 진입 면책을 문서화했다.
