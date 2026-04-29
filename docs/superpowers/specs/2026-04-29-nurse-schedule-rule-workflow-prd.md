# PRD: SNUH Mate Nurse Schedule Rule/Workflow Engine

> 작성일: 2026-04-29  
> 상태: Final PRD v1  
> 제품 축: SNUH Mate Team Plan  
> 핵심 결정: Timefold 없이, SNUH Mate 자체 rule/workflow 엔진으로 구현한다.

---

## 0. Assumptions

1. SNUH Mate는 병원 EMR의 공식 근무표 생성 기능을 대체하지 않는다.
2. MVP의 1차 가치는 "생성"이 아니라 "가져오기, 검증, 조정, 배포, 교대요청, 승인"이다.
3. 기존 `public/nurse_admin/`, `apps/web/public/nurse_admin/`, `schedule_suite` 계열은 과거 테스트/데모용으로 간주한다. 새 제품용 nurse admin은 별도 route와 module로 구축한다.
4. 병원 실데이터는 외부 solver/platform API로 전송하지 않는다.
5. 팀 스케줄 데이터와 개인 급여/명세서 데이터는 같은 사용자의 앱 안에 있어도 저장 경계와 권한 경계를 분리한다.
6. SNUH Mate 디자인 시스템을 새 admin/member UI의 기본 구현 규칙으로 사용한다.

---

## 1. Objective

SNUH Mate Team Plan에 간호 근무스케줄 운영 기능을 만든다. 이 기능은 EMR에서 이미 생성된 근무표를 가져와 표준 스키마로 정규화하고, 노조수첩 규칙과 부서별 암묵지를 적용해 즉시 검증하며, 관리자가 드래그앤드랍으로 조정한 뒤 팀원에게 배포할 수 있게 한다. 팀원은 배포된 개인/팀 스케줄을 확인하고, 원하는 사람에게 교대 요청을 보내며, 상대방 수락과 관리자 승인 후 변경된 근무표를 다시 배포한다.

### Product Positioning

SNUH Mate는 병원 공식 EMR 원장(source of truth)이 아니다. SNUH Mate는 팀 단위 운영 협업 레이어다.

```text
EMR 생성 근무표
  -> SNUH Mate import snapshot
  -> rule validation
  -> manager edit overlay
  -> published schedule version
  -> member/team view
  -> swap request
  -> approval
  -> audit/notification
```

### Success Metrics

| 지표 | MVP 목표 |
|---|---|
| EMR 표 가져오기 성공률 | CSV/XLS/clipboard 기준 95% 이상 셀 인식 |
| 관리자 수정 시간 | 1개월 근무표 1회 수정/배포 10분 이내 |
| 검증 커버리지 | 커버리지, 자격, N-OFF-D, 16시간 휴식, 야간 상한, 온콜 충돌 탐지 |
| 변경 추적 | 모든 관리자 수정/교대 승인에 audit log 100% 생성 |
| 사용자 확인 | 개인 스케줄, 팀 스케줄, 교대요청 상태를 모바일에서 확인 가능 |

---

## 2. Non-Goals

- Timefold Platform API 연동
- Timefold Solver 또는 외부 최적화 엔진 도입
- EMR 내부 시스템 직접 자동화 또는 비공식 scraping
- 환자정보, 진료정보, EMR 인증정보 저장
- 처음부터 완전 자동 월간 근무표 생성
- 기존 테스트용 `nurse_admin` 화면의 단순 확장
- 급여명세서/개인 급여 데이터와 팀 근무표 데이터의 단일 저장 모델 통합

---

## 3. Users And Roles

| Role | 설명 | 주요 권한 |
|---|---|---|
| Organization owner | Team Plan 구매/조직 관리자 | 조직/팀 생성, 관리자 지정, 보안 설정 |
| Team admin | 수간호사, 책임자, 스케줄 관리자 | 근무표 import, 규칙 관리, 수정, 배포, 승인 |
| Scheduler | 실무 스케줄 담당자 | import, 수정안 작성, 검증 실행, 승인 요청 |
| Member | 팀원 | 개인/팀 스케줄 조회, 교대 요청/수락 |
| Viewer | 열람자 | 배포본 조회만 가능 |

