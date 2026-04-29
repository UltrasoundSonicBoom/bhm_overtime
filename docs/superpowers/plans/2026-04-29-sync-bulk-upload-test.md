# Sync & Bulk Upload — Implementation + Test Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** (1) 급여명세서 다중 파일 동시 업로드 지원(bulk), (2) 로컬↔클라우드 동기화 전체 경로를 Playwright로 실측 검증.

**Architecture:** 
- Bulk: `payroll-views.js`의 두 `<input type="file">` 에 `multiple` 추가 + `handleBulkUpload(files)` 신규 함수. 순차 파싱 후 마지막에 단 1회 `renderPayPayslip()` 호출.
- Test: Playwright MCP로 로컬 dev 서버 실행, 5개 PDF 업로드 → 로그인 전후 localStorage·UI·Firestore 상태 검증.

**Tech Stack:** Astro 5 / Vanilla JS / Firebase Auth+Firestore / Playwright MCP / PDF.js (embedded)

---

## 사전 지식 — 파일 경로 & 스토리지 키 맵

| 항목 | localStorage 키 | Firestore 경로 | 비고 |
|------|----------------|----------------|------|
| 파싱된 명세서 | `payslip_{googleSub\|guest}_{YYYY}_{MM}` | **없음 (로컬 전용)** | `salary-parser.js:_payslipUid()` |
| 시간외 보정 | `overtimePayslipData` | `users/{uid}/payslips/{YYYY-MM}` | write-through |
| 프로필 | `snuhmate_hr_profile_{uid\|guest}` | `users/{uid}/profile/identity+payroll` | migration + write-through |
| 시간외 | `overtimeRecords_{uid\|guest}` | `users/{uid}/overtime/{YYYY-MM}` | write-through |
| 휴가 | `leaveRecords` | `users/{uid}/leave/{YYYY}` | write-through |
| 근무이력 | `snuhmate_work_history_{uid\|guest}` | `users/{uid}/work_history/{id}` | migration |
| 즐겨찾기 | `snuhmate_reg_favorites_{uid\|guest}` | `users/{uid}/settings/reference` | migration |
| 설정 | `snuhmate_settings` | `users/{uid}/settings/app` | migration |

**중요:** 파싱 명세서(`payslip_*`)는 Firestore 동기화 대상이 아님. 기기별 로컬 저장. 로그인 후 업로드하면 `payslip_{googleSub}_{YYYY}_{MM}`으로 저장됨.

## 테스트 PDF 파일

| 파일 | 내용 | 기대 결과 |
|------|------|-----------|
| `data/2512 일반직 급여.pdf` | 2025-12 일반직 급여 | 25년 12월 급여 파싱 |
| `data/2512 일반직 소급.pdf` | 2025-12 소급분 | 25년 12월 소급 타입으로 병합 |
| `data/2601 일반직 급여.pdf` | 2026-01 일반직 급여 | 26년 1월 급여 파싱 |
| `data/2601 일반직연차수당.pdf` | 2026-01 연차수당 | 26년 1월 연차수당 타입 병합 |
| `data/2602 salary.pdf` | 2026-02 급여 | 26년 2월 급여 파싱 |

## 수정 파일 목록

| 파일 | 변경 유형 | 내용 |
|------|---------|------|
| `apps/web/src/client/payroll-views.js` | **수정** | bulk upload 지원 |

---

## Phase 1: Bulk Upload 구현

### Task 1: fileInput에 multiple 추가 + handleBulkUpload 구현

**Files:**
- Modify: `apps/web/src/client/payroll-views.js` (lines ~407-430, ~512-534, ~544-591)

- [ ] **Step 1: 빈 상태(empty state) fileInput에 multiple 추가**

  `apps/web/src/client/payroll-views.js` 의 `payslipUploadFileInput` 생성 블록(~407줄):

  ```js
  const fileInput = el('input', {
    type: 'file',
    id: 'payslipUploadFileInput',
    accept: '.pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.gif,.bmp,.webp',
    multiple: true,          // ← 추가
    style: { display: 'none' }
  });
  fileInput.addEventListener('change', function () {
    if (fileInput.files && fileInput.files.length > 0) handleBulkUpload(fileInput.files);  // ← files[0] → files
    fileInput.value = '';
  });
  ```

