# intentInjector — 전달 모델 기반 INTENT.md 주입 + mutation 게이트

## Purpose

Read | Write | Edit | Delete 공용 방문 파이프라인. 전달 모델("규칙이 live 컨텍스트에 존재하면 전달된 상태")의 미전달/stale/fresh 상태에 따라 소유 fractal의 `[filid:ctx]`를 주입하고, 미전달 모듈의 mutation은 규칙 본문을 실은 `[filid:gate]`로 한 번 차단-전달한다.

## Conventions

- 상태 판정·기록의 최종 권위는 `commitVisit`(cacheManager) lock 트랜잭션; 메모리 판정은 advisory 사전 필터. 같은 턴 재방문 디렉토리는 완전 무출력
- fresh(경과 < `injection.ctxTtlTurns`, 기본 5턴) → 무출력; stale → soft ctx 재전달; 미전달 → Read는 ctx, mutation은 deny(+본문) 후 재시도 통과
- mutation은 Write/Edit/Delete이며 Delete 방문도 `commitVisit`을 거쳐 owner delivery 상태를 갱신
- 게이트 면제: INTENT/DETAIL 대상(문서 위생과 삭제 보호는 validator 전담), owner INTENT 부재. INTENT.md 자기-변경은 전달로 마킹
- 전달 단위는 소유 fractal(chain 상향 첫 INTENT.md 보유 dir); 키는 `{boundary}\t{relDir}`; 서브 스코프 분리는 판별 transcript_path 제공 시 자동 활성 (현행 미제공 → 세션 공유, DETAIL 참조)
- hook guide block은 스코프당 1회, 첫 ctx(또는 첫 deny reason)에 선행

## Boundaries

### Always do

- boundary는 즉시 캐시해 chain 재계산 회피; machine path는 portable API로 정규화
- deny reason에는 항상 재시도 안내와 INTENT 본문을 포함 (bare deny 금지)
- Read/Write/Edit/Delete 모두 동일한 방문 기록과 delivery 상태 전이를 사용

### Ask first

- `[filid:ctx]`/`[filid:map]`/`[filid:gate]` 포맷 변경 (에이전트가 읽는 계약)
- TTL 기본값(5턴) 변경, INTENT/DETAIL 외 게이트 면제 목록 확장
- mutation 방문 집합 또는 Delete의 전달 상태 갱신 의미 변경

### Never do

- stale/fresh 상태에서 deny 발화 (deny는 미전달 mutation 전용)
- 프로젝트 파일 write (캐시 파일 외 부수효과 금지)
- 전달 기록을 세션 epoch 간 공유 (compact/clear 리셋 필수)
- branch 이름이나 spike 상태를 gate 입력으로 사용