Identity 원칙:

- 로그인 identity: Firebase/Auth 등 앱 로그인 주체
- employee identity: 조직 내 직원/팀원 주체
- 팀 권한은 employee identity와 membership에 붙인다.
- 병원 사번/이름만으로 로그인 권한을 판단하지 않는다.

---

## 4. Core Schema

Timefold는 도입하지 않지만, 근무스케줄 문제를 설명하는 핵심 schema vocabulary는 가져온다.

| Schema | 의미 | 예시 |
|---|---|---|
| coverage | 날짜/shift별 필요 인원 | D 3명, E 2명, N 2명 |
| qualification | 가능한 사람 | Angio 숙련자, 장비 가능자, 방 담당 |
| preference | 희망/비희망 | 휴가, 교육, 선호 근무 |
| pairing | 같이/따로 배치 | 신규+프리셉터, 특정 조합 회피 |
| pinning | 고정 셀 | 이미 확정된 근무, 관리자 잠금 |
| mandatory shifts | 반드시 유지 | 온콜, 교육, 행사, 필수 야간 |
| rule severity | 차단/경고/정보 | N-OFF-D 차단, 야간 횟수 경고 |

### Domain Objects

| Object | 핵심 필드 |
|---|---|
| Organization | id, name, plan, settings |
| Team | id, organizationId, name, departmentType, timezone |
| EmployeeIdentity | id, displayName, roleFamily, birthYear, department, employmentStatus |
| TeamMembership | teamId, employeeIdentityId, role, activeFrom, activeTo |
| Skill | id, name, category, expiresAt |
| WorkArea | id, name, type, equipmentTags |
| ShiftTemplate | code, label, startTime, endTime, restProfile |
| CoverageRequirement | date, shiftCode, requiredCount, requiredSkills, workAreaId |
| Preference | employeeId, dateRange, shiftCode, type, reason, weight |
| PairingRule | employeeA/B or group, mode, severity, effectiveFrom/To |
| Assignment | date, shiftCode, employeeId, workAreaId, source |
| OnCallAssignment | date, employeeId, standbyType, actualCallOuts, compensationStatus |
| ScheduleImport | id, teamId, period, sourceType, sourceFileMeta, parserVersion, createdBy |
| ScheduleSnapshot | id, importId, assignments, checksum, immutable |
| ScheduleChange | id, scheduleVersionId, type, before, after, reason, createdBy |
| RulePack | id, teamId, name, source, version, effectiveFrom, effectiveTo |
| RuleEvaluation | id, scheduleVersionId, ruleId, severity, status, affectedCells |
| PublishedScheduleVersion | id, teamId, period, version, snapshotId, overlayIds, publishedBy |
| SwapRequest | id, requesterId, targetEmployeeId, offeredAssignment, requestedAssignment, status |
| ApprovalTask | id, targetType, targetId, approverId, status, decidedAt |
| Notification | id, recipientId, type, targetId, readAt |
| AuditLog | id, actorId, action, targetType, targetId, before, after, createdAt |

---

## 5. Rule Model

규칙은 코드에 하드코딩하지 않고, 표준 rule template과 부서별 rule pack으로 관리한다. 관리자는 rule template의 값을 조정하거나 부서 rule을 추가할 수 있다. 단, 자유 문자열 규칙이 아니라 검증 가능한 구조화 규칙으로 저장한다.

### Rule Sources

| Source | 설명 | 예시 |
|---|---|---|
| union_handbook | 노조수첩/단협 규칙 | 월 야간 상한, 16시간 휴식, 온콜 보상 |
| hospital_policy | 병원/간호본부 운영 기준 | 병동별 필수 인력, 교육일 기준 |
| department_tacit | 부서 암묵지 | Angio 장비 숙련자, 방/장비 로테이션 |
| manager_override | 관리자 예외 | 특정 월 임시 예외, 본인 희망 야간 |

### Rule Severity

| Severity | 의미 | UI 처리 |
|---|---|---|
| block | 배포 전 반드시 해결 | 빨간 badge, publish 차단 |
| warn | 배포 가능하지만 확인 필요 | 노란 badge, 승인 사유 요구 |
| info | 참고 정보 | 회색/파란 badge |

