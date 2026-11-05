# setup -- SessionStart 초기화

## Purpose

SessionStart에서 FCA opt-in 탐지와 cache·전달 epoch의 수명을 관리한다. 규칙 배포와 config 생성은 setup 스킬에 맡긴다.

## Conventions

- Bootstrap 진단은 Node builtin spawn만 번들하는 selfProbeHook을 사용한다. 범용 프로세스 도구를 가져오면 hook 번들 예산을 넘는다.
- compact/clear는 컨텍스트를 잃으므로 전달 기록을 재무장하고, resume/startup은 기존 컨텍스트가 살아 있으므로 보존한다. boundary 재계산 비용은 filesystem 사실의 정합성을 위해 수용한다.
- 자동 탐지는 INTENT 존재만으로 opt-in하며 config 생성과 규칙 배포는 setup 스킬의 책임이다.
- session prune과 전체 cache prune은 독립 throttle을 사용한다. 한 작업의 실행 여부가 다른 정리를 막지 않게 한다.
- 초기화 진단은 FCA 프로젝트에만 전달하고 실패는 세션 시작을 막지 않는다.

## Boundaries

### Always do

- 로거는 `createLogger('setup')`으로 네임스페이스 고정
- 어떤 실패에도 세션 시작을 블록하지 않음 (`continue: true` 보장)
- `.claude/rules/`는 read-only로만 취급 (deploy 금지)

### Ask first

- `hasIntentMdInTree`의 `maxDepth` 변경 (기본 4)
- Phase 2 자동 감지 조건 수정 (예: `package.json`도 검사)

### Never do

- `.claude/rules/filid_*.md` 등 rule doc 파일을 write
- `.filid/config.json` 자동 생성 (setup 스킬 전담)
- daily throttle 게이트 (`isPruneDue` / `isSessionPruneDue`) 우회로 매 세션마다 prune 강제 실행
- 범용 self-probe·spawn·cross-spawn·which를 SessionStart 번들에 포함

## Dependencies

- 캐시 디렉터리·세션 파일·prune 게이트는 `../../core/infra/cacheManager/` 한 곳에서만 온다.
- 로거·스캔 상수·문서 파일명·훅 타입과 cross-platform 유틸은 상위 계층 공개 경계로만 접근한다.