- [ ] **Step 2: buildTextUploadBtn fileInput에도 multiple 추가**

  `buildTextUploadBtn()` 내부 fileInput(~513줄):

  ```js
  const fileInput = el('input', { type: 'file', accept: 'application/pdf,.pdf', multiple: true });
  // ...
  fileInput.addEventListener('change', function () {
    if (fileInput.files && fileInput.files.length > 0) {
      handleBulkUpload(fileInput.files);  // ← files[0] → files
    }
  });
  ```

- [ ] **Step 3: handleBulkUpload 함수 추가 (handleInlineUpload 바로 위에 삽입)**

  `handleInlineUpload` 함수 직전(~544줄)에 삽입:

  ```js
  async function handleBulkUpload(files) {
    const list = Array.from(files);
    if (list.length === 0) return;
    if (list.length === 1) { return handleInlineUpload(list[0]); }  // single → 기존 경로

    const visualEl = document.getElementById('payPayslipVisual');
    if (visualEl) {
      const prog = el('div', { className: 'card', style: { textAlign: 'center', padding: '24px' } });
      const progText = el('div', { style: { color: 'var(--text-muted)', fontSize: 'var(--text-body-normal)' } });
      progText.textContent = `0 / ${list.length} 처리 중…`;
      prog.appendChild(progText);
      visualEl.textContent = '';
      visualEl.appendChild(prog);
    }

    let ok = 0;
    const errors = [];
    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      if (visualEl) {
        const progText = visualEl.querySelector('div div');
        if (progText) progText.textContent = `${i + 1} / ${list.length} 처리 중… (${file.name})`;
      }
      try {
        const result = await SALARY_PARSER.parseFile(file);
        const ym = SALARY_PARSER.parsePeriodYearMonth(result);
        if (ym) {
          SALARY_PARSER.saveMonthlyData(ym.year, ym.month, result, ym.type);
          if (typeof SALARY_PARSER.applyStableItemsToProfile === 'function') {
            SALARY_PARSER.applyStableItemsToProfile(result);
          }
          if (typeof window._propagatePayslipToWorkHistory === 'function') {
            window._propagatePayslipToWorkHistory(result, ym);
          }
          ok++;
        } else {
          errors.push(`${file.name}: 급여 기간 인식 불가`);
        }
      } catch (err) {
        errors.push(`${file.name}: ${err.message || '처리 실패'}`);
      }
    }

    currentPayslipIdx = 0;
    renderPayPayslip();  // 마지막 1회만 렌더

    // 결과 토스트
    try {
      const toast = document.createElement('div');
      toast.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#10b981;color:#fff;padding:10px 18px;border-radius:8px;z-index:9999;font-size:0.9rem;font-weight:600;box-shadow:0 4px 12px rgba(0,0,0,.2);max-width:90vw;text-align:center;';
      if (errors.length === 0) {
        toast.textContent = `💾 ${ok}개 명세서 저장 완료 — 내 정보 자동 반영됨`;
      } else {
        toast.style.background = '#f59e0b';
        toast.textContent = `⚠️ ${ok}개 저장 / ${errors.length}개 실패: ${errors[0]}`;
      }
      document.body.appendChild(toast);
      setTimeout(() => { toast.remove(); }, 4000);
    } catch (e) { /* noop */ }
  }
  ```

- [ ] **Step 4: 빌드 확인**

  ```bash
  cd /Users/momo/Documents/GitHub/bhm_overtime/apps/web
  npm run build 2>&1 | tail -20
  ```

  Expected: `✓ built in` 메시지, 에러 없음

- [ ] **Step 5: 커밋**

  ```bash
  git add apps/web/src/client/payroll-views.js
  git commit -m "feat(payslip): 다중 파일 bulk upload 지원 + 진행상황 표시"
  ```

---

## Phase 2: Playwright 동기화 통합 테스트

> **사전 조건:** dev 서버 실행 필요. Playwright MCP 설정에서 `--allowed-origins *` 완료.

