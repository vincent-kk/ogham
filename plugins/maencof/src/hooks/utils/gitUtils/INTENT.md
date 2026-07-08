# gitUtils

## Purpose

vault 커밋용 git 프리미티브 — repo 판별, scope 기반 staging(민감 파일 exclude 동반), staged 조회, 커밋, 커밋 메시지 생성. 모든 git 실행은 `runGit`(spawnCli 래퍼)을 경유하며 index.lock 충돌 시 backoff 재시도한다.

## Boundaries

### Always do

- `@ogham/cross-platform/spawn`의 spawnCli 경유 git 실행 (child_process 직접 사용 금지)
- staging pathspec에 SENSITIVE_EXCLUDE_PATH_SPECS 동반

### Ask first

- 커밋 메시지 포맷 변경
- lock 재시도 정책(GIT_LOCK_RETRY_DELAYS_MS) 변경

### Never do

- force push 실행
- scope 밖 경로를 staging에 추가
