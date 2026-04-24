# SoT Update Runbook — 단협 개정 시 동기화 절차

> 새 단협 (예: 2027.md) 이 들어왔을 때 registry/DATA/테스트가 모두 정합을 유지하도록 하는 운영 매뉴얼.
> 담당: 유지보수자. 빈도: 연 1회 (통상 11월 단협 갱신).

## 1. 전체 흐름

```
full_union_YYYY.md (canonical 단협 전문, 사용자가 채움)
   ↓ (Step A) 축약 요약 갱신
hospital_guidelines_YYYY.md (개발자 참고용)
   ↓ (Step B) 조항 배열 구조화
data/union_regulation_YYYY.json (regulation.html 표시용)
   ↓ (Step C) 수치 추출
data.js DATA_STATIC (계산 상수)
   ↓ (Step D) assert 값 업데이트
data/calc-registry.json (Vitest drift-check 기준)
```

## 2. 5단계 절차

### Step A: 단협 전문 수신 (사용자)

- 새 단협 `data/full_union_regulation_YYYY.md` 생성.
- 기존 `full_union_regulation_{YYYY-1}.md` 는 아카이브 (삭제하지 말고 버전 보존).

### Step B: 파생 문서 갱신 (개발자/자동화)

순서 중요 (위 → 아래):

1. **hospital_guidelines_YYYY.md** 축약: 제4~6장 위주로 요약.
2. **union_regulation_YYYY.json** 구조화: 조항별 id/title/content/clauses 배열로 변환.
3. **data.js DATA_STATIC** 수치 갱신: 변경된 overtimeRates, allowances, familyAllowance, longServicePay 등.
4. **data/calc-registry.json** expected 값 동기화.

### Step C: 자동 검증

```bash
npm test
```

Expected: 모든 테스트 PASS. drift 감지 시 해당 테스트 실패 메시지로 어느 수치가 불일치인지 표시.

### Step D: 버전드 SoT (선택 — 역사적 계산 필요 시)

**질문: 퇴직자가 2025년 당시 기준으로 계산을 원하면?**

현재 구조는 "최신 DATA" 만 가짐. 해결 옵션:

- **옵션 1 (지금, 간단)**: `DATA_STATIC` 만 최신 유지. 과거 계산은 과거 커밋 (git 태그) 으로 되돌아가 실행.
- **옵션 2 (중기, Plan I)**: `data/pay_rules_YYYY.json` 연도별 분리. `calcSeveranceFullPay` 같은 과거 기준 계산 함수가 `year` 인자로 해당 연도 룰 선택.
- **옵션 3 (장기)**: 효력 발생일별 룰 선택 로직 내장.

2027 단협 개정 시점의 권장: 옵션 1 로 충분. 퇴직 계산 같은 과거 기준이 실제 문제되면 옵션 2 로 전환.

### Step E: 문서화

- `docs/architecture/sot-drift-risk.md` 에 "YYYY 단협 개정" 항목 추가 (날짜, 주요 변경 수치).
- `calc-registry.json` 의 `generated_from` 과 `version` 필드 업데이트.
- CHANGELOG 혹은 릴리스 노트 작성.

## 3. 체크리스트 (2027.md 예시)

- [ ] `data/full_union_regulation_2027.md` 생성 (사용자 승인)
- [ ] `data/hospital_guidelines_2027.md` 축약본 작성 (또는 기존 업데이트)
- [ ] `data/union_regulation_2027.json` 구조화
- [ ] `data.js DATA_STATIC` 값 갱신 (payTables / allowances / rates 등)
- [ ] `data/calc-registry.json` 의 `version` → "2027.XX" + expected 값 동기화
- [ ] `npm test` 모두 PASS
- [ ] `regulation.js:257` fetch URL 이 2027 JSON 을 가리키는지 확인 (파일명 패턴 변경 시)
- [ ] `docs/architecture/sot-drift-risk.md` 개정 이력 추가
- [ ] PR 생성 — 리뷰어가 단협 전문 ↔ registry 값 spot check
- [ ] 2026.md 와 diff 내는 툴/스크립트가 있으면 실행 (없으면 개정 요약 수동 작성)

## 4. 자동화 아이디어 (미래 개선)

- **스크립트 1**: `scripts/validate-registry.js` — registry.json 의 각 entry 의 `article` 필드를 full_union.md 내 해당 조항 위치로 매핑 + 정규식으로 수치 추출 후 dual-check.
- **스크립트 2**: `scripts/extract-data-from-md.js` — full_union.md 특정 섹션에서 숫자 자동 추출해 data.js 비교 리포트 출력.
- **CI 후크**: Vitest 에 full_union.md 파싱 assert 추가 → 개정 시 어느 수치가 drift 인지 자동 리스팅.

이 자동화는 **Plan J** (단협 개정 자동 검증) 로 별도 플랜 필요. 현재는 사람이 체크리스트로 수동 검증.

## 5. 실패 시나리오

- **"registry 테스트 실패 — DATA 가 달라짐":** 개정 전후 diff 에서 의도된 변경이면 registry 업데이트. 의도치 않은 변경이면 DATA 로 복구.
- **"regulation.html 이 여전히 2026 조항 표시":** `union_regulation_2027.json` 이 `union_regulation_2026.json` 을 완전 대체했는지 확인. regulation.js:257 fetch 경로 점검.
- **"퇴직 계산이 새 기준으로 적용됨":** 의도된 동작이면 OK. 과거 기준 필요하면 Step D 의 옵션 2 고려.

## 6. 담당자 인수인계 체크

- 이 runbook 의 "최근 갱신 일자" 를 매년 업데이트.
- 담당자 교체 시 다음 세 문서를 함께 인계:
  - `docs/architecture/README.md` (전체 구조 index)
  - `docs/architecture/sot-drift-risk.md` (드리프트 리스크)
  - 본 runbook (개정 절차)