### Task 2: Dev 서버 시작 및 초기 상태 캡처

- [ ] **Step 1: dev 서버 백그라운드 실행**

  ```bash
  cd /Users/momo/Documents/GitHub/bhm_overtime/apps/web
  npm run dev -- --port 4321 &
  ```

  그 다음:
  ```bash
  until curl -sf http://localhost:4321 > /dev/null 2>&1; do sleep 2; done && echo "ready"
  ```

- [ ] **Step 2: 브라우저 열기 + 초기 스냅샷**

  Playwright MCP:
  ```
  browser_navigate → http://localhost:4321
  browser_take_screenshot → /tmp/00_initial.png
  browser_console_messages → 에러 0건 확인
  ```

- [ ] **Step 3: localStorage 초기화 (클린 상태 보장)**

  ```
  browser_evaluate → localStorage.clear(); sessionStorage.clear();
  browser_navigate → http://localhost:4321  (새로고침)
  browser_take_screenshot → /tmp/01_clean_state.png
  ```

---

### Task 3: 시나리오 A — 게스트 단일 파일 업로드

- [ ] **Step 1: 급여 탭 이동**

  ```
  browser_click → [tab button: '급여']
  browser_take_screenshot → /tmp/A1_pay_tab.png
  ```

- [ ] **Step 2: 명세서 서브탭 선택**

  ```
  browser_click → [tab: '명세서']
  browser_take_screenshot → /tmp/A2_payslip_subtab.png
  ```
  
  Expected: 빈 상태 ("아직 등록된 명세서가 없습니다.") + "급여명세서 업로드" 버튼

- [ ] **Step 3: 단일 PDF 업로드 (2601 급여)**

  ```
  browser_choose_file → 
    selector: '#payslipUploadFileInput'
    files: ['/Users/momo/Documents/GitHub/bhm_overtime/data/2601 일반직 급여.pdf']
  ```

- [ ] **Step 4: 파싱 결과 확인**

  ```
  browser_take_screenshot → /tmp/A3_single_upload_result.png
  browser_console_messages
  ```
  
  Expected:
  - 토스트: "💾 명세서 2026년 1월 자동 저장됨 — 내 정보 자동 반영 완료"
  - 명세서 카드: 2026년 1월 급여 표시
  - 지급총액, 공제총액, 실수령액 표시
  - 에러 없음

- [ ] **Step 5: localStorage 저장 확인**

  ```
  browser_evaluate →
    JSON.stringify(
      Object.keys(localStorage).filter(k => k.startsWith('payslip_'))
    )
  ```
  
  Expected: `["payslip_guest_2026_01"]` 포함

---

### Task 4: 시나리오 B — 게스트 Bulk 업로드 (5개 파일)

- [ ] **Step 1: localStorage 초기화**

  ```
  browser_evaluate → localStorage.clear()
  browser_navigate → http://localhost:4321
  browser_click → [tab: '급여'] → [subtab: '명세서']
  ```

- [ ] **Step 2: 5개 파일 동시 업로드**

  ```
  browser_choose_file →
    selector: '#payslipUploadFileInput'
    files: [
      '/Users/momo/Documents/GitHub/bhm_overtime/data/2512 일반직 급여.pdf',
      '/Users/momo/Documents/GitHub/bhm_overtime/data/2512 일반직 소급.pdf',
      '/Users/momo/Documents/GitHub/bhm_overtime/data/2601 일반직 급여.pdf',
      '/Users/momo/Documents/GitHub/bhm_overtime/data/2601 일반직연차수당.pdf',
      '/Users/momo/Documents/GitHub/bhm_overtime/data/2602 salary.pdf'
    ]
  ```

- [ ] **Step 3: 진행상황 UI 확인 (빠르게 캡처)**

  ```
  browser_take_screenshot → /tmp/B1_bulk_progress.png
  ```
  
  Expected: "1 / 5 처리 중…" 텍스트 표시

