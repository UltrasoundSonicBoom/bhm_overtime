# SNUHmate Harness Map

## 1. 조사 범위와 현재 근거

이 문서는 현재 저장소와 참고 문서, 그리고 `harness-100` 레퍼런스를 바탕으로 SNUHmate의 하네스 구조를 계층별로 정리한 초안이다.

### 저장소에서 확인된 사실

- 팀/서브도메인 구조는 이미 DB 레벨에서 준비되어 있다.
  - `server/drizzle/0002_square_nova.sql`에 `teams`, `team_subdomains`, `team_rule_profiles`가 있다.
- 현재 시드와 테스트는 `101`, `angio` 중심으로 구성되어 있다.
  - `server/scripts/seed-pilot-schedules.ts`
  - `server/scripts/build-schedule-suite-report.ts`
- 현재 `.claude`에는 세 가지 수평 팀이 이미 있다.
  - `run-build-team`
  - `run-ops-team`
  - `run-user-team`
- 현재 병동/간호 문맥은 분명히 존재한다.
  - `schedule_suite.js`
  - `content/policies/2026/nurse_regulation.md`
  - `docs/qa-report-2026-04-05.md`

### 아직 근거가 약한 영역

- `CT`
- `MR`
- `핵의학`
- `행정(인사/총무/교육수련팀/급여관리)`

이 영역들은 제품 내 필요성은 분명하지만, 현재 저장소에는 `101`/`angio`만큼 구체적인 운영 규칙과 테스트 데이터가 보이지 않는다. 따라서 아래 제안은:

1. 현재 코드베이스에 있는 공통 구조는 즉시 재사용하고
2. 부족한 팀별 규칙은 새 하네스로 분리해 수집/정의하는 방식

으로 설계한다.

### 도메인별 근거 밀도

| 도메인 | 현재 근거 수준 | 저장소에서 확인된 단서 |
| --- | --- | --- |
| `101` | 강함 | 팀 시드, 팀원 skillTags, 이벤트, coverage delta, QA 시나리오가 존재 |
| `angio` | 강함 | 팀 시드, sedation/new-grad/coverage delta, QA 시나리오가 존재 |
| `급여관리` | 강함 | 급여 탭, 급여명세서 파서, allowance 데이터, 시뮬레이터가 존재 |
| `행정 공통` | 중간 | `adminOps` 라우트에 regulation/FAQ/content/approval/audit 흐름이 존재 |
| `핵의학` | 약함 | 사용자 프로필/샘플 급여 데이터/서비스 소개에 부서 흔적은 있으나 운영 규칙은 없음 |
| `CT` | 매우 약함 | 독립 운영 규칙/팀 데이터/전용 화면 흔적을 찾지 못함 |
| `MR` | 매우 약함 | 독립 운영 규칙/팀 데이터/전용 화면 흔적을 찾지 못함 |

즉, 현재 제품의 실제 기반은 `101`, `angio`, `급여`, `행정 운영`에 있고, `CT/MR/핵의학 운영 하네스`는 새로 정의해야 하는 영역이다.

## 2. 설계 원칙

핵심은 "서브도메인마다 하네스를 새로 복제"하는 것이 아니라, 아래 세 축을 조합하는 것이다.

1. `surface axis`
   - `www.snuhmate.com`
   - `101.snuhmate.com`
   - `angio.snuhmate.com`
   - 이후 `ct.snuhmate.com`, `mr.snuhmate.com`, `nm.snuhmate.com` 등
2. `intent axis`
   - build
   - ops
   - user
3. `domain axis`
   - core
   - clinical
   - diagnostic imaging
   - admin
   - product/www

즉, 실제 런타임에서는 다음처럼 해석하는 것이 맞다.

`hostname -> team context -> domain layer -> intent orchestrator -> agent team`

예:

- `101.snuhmate.com` + 사용자 질문 + 스케줄 생성 요청
  - `101 pack`
  - `clinical core`
  - `run-user-team` 또는 `run-build-team`
- `www.snuhmate.com` + FAQ/콘텐츠 개편 요청
  - `www pack`
  - `core`
  - `run-ops-team`

## 3. SNUHmate Harness Map

