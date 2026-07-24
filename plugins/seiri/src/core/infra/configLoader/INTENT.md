# configLoader — 개입 강도 다이얼

## Purpose

다이얼 하나를 읽고·쓰고·설명한다. **규칙 배포 상태는 담지 않는다** —
`.claude/rules/` 파일시스템이 그쪽의 단일 진실이라 사본은 드리프트만 만든다.

## Structure

```
index.ts    barrel (외부 소비자 전용 — 훅은 loaders/·utils/ 를 직접 import)
loaders/    organ — loadConfig · loadIntervention · writeConfig
                    · writeRuntime · clearRuntime · createDefaultConfig
utils/      organ — readDialFile · resolveConfigPath · resolveRuntimePath
                    · isInterventionLevel · describeDial · renderPostureLines
```

## Conventions

- **2계층**: 기준선 `config.json`(커밋, setup 표면 전용) + 런타임 밸브
  `runtime.json`(비추적, `config` action 전용). 유효값 `runtime ?? baseline ?? standard` 를 매 훅 재계산한다.
- 읽기는 **절대 throw 하지 않는다.** 부재는 정상 상태, 손상은 건너뛰고
  `warnings` 가 파일을 지목한다 — 그래야 조용한 오버라이드가 없다.
- 두 계층은 같은 한 키짜리 객체라 `readDialFile` 하나로 파싱한다.
- 검증은 손으로 짠 predicate — 훅 경로라 검증 런타임을 들일 수 없다.
- 경로는 저장소 루트 기준(`findRepoRoot`)이라 워크트리끼리 밸브가 안 샌다.
  조합·비교는 `cross-platform/compat` 경유 (네이티브 `node:path` 금지).

## Boundaries

### Always do

- 쓰기는 `writeAtomically` 경유 — 반쪽 파일을 남기지 않게.
- 새 설정 키 전에 "이 값의 진실을 누가 소유하는가"를 먼저 답할 것.

### Ask first

- 설정 키 추가 (다이얼 외의 값은 저장소나 파일시스템 소유).
- 반환 형태 변경 (페이지·훅·도구 세 계약).

### Never do

- 규칙 배포 상태를 config 에 미러링.
- 언어 설정 보유 — 출력 언어는 세션이 소유한다.
- 세션 훅에서 다이얼 **쓰기** (읽기만 허용).

## Dependencies

- `../../utils/`, `../../../constants/`, `@ogham/cross-platform/compat`
