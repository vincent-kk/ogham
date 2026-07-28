# configManager

## Purpose

config 의 dot-path 기반 접근 및 관리. user(호스트 상태 루트)와 project(`<cwd>/.imbas/config.json`) 두 레이어이며 project 가 user 를 재정의한다.

## Structure

| File                    | Role                                                                           |
| ----------------------- | ------------------------------------------------------------------------------ |
| `configManager.ts`      | load(병합) · loadConfigByScope(레이어별) · loadConfigScope · save(단일 레이어) |
| `utils/configLayers.ts` | 두 레이어 좌표 해석                                                            |
| `index.ts`              | barrel                                                                         |

## Conventions

- 검증은 병합 결과에만 건다. project 레이어는 재정의한 키만 담아 단독으로 스키마를 통과할 수 없다.
- 저장 레이어는 호출자가 지목한다. 기본값을 두지 않는다 — 둘 다 유효한 대상이라 조용한 기본값은 잘못된 파일을 쓴다.

## Boundaries

### Always do

- 파일 I/O는 `@ogham/cross-platform/config-scope` 경유
- 두 레이어 모두 부재는 정상 상태 — 검증된 기본값을 돌려준다

### Ask first

- 설정 스키마 변경
- 레이어 개수·우선순위 변경

### Never do

- 직접 fs.writeFileSync 호출
- 병합 결과를 어느 한 레이어에 되쓰기 — project 재정의가 user 기본값에 구워진다