| Layer | 적용 범위 | 주 책임 | 주로 붙는 서브도메인 |
| --- | --- | --- | --- |
| `snuhmate-core` | 전역 | 팀 해석, 접근 정책, 소스 인용, QA 게이트, PHI/안전 경계 | 전부 |
| `product-www-core` | 대외 제품 | 제품 소개, FAQ, 퍼블릭 정책/공지, 공개 UX 카피 | `www` |
| `clinical-core` | 임상 공통 | 교대/휴식/금지패턴/교육/이벤트 커버리지/신규 보호 | `101`, `angio`, `ct`, `mr`, `핵의학` |
| `diagnostic-imaging-core` | 영상계 공통 | 모달리티 운영, 검사실/시술실 배치, 장비/슬롯/안전 체크 | `angio`, `ct`, `mr`, `핵의학` |
| `admin-core` | 행정 공통 | 인사/총무/교육수련/급여 규정, 문서 운영, 승인 흐름 | 행정 |
| `101-pack` | 101 병동 | 3교대 병동 간호, 신규간호사 보호, 프리셉터/병동 행사 | `101` |
| `angio-pack` | Angio | 시술실/조영제/sedation/on-call/오버타임 | `angio` |
| `ct-pack` | CT | 검사 슬롯, 조영제, 응급 검사 우선순위, 룸 커버리지 | `ct` |
| `mr-pack` | MR | MR safety screening, 금속/삽입물 리스크, 슬롯 운영 | `mr` |
| `nuclear-medicine-pack` | 핵의학 | 방사성의약품 타이밍, 검사 윈도우, 방사선 안전 | `핵의학` |
| `hr-pack` | 인사 | 인사 규정, 휴가/근태/발령/온보딩 | 행정 |
| `general-affairs-pack` | 총무 | 시설/자산/구매/공지 운영 | 행정 |
| `education-training-pack` | 교육수련팀 | 교육 일정, 오리엔테이션, 수련/평가 체크리스트 | 행정 |
| `payroll-pack` | 급여관리 | 수당/급여 시뮬레이션, 급여 규정 FAQ, 이의 검토 | 행정 |

## 4. `core / clinical / 101 / angio / www` 분리표

| 영역 | 책임 범위 | 들어가야 할 것 | 빼야 할 것 |
| --- | --- | --- | --- |
| `core` | 전역 정책과 라우팅 | 팀 식별, 정책 경계, 소스 인용, QA, release gate | 병동별 세부 규칙, Angio 전용 룰 |
| `clinical` | 임상 공통 운영 규칙 | 교대표 규칙, 휴식/연속근무, 교육/행사 coverage, 신규 보호 | 제품 소개 카피, 급여 문답, 대외 웹 운영 |
| `101` | 101 병동 특수화 | 병동 3교대, 프리셉터, 신규간호사 온보딩, 병동 행사 | Angio 시술 일정, 공개 웹 운영 |
| `angio` | Angio 특수화 | 시술실 운영, sedation/contrast, on-call, 검사실 커버리지 | 병동 전용 프리셉터 규칙, 공개 웹 운영 |
| `www` | 퍼블릭 제품 경험 | 제품 페이지, FAQ, 지원/문의, 대외 문서 | 병동 운영 스케줄 생성, 팀별 오버타임 계산 |

이 분리는 "사이트별 분리"이면서 동시에 "규칙 소유권 분리"다.

- `www`는 제품/브랜드/공개 정보의 소유자
- `clinical`은 병동/검사실 공통 운영 정책의 소유자
- `101`, `angio`는 팀별 예외와 현장 룰의 소유자
- `core`는 절대 중복되면 안 되는 안전/정합성 레이어

## 5. 레이어별 에이전트/스킬 목록

### 5.1 Core Layer

#### 에이전트

| Agent | 역할 | 상태 |
| --- | --- | --- |
| `build-orchestrator` | 빌드/개발 작업 분배 | 재사용 |
| `ops-orchestrator` | 운영 작업 분배 | 재사용 |
| `user-orchestrator` | 사용자 질의 흐름 제어 | 재사용 |
| `qa-engineer` | 경계 비교, QA 게이트 | 재사용 |
| `ops-reviewer` | 운영 결과 검토/승인 | 재사용 |
| `context-router` | hostname/teamSlug 기반 컨텍스트 선택 | 신규 |
| `privacy-safety-reviewer` | PHI/안전/금칙 경계 점검 | 신규 |
| `release-gatekeeper` | 도메인별 배포 전 최종 게이트 | 신규 |

