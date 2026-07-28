## Purpose

user와 project 두 config 레이어 파일의 좌표를 정하고, 읽고, 쓰고, 소비자가
한 번에 조회할 `ConfigScopeState`로 조립한다. 값의 의미는 모른다.

## Structure

| File                        | Role                                     |
| --------------------------- | ---------------------------------------- |
| `index.ts`                  | public barrel                            |
| `resolveConfigLayers.ts`    | 두 레이어 파일의 절대 경로 계산          |
| `readConfigLayers.ts`       | 두 레이어 원문 읽기                      |
| `writeConfigLayer.ts`       | 한 레이어 원자적 교체                    |
| `buildConfigScopeState.ts`  | 읽기 + 병합 + 재정의 목록 조립           |
| `utils/readLayer.ts`        | 한 파일 읽기·파싱·경고                   |
| `utils/findForbiddenKeys.ts`| 원문의 위험 키 dot path 수집             |

## Conventions

- 형제 모듈은 진입점으로 소비한다: `../merge/index.js`,
  `../../paths/index.js`, `../../filesystem/index.js`.
- 좌표 계산과 디스크 조회를 분리한다. `resolveConfigLayers`는 파일 존재를
  보지 않는다.
- 원문 문서는 정화하지 않는다. `FORBIDDEN_KEYS`는 경고만 남기고 그대로 둔다.

## Boundaries

### Always do

- 파일 쓰기는 `writeFileAtomicallySync`와 `ensureDirectorySync`를 거친다.
- 부재는 `null`, 손상은 `null` + `warnings`로 구별 가능하게 남긴다.
- project 레이어 쓰기 요청인데 경로가 없으면 던진다. 조용히 user에 쓰지 않는다.

### Ask first

- `ConfigScopeState` 필드 추가·삭제. 설정 페이지 wire 계약이다.
- 기본 파일 이름이나 project 디렉터리 이름 규칙 변경.

### Never do

- 레이어 읽기에서 던지기. 손상된 config 하나가 세션을 죽여서는 안 된다.
- 프로젝트 루트를 스스로 추측하기. 앵커 규칙은 플러그인마다 다르므로
  해석된 절대 경로를 호출자가 넘긴다.
- `node:fs` / `node:path` 직접 호출.

## Dependencies

- 내부: `configScope/merge`, `filesystem`, `paths`.
- 외부: 없음.
