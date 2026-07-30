## Purpose

상위 Ogham 패키지가 파일을 안전하게 읽고 교체하기 위한 동기식 시스템 호출 경계다.

## Structure

| Path         | Role                                     |
| ------------ | ---------------------------------------- |
| `index.ts`   | 내부 aggregate barrel·루트 재노출 source |
| `read/`      | 목적별 판독 함수 organ                   |
| `hookIo/`    | 기존 hook용 일반 write/copy 경계         |
| `mutation/`  | 디렉터리·파일 변경 함수 organ            |
| `locking/`   | owner-token 잠금 fractal                 |
| `safety/`    | descendant symlink 검사 organ            |
| `helpers/`   | 단일 책임 내부 함수 organ                |
| `types/`     | 파일 옵션과 잠금 결과 타입 organ         |
| `__tests__/` | 동작·구조 계약 테스트 organ              |

## Conventions

- "없음"만 `null`, `[]`, `false`로 낮추고 권한/형식 오류는 throw한다.
- 공개 함수와 내부 보조 함수 모두 파일당 하나만 선언한다.
- 외부 소비자는 패키지 루트만 쓰고, 같은 패키지 subtree는 `read/`·`mutation/`·`helpers/` concrete 파일을 직접 import할 수 있다.
- hook 격리는 `sideEffects: false` tree-shaking과 emitted byte·output forbidden-pattern guard로 검증한다.
- 파일은 같은 디렉터리의 고유 임시 파일을 rename해 교체한다.
- 잠금은 원자적 lock-directory, owner token, stale quarantine을 사용한다.
- 신뢰한 root 자체는 허용하고 그 아래 기존 symlink segment만 거부한다.

## Boundaries

### Always do

- 임시 파일과 lock cleanup은 정확한 sibling 경로로 제한한다.
- lock timeout은 `acquired: false`로 반환한다.
- 기존 파일 권한은 별도 mode가 없으면 보존한다.

### Ask first

- 비동기 API 추가 또는 lock 파일 형식 변경.

### Never do

- 잠금 없이 timeout 이후 작업 실행.
- 재귀 삭제 대상을 검증되지 않은 경로나 root로 확장.
- ENOENT 이외 오류를 "없음"으로 숨김.

## Dependencies

- 내부 `paths` concrete 모듈, 외부 Node `fs`·`crypto`.