- [ ] **Step 4: 완료 후 결과 확인**

  ```
  browser_take_screenshot → /tmp/B2_bulk_done.png
  browser_console_messages
  ```
  
  Expected:
  - 토스트: "💾 5개 명세서 저장 완료 — 내 정보 자동 반영됨"
  - 월 슬라이더: 2026-02 ~ 2025-12 (5개 항목)
  - 에러 없음

- [ ] **Step 5: localStorage 저장 키 확인**

  ```
  browser_evaluate →
    Object.keys(localStorage)
      .filter(k => k.startsWith('payslip_'))
      .sort()
  ```
  
  Expected 5개 키:
  - `payslip_guest_2025_12`
  - `payslip_guest_2025_12_소급` (또는 유사 타입)
  - `payslip_guest_2026_01`
  - `payslip_guest_2026_01_연차수당` (또는 유사)
  - `payslip_guest_2026_02`

- [ ] **Step 6: 프로필 자동 반영 확인**

  ```
  browser_click → [tab: '개인정보']
  browser_take_screenshot → /tmp/B3_profile_auto_populated.png
  ```
  
  Expected: 이름, 부서, 직급이 PDF에서 자동 채워져 있음

- [ ] **Step 7: 2025-12 월 데이터 상세 확인**

  ```
  browser_click → [tab: '급여'] → [subtab: '명세서']
  browser_click → [month slider ◀ to navigate to 2025-12]
  browser_take_screenshot → /tmp/B4_dec2025_detail.png
  ```
  
  Expected: 2025년 12월 급여 + 소급분 병합 표시

---

### Task 5: 시나리오 C — 이메일 로그인 후 마이그레이션 동기화

- [ ] **Step 1: Bulk 업로드 상태 유지한 채로 로그인 진행**

  (Task 4 완료 후 상태 유지)
  
  ```
  browser_click → [tab: '설정']
  browser_take_screenshot → /tmp/C1_settings_tab.png
  ```

- [ ] **Step 2: 로그인 버튼 클릭**

  ```
  browser_click → #snuhmateAuthPill  (또는 '로그인' 버튼)
  browser_take_screenshot → /tmp/C2_login_dialog.png
  ```
  
  Expected: 로그인 다이얼로그 표시 (구글 버튼 + 이메일/비밀번호 폼)

- [ ] **Step 3: 이메일 로그인 입력**

  ```
  browser_fill → input[type=email] → kgh1379@gmail.com
  browser_fill → input[type=password] → [비밀번호 입력]
  browser_click → [로그인 버튼]
  browser_take_screenshot → /tmp/C3_after_email_login.png
  ```

- [ ] **Step 4: 마이그레이션 다이얼로그 확인 (Step 1 확인 패널)**

  ```
  browser_take_screenshot → /tmp/C4_migration_step1.png
  ```
  
  Expected:
  - "☁️ 클라우드 동기화" 제목
  - "핸드폰에 저장된 내용 전체를 클라우드에 동기화하시겠습니까?"
  - [아니요 (선택)] [예 (전체 동기화)] 버튼

- [ ] **Step 5: "예 (전체 동기화)" 클릭**

  ```
  browser_click → [예 (전체 동기화)]
  browser_take_screenshot → /tmp/C5_syncing.png
  ```
  
  Expected: "업로드 중…" 버튼 상태

- [ ] **Step 6: 동기화 완료 확인**

  ```
  browser_take_screenshot → /tmp/C6_sync_done.png
  browser_console_messages
  ```
  
  Expected:
  - 버튼: "완료! (N개)"
  - 콘솔에 `[migration]` 실패 경고 없음
  - 다이얼로그 자동 닫힘 (1.2초 후)

- [ ] **Step 7: 설정 탭 로그인 상태 확인**

  ```
  browser_click → [tab: '설정']
  browser_take_screenshot → /tmp/C7_settings_loggedin.png
  ```
  
  Expected:
  - `#snuhmateAuthPill`: 사용자 이름(또는 이메일 앞부분) 표시
  - `#snuhmateLogoutBtn`: "로그아웃" 표시

