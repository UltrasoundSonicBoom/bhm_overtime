# 데이터 Lifecycle 정책 — 회귀 패턴의 본질 분석

> 작성: 2026-04-27 (Phase 5-followup)
> 범위: bhm_overtime SPA 의 localStorage 데이터 lifecycle 통합 정책
> 동기: 동일 회귀 패턴 5+ 회 반복 → 근본 원인 정리 + 영구 차단 정책

---

## 1. 반복된 회귀 패턴 (4종)

### A. "데이터 부활"
- **증상**: 사용자가 데이터 초기화 후 → 다시 진입하면 명세서/프로필/이력 일부 살아있음
- **사용자 인지**: "심각한 보안 에러" — 다른 사람이 쓸 때 흔적 노출
- **근본 원인**:
  1. 새 도메인 키 추가 시 USER_DATA_PATTERNS 갱신 누락 (drift)
  2. `bhm_settings` 같은 KEEP 대상에 PII 저장
  3. 다른 namespace 키 (`*_<uid>`, `*_demo`) 매칭 누락
  4. 외부 sync (Google Drive/Calendar) 가 wipe 후 cloud 에서 복원
  5. 사용자가 같은 파일을 다시 업로드 → "부활" 로 인식

### B. "저장 후 데이터 소실"
- **증상**: 명세서로 채워진 form 값을 [저장하기] 누르면 일부 필드 빈 값으로 덮어쓰기됨
- **근본 원인**: `PROFILE.save(data)` 의 merge 정책이 **빈 string `''` 으로 existing 덮어씀**
  ```js
  // 현재 (위험)
  const profile = { ...defaults, ...existing, ...data };
  // data.specialPay = '' (form 에 빈 input) → existing.specialPay = 35000 덮어씀
  ```
- 빈 input 의 가족수당/특수수당 등이 명세서로 채워진 값을 wipe

### C. "탭 전환 후 form 비어있음"
- **증상**: 명세서 업로드 → 다른 탭 → info 탭 진입 → form 비어있음
- **근본 원인**: `_bootstrapProfileTab` 만 1회 form 채움. `initProfileTab` 가 form 갱신 누락 → 탭 진입 시 form 빈 채로 표시
- **이미 fix 완료** (`a79bb43`): `initProfileTab` 가 매번 PROFILE.applyToForm 호출

### D. "CSP 차단"
- **증상**: SPA root URL 의 fonts.googleapis.com / tally.so 차단
- **근본 원인**: `vercel.json` source pattern `/(.*)\.html` 가 SPA root `/` 매치 안 함
- **이미 fix 완료** (`6f62f6a`): `/` source 별도 추가

---

## 2. 본질 분석 — 왜 같은 패턴이 반복되나?

### 원인 1: localStorage 키의 **분산 정의**
- 각 모듈이 자기 키를 직접 관리 (PROFILE.STORAGE_KEY, OVERTIME.STORAGE_KEY, payslip_*, payroll_compare_history, snuhmate_reg_favorites, ...)
- **단일 진실 원천 없음**: 키 추가 시 reset/backup/inventory 갱신 누구도 책임 안 짐
- USER_DATA_PATTERNS, downloadBackup keys, KEEP 목록 — 각각 따로 drift

### 원인 2: save merge 정책 **합의 부재**
- `PROFILE.save(data)` 가 spread merge 만 함 — 빈 string 도 덮어씀
- 부분 저장 (form 일부만 채워진 상태) 시 명시적 정책 없음
- collectFromForm 도 `el.value` 그대로 반환 (빈 값 처리 X)

### 원인 3: 자동 저장 vs 수동 저장 **chain 명확하지 않음**
- 명세서 업로드 → applyStableItemsToProfile (자동 patch save)
- 사용자 [저장하기] → collectFromForm + PROFILE.save (수동 full save) — 빈 값으로 덮어씌우는 조합
- 두 경로의 상호작용을 사용자가 추적 불가

### 원인 4: 회귀 가드의 **scope 좁음**
- 통합 테스트가 단일 시나리오만 검증
- 사용자 실제 시나리오 (명세서 업로드 → 다른 탭 → 저장 → 초기화 → 새 명세서) 끝까지 검증 X
- SW + lazy fragment + 외부 sync 등 production-only chain 미검증

---

## 3. 본질적 해결책 (정책 + 구현)

### 정책 A: STORAGE_REGISTRY (단일 진실 원천)

