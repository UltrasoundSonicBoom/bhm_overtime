---
name: smate-payroll-review
description: "SNUHmate 급여·퇴직금 회귀 리뷰 파이프라인. 단협·호봉표·계산기·명세서 파서 변경의 영향을 도메인 전문가와 테스트 영향 분석가가 협업해 검증한다. '계산기 바꿨어', '단협 데이터 수정했어', '명세서 파서 손봤어', '퇴직금 로직 검토', '파서 회귀 테스트', '호봉표 drift 확인' 등 급여 관련 코드 변경 검토에 사용한다. 단, 새로운 명세서 형식 파서 *추가*는 별도 워크플로우(향후 smate-parser-add)이고, 단협 *원문 마크다운* 갱신은 smate-regulation-sync 영역."
---

# SNUHmate Payroll Review — 급여·퇴직금 회귀 리뷰 파이프라인

급여/퇴직금/단협/호봉표/명세서 파서 변경의 회귀 영향을 체계적으로 점검한다. 도메인 전문가와 테스트 영향 분석가가 SendMessage로 협업한다.

## 언제 사용

- `packages/calculators/src/` 변경 (`retirement-engine.js`, `holidays.js`, `index.js`)
- `apps/web/src/client/salary-parser.js`, `payslip-llm-verify.js`, `retirement-payslip-sync.js` 변경
- `apps/web/public/data/union_regulation_2026.json`, `full_union_regulation_2026.md` 변경
- `apps/web/public/data/calc-registry.json` 변경
- `packages/regulation-constants/`, `packages/profile/src/payroll.js`, `packages/profile/src/overtime.js`, `packages/profile/src/leave.js` 변경
- 새 호봉 데이터 추가
- "이 변경이 명세서 파싱·계산 결과에 영향 주나?" 의문이 들 때

## 에이전트 구성

| 에이전트             | 파일                                     | 역할                                                                 | 타입            |
| -------------------- | ---------------------------------------- | -------------------------------------------------------------------- | --------------- |
| smate-payroll-domain | `.claude/agents/smate-payroll-domain.md` | 단협·호봉표·계산기·파서 도메인 지식. 변경의 의미와 1차/2차 영향 평가 | general-purpose |
| smate-test-impact    | `.claude/agents/smate-test-impact.md`    | 파일·심볼 → 테스트 매핑. 깨질 가능성 있는 테스트 + 누락 커버리지     | general-purpose |

## 워크플로우

### Phase 1: 입력 정리 (오케스트레이터 직접 수행)

1. 사용자 입력에서 추출:
   - **변경 범위**: 변경된 파일 경로 또는 PR 번호 또는 `git diff` 출력
   - **변경 의도**: 사용자가 1줄로 설명한 "왜 바꿨는가" (예: "2027 호봉표 추가", "야간수당 가산율 단협 개정 반영")
   - **베이스라인**: 기준 브랜치 (기본 `main`)
2. `_workspace/` 디렉토리를 프로젝트 루트에 생성 (없으면)
3. 입력을 `_workspace/00_input.md` 에 정리:

```markdown
# 입력

- 변경 범위: <파일 목록 또는 PR 번호>
- 변경 의도: <한 줄>
- 베이스라인: main
- diff 요약: $(git diff --stat <base>..HEAD)
```

4. 베이스라인 단위 테스트 1회 실행 → 통과 확인 (실패 중인 테스트가 있으면 회귀 분석이 의미 없음):

```bash
pnpm test:unit 2>&1 | tail -20
```

베이스라인이 깨져있으면 사용자에게 보고 후 종료.

### Phase 2: 병렬 분석 (두 에이전트 SendMessage)

`@smate-payroll-domain` 과 `@smate-test-impact` 를 동시 dispatch:

**`@smate-payroll-domain` 에 보낼 메시지:**

> 다음 변경의 도메인 영향을 분석해 `_workspace/01_domain_review.md` 로 저장:
>
> - 변경 범위: \<파일\>
> - 변경 의도: \<한 줄\>
>   산출물 포맷은 너의 system prompt 의 "산출물 포맷" 섹션 참조.

**`@smate-test-impact` 에 보낼 메시지:**