#### 스킬

| Skill | 역할 | 상태 |
| --- | --- | --- |
| `run-build-team` | build fan-out/fan-in | 재사용 |
| `run-ops-team` | ops 문서/콘텐츠 워크플로우 | 재사용 |
| `run-user-team` | 사용자 답변/계산/근거 응답 | 재사용 |
| `resolve-snuhmate-context` | subdomain/teamSlug -> layer 조합 해석 | 신규 |
| `enforce-source-grounding` | 근거 없는 답변/정책 누락 차단 | 신규 |
| `clinical-safety-gate` | 임상 영역 결과 검토 | 신규 |
| `public-site-release-gate` | www 릴리스 전 검수 | 신규 |

### 5.2 Clinical Layer

#### 에이전트

| Agent | 역할 | 상태 |
| --- | --- | --- |
| `clinical-ops-architect` | 임상 공통 정책 구조화 | 신규 |
| `schedule-rules-analyst` | 교대 규칙/제약 분석 | 신규 |
| `event-coverage-analyst` | 행사/교육 시 coverage delta 산정 | 신규 |
| `new-staff-protection-reviewer` | 신규간호사/프리셉터 보호 규칙 점검 | 신규 |
| `clinical-qa-reviewer` | 임상 결과의 일관성 QA | 신규 |

#### 스킬

| Skill | 역할 | 상태 |
| --- | --- | --- |
| `clinical-staffing-rules` | 휴식/야간/금지패턴/가중치 규칙 적용 | 신규 |
| `schedule-scenario-lab` | 팀별 시나리오 검증 | 신규 |
| `clinical-event-coverage` | 교육/행사 커버리지 반영 | 신규 |
| `new-grad-protection` | 신규간호사/프리셉터 안전 규칙 적용 | 신규 |

### 5.3 101 Layer

#### 에이전트

| Agent | 역할 | 상태 |
| --- | --- | --- |
| `ward-101-orchestrator` | 101 병동 흐름 조율 | 신규 |
| `ward-scheduler-reviewer` | 병동 스케줄 규칙 검토 | 신규 |
| `preceptor-pairing-reviewer` | 프리셉터/신규 pairing 검토 | 신규 |
| `ward-event-planner` | 병동 교육/행사 영향 반영 | 신규 |

#### 스킬

| Skill | 역할 | 상태 |
| --- | --- | --- |
| `ward-roster-review` | 3교대 병동 roster 검토 | 신규 |
| `ward-event-policy` | 병동 행사/회의 coverage 룰 | 신규 |
| `preceptor-coverage-check` | 신규간호사와 프리셉터 보호 | 신규 |
| `ward-overtime-sanity-check` | 병동 오버타임/근무 요청 sanity check | 신규 |

### 5.4 Angio Layer

#### 에이전트

| Agent | 역할 | 상태 |
| --- | --- | --- |
| `angio-orchestrator` | Angio 흐름 조율 | 신규 |
| `procedure-day-planner` | 시술일 배치/슬롯 운영 검토 | 신규 |
| `sedation-skill-reviewer` | sedation/contrast skill coverage 검토 | 신규 |
| `oncall-overtime-auditor` | on-call/초과근무 검토 | 신규 |

#### 스킬

| Skill | 역할 | 상태 |
| --- | --- | --- |
| `angio-procedure-day-review` | 시술실 운영 규칙 반영 | 신규 |
| `angio-oncall-pay-check` | on-call/수당/초과근무 검토 | 신규 |
| `modality-coverage-review` | Angio 특수 스킬 커버리지 점검 | 신규 |
| `contrast-education-event` | 조영제/교육 이벤트 영향 반영 | 신규 |

### 5.5 WWW Layer

#### 에이전트

| Agent | 역할 | 상태 |
| --- | --- | --- |
| `content-editor` | 콘텐츠 초안/편집 | 재사용 |
| `admin-ui-engineer` | 관리 UI/운영 화면 구현 | 재사용 |
| `www-product-orchestrator` | 공개 사이트/브랜드 흐름 조율 | 신규 |
| `support-faq-analyst` | FAQ/문의 지식 구조화 | 신규 |
| `public-release-reviewer` | 공개 페이지 QA | 신규 |

#### 스킬

