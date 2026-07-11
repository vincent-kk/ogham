# vaultCommitter

## Purpose

볼트 변경사항 Git 자동 커밋. MCP bootSweep(직전 세션 마무리)과 UserPromptSubmit(skip_patterns 매칭, 기본 /clear)에서 opt-in 방식으로 동작. 커밋 범위는 `vault-commit.json::scope`(기본: 5-Layer 문서 트리 + .maencof-meta/)로 제어하고, 당일 자동 커밋은 `helpers/foldDaily`가 하루 1커밋으로 접는다. 커밋 게이트는 live index.lock 을 존중하되 stale lock(mtime 임계 초과)은 회수한다.

## Structure

- `index.ts` — 순수 barrel (공개 API: readVaultCommitConfig/shouldCommitOnPrompt/isClearCommand/runVaultCommitter + DEFAULT_SKIP_PATTERN_SOURCE + 타입)
- `types/` organ — 공개 타입 (VaultCommitConfig/VaultCommitterInput/VaultCommitterEvent/VaultCommitterResult)
- `operations/` organ — config 읽기·프롬프트 판별·커밋 오케스트레이션 (함수 1개/파일)
- `helpers/foldDaily/` — 당일 자동 커밋 폴딩 (git reset --soft, 실패 시 ORIG_HEAD 복구)

## Boundaries

### Always do

- vault-commit.json의 enabled: true 확인 후 실행 (opt-in 전용)
- gitUtils로 커밋 실행 (index.lock 체크 선행)
- staging 시 SENSITIVE_EXCLUDE_PATH_SPECS 동반 (민감 파일 2차 방어)
- UserPromptSubmit 이벤트에서는 skip_patterns(기본 /clear) 매칭 후에만 실행

### Ask first

- 커밋 전략 변경
- 자동 커밋 트리거 이벤트 추가
- 기본 scope(DEFAULT_COMMIT_SCOPE) 구성 변경

### Never do

- 사용자 리포지토리에 force push
- vault-commit.json 없이 자동 커밋 실행
- .maencof/ 그래프 캐시를 기본 scope에 포함
- 수동(비자동) 커밋을 폴딩 대상에 포함
