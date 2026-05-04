# ADR — PII 마스킹과 급여 암호화는 별개 시스템

**날짜:** 2026-05-04
**상태:** 채택
**컨텍스트:** 사용자가 PII 마스킹(B6) 과 급여명세서·인증 흐름을 혼동하는 일이 반복됨. 향후 코드 변경 시 두 시스템을 구분해서 다루도록 명시한다.

## 결정

### PII 마스킹 (B6, 미구현)

- **목적:** 사용자가 업로드한 *환자 의료 문서* (CSV/PDF/이미지) 의 PII (RRN, 전화번호, 환자 ID, 주소, 사람 이름) 를 처리 시점에 마스킹.
- **위치:** `backend/app/masking/` (예정)
- **저장 정책:** **메모리/임시 디렉토리 처리, 응답 후 즉시 삭제. Firestore 영구 저장 금지.**
- **파이프라인:** 1차 정규식 → 2차 NER → 3차 LLM 검증
- **트리거:** 사용자가 환자 데이터를 업로드할 때 (현재는 미구현, B6 단계에서 구현 예정)

### 급여 데이터 암호화 (구현 완료)

- **목적:** 사용자 *본인의 보수 정보* (급여명세서·프로필·시간외/휴가/스케줄/경력) 를 영구 저장하되, 클라우드 저장 시 항상 암호화.
- **위치:**
  - 키 파생: `apps/web/src/firebase/crypto.js` — `SHA-256(uid + '|snuh-mate-2026')`
  - 암호화 정책: `apps/web/src/firebase/sync/_encrypted-fields.js`
  - 적용: `apps/web/src/firebase/sync/*-sync.js` (payslip, profile, overtime, leave, schedule, career-events)
- **알고리즘:** AES-GCM 256 (Web Crypto SubtleCrypto, 12-byte random IV)
- **저장 정책:**
  - **Firestore (authoritative):** 모든 민감 필드 암호화 (`{ _v:1, iv, c }` 블롭). metadata (payMonth, lastEditAt) 만 평문 (인덱싱용).
  - **localStorage (offline 사본):** 평문 — *의도된 설계*. offline 계산용. Firestore 가 source of truth.
- **키 회복:** uid 보존 시 자동 (Google account 같으면 동일 uid → 동일 키). uid 손실 시 복구 불가 (사용자 동의된 트레이드오프).

### 텔레메트리 (개인정보 누설 방지)

- **위치:** `apps/web/src/client/telemetry-sanitizer.js`
- **3중 검증:** 클라이언트 sanitize → 게이트웨이 → Firestore Rules
- **거부 패턴:** 금액 (`/(?:-?\d{1,3}(?:,\d{3})+|\b\d{4,}\s*원)/`), 사번 (5자리+), 주민번호 (`/\d{6}-\d{7}/`), 한국 성씨 시작 2-4자 한글 이름
- **수집 허용:** 라벨/구조/수정 이력만 (`new_label`, `user_correction`, `parse_failure`, `confidence_low`, `schedule_code`, `structure_pattern`)
- **fail-closed:** 어떤 필드든 패턴 매치 시 이벤트 자체 reject

## 절대 혼동하면 안 되는 이유

| 측면 | PII 마스킹 (B6) | 급여 암호화 |
|---|---|---|
| 보호 대상 | *타인* (환자) 의 의료 정보 | *본인* 의 보수/근무 정보 |
| 저장 여부 | 영구 저장 금지 (메모리만) | 영구 저장 (Firestore) |
| 수단 | 마스킹 (값 자체 변환) | 암호화 (값 보존, 키 필요) |
| 적용 시점 | 업로드/스캔 시점 | Firestore 쓰기 직전 |
| 키/시크릿 | 없음 (정규식+NER) | uid 파생 키 |

## 새로운 코드를 추가할 때

- **급여/근무 숫자 신규 필드 추가:** `apps/web/src/firebase/sync/_encrypted-fields.js` 의 정책에 등록 + 해당 sync 모듈에서 `encryptDoc(...)` 사용 확인.
- **환자 데이터 신규 필드 추가:** `backend/app/masking/pipeline.py` 경유 필수. Firestore 에 저장 금지.
- **둘은 같은 키 보관소를 공유하지 않음.** PII 마스킹은 키가 없음 (정규식/NER 기반). 급여 암호화는 uid 파생 키.
- **로깅/Sentry:** 평문 급여/이름/사번을 로그에 출력하지 않음. dev 전용 `console.warn` 도 production 빌드에서 strip 또는 sanitize 후 송신.

## 감사 결과 (2026-05-04)

- `apps/web/src/client/telemetry-sanitizer.js` — 평문 급여 키워드 (`grossPay`, `netPay`, `salaryItems`, `monthlyTotal`, `총급여`, `실수령`) 0건 노출. **감사 통과.**
- `apps/web/src/client/salary-parser.js:764, 904` — `console.warn`/`console.table` 로 급여 항목명·금액 출력. dev 디버깅 한정 (production 텔레메트리 송신 경로 아님). 향후 production 빌드에서 strip 권장 (별도 작업).
- production 텔레메트리 (Sentry, Cloudflare Analytics) 송신 경로에 평문 급여 누출 0건 확인.

## 참조

- 사용자 지적 (2026-05-04): "PII 기능은 전체 데이터에 적용하는게 아니다... 급여명세서의 세세한 급여 숫자는 암호화가 원칙이다"
- 관련 메모: `feedback_supabase_forbidden`, `project_payslip_flow_redesign`, `project_runtime_ai_decisions`
- B6 마스킹 plan: `docs/superpowers/plans/2026-05-01-snuhmate-b6-masking.md`