| Skill | 역할 | 상태 |
| --- | --- | --- |
| `faq-support-ops` | FAQ/문의/운영 지식 정리 | 신규 |
| `snuhmate-product-messaging` | 제품 소개/브랜드 카피 규칙 | 신규 |
| `public-site-regression` | 공개 페이지 회귀 점검 | 신규 |
| `policy-page-publisher` | 공개 정책/고지 발행 워크플로우 | 신규 |

### 5.6 Imaging/Admin 확장 레이어

#### 확장 대상별 최소 에이전트/스킬 세트

| Layer | 에이전트 | 스킬 |
| --- | --- | --- |
| `ct-pack` | `ct-orchestrator`, `ct-slot-reviewer`, `contrast-safety-reviewer` | `ct-room-coverage-review`, `contrast-safety-checklist`, `emergency-slot-triage` |
| `mr-pack` | `mr-orchestrator`, `mr-safety-reviewer`, `mr-slot-reviewer` | `mr-safety-screening-workflow`, `mr-slot-coverage-review`, `implant-risk-check` |
| `nuclear-medicine-pack` | `nm-orchestrator`, `tracer-logistics-reviewer`, `radiation-safety-reviewer` | `nuclear-tracer-logistics`, `radiation-safety-checklist`, `time-window-coordination` |
| `hr-pack` | `hr-policy-analyst`, `leave-workflow-reviewer`, `onboarding-reviewer` | `hr-policy-answering`, `leave-rule-check`, `staff-onboarding-checklist` |
| `general-affairs-pack` | `ga-ops-analyst`, `asset-request-reviewer`, `notice-coordinator` | `asset-request-routing`, `facility-issue-triage`, `internal-notice-publisher` |
| `education-training-pack` | `training-orchestrator`, `curriculum-reviewer`, `attendance-auditor` | `training-schedule-planner`, `orientation-checklist`, `attendance-compliance-check` |
| `payroll-pack` | `payroll-analyst`, `allowance-reviewer`, `dispute-triage-reviewer` | `payslip-parse-qa`, `allowance-simulator`, `payroll-dispute-triage` |

## 6. 무엇을 재사용하고 무엇을 새로 만들 것인가

### 6.1 현재 저장소에서 재사용할 것

| 대상 | 현재 자산 | 활용 방식 |
| --- | --- | --- |
| 오케스트레이션 | `run-build-team`, `run-ops-team`, `run-user-team` | 그대로 살리고, context resolver만 앞단에 추가 |
| QA | `qa-engineer` | 전 레이어 공통 게이트로 재사용 |
| 운영 검토 | `ops-reviewer` | admin/www/ops 승인 흐름에 재사용 |
| 규정/근거 응답 | `rag-answerer`, `regulation-ingestor` | clinical/admin 공통 지식 레이어에 재사용 |
| 급여 계산 | `pay-simulator` | `payroll-pack`의 핵심 계산 에이전트로 재사용 |
| 콘텐츠 편집 | `content-editor` | `www`와 `admin-core`에 재사용 |
| UI 구현 | `admin-ui-engineer` | admin/nurse_admin/www 운영 UI까지 범용 재사용 |

### 6.2 `harness-100`에서 패턴만 가져와 적응할 것

| 레퍼런스 | 가져올 부분 | 적용 레이어 |
| --- | --- | --- |
| `83-sop-writer` | SOP 구조화, checklist design | `clinical-core`, `education-training-pack`, `admin-core` |
| `92-operations-manual` | 운영 매뉴얼 구조 | `admin-core`, `www`, `general-affairs-pack` |
| `91-onboarding-system` | 신규 인력/팀 온보딩 설계 | `101`, `education-training-pack`, `hr-pack` |
| `67-compliance-checker` | 규정 검토 패턴, 의료법령 지식 베이스 구조 | `clinical-core`, `admin-core`, `payroll-pack` |
| `94-audit-report` | 감사/검토 결과 보고 형식 | `core`, `admin-core`, `www` |
| `88-risk-register` | 리스크 식별/우선순위화 | `clinical-core`, `diagnostic-imaging-core` |
| `25-incident-postmortem` | 사고/이슈 회고 구조 | `clinical-core`, `admin-core` |
| `82-report-generator` | 구조화된 결과물 생성 | 전 레이어 |

### 6.3 새로 만들어야 할 것