> 다음 변경에 대한 테스트 영향을 분석해 `_workspace/02_test_impact.md` 로 저장:
>
> - 변경 범위: \<파일\>
>   산출물 포맷은 너의 system prompt 의 "산출물 포맷" 섹션 참조.

두 에이전트가 병렬로 작업한다. 둘 다 끝날 때까지 대기.

### Phase 3: 검증 실행 (오케스트레이터)

1. `_workspace/02_test_impact.md` 의 "영향받는 테스트 목록" 을 읽는다.
2. 베이스라인에서 그 테스트들만 1차 실행:

```bash
pnpm test:unit -- <impacted_test_files>
```

3. 결과를 `_workspace/03_baseline_results.md` 에 저장 (통과/실패/skip).
4. 사용자에게 변경을 적용하라고 안내 _또는_ 변경이 이미 적용된 상태라면 같은 테스트를 재실행:

```bash
pnpm test:unit -- <impacted_test_files>
```

5. 결과를 `_workspace/04_after_change_results.md` 에 저장.
6. 단협 또는 호봉표 데이터 변경이라면 추가로:

```bash
pnpm verify:data 2>&1 | tee _workspace/05_verify_data.log
```

### Phase 4: 종합 리포트 (오케스트레이터)

`_workspace/06_final_report.md` 작성:

```markdown
# Payroll Review — 종합

## 변경 요약

<00_input.md 에서>

## 도메인 영향 (요약)

<01_domain_review.md 에서 핵심 1~3줄>

## 테스트 영향 (요약)

<02_test_impact.md 에서 핵심>

## 회귀 결과

| 테스트 | 베이스라인 | 변경 후 | 비고 |
| ------ | ---------- | ------- | ---- |
| ...    | PASS       | PASS    | OK   |

## verify:data

<05_verify_data.log 결론 1줄 — drift 0 / drift N건>

## 판정

- 🟢 통과 — 머지 가능
- 🟡 주의 — 다음 항목 보완 후 머지: <목록>
- 🔴 회귀 — 다음 깨진 항목 수정 필요: <목록>

## 추천 다음 행동

1. ...
```

## 통과 조건

- `_workspace/00_input.md` ~ `06_final_report.md` 모두 존재
- 베이스라인 테스트 통과 (회귀 분석 전제)
- 영향받는 테스트가 변경 후에도 통과 _또는_ 실패 원인이 의도된 동작 변경임이 도메인 리뷰에 명시됨
- 데이터 drift 변경은 `verify:data` 통과
- 최종 판정 (🟢/🟡/🔴) 명시

## 에러 핸들링

- **베이스라인이 이미 깨져있음**: Phase 1 에서 보고하고 종료. "메인 브랜치 테스트가 이미 실패 중이라 회귀 분석을 진행할 수 없음" 메시지 출력.
- **영향받는 테스트가 0개로 분석됨**: 의도된 결과일 수 있지만 의심스러우니 사용자에게 확인 — "변경이 정말 어떤 단위 테스트에도 잡히지 않는다면 테스트 커버리지 누락이 의심됩니다."
- **`pnpm verify:data` 실패**: drift 내역을 `06_final_report.md` 의 "🔴 회귀" 섹션에 그대로 첨부.
- **에이전트 응답 실패**: 5분 타임아웃, 사용자에게 수동 검토 요청.

## 참조 도메인 지식

- 호봉표·단협 위치: `apps/web/public/data/union_regulation_2026.json`, `full_union_regulation_2026.md`
- 계산기: `packages/calculators/src/retirement-engine.js`, `holidays.js`, `index.js`
- 파서: `apps/web/src/client/salary-parser.js`, `excel-parser.js`, `csv-parser.js`
- 테스트: `tests/unit/calculators.test.js`, `excel-parser.test.js`, `csv-parser.test.js`, `retirement-payslip-sync.test.js`, `holidays-static-sync.test.js`
- 검증 명령:
  - `pnpm test:unit` — 모든 단위 테스트
  - `pnpm test:integration` — 통합
  - `pnpm verify:data` — 단협·호봉표 drift
  - `pnpm verify` — lint + check + 전체 테스트 + build
