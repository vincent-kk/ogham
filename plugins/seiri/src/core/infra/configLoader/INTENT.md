# configLoader — `.seiri/config.json` 읽기·쓰기

## Purpose

프로젝트의 개입 강도 다이얼 하나를 읽고 쓴다. 저장소 루트의
`.seiri/config.json` 이 유일한 대상이며, **규칙 배포 상태는 담지 않는다** —
`.claude/rules/` 파일시스템이 그쪽의 단일 진실이라 config 사본은 드리프트만
만든다.

## Structure

```
index.ts    barrel (외부 소비자 전용 — 훅은 loaders/·utils/ 를 직접 import)
loaders/    organ — loadConfig · writeConfig · createDefaultConfig
utils/      organ — resolveConfigPath · isInterventionLevel
```

## Conventions

- `loadConfig` 는 **절대 throw 하지 않는다.** 파일 부재는 정상 상태(`config: null`),
  손상은 `warning` 을 채운 `config: null`. 둘의 구분이 렌더에서 "무시했다"를
  말할 수 있게 한다.
- 검증은 손으로 짠 predicate — 이 경로는 훅에 도달하므로 검증 런타임을 번들에
  들일 수 없다. 값이 3개짜리 enum 하나라 스키마가 필요하지 않다.
- 경로는 저장소 루트 기준(`findRepoRoot`) — 하위 디렉터리에서도 같은 다이얼.
- 경로 조합·비교는 `@ogham/cross-platform/compat` 경유 (네이티브 `node:path` 금지).

## Boundaries

### Always do

- 쓰기는 `writeAtomically` 경유 — 중단된 쓰기가 반쪽 config 를 남기지 않게.
- 새 설정 키를 늘리기 전에 "이 값의 진실을 누가 소유하는가"를 먼저 답할 것.

### Ask first

- 설정 키 추가 (다이얼 외의 값은 기본적으로 저장소나 파일시스템 소유).
- `loadConfig` 반환 형태 변경 (설정 페이지·훅 양쪽 계약).

### Never do

- 규칙 배포 상태(활성 규칙 목록)를 config 에 미러링.
- 언어 설정 보유 — 규칙 본문은 영문 고정, 출력 언어는 세션이 소유한다.
- 세션 훅에서 config 를 **쓰기** (읽기만 허용).

## Dependencies

- `../../utils/` (`findRepoRoot`·`writeAtomically`), `../../../constants/`
- `@ogham/cross-platform/compat`
