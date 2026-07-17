---
id: plugins-filid-src-core-infra-cacheManager-4d8f79
fractal_path: plugins/filid/src/core/infra/cacheManager
file_path: plugins/filid/src/core/infra/cacheManager/caches/fmapLock.ts
created_at: "2026-07-17T15:07:01Z"
review_branch: feat/filid-delivery-model-injection
original_fix_id: FIX-004
severity: MEDIUM
weight: 1
touch_count: 0
last_review_commit: null
rule_violated: ops-lock-fencing
metric_value: PLAUSIBLE — lock ownership token absent (acquireLock stale-eviction L18 + releaseLock L30 both unfenced; lock is an empty mkdir dir)
---

# 기술 부채: fmapLock 소유권 토큰 부재 — 축출-중-홀드 레이스 (fencing 유예)
## 원래 수정 요청
acquireLock 시 lockPath 내부에 pid+timestamp 토큰을 기록하고, releaseLock 과 stale-eviction 양쪽 모두 삭제 전 토큰 일치를 확인하는 fencing 을 추가할 것. 락을 1초 이상 홀드시킨 상태에서 2번째 획득자가 살아있는 락을 축출하고 원소유자의 releaseLock 이 2번째의 락을 제거하는지 검증하는 회귀 테스트를 함께 추가.
## 개발자 소명
5건 중 유일한 PLAUSIBLE 판정. 소유권 미검증(빈 디렉터리 락, releaseLock 의 locked 는 호출자 로컬 기억일 뿐)은 코드로 확정된 사실이나 발동 트리거가 비현실적이다: commitVisit 임계구역은 동기 fs read 2 + writeAtomic 1~2 로 로컬 디스크에서 sub-ms 이고, acquireLock 데드라인 100ms 는 stale 임계값 1s 보다 짧아 대기 프로세스는 evict 를 발동시키기 전에 lockless 로 degrade 한다. 리뷰어 자신도 '확정 방법: fake timer 로 1초 홀드 테스트' 를 요구했다 — 실증 회귀 테스트 없이 fencing 을 지금 넣는 것은 과대응. 부채로 유예하고 확정 테스트를 ADR 에 명시한다.
## 정제된 ADR
ADR-2026-07-17: fmapLock ownership-token fencing deferred. Context: operations-sre 가 ops-lock-fencing (MEDIUM) 제기 — acquireLock 의 stale eviction(fmapLock.ts:18, 1s 나이 초과 시 rmdirSync)과 releaseLock(:30 무조건 rmdirSync) 모두 소유권 토큰 검증이 없고 락은 내용 없는 mkdir 디렉터리다. 리뷰 등급은 5건 중 유일한 PLAUSIBLE. Decision: 부채로 유예. 메커니즘은 실재하나 발동 조건(임계구역 홀드 > 1s)이 로컬 디스크 sub-ms 실행 + acquireLock 100ms<1s 데드라인 구조상 비현실적이라, 실증 없는 선제 fencing 은 과대응. Consequences: 디스크 경합/프로세스 정지/네트워크 FS 에서 임계구역이 1s 를 넘으면 축출-중-홀드 레이스로 delivered/fmap 기록이 last-writer-wins 로 유실·중복될 수 있다(이 PR 이 직렬화로 없애려던 레이스의 재발). 해소 방법: fake timer 또는 주입된 stall 로 락을 1s+ 홀드시킨 상태에서 (a) 2번째 획득자가 살아있는 락을 축출하고 (b) 원소유자 releaseLock 이 2번째의 락을 삭제하는지 검증하는 회귀 테스트를 먼저 추가한다. 그 테스트가 레이스를 재현하면 pid+timestamp fencing 을 구현하고 즉시 승격한다.