### MVP Built-In Rules

| Rule | 기본 severity | 설명 |
|---|---|---|
| coverage_missing | block | 날짜/shift별 필요 인원 미달 |
| qualification_missing | block | 필요한 skill/장비/방 자격 미충족 |
| forbidden_pattern_n_off_d | block | N-OFF-D 금지 |
| min_rest_16h | block | 교대 간 최소 16시간 휴식 위반 |
| ward_age_40_night_block | block 또는 warn | 병동 40세 이상 야간 배치 금지 원칙. 본인 희망/부서 예외는 사유 필요 |
| monthly_night_soft_cap | warn | 월 야간 기준 초과 |
| monthly_night_hard_cap | block | 월 야간 하드캡 초과 |
| on_call_shift_conflict | block | 온콜과 야간/휴식/교육 충돌 |
| on_call_compensation_hint | info | 온콜 대기/출동 보상 안내 |
| pinned_cell_changed | block | 관리자 잠금 셀 변경 시 차단 |
| mandatory_shift_missing | block | 온콜, 교육, 필수 근무 누락 |
| preference_unmet | info 또는 warn | 희망/비희망 미반영 |
| pairing_violation | warn 또는 block | 신규+프리셉터, 특정 조합 회피 |

### Department Tacit Rules

부서 암묵지는 다음 template으로 제한한다.

| Template | 예시 |
|---|---|
| required_skill_for_shift | Angio N에는 숙련자 1명 이상 |
| required_skill_for_work_area | 특정 방/장비는 인증자만 |
| rotation_interval | 장비/방 담당은 6개월 또는 1년 단위 로테이션 |
| avoid_pairing | 특정 조합 동시 근무 회피 |
| require_pairing | 신규 간호사는 preceptor와 일정 기간 pairing |
| protected_employee | 임신, 복직, 교육주간, 건강상 제한 |
| manager_pin | 특정 날짜/근무 고정 |

---

## 6. MVP User Flows

### Flow A. EMR 근무표 가져오기

1. 관리자가 팀과 기간을 선택한다.
2. CSV/XLS 파일 업로드 또는 clipboard paste를 실행한다.
3. 시스템이 이름, 날짜, shift code, 비고를 표준 grid로 파싱한다.
4. 관리자가 미인식 셀을 수동 보정한다.
5. import snapshot을 생성한다.
6. 원본 snapshot은 immutable로 보존한다.

MVP 우선순위:

1. XLS/CSV
2. clipboard paste
3. PDF parsing
4. image/vision parsing

### Flow B. 규칙 검증

1. import snapshot에 team rule pack을 적용한다.
2. cell 단위 issue를 board에 표시한다.
3. 우측 inspector에서 위반 근거, rule source, 해결 제안을 보여준다.
4. block issue가 있으면 publish를 막는다.
5. warn issue는 관리자 사유 입력 후 publish 가능하다.

### Flow C. 관리자 드래그앤드랍 수정

1. 관리자가 근무 셀을 다른 사람/날짜/shift로 drag한다.
2. 시스템은 원본 snapshot을 수정하지 않고 ScheduleChange overlay를 만든다.
3. 변경 직후 해당 날짜와 인접 날짜의 규칙을 즉시 재검증한다.
4. 영향 범위와 새 issue를 표시한다.
5. 관리자는 변경 사유를 저장하거나 되돌린다.

### Flow D. 배포

1. 관리자가 검증 요약을 확인한다.
2. block issue 0건일 때 publish 가능하다.
3. warn issue가 남아 있으면 사유가 있어야 한다.
4. 배포 시 PublishedScheduleVersion vN을 생성한다.
5. 팀원에게 알림을 보낸다.

### Flow E. 사용자 조회

1. 팀원은 개인 스케줄을 월/주/오늘 단위로 본다.
2. 팀 스케줄에서 동료 근무를 본다.
3. 본인 일정은 캘린더 내보내기 또는 알림 설정이 가능하다.
4. 권한 없는 팀/타부서 세부정보는 보이지 않는다.

### Flow F. 교대 요청