| 신규 자산 | 이유 | 우선순위 |
| --- | --- | --- |
| `resolve-snuhmate-context` | `www/101/angio/CT/MR/핵의학/행정`을 한 구조 안에서 해석하려면 필수 | 높음 |
| `clinical-staffing-rules` | 현재 규칙이 코드/정책에 흩어져 있어 하네스 레벨 추상화가 필요 | 높음 |
| `101-pack` | 현재 가장 구체적인 현장 팀이라 독립 pack 가치가 큼 | 높음 |
| `angio-pack` | Angio는 병동과 다른 운영 패턴이 분명함 | 높음 |
| `diagnostic-imaging-core` | CT/MR/핵의학 확장을 위해 Angio 상위 공통층이 필요 | 높음 |
| `admin-core` | 인사/총무/교육수련/급여를 한데 묶는 공통 레이어가 필요 | 높음 |
| `www-product-messaging` 계열 스킬 | 공개 웹은 임상 운영과 완전히 다른 카피/QA 원칙이 필요 | 중간 |
| `ct-pack`, `mr-pack`, `nuclear-medicine-pack` | 제품 확장 대상이나 현 규칙이 약하므로 별도 수집 필요 | 중간 |
| `privacy-safety-reviewer` | 임상/행정 모두에서 안전한 답변 경계가 필요 | 높음 |
| `release-gatekeeper` | 도메인별 배포 전 최소 공통 품질 게이트가 필요 | 중간 |

## 7. 추천 구조

실행 구조는 아래처럼 두는 것이 가장 자연스럽다.

### 7.1 수평 오케스트레이터 유지

- `run-build-team`
- `run-ops-team`
- `run-user-team`

이 세 개는 유지한다. 지금 저장소의 가장 좋은 자산이기 때문이다.

### 7.2 앞단에 컨텍스트 라우터 추가

새 skill:

- `resolve-snuhmate-context`

이 skill이 아래를 결정한다.

- 어떤 서브도메인인가
- 어떤 팀인가
- clinical/admin/www 중 어떤 상위 레이어인가
- 어떤 team pack을 붙일 것인가

### 7.3 도메인 pack은 얇고 명확하게

- `101-pack`
- `angio-pack`
- `ct-pack`
- `mr-pack`
- `nuclear-medicine-pack`
- `hr-pack`
- `general-affairs-pack`
- `education-training-pack`
- `payroll-pack`

각 pack은 "예외와 현장 규칙"만 가져야 한다. 공통 정책을 복붙하면 안 된다.

## 8. 우선순위 제안

### Phase 1

- `snuhmate-core`
- `resolve-snuhmate-context`
- `clinical-core`
- `101-pack`
- `angio-pack`

이 단계만 해도:

- `101.snuhmate.com`
- `angio.snuhmate.com`
- 내부 임상 운영 흐름

까지는 꽤 안정적으로 분리된다.

### Phase 2

- `product-www-core`
- `www` 전용 FAQ/콘텐츠/릴리스 QA

이 단계에서 `www.snuhmate.com`을 별도 하네스로 안정화한다.

### Phase 3

- `diagnostic-imaging-core`
- `ct-pack`
- `mr-pack`
- `nuclear-medicine-pack`

이 단계는 인터뷰와 룰 수집이 필요하다.

### Phase 4

- `admin-core`
- `hr-pack`
- `general-affairs-pack`
- `education-training-pack`
- `payroll-pack`

이 단계는 문서 구조와 승인 흐름 정의가 핵심이다.

## 9. 결론

이 프로젝트는 "간호사 하네스 하나"로 가면 안 된다. 맞는 구조는 아래와 같다.

1. 전역 `core`를 둔다.
2. `clinical`, `diagnostic-imaging`, `admin`, `www` 같은 상위 도메인 코어를 둔다.
3. `101`, `angio`, `CT`, `MR`, `핵의학`, `인사`, `총무`, `교육수련`, `급여관리`는 팀별 pack으로 분리한다.
4. 기존 `run-build-team`, `run-ops-team`, `run-user-team`은 그대로 살리고, 앞단에서 context를 해석해 pack을 붙이는 구조로 간다.

즉, 정답은 "하네스를 팀별로 복제"가 아니라:

`공통 코어 + 도메인 코어 + 팀 pack + 기존 수평 오케스트레이터 재사용`

구조다.
