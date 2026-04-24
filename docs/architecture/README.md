# 아키텍처 문서 인덱스

> Plan D (2026-04-23) 산출물.
> 코드를 건드리기 전에 구조를 먼저 파악한다. 모든 리팩토링·버그 픽스는 이 문서들의 근거로 움직여야 한다.

## 문서 목록

| 번호 | 문서 | 역할 |
|------|------|------|
| 1 | [data-sources.md](./data-sources.md) | 데이터 파일 인벤토리 + 로드 플로우 (Mermaid 포함) |
| 2 | [calc-registry.md](./calc-registry.md) | `CALC.*` 함수 × `DATA` 참조 × 규정 조항 매트릭스 (드리프트 감지 근거) |
| 3 | [integration-points.md](./integration-points.md) | 탭 간 이벤트/주입 경로 맵 |
| 4 | [sot-drift-risk.md](./sot-drift-risk.md) | 드리프트 위험 매트릭스 + 실증 8건 + 개선안 Tier 1/2/3 |
| 5 | [known-issues.md](./known-issues.md) | 확실한 Latent 버그 12건 + 미검증 경로 17건 |

## 머신 리더블 SoT (Plan E 산출)

| 파일 | 역할 |
|------|------|
| [`data/calc-registry.json`](../../data/calc-registry.json) | DATA 값 assert 대상 + CALC 함수 존재성 + 외부 참조 무결성 (20 data_values + 1 array 7 items + 20 functions + 2 references) |
| [`tests/unit/calc-registry.test.js`](../../tests/unit/calc-registry.test.js) | Vitest drift-check — 43 active assert + 7 skip |

### 단협 개정 시 업데이트 순서

1. `full_union_regulation_2026.md` 전문 수정 (사용자 관리)
2. `hospital_guidelines_2026.md` 축약 갱신
3. `data.js` DATA_STATIC 수치 반영
4. `data/calc-registry.json` expected 값 동기화
5. `npm test` 실행 → drift 0 확인

하나라도 스킵하면 Vitest 가 실패로 감지한다.

### Plan F 실행 후 승격 예정

`tests/unit/calc-registry.test.js` 의 7개 `.skip` 은 Plan F Bug 수정 후 `.skip` 제거하면 자동으로 green 승격:
- 5개 dead export (calcSeverancePay/calcPromotionDate/calcNursePay/calcUnionStepAdjust/checkNurseScheduleRules) 제거
- 2개 broken refs (calcRetirement 추가, calcServiceYears 네임스페이스 수정)

## Plan D 감사 결과 요약

### SoT 계층

```
data/full_union_regulation_2026.md  (⭐ canonical 단협 전문 — 사용자 관리)
    ↓ 사람 수동
hospital_guidelines_2026.md        (축약) ──┐
union_regulation_2026.json         (조항)  ─┤→ regulation.html
data.js DATA_STATIC                (계산값)──┴→ calculators.js → UI 탭
```

연결 메커니즘은 **전부 사람 의존**. 자동 검증 없음.

### 주요 발견 (12 latent bugs)

- `CALC.calcRetirement` — 호출은 있으나 함수 정의 없음 (app.js:1347, silent try/catch).
- `CALC.calcServiceYears` 네임스페이스 오류 — 실제는 `PROFILE.calcServiceYears`, 파서가 serviceYears=0 으로 고정.
- `calcNursePay` 내부 상수 하드코딩 — `DATA.allowances.preceptorPay` 있음에도 미참조.
- `recoveryDay.otherCumulativeTrigger` 부분 구현 — 시설직 리커버리 데이 누락.
- **data.js 내부 값 모순**: 장기재직 휴가 20년+ "7일 (line 299) vs 10일 (line 421)" 동일 파일 내 불일치.
- `applyProfileToOvertime` 이 `profileChanged` 미수신 → 프로필 저장해도 시간외 탭 시급 즉시 갱신 안 됨 (사용자 체감 "연동 안 됨" 원인).
- `profileChanged` 수신자 단 1곳 (pay-estimation.js:873) — 홈/설정 등 갱신 안 됨.
- `leaveRecords` 키 고정 (getUserStorageKey 미적용) — 멀티 유저 환경 데이터 섞임 위험.
- 급여명세서 체인 중복 구현 (app.js + payroll-views.js).
- 미사용 공개 함수 3개 (calcSeverancePay, checkNurseScheduleRules, calcPromotionDate).
- `showOtToast('메시지', 4500)` 시그니처 불일치 (app.js:3598).
- `localhost:3001/api/data/bundle` CSP 차단 (콘솔 오염).

### 후속 플랜 제안

**실행 순서**:

| 순서 | 플랜 | 범위 | 효과 |
|------|------|------|------|
| 1 | **Plan E** | Calculator Registry 자동 검증 + SoT JSON 분리 | 드리프트 자동 감지 (모든 후속 작업의 안전망) |
| 2 | **Plan F** | 확실한 latent 버그 12건 수정 | Plan E 가 재발 방지 |
| 3 | **Plan G** | 통합 e2e + profileChanged 수신자 확장 | 사용자 체감 "연동 안 됨" 해소 |
| 4 | **Plan H** | retirement.html, regulation.html, 급여/수당, AppLock 등 | 범위 확장 |

## 사용 규칙

- **단협 개정 시:** 이 디렉토리 5개 문서 **전수 재검토**. 어느 하나라도 outdated 면 스테일.
- **새 계산 함수 추가 시:** calc-registry.md 매트릭스에 행 추가 + 규정 조항 연결.
- **새 탭 간 이벤트 추가 시:** integration-points.md 테이블 업데이트.
- **신규 데이터 파일 추가 시:** data-sources.md 에 반드시 등재.
- **버그 발견 시:** known-issues.md 에 Bug N 형식으로 기재.
- **드리프트 위험 변화:** sot-drift-risk.md 매트릭스 + 실증 사례 갱신.

## 관련 플랜 문서

- [Plan D 자체](../superpowers/plans/2026-04-23-plan-d-sot-audit.md) — 본 감사 실행 계획서.
- Plan E/F/G/H — 본 감사 결과를 기반으로 추후 작성 예정.