1. 사용자가 본인 근무 셀에서 "교대 요청"을 선택한다.
2. 교대 가능한 후보 목록을 본다.
3. 원하는 사람에게 요청을 보낸다.
4. 상대방이 수락/거절한다.
5. 수락되면 관리자 approval task가 생성된다.
6. 관리자가 승인하면 ScheduleChange가 생성되고 배포본 vN+1에 반영된다.
7. 요청자, 상대방, 관리자에게 알림과 audit log가 남는다.

---

## 7. Frontend Requirements

새 nurse admin은 테스트용 `nurse_admin`을 확장하지 않고, Astro route와 SNUH Mate 디자인 시스템 기반으로 새로 만든다.

### Admin Surface

| Route | 목적 |
|---|---|
| `/team/schedules/admin` | 관리자 근무표 import, 검증, 수정, 배포 |
| `/team/schedules/admin/import` | CSV/XLS/clipboard import wizard |
| `/team/schedules/admin/rules` | rule pack 관리 |
| `/team/schedules/admin/approvals` | 교대 요청 승인 |
| `/team/schedules/admin/audit` | 변경 이력 |

### Member Surface

| Route | 목적 |
|---|---|
| `/team/schedules` | 팀 스케줄 조회 |
| `/team/schedules/me` | 개인 스케줄 조회 |
| `/team/schedules/swaps` | 교대 요청/수락/상태 확인 |

### Admin UI Requirements

- 월간 grid는 가로 스크롤과 sticky column/header를 지원한다.
- shift cell은 고정 크기를 유지하고, D/E/N/OFF/AL/ONCALL 등 code가 흔들리지 않아야 한다.
- drag/drop 조작은 keyboard fallback을 제공한다.
- 변경 전/후가 눈에 보여야 한다.
- issue badge는 block/warn/info severity를 색과 label로 구분한다.
- 우측 inspector는 선택 셀의 근무자, 날짜, 규칙 위반, 변경 이력, 가능한 액션을 보여준다.
- publish 전 summary modal은 block/warn/info counts와 배포 대상자를 보여준다.

### Member UI Requirements

- 모바일 우선 개인 달력.
- 오늘/내일 근무, 다음 야간, 다음 온콜, 교대 요청 상태를 한 화면에서 확인.
- 팀 스케줄은 검색, 역할/shift 필터, 내 근무 강조를 지원.
- 교대 요청은 3단계 이내로 완료: 요청 대상 선택, 메시지 입력, 전송.

---

## 8. Design System Requirements

신규 UI는 SNUH Mate 디자인 시스템을 사용한다.

### Required Sources

- `docs/design-system/usage.md`
- `docs/design-system/components.md`
- `apps/web/src/styles/tokens/*.css`
- `apps/web/src/components/ui/*.astro`
- `apps/web/src/components/layout/*.astro`
- `apps/web/src/components/patterns/*.astro`

### Rules

- 색상은 `--color-*` semantic token만 사용한다.
- 간격은 `--space-*` scale만 사용한다.
- 버튼은 `Button.astro`를 사용한다.
- 입력은 `FormField` + `Input/Select/Textarea/Checkbox/Radio/Switch` 조합을 사용한다.
- 페이지 구조는 `Container`, `Section`, `Grid`, `Stack`, `PageHeader`를 사용한다.
- 빈 상태, 오류, 로딩은 `EmptyState`, `ErrorState`, `LoadingSkeleton`을 사용한다.
- 특수 schedule grid component가 필요하면 `apps/web/src/components/team-schedules/`에 만들고 `/design-system` showcase에 등록한다.
- raw hex, 임의 spacing, inline style 직접 지정은 금지한다.

### UX Tone

- 관리자 화면은 SaaS 운영툴처럼 조용하고 밀도 있게 만든다.
- hero/marketing layout을 쓰지 않는다.
- card 안에 card를 중첩하지 않는다.
- 일정표는 꾸밈보다 판독성과 반복 작업 효율을 우선한다.

---

## 9. Backend And Storage Requirements

MVP는 Firebase/Firestore 기반 Team Plan 저장소를 우선 사용한다. 파일 파싱은 기존 backend parser를 제품화할 수 있으나, schedule 운영 데이터의 권한과 배포 workflow는 Team Plan 데이터 모델에 맞춘다.