```js
// shared/storage-registry.js (신규 — Phase 5-followup)
export const STORAGE_REGISTRY = {
  // 사용자 도메인 데이터 — wipe 대상
  user: [
    /^bhm_hr_profile/,
    /^overtimeRecords/,
    /^leaveRecords/,
    /^bhm_work_history/,
    /^payslip_/,
    /^otManualHourly/,
    /^overtimePayslipData/,
    /^bhm_lastEdit_/,
    /^_orphan_/,
    /^snuhmate_reg_favorites/,
    /^payroll_compare_history/,    // ← 누락 fix
    /^cardnews\./,                  // ← 누락 fix (사용자 위젯 설정)
    /^bhm_demo_mode$/,
    /^hwBannerDismissed$/,
  ],
  // 시스템 메타 — KEEP
  keep: new Set([
    'bhm_local_uid', 'bhm_deviceId', 'bhm_anon_id',
    'theme', 'snuhmate-theme',
    'bhm_leave_migrated_v1', 'bhm_debug_parser',
    // bhm_settings 는 별도 처리 (PII 필드만 wipe)
  ]),
  // 외부 캐시 — KEEP (재로드 가능)
  cache: [
    /^holidays_/,
    /^data_bundle_/,
    /^Channel\./,
    /^onboarding_(seen|count)/,
  ],
  // bhm_settings 안에서 wipe 할 PII 필드
  settingsWipeFields: ['googleSub', 'driveEnabled', 'calendarEnabled', 'cachedProfile', 'lastSync'],
};
```

**규약**: 새 localStorage 키 추가 시 STORAGE_REGISTRY 갱신 PR 필수.

### 정책 B: save merge 보호

```js
// profile.js
save(data) {
  const existing = this.load() || {};
  // Phase 5-followup: 빈 값으로 existing 덮어쓰기 금지
  const cleaned = {};
  for (const [k, v] of Object.entries(data)) {
    if (v === '' || v === null || v === undefined) continue;
    if (typeof v === 'number' && v === 0 && existing[k] > 0) continue;
    cleaned[k] = v;
  }
  const profile = { ...this.defaults, ...existing, ...cleaned, savedAt: ... };
  ...
}
```

### 정책 C: 자동 저장 + UX 명시

- 명세서 업로드 → 자동 PROFILE.save(patch) (이미 있음 — `applyStableItemsToProfile`)
- 자동 저장 직후 status badge "💾 명세서로 자동 저장됨" 표시 (3초 fade)
- 사용자 [저장하기] = 추가 보강 (form 수동 입력값 → save)

### 정책 D: 회귀 가드 강화

신규 통합 테스트 (`tests/integration/data-lifecycle.test.js`):
1. 명세서 업로드 → 자동 PROFILE 저장 검증
2. saveProfile 호출 시 빈 form 필드가 existing 명세서 값 덮어쓰기 X 검증
3. clearProfile → STORAGE_REGISTRY.user 모든 패턴 wipe 검증 + KEEP 보존
4. clearProfile → bhm_settings 의 PII 필드만 wipe / driveEnabled 등 보존
5. wipe 후 잔존 키 0건 (`payroll_compare_history` 등 새 키 추가 시 자동 검출)

---

## 4. 구현 우선순위 (지금 진행)

| Task | 범위 | 우선순위 |
|---|---|---|
| 1. PROFILE.save 빈 값 보호 (정책 B) | profile.js | 🔴 즉시 (이슈 4) |
| 2. USER_DATA_PATTERNS 보강 + payroll_compare_history (정책 A 부분) | profile-tab.js | 🔴 즉시 (이슈 2) |
| 3. bhm_settings PII 셀렉티브 wipe | profile-tab.js | 🟡 보안 |
| 4. 명세서 업로드 자동 저장 status UX (정책 C) | salary-parser.js / app.js | 🟡 UX (이슈 3) |
| 5. STORAGE_REGISTRY 신규 모듈 (정책 A 완전) | shared/ | 🟢 Phase 6 마이그레이션 |
| 6. 회귀 가드 통합 테스트 (정책 D) | tests/integration/ | 🔴 즉시 (회귀 차단) |

---

## 5. Phase 6/7 (TurboRepo + Astro + Tailwind + Firebase) 호환성

- ✅ STORAGE_REGISTRY = `packages/storage-registry` 별도 패키지로 격리 가능
- ✅ save merge 정책 = Firebase Firestore 동기화 시 동일 정책 적용
- ✅ 자동 저장 status UX = Astro component 으로 재작성 (Phase 7 Tailwind)
- ✅ 데이터 wipe 시 Firebase Auth signOut + Firestore collection delete 추가 hook