- [ ] **Step 8: 명세서 탭 로그인 후 유지 확인**

  ```
  browser_click → [tab: '급여'] → [subtab: '명세서']
  browser_take_screenshot → /tmp/C8_payslip_after_login.png
  ```
  
  Expected:
  - 명세서 데이터 여전히 표시됨
  - **주의:** 로그인 후 `storageKey`는 `payslip_{googleSub}_{YYYY}_{MM}`으로 바뀜
  - 따라서 게스트 명세서가 안 보이면 정상 (이 동작을 확인·문서화)

---

### Task 6: 시나리오 D — Google OAuth 로그인 흐름

- [ ] **Step 1: 로그아웃 후 localStorage 초기화**

  ```
  browser_click → [로그아웃]
  browser_evaluate → 
    ['snuhmate_migration_done_v1'].forEach(k => localStorage.removeItem(k))
  browser_navigate → http://localhost:4321
  ```

- [ ] **Step 2: 테스트 데이터 재주입 (게스트 프로필)**

  ```
  browser_evaluate →
    localStorage.setItem('snuhmate_hr_profile_guest', JSON.stringify({
      name: '테스트사용자', department: '영상의학과', position: '방사선사',
      hourlyWage: 15000, hireDate: '2020-03-01'
    }))
  ```

- [ ] **Step 3: Google 로그인 시도**

  ```
  browser_click → [tab: '설정']
  browser_click → #snuhmateAuthPill
  browser_take_screenshot → /tmp/D1_google_login_dialog.png
  browser_click → [Google로 계속하기 버튼]
  browser_take_screenshot → /tmp/D2_google_popup.png
  ```
  
  **Note:** Google OAuth 팝업은 자동화 불가. 스크린샷으로 팝업 뜨는 것 확인 후 수동 완료.
  팝업에서 계정 선택 → Playwright가 `browser_take_screenshot`으로 로그인 완료 상태 확인.

- [ ] **Step 4: 마이그레이션 Step 1 → "아니요(선택)" 클릭**

  ```
  browser_take_screenshot → /tmp/D3_migration_step1.png
  browser_click → [아니요 (선택)]
  browser_take_screenshot → /tmp/D4_migration_step2_select.png
  ```
  
  Expected: 카테고리 체크박스 목록 표시 (7개 항목, 모두 체크됨)

- [ ] **Step 5: 일부만 선택 후 동기화**

  ```
  browser_click → label[data or text: '앱 설정'] input[type=checkbox]   (체크 해제)
  browser_click → label[text: '즐겨찾기'] input[type=checkbox]          (체크 해제)
  browser_click → [선택 항목 동기화]
  browser_take_screenshot → /tmp/D5_partial_sync.png
  browser_console_messages
  ```
  
  Expected: 콘솔에 실패 0건, 버튼에 "완료! (N개)"

---

### Task 7: 시나리오 E — 로그인 상태에서 명세서 업로드 (write-through)

- [ ] **Step 1: 로그인 상태 확인**

  ```
  browser_evaluate → !!window.__firebaseUid
  ```
  
  Expected: `true`

- [ ] **Step 2: 명세서 탭에서 bulk 업로드**

  ```
  browser_click → [tab: '급여'] → [subtab: '명세서']
  browser_choose_file →
    selector: '#payslipUploadFileInput'
    files: [
      '/Users/momo/Documents/GitHub/bhm_overtime/data/2601 일반직 급여.pdf',
      '/Users/momo/Documents/GitHub/bhm_overtime/data/2602 salary.pdf'
    ]
  browser_take_screenshot → /tmp/E1_bulk_loggedin.png
  ```

- [ ] **Step 3: 저장 확인 + 키 패턴 확인**

  ```
  browser_evaluate →
    Object.keys(localStorage)
      .filter(k => k.startsWith('payslip_'))
      .sort()
  ```
  
  Expected: `payslip_{googleSub}_2026_01`, `payslip_{googleSub}_2026_02` — `_guest_` 아님

- [ ] **Step 4: 명세서 UI 상세 검증**

  ```
  browser_take_screenshot → /tmp/E2_payslip_detail.png
  ```
  
  Expected:
  - 지급총액 / 공제총액 / 실수령액 숫자 표시
  - 지급 내역 수평 바 (기본급, 시간외수당, 각종 수당)
  - 공제 내역 수평 바 (국민연금, 건강보험, 소득세 등)