### Collections

```text
organizations/{organizationId}
teams/{teamId}
employeeIdentities/{employeeIdentityId}
teamMemberships/{membershipId}
teams/{teamId}/rulePacks/{rulePackId}
teams/{teamId}/scheduleImports/{importId}
teams/{teamId}/scheduleSnapshots/{snapshotId}
teams/{teamId}/scheduleVersions/{versionId}
teams/{teamId}/scheduleChanges/{changeId}
teams/{teamId}/ruleEvaluations/{evaluationId}
teams/{teamId}/swapRequests/{swapRequestId}
teams/{teamId}/approvalTasks/{approvalTaskId}
teams/{teamId}/notifications/{notificationId}
teams/{teamId}/auditLogs/{auditLogId}
```

### API Contracts

| Action | Contract |
|---|---|
| import schedule | `POST /api/team-schedules/import` |
| parse clipboard | client-side parser first, backend parser fallback |
| validate schedule | `POST /api/team-schedules/validate` |
| create change overlay | `POST /api/team-schedules/changes` |
| publish version | `POST /api/team-schedules/publish` |
| create swap request | `POST /api/team-schedules/swaps` |
| accept/reject swap | `POST /api/team-schedules/swaps/{id}/decision` |
| approve swap | `POST /api/team-schedules/approvals/{id}/decision` |
| list notifications | `GET /api/team-schedules/notifications` |

API는 이후 구현 방식에 따라 Firebase callable, server route, FastAPI, 또는 Vercel function으로 구체화할 수 있다. PRD 기준에서는 contract와 권한 모델을 먼저 고정한다.

### Security Boundaries

- member는 자기 팀의 published schedule만 읽을 수 있다.
- member는 draft, import snapshot, 다른 사람의 상세 preference를 읽을 수 없다.
- admin/scheduler만 draft, validation, rule pack, approval queue를 볼 수 있다.
- schedule duty code와 memo는 가능한 한 암호화 대상이다.
- team-visible 정보와 개인 급여/명세서 정보는 Firestore path와 rule을 분리한다.
- 모든 publish, approval, override는 audit log를 남긴다.

---

## 10. Engine Requirements

### Rule Engine

입력:

- schedule snapshot
- change overlays
- team members
- coverage requirements
- qualifications
- preferences
- pairing rules
- pinning rules
- mandatory shifts
- on-call assignments
- rule packs

출력:

- normalized assignments
- rule evaluations
- blocking summary
- affected cells
- suggested fixes
- publish eligibility

### Change Overlay Engine

원본 import snapshot은 수정하지 않는다. 모든 수동 변경은 overlay로 저장한다.

```text
base snapshot + ordered overlays = candidate schedule
candidate schedule + rule pack = validation result
candidate schedule + publish action = published version
```

### Local Repair, Not Full Optimization

MVP는 전체 근무표 자동 생성이 아니라 local repair suggestion까지만 허용한다.

예시:

- 이 셀 변경 시 커버리지 부족이 발생하니 같은 날짜 E 가능한 후보 3명 추천
- N-OFF-D 위반이 생기니 D를 OFF로 바꾸거나 N 담당자를 교체 제안
- Angio 장비 자격자가 부족하니 자격자 후보 필터링

---

## 11. Import Requirements

### Accepted Inputs

| Input | MVP 여부 | 설명 |
|---|---|---|
| XLS/XLSX | 필수 | EMR export 또는 관리자 파일 |
| CSV | 필수 | 가장 안정적인 1차 format |
| Clipboard paste | 필수 | Excel grid 복사 붙여넣기 |
| PDF | 후속 | 병원 출력물 기반 parsing |
| Image/Vision | 후속 | 모바일 촬영 기반 parsing |

### Normalization Rules

- 이름/직원 식별자는 employee identity와 매칭한다.
- 매칭 실패 시 unresolved employee로 표시하고 관리자 보정을 요구한다.
- duty code는 표준 코드로 변환한다: D, E, N, OFF, AL, EDU, ONCALL 등.
- 알 수 없는 code는 unknown badge로 표시하고 배포 전 해결한다.
- import 파일 원본과 파싱 결과 checksum을 저장한다.

