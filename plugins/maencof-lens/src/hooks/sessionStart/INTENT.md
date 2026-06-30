## Purpose

SessionStart 훅 구현. 진입 시 spawn 없는 환경 자가진단(node/PATH/CLAUDE_PLUGIN_ROOT) 후, 설정이 있으면 볼트 상태를 확인하고 스킬 가이드를 주입한다.

## Structure

| File / Dir              | Role                                           |
| ----------------------- | ---------------------------------------------- |
| `sessionStart.ts`       | config 감지 → 볼트 상태 → 가이드/advisory 조립 |
| `sessionStart.entry.ts` | esbuild 진입점 (진단 + 결과 stdout)            |
| `probe/`                | spawn-free 환경 진단 (process.versions/env)    |

## Boundaries

### Always do

- 이 모듈의 단일 책임을 유지한다
- 변경 시 관련 테스트를 함께 업데이트한다

### Ask first

- 공개 API 시그니처 변경
- 다른 모듈에 대한 새로운 의존성 추가

### Never do

- 순환 의존성 도입
- organ 경계를 넘는 직접 import
