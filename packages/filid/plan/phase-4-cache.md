# Phase 4: 디스크 캐시

> 상태: 미결 사항 결정 필요 (#3, #4)

## 목표

INTENT.md 체인 탐색 결과를 디스크에 캐싱하여 Hook 실행 시 반복적인 fs 탐색을 회피한다.

## 선행 조건

- Phase 3 완료 (주입 시스템이 캐시 소비자)

## 캐시 구조

```
~/.claude/plugin/filid/{project-hash}/cache.json
```

```json
{
  "version": 1,
  "project_root": "/path/to/project",
  "built_at": "2026-03-09T09:00:00+09:00",
  "git_head": "abc1234",
  "tree": {
    "src/payment/checkout/": {
      "chain": ["./", "src/", "src/payment/", "src/payment/checkout/"],
      "mtimes": {
        "./INTENT.md": 1741478400,
        "src/INTENT.md": 1741478400,
        "src/payment/INTENT.md": 1741478400,
        "src/payment/checkout/INTENT.md": 1741478400
      }
    }
  }
}
```

## 무효화 전략

### mtime 기반 (파일 단위)

- 캐시된 mtime과 실제 mtime 비교
- 변경된 INTENT.md만 재읽기 (chain 전체 무효화 아님)

### git HEAD 기반 (프로젝트 단위)

- branch 전환 감지 → HEAD 변경 시 무효화
- **미결 #4**: 전체 무효화 vs `git diff --name-only`로 변경 파일만 선택적 무효화

## `filid build` 프리빌드

프로젝트 전체 INTENT.md를 사전 스캔하여 캐시 일괄 구성.

- CI/CD 또는 git hook (post-checkout, post-merge)에서 자동 실행 가능
- **미결 #3**: Hook 내 자동 실행 vs 별도 CLI 패키지로 배포

## 캐시 히트/미스 흐름

```
PreToolUse(file) →
  1. project-hash 계산
  2. cache.json 존재? → 없으면 전체 스캔 + 캐시 생성
  3. git_head 일치? → 불일치 시 무효화 전략 적용
  4. 해당 디렉토리 엔트리 존재? → 없으면 해당 체인만 스캔
  5. mtime 비교 → 변경된 파일만 재읽기
  6. 캐시 업데이트 + 결과 반환
```

## 산출물

- `CacheManager` 모듈
- `cache.json` 읽기/쓰기/무효화
- `filid build` 커맨드 (또는 Hook 내 자동 빌드)
- 미결 사항 #3, #4 결정 문서