---

## 12. Notifications

MVP 알림은 앱 내부 notification center부터 시작한다. 브라우저 push, email, Kakao/Slack 등 외부 알림은 후속 phase로 둔다.

| Event | Recipient |
|---|---|
| schedule published | team members |
| swap requested | target employee |
| swap accepted | requester, admin |
| swap rejected | requester |
| admin approved swap | requester, target employee |
| admin rejected swap | requester, target employee |
| schedule changed after publish | affected employees |

---

## 13. Tech Stack

- App shell: Astro + Vanilla JS ESM
- UI: SNUH Mate design system components
- Data validation: Zod for client/domain schema
- Import parsing: `xlsx`, `papaparse`, clipboard parser
- Backend parser fallback: existing FastAPI parser can be reused after product hardening
- Storage: Firestore/Team Plan collections
- Tests: Vitest unit/integration, Playwright smoke
- Calendar export: ICS as follow-up after published schedule is stable

---

## 14. Commands

```bash
pnpm web:dev
pnpm web:build
npm run build
npm run test:unit
npm run test:integration
npm run test:smoke
npm run lint
```

Backend parser verification, if used:

```bash
cd backend
pytest
```

---

## 15. Project Structure

Proposed new structure:

```text
apps/web/src/pages/team/schedules/
  admin.astro
  import.astro
  rules.astro
  approvals.astro
  audit.astro
  index.astro
  me.astro
  swaps.astro

apps/web/src/client/team-schedules/
  admin-controller.js
  import-controller.js
  rule-editor-controller.js
  member-schedule-controller.js
  swap-controller.js

apps/web/src/components/team-schedules/
  ScheduleGrid.astro
  ShiftCell.astro
  RuleIssueBadge.astro
  ScheduleInspector.astro
  ImportPreviewTable.astro
  SwapRequestPanel.astro

packages/scheduling/
  src/schema.js
  src/rules.js
  src/evaluate.js
  src/overlay.js
  src/import-normalize.js
  src/availability.js

tests/unit/scheduling/
tests/integration/team-schedules/
tests/e2e/team-schedules.spec.js
```

Do not extend:

```text
public/nurse_admin/
apps/web/public/nurse_admin/
apps/web/src/client/schedule_suite.js
apps/web/public/client/schedule_suite.js
```

These may be used only as throwaway reference while implementing the new product surface.

---

## 16. Code Style

Domain code should be deterministic and side-effect-light.

```js
export function evaluateMinRest(assignments, shiftTemplates, rule) {
  const issues = [];
  const byEmployee = groupAssignmentsByEmployee(assignments);

  for (const [employeeId, rows] of byEmployee.entries()) {
    const sorted = rows.toSorted((a, b) => a.date.localeCompare(b.date));
    for (let i = 1; i < sorted.length; i += 1) {
      const restHours = calculateRestHours(sorted[i - 1], sorted[i], shiftTemplates);
      if (restHours < rule.minHours) {
        issues.push({
          ruleId: rule.id,
          severity: rule.severity,
          employeeId,
          cells: [sorted[i - 1].cellId, sorted[i].cellId],
          message: `교대 간 휴식 ${restHours}시간`,
        });
      }
    }
  }

  return issues;
}
```

Conventions:

- schema 이름은 domain language를 그대로 쓴다.
- UI-only 상태와 persisted domain 상태를 분리한다.
- issue는 항상 `ruleId`, `severity`, `affectedCells`, `message`를 포함한다.
- 관리자 override는 항상 reason과 actor를 포함한다.

---

## 17. Testing Strategy

### Unit Tests

- rule evaluator
- overlay merge
- import normalization
- employee matching
- shift rest calculation
- monthly night count
- on-call conflict
- swap request state machine

### Integration Tests

- import -> snapshot -> validation
- drag/drop change -> overlay -> validation
- publish -> member view
- swap request -> counterpart accept -> manager approve -> new published version
- Firestore rules for team role isolation
- design-system governance for new components

### E2E Smoke

