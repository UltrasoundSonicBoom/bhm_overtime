# Spec: Phase 8 — Firebase Auth + Firestore 도입

**작성일**: 2026-04-29 (v1) / **갱신**: 2026-04-29 (v2 — 사용자 승인 통합 blueprint)
**선행 phase**: Phase 7 (Tailwind) 완료
**Firebase Project**: `snuhmate` (project# 914163950802, owner ultrasoundsonicboom@gmail.com)
**Hosting (그대로 유지)**: Cloudflare. Firebase Hosting **미사용**.

> **v2 변경점 요약** (2026-04-29 사용자 승인, blueprint: `~/.claude/plans/agile-chasing-stardust.md`):
> - **Auth 1차 변경**: Email/Password 제거 → **Google + 카카오 1차 통합** (Plan A/B 분리 폐기)
> - **신규 §18 암호화 레이어**: 민감 필드 AES-GCM (uid 파생 키), 평문 인덱싱 필드는 보존 (Hybrid)
> - **신규 §19 Supabase 잔여물 정리**: 별도 phase
> - **데이터 보존**: 10년 누적 비전 유지 (자동 삭제 0)
> - 본 SPEC 의 §6 Auth, §7 Migration, §15 진행 순서 는 v2 결정으로 해석할 것

---

## 1. Objective

snuhmate.com (현재 게스트 모드 localStorage-only) 에 **선택적 클라우드 동기화**를 도입한다. 사용자는 로그인 없이도 100% 사용 가능하며, 로그인 시 (a) 다기기 동기화, (b) 10년치 급여 명세서 누적 (현 시스템 3개월 한계 극복), (c) 본인 OpenAI/Anthropic API 키로 AI 분석/검증 기능을 잠금 해제한다.

### Success Criteria
1. 게스트 모드 사용자 0 회귀 — Phase 5 회귀 가드 9 시나리오 + Phase 7 Tailwind 5 critical 가드 통과
2. 로그인 사용자: 8개 탭 모든 데이터 종류가 Firestore와 양방향 동기화 (인벤토리 §3 참조 — 빠짐 0건)
3. 게스트 → 로그인 전환 시 "검토 후 카테고리별 업로드" 다이얼로그 (자동 silent push 0건)
4. 원본 PDF는 Google Drive `snuhmate/{YYYY}/` 폴더로 이전 — Firestore에는 파싱 결과만
5. 개인 식별 정보 (이름/사번/부서/근무이력) 와 급여 메타 (시급/연봉) 가 Firestore 상에서 logical separation
6. snuhmate.com (Cloudflare 호스팅) 무중단 배포 — Firebase Hosting 미사용
7. Firestore Security Rules: `request.auth.uid == userId` strict 외 0 예외
8. 카카오 로그인 동작 (Cloud Function Custom Token 패턴, Blaze plan)
9. 콘솔 에러 0건 (브라우저 스모크)

---

## 2. Tech Stack

- **Firebase SDK**: `firebase` v10.x modular (`firebase/auth`, `firebase/firestore`). compat SDK **금지**.
- **Auth providers (1차)**:
  - Email/Password
  - Google OAuth (이미 Drive/Calendar OAuth 브랜드 승인)
  - **카카오 로그인** (Custom Token, Cloud Function 1개)
- **Firestore**: native mode, region `asia-northeast3` (Seoul) 권장 (사용자 다수 한국)
- **Cloud Functions**: Node 20, TypeScript. `kakaoCustomToken` 1개 함수 (1차)
- **Plan**: Blaze (카카오 Cloud Function 필요)
- **Storage**: 활성 안 함 (PDF는 Google Drive 사용)
- **Hosting**: Firebase Hosting 활성 안 함. Cloudflare 그대로
- **Offline**: Firestore offline persistence (IndexedDB) 활성

---

## 3. 데이터 인벤토리 — 탭별 × 키별 × Firestore 매핑 (빠짐 검증용)

> **Q3 핵심 응답**: UIUX에 이미 구현된 모든 데이터를 빠짐없이 Firestore로 매핑. 각 탭의 모든 기능 점검 완료.

### 3.1 PayrollIsland (급여 탭)

| localStorage key | 현재 prefix | 데이터 | Firestore path | 비고 |
|---|---|---|---|---|
| `snuhmate_hr_profile` (payroll fields only) | snuhmate_* | 시급, 연봉, 호봉, 직급, 입사일 | `users/{uid}/profile/payroll/main` | identity와 분리 (q3-3) |
| `overtimePayslipData` | (no prefix) | 파싱된 명세서 배열 | `users/{uid}/payslips/{autoId}` 1 doc per 명세서 | q3-1 같은 달 2개 가능, `payslipName` 필드 (파싱 이름), `payMonth: "YYYY-MM"` 인덱스 |
| `otManualHourly` | (no prefix) | 수동 입력 시급 | `users/{uid}/profile/payroll/main.manualHourly` | payroll doc의 필드 |

**원본 PDF**: Google Drive `snuhmate/{YYYY}/{payslipName}.pdf` (q3-2). Drive file ID 를 Firestore payslip doc 의 `driveFileId` 필드에 저장.

### 3.2 OvertimeIsland (시간외)

| localStorage key | 데이터 | Firestore path |
|---|---|---|
| `overtimeRecords` | 시간외 기록 배열 | `users/{uid}/overtime/{yyyymm}` 1 doc per 월. `entries: [{date, hours, type, ...}]` |
| `otManualHourly` | (PayrollIsland와 공유) | (PayrollIsland 항목 참조) |
| 시급 0원 경고 배너 상태 | (derived, persistence X) | — |

### 3.3 LeaveIsland (휴가)

| localStorage key | 데이터 | Firestore path |
|---|---|---|
| `leaveRecords` | 휴가 기록 배열 | `users/{uid}/leave/years/{yyyy}` 1 doc per 년. `entries`, `annualBalance` |
| `snuhmate_leave_migrated_v1` | 마이그레이션 플래그 | localStorage-only (sync 제외) |

### 3.4 ProfileIsland (개인정보) — **q3-3 분리 핵심**

| 데이터 | 분류 | Firestore path |
|---|---|---|
| 이름, 사번, 부서, 입사일, 직급/호봉 (식별/근무 메타) | **identity** | `users/{uid}/profile/identity/main` |
| 시급, 연봉, 수당 정책, 급여 계산 옵션 | **payroll** | `users/{uid}/profile/payroll/main` |
| 근무이력 (`snuhmate_work_history`, `bhm_work_history` legacy) | **work_history** | `users/{uid}/work_history/{entryId}` |
| `snuhmate_work_history_seeded` (시드 플래그) | flag | `users/{uid}/profile/identity/main.workHistorySeeded` |

> **현재 상태**: `snuhmate_hr_profile` 한 doc 에 identity + payroll 혼재. **분리 마이그레이션 Task 별도** (Task 4.2).

### 3.5 ReferenceIsland (찾아보기 / 취업규칙)

| localStorage key | Firestore path |
|---|---|
| `snuhmate_reg_favorites` | `users/{uid}/settings/reference/favorites` |

### 3.6 SettingsIsland (설정)

| localStorage key | 데이터 | Firestore path |
|---|---|---|
| `snuhmate_settings` | 일반 설정 (theme except, AppLock 등) | `users/{uid}/settings/app/main` |
| `snuhmate_local_uid` | 로컬 익명 식별자 | **device-local only** (sync 제외) |
| `snuhmate_anon_id` | 익명 분석 ID | **device-local only** |
| `snuhmate_device_id` | device 식별자 | **device-local only** |
| `theme` | 테마 (linear/dark/neo) | `users/{uid}/settings/app/main.theme` |
| `snuhmate_demo_mode` | 데모 모드 | **device-local only** |
| `snuhmate_debug_parser` | 파서 디버그 플래그 | **device-local only** |

### 3.7 FeedbackIsland (피드백)

- 현재 server-side endpoint 사용 (피드백 form 제출). Phase 8 영향 0. **변경 없음**.

### 3.8 HomeIsland (홈 대시보드)

- 모든 데이터는 위 탭들에서 derived. 자체 persistence 0. **변경 없음**.

### 3.9 lastEdit 메타 (LWW conflict resolution용)

| localStorage key | Firestore 위치 |
|---|---|
| `snuhmate_last_edit_*` (모든 base key 별) | 각 doc의 `lastEditAt: Timestamp` 필드 (serverTimestamp) |

### 3.10 데이터 인벤토리 검증 체크리스트 (구현 시 참조)

- [ ] 8개 탭 × 각 데이터 항목 → Firestore path 매핑 100% 커버
- [ ] device-local-only 키 (uid, anon_id, device_id, demo_mode, debug_parser) 명시적으로 sync 제외 처리
- [ ] PDF 원본 → Google Drive 이전, Firestore에는 metadata + `driveFileId` 만
- [ ] 식별정보 (identity) ↔ 급여정보 (payroll) Firestore 상에서 별도 doc

---

## 4. localStorage 키 위험 분석 + 해결 전략

### 4.1 잠복 버그: `getUserStorageKey` 정의 누락

**확인된 사실**: `apps/web/`, `packages/` 어디에도 `window.getUserStorageKey =` 정의가 없음. 모든 호출은 fallback (`base + '_guest'`) 으로만 동작 → **현재 user-scoped 분리가 작동하지 않음** (모든 사용자가 `_guest` suffix 단일 namespace 공유).

**Phase 8 Task 0 (필수 prerequisite)**:
- (a) 정의 위치 확정 — 누락이면 신규 정의 추가 (예: `inline-ui-helpers.js` 최상단)
- (b) 동작 테스트 1개 추가 — guest / logged-in 키 분리 검증
- (c) 회귀 가드에 포함

### 4.2 키 명명 비일관성 — Key Registry 모듈 도입

`snuhmate_*`, `bhm_*`, prefix 없음 (`overtimeRecords`, `otManualHourly`, `leaveRecords`) 혼재. 신규 모듈 `packages/sync/src/key-registry.ts` 에서 양방향 매핑 중앙화:

```typescript
// 예시 시그니처
export const KEY_REGISTRY = {
  'snuhmate_hr_profile': { firestorePath: (uid) => `users/${uid}/profile/identity/main`, scope: 'sync' },
  'overtimeRecords': { firestorePath: (uid) => `users/${uid}/overtime`, scope: 'sync', shape: 'collection-by-yyyymm' },
  'snuhmate_local_uid': { scope: 'device-local' },
  // ...
} as const;
```

모든 Firestore 동기화 코드는 이 registry 를 참조. 누락 키 = 컴파일 에러.

### 4.3 legacy `bhm_*` 마이그레이션 누락 검증

- ✅ `bhm_settings`, `bhm_local_uid`, `bhm_deviceId`, `bhm_anon_id`, `bhm_demo_mode`, `bhm_debug_parser`, `bhm_leave_migrated_v1`, `bhm_lastEdit_*` → `inline-ui-helpers.js` lazy migrate
- ✅ `bhm_hr_profile` → `profile.js` self-migrate
- ✅ `bhm_work_history`, `bhm_work_history_seeded` → `work-history.js` self-migrate
- ⚠️ **확인 필요**: `bhm_lastEdit_*` 외에 누락된 prefix 없는 키 (예: `overtimeRecords` 가 `bhm_overtimeRecords` 로 존재하는 사용자가 있는지)
- **Task 0.2**: 프로덕션 sample 5명 localStorage dump 분석 → 누락 키 식별

### 4.4 게스트 → 로그인 전환 시 키 충돌

게스트 사용자가 `snuhmate_hr_profile_guest` 에 데이터 보유 → 로그인 시 `snuhmate_hr_profile_uid_xxx` 키와 충돌 가능.

**해결**: 마이그레이션 다이얼로그 (Q4-b) 가 단일 트랜잭션으로 처리:
1. 모든 `*_guest` 키 scan
2. 카테고리별 (개인정보/급여/시간외/휴가/설정) 체크박스 UI
3. 동의된 카테고리만:
   - Firestore 업로드
   - `*_uid_xxx` 키로 복사
   - `*_guest` 키 삭제
4. 거부된 카테고리는 `*_guest` 그대로 유지 (재로그아웃 시 다시 사용 가능)

### 4.5 multi-device LWW 충돌 해결

각 Firestore doc 에 `lastEditAt: serverTimestamp()` 필드. 클라이언트에서 write 시 비교 → 더 최근 timestamp 우선. 충돌 detection UI 는 Phase 8.5 로 분리 (Phase 8 은 silent LWW).

---

## 5. Firestore 데이터 모델 (확정)

```
/users/{uid}/
  profile/
    identity/main         { name, employeeId, department, position, hireDate, ... lastEditAt }
    payroll/main          { hourlyWage, annualSalary, manualHourly, allowancePolicy, ... lastEditAt }
    settings/main         { theme, appLock, ... lastEditAt }
  payslips/{autoId}       { payMonth: "YYYY-MM", payslipName, parsedFields, driveFileId, lastEditAt }
  overtime/{yyyymm}       { entries: [...], lastEditAt }
  leave/years/{yyyy}      { entries: [...], annualBalance, lastEditAt }
  work_history/{entryId}  { startDate, endDate, employer, position, ... lastEditAt }
  settings/
    app/main              { theme, notifications, ... lastEditAt }
    reference/favorites   { items: [...], lastEditAt }
```

---

## 6. Auth Provider 1차 — Email + Google + 카카오

### 6.1 카카오 (Custom Token 패턴)

**필요 작업**:
- [ ] 카카오 디벨로퍼 콘솔 앱 등록 (snuhmate)
- [ ] REST API key 발급
- [ ] Cloud Function `kakaoCustomToken`:
  - input: 카카오 access token
  - 검증: 카카오 `/v2/user/me` 호출
  - output: Firebase Custom Token (uid = `kakao_${kakaoUserId}`)
- [ ] Blaze plan 활성 + 결제 카드 등록 (사용자 수동)
- [ ] Firebase Console에서 Email/Password, Google 활성

### 6.2 Apple/네이버 — Phase 8.5 분리

**근거**: 1차 출시 속도 + 디버깅 surface 최소화 + Apple Developer Program $99/년 부담은 별도 분리 시점에 결정.

---

## 7. Migration UX (Q4-b)

첫 로그인 성공 시 1회:

```
┌─ 클라우드 동기화 시작 ──────────┐
│ 다음 로컬 데이터를 클라우드에 업로드할까요? │
│ ※ 거부한 항목은 이 기기에만 보관됩니다.    │
│                                    │
│ [✓] 개인정보 (이름, 사번, 부서)       │
│ [✓] 근무이력                        │
│ [✓] 급여명세서 (5개월치 발견)        │
│ [✓] 시간외 기록                     │
│ [✓] 휴가 기록                       │
│ [✓] 설정                           │
│                                    │
│  [나중에]            [선택 항목 업로드] │
└──────────────────────────────────┘
```

- "나중에" → 다이얼로그 닫고 게스트-같은 동작 유지 (URL 파라미터로 재오픈 금지 — non-pushy 메모리)
- 부분 업로드 가능 — 급여만, 시간외만 등 사용자 선택권 100% 보장

---

## 8. Security Rules (Strict, Q5-A)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

**제외 사항**:
- admin 백도어 0
- public read 0
- custom claim 0 (Phase 8.5 이후 검토)

---

## 9. Project Structure 추가

```
packages/sync/                         # 신규 패키지
  src/
    key-registry.ts                    # localStorage key ↔ Firestore path 양방향 매핑
    firestore-sync.ts                  # 양방향 동기화 엔진 (Firestore offline persistence 활용)
    migration-dialog.ts                # 첫 로그인 시 마이그레이션 UI 로직
    auth-provider.ts                   # Firebase Auth wrapper
  package.json
functions/                             # 신규 — Cloud Functions
  src/
    kakao-custom-token.ts              # 카카오 → Firebase Custom Token
  package.json
firebase.json                          # firebase init 후 생성
.firebaserc                            # firebase init 후 생성
firestore.rules                        # Security Rules
firestore.indexes.json                 # 인덱스 정의
docs/superpowers/specs/2026-04-29-phase8-firebase-auth.md  # 본 문서
```

---

## 10. Commands (Phase 8 진입 후)

```
# Firebase
firebase login                         # 사용자 직접 (interactive)
firebase init                          # 사용자 직접 (interactive) — Firestore + Functions 선택
firebase use snuhmate
firebase deploy --only firestore:rules
firebase deploy --only functions

# 개발
npm install firebase                   # apps/web
npm install firebase-admin firebase-functions    # functions/

# 빌드/테스트
npm run build                          # turbo
npm test                               # vitest (회귀 가드 포함)
```

---

## 11. Code Style

기존 ESM modular 패턴 유지. Firebase import 예시:

```typescript
// packages/sync/src/firestore-sync.ts
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc, setDoc, getDoc, serverTimestamp,
} from 'firebase/firestore';
import { KEY_REGISTRY } from './key-registry';

const app = initializeApp(/* config */);
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
```

명명: `firestoreSync`, `migrateGuestData`, `useFirebaseAuth` (camelCase). 기존 `apps/web/src/client/*.js` 와 일관.

---

## 12. Testing Strategy

- **회귀 가드 (필수)**:
  - Phase 5 9 시나리오 (cross-module ESM)
  - Phase 7 5 critical (profile form / overtime banner / settings backup / reference chapters / payroll picker)
  - **신규 (Phase 8)**: 게스트 모드 동작 0 회귀 — 로그인 안 한 사용자가 모든 탭 정상 사용
- **신규 테스트**:
  - `key-registry.test.ts` — 모든 localStorage key 가 registry 에 존재 + path 충돌 0
  - `firestore-sync.test.ts` — emulator 사용. read/write/lww 시나리오
  - `migration-dialog.test.ts` — 부분 업로드, 거부 시 _guest 보존, 재트리거 안 됨
  - `auth-provider.test.ts` — Email/Google/카카오 3 provider 시그니처
- **E2E (Playwright)**:
  - 게스트 → 로그인 → 마이그레이션 다이얼로그 → 부분 업로드 → 다른 탭에서 검증
  - 로그아웃 → 다시 게스트 모드 동작 확인
- **CLAUDE.md Playwright 스모크**: Phase 8 변경 후 8개 탭 + 콘솔 에러 0건 자동화

---

## 13. Boundaries

### Always
- Firestore offline persistence 활성 유지
- 모든 Firestore write 에 `lastEditAt: serverTimestamp()` 포함
- 게스트 모드 코드 경로 0 변화 (additive only)
- key-registry 통하지 않은 직접 Firestore path 하드코딩 금지

### Ask First
- 신규 Firestore collection 추가
- Auth provider 추가 (Apple/네이버 등 Phase 8.5)
- Cloud Function 추가
- Blaze plan 사용량 임계 변경
- snuhmate.com 호스팅 변경 (Cloudflare → Firebase 등)

### Never
- compat SDK 사용
- silent auto-upload (마이그레이션 다이얼로그 우회)
- Security Rules 에 `allow read, write: if true` 류 예외
- localStorage 코드 일괄 제거 (Phase 8 = additive)
- admin 백도어 / public read
- Firebase API key 를 git 에 커밋 (config 는 환경변수 또는 Cloudflare 빌드 변수)

---

## 14. Open Questions (SPEC 확정 단계)

1. **Q14.1** Cloudflare Pages 빌드 환경에서 Firebase config (apiKey 등) 를 어떻게 inject? (env var? Cloudflare build secret?)
2. **Q14.2** 카카오 Cloud Function region — `asia-northeast3` (Seoul) 인가 `us-central1` (default) 인가? Latency 측면 Seoul 권장
3. **Q14.3** Drive `snuhmate/{YYYY}/` 폴더 — 이미 Google Drive 통합 (memory) 에서 사용 중인 폴더 구조와 충돌 없는지 확인 필요. 현재 어떤 경로 사용?
4. **Q14.4** 마이그레이션 다이얼로그 카테고리 5개 — "설정" 은 device-local 키와 sync 키가 섞여있음. 어떤 sub-카테고리 보일지?
5. **Q14.5** 같은 달 2개 명세서 (소급/연차수당) — 기존 코드 확인 후 기존 unique key 가 무엇인지 (`payslipName` 만으로 충분한지, `payDate` 도 필요한지)

---

## 15. Phase 8 진행 순서 (다음 단계 = Plan 작성)

1. **SPEC 사용자 승인** ← 현재
2. **Task 0 (prerequisite)**: `getUserStorageKey` 정의 위치 확정 + 회귀 가드 1개 추가 + production sample 분석
3. **firebase init** (사용자 인터랙티브 직접 실행) → `.firebaserc`, `firebase.json` 생성. Firestore + Functions 선택
4. **Plan 작성** (subagent-driven 형식, `docs/superpowers/plans/2026-04-29-phase8-firebase.md`)
5. **Task 1~N** 구현 (incremental, 각 task 후 회귀 가드 통과 확인)
6. **카카오 디벨로퍼 콘솔 등록** (사용자 수동) + Custom Token Function 배포
7. **Cloudflare Pages 환경 변수 추가** (Firebase config)
8. **Production smoke** (CLAUDE.md Playwright 자동화)
9. **메모리 업데이트**: `project_phase8_firebase_kickoff.md` → `project_phase8_complete.md` 또는 lessons learned

---

## 16. 호환 유지 (Phase 5/7 회귀 가드)

- ✅ Phase 5 9 시나리오 통과 (cross-module ESM)
- ✅ Phase 7 Tailwind utility 0 회귀
- ✅ 5 critical 회귀 가드 통과
- ✅ 게스트 모드 (localStorage-only 사용자) 영향 0
- ✅ snuhmate.com (Cloudflare) 무중단

---

## 17. 핵심 파일 (Phase 8에서 touch)

**신규**:
- `packages/sync/` (전체)
- `functions/` (전체)
- `firebase.json`, `.firebaserc`, `firestore.rules`, `firestore.indexes.json`

**수정**:
- `packages/profile/src/profile.js` — Firestore identity/payroll 분리 + sync hook
- `packages/profile/src/work-history.js` — Firestore work_history sync hook
- `packages/profile/src/overtime.js` — Firestore overtime sync hook
- `packages/profile/src/leave.js` — Firestore leave sync hook
- `packages/profile/src/payroll.js` — Firestore payslip sync hook
- `apps/web/src/client/inline-ui-helpers.js` — `getUserStorageKey` 정의 추가 + Firebase init bootstrap
- `apps/web/src/client/settings-ui.js` — 로그인 UI 진입점 (Firebase Auth)
- `apps/web/src/components/tabs/SettingsIsland.astro` — Auth UI rendering
- `apps/web/src/client/regulation.js` — `snuhmate_reg_favorites` sync hook

**미수정**:
- 8개 탭의 UI 로직 (Astro components) — additive only, 기존 동작 100% 유지

---

## 18. 암호화 레이어 (v2 신규)

> 사용자 승인 blueprint (`~/.claude/plans/agile-chasing-stardust.md` Phase 4) — DB 해킹 / Firebase 직원 내부자 위협 방어. 한국 PIPA 의료직 정보 추가 layer.

### 18.1 키 파생 + 알고리즘
- **알고리즘**: AES-GCM 256-bit
- **키 파생**: `SHA-256(uid + '|snuh-mate-2026')` → AES-GCM key (`crypto.subtle.importKey`)
- **IV**: 매 암호화마다 12-byte 랜덤 (`crypto.getRandomValues`)
- **저장 형태**: `{ _v: 1, iv: <base64>, c: <base64-ciphertext> }` 객체
- **로컬 영향 0**: localStorage 는 평문 유지 (AppLock PIN 으로 보호). 암호화는 Firestore write 직전에만.

### 18.2 적용 범위 — Hybrid (선택적)

**평문 (인덱스/쿼리 가능)**:
- `payMonth`, `payDate`, `lastEditAt`, `firestoreId`, `createdAt`
- `payslipName` (카테고리 분류용)
- `entries[].date`, `entries[].yyyymm`
- `category`, `type`

**암호화 필드** — `firebase/sync/_encrypted-fields.js` 화이트리스트:
- Identity: `name`, `employeeId`, `department`, `position`, `hireDate`, `jobLevel`, `rank`
- Payroll: `hourlyWage`, `annualSalary`, `manualHourly`, `allowancePolicy`, `paymentDay`, `baseHours`
- Payslip: `parsedFields` (전체)
- Overtime: `entries[].hours`, `entries[].duration`, `entries[].notes`
- Leave: `entries[].duration`, `entries[].notes`
- Settings: `appLockPin`, `customNotes`
- Work history: `employer`, `position`, `notes`, `salary`

### 18.3 트레이드오프 + 결정 근거

- ✅ **AI 분석 가능**: 클라이언트 fetch → 복호화 → 본인 OpenAI/Anthropic API key 호출. AI 차단 없음.
- ✅ **Firestore 쿼리 효율**: payMonth orderBy 등 인덱싱 필드 보존.
- ✅ **본인 검색**: 자기 데이터는 다 fetch 후 클라이언트 메모리 검색 (≤ 1000 doc).
- ❌ **타인 검색 차단**: Security Rules 가 어차피 차단. 암호화는 추가 layer.
- ⚠️ **Key recovery**: uid 잃으면 데이터 영구 잠금. Google 로그인 회복 가능 (uid 동일).
- ⚠️ **Key rotation**: 미지원 (v1). 필요 시 client-side 재암호화 Phase 8.x 신규 task.

### 18.4 신규 파일
- `firebase/crypto.js` — `deriveKey(uid)`, `encryptValue(v, key)`, `decryptValue(blob, key)`, `encryptDoc(doc, fields, key)`, `decryptDoc(doc, fields, key)`
- `firebase/sync/_encrypted-fields.js` — 화이트리스트 (위 §18.2)
- `tests/integration/firebase/crypto.test.js` — 라운드트립 + IV 랜덤성 + 평문 필드 보존

---

## 19. Supabase 잔여물 정리 (v2 신규)

> 사용자 승인 blueprint Phase 11. 메모리 (project_backend_upgrade.md / Supabase 재검토 금지) 와 정합.

### 19.1 정리 대상
- `archive/` 또는 active source tree 의 `*supabase*.sql` 파일
- 코드 내 `// TODO: Supabase`, `// SB-` 주석
- `import` 또는 환경변수 (`SUPABASE_URL`, `SUPABASE_ANON_KEY` 등) 잔재
- Hono 백엔드 스캐폴드 (재활용 검토 후 archive 이동)

### 19.2 액션
1. `archive/backend-upgrade-supabase/` 디렉토리 생성 → 잔여물 이동
2. 코드 grep 후 죽은 코드 제거
3. README / docs 의 Supabase 참조 → "Phase 8 전 시도, 폐기" 한 줄 + Phase 8 link
4. `.env*` 의 SUPABASE_* 키 제거