- [ ] **Step 5: 콘솔에서 Firestore write-through 로그 확인**

  ```
  browser_console_messages
  ```
  
  Firestore write-through가 있으면: `[Phase 8]` 로그 또는 silent. 에러 없어야 함.

---

### Task 8: 시나리오 F — 급여 탭 전체 서브탭 검증

- [ ] **Step 1: 계산 서브탭**

  ```
  browser_click → [tab: '급여'] → [subtab: '계산']
  browser_take_screenshot → /tmp/F1_calc_subtab.png
  ```
  
  Expected: 시급 경고 배너 없음 (프로필에 시급 입력됨), 급여 계산 결과 표시

- [ ] **Step 2: 명세서 서브탭 — 월 슬라이더 네비게이션**

  ```
  browser_click → [subtab: '명세서']
  browser_click → [◀ 이전월]
  browser_take_screenshot → /tmp/F2_prev_month.png
  browser_click → [▶ 다음월]
  browser_take_screenshot → /tmp/F3_next_month.png
  ```

- [ ] **Step 3: 아카이브 탭 목록 확인**

  ```
  browser_click → [subtab: '아카이브'] 또는 스크롤
  browser_take_screenshot → /tmp/F4_archive.png
  ```
  
  Expected: 업로드된 모든 월 목록 표시

- [ ] **Step 4: 퇴직금 서브탭**

  ```
  browser_click → [subtab: '퇴직금']
  browser_take_screenshot → /tmp/F5_retirement.png
  ```
  
  Expected: 퇴직금 예상 금액 계산 표시

---

### Task 9: 검증 체크리스트 + 콘솔 에러 최종 확인

- [ ] **Step 1: 전 탭 순회**

  ```
  for tab in ['홈', '급여', '시간외', '휴가', '찾아보기', '개인정보', '설정', '피드백']:
    browser_click → tab
    browser_console_messages  → 에러 0건 확인
    browser_take_screenshot → /tmp/Z_{tab}.png
  ```

- [ ] **Step 2: 결과 요약**

  테스트 완료 후 아래 표 채우기:

  | 시나리오 | 결과 | 비고 |
  |---------|------|------|
  | A. 게스트 단일 업로드 | ✅/❌ | |
  | B. 게스트 Bulk 5개 업로드 | ✅/❌ | |
  | C. 이메일 로그인 + 전체 동기화 | ✅/❌ | |
  | D. Google 로그인 + 선택 동기화 | ✅/❌ | |
  | E. 로그인 상태 Bulk 업로드 | ✅/❌ | |
  | F. 급여 탭 서브탭 전체 | ✅/❌ | |
  | 콘솔 에러 0건 | ✅/❌ | |

- [ ] **Step 3: dev 서버 종료**

  ```bash
  kill $(lsof -ti:4321) 2>/dev/null || true
  browser_close
  ```

---

## 알려진 제약 및 주의사항

### 명세서 localStorage 키 불연속 문제
게스트로 업로드한 명세서(`payslip_guest_*`)는 로그인 후 `payslip_{googleSub}_*`로 이동하지 않음.
**현재 동작:** 로그인 후 명세서 탭이 비어 보임 (재업로드 필요).
**마이그레이션 다이얼로그:** 현재 payslip 파싱 데이터는 migration 대상 아님 (용량 크고 로컬 전용 설계).
→ 개선이 필요하면 별도 Task로 분리 권장.

### Google OAuth 자동화 불가
Playwright에서 Google 팝업 자동화는 `data-testid` 접근 불가. 수동 로그인 후 결과 캡처로 검증.

### Firestore 직접 검증
Firebase Console (`console.firebase.google.com` → snuhmate → Firestore) 에서 `users/{uid}/profile/identity` 등 직접 확인 권장.

### 2602 salary.pdf 파일명
영문 파일명. `parsePeriodYearMonth`가 2026-02로 인식하는지 확인 필요 (Task 7 E3 단계).