- admin imports sample XLS
- admin fixes one cell by drag/drop
- block issue disappears
- admin publishes v1
- member sees own schedule
- member requests swap
- counterpart accepts
- admin approves
- member sees v2 update

---

## 18. Acceptance Criteria

MVP is done when:

1. A manager can import one month of nurse schedule from CSV/XLS/clipboard.
2. The imported original schedule is stored as immutable snapshot.
3. The manager can drag/drop at least one assignment change.
4. The change is stored as overlay/change request, not by mutating the snapshot.
5. Rule validation runs immediately after change.
6. Validation catches coverage, qualification, N-OFF-D, 16h rest, night cap, on-call conflict.
7. A manager can publish v1 only when block issues are resolved.
8. Members can view personal and team schedule from the published version.
9. A member can send a swap request to another member.
10. The counterpart can accept or reject.
11. Accepted swap creates manager approval task.
12. Manager approval creates a new published version.
13. Notifications are visible in app for affected users.
14. Audit log exists for import, change, publish, swap, approval.
15. New UI uses SNUH Mate design system components and passes governance tests.

---

## 19. Rollout Plan

### Phase 1. Domain Schema And Import

- Build `packages/scheduling` schema.
- Implement CSV/XLS/clipboard normalization.
- Build import preview UI.
- Store immutable snapshot.

### Phase 2. Rule Engine

- Implement rule pack schema.
- Implement MVP built-in rules.
- Build validation summary and cell issue model.
- Add rule pack admin surface.

### Phase 3. Admin Schedule Board

- Build new schedule grid with drag/drop.
- Store overlay changes.
- Add cell inspector.
- Revalidate affected range after changes.

### Phase 4. Publish And Member Views

- Create versioned published schedule.
- Build personal schedule page.
- Build team schedule page.
- Add notification center.

### Phase 5. Swap Workflow

- Implement swap request state machine.
- Add counterpart accept/reject.
- Add manager approval queue.
- Publish approved changes as new version.

### Phase 6. Hardening

- Firestore security rules.
- Audit log completeness.
- Playwright smoke.
- Design-system showcase for schedule components.
- Import edge-case handling.

---

## 20. Risks And Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| EMR export format varies | import 실패 | CSV/XLS/clipboard first, import mapping preset 저장 |
| 관리자 암묵지가 자유 텍스트로 퍼짐 | 검증 불가 | structured rule templates만 허용 |
| drag/drop이 규칙을 쉽게 깨뜨림 | 현장 신뢰 하락 | 즉시 재검증, block publish |
| 팀원 개인정보 노출 | 보안 사고 | team role rule, published-only read, draft 제한 |
| schedule과 payroll data 혼재 | privacy/권한 문제 | path와 encryption boundary 분리 |
| 기존 테스트용 nurse_admin 혼동 | 제품 품질 저하 | 새 route/module만 제품 surface로 인정 |
| 자동 생성 욕심으로 scope 증가 | MVP 지연 | local repair suggestion까지만 허용 |

---

## 21. Open Questions

MVP 구현 전 확인할 사항:

1. 실제 EMR export의 1차 format은 XLS, CSV, PDF 중 무엇인가?
2. 병동 40세 이상 야간 금지 원칙은 모든 병동에서 block으로 둘 것인가, 본인 희망 시 warn+override로 둘 것인가?
3. Angio 온콜은 예정 대기와 실제 호출을 같은 화면에 보이되, 데이터 모델은 분리할 것인가?
4. 팀원 이름 노출 범위는 전체 팀원 공개인가, shift/날짜 단위 최소 공개인가?
5. Team Plan MVP의 첫 파일럿은 101 병동, Angio, 또는 둘 다인가?

---

## 22. Final Decision

SNUH Mate의 간호 근무스케줄 MVP는 Timefold 없이 구현한다. 핵심은 solver가 아니라 workflow다. EMR에서 만든 근무표를 안전하게 가져오고, SNUH Mate의 규칙/암묵지/디자인 시스템 위에서 관리자가 빠르게 보정하고 배포하며, 팀원이 교대 요청을 통해 실제 운영 흐름에 참여할 수 있게 만드는 것이 1차 목표다.
