// Phase 6 후속: 빌드 산출물 기반 inline-onclick 검증은 apps/web (Astro) 빌드로 이관됨.
// 본 파일은 root *.js 의 window.X 호환층 KEEP-allowlist 회귀만 유지한다.
// (Phase 4 정리에서 root *.js 자체가 사라지면 본 테스트도 함께 제거할 것.)
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');

describe('window.X 호환층 회귀 (root *.js)', () => {
  // ── Phase 3-F: root .js 의 window.X 호환층 KEEP allowlist 외 0 ──
  it('root .js 의 window.X 호환층 KEEP only — Phase 3-F 완료 기준', () => {
    // KEEP: 외부 모듈 / inline HTML script / fragments onclick 참조 — 의도된 노출
    const KEEP = new Set([
      // ESM 모듈 ↔ legacy IIFE 호환 (다른 모듈이 window.X 참조)
      'AppLock', 'CALC', 'DATA', 'DATA_STATIC', 'HOLIDAYS',
      'LEAVE', 'PAYROLL', 'OVERTIME', 'PROFILE', 'RetirementEngine', 'escapeHtml',
      'SALARY_PARSER', 'PROFILE_FIELDS',
      // app.js entry safeCall 동적 dispatch 대상
      'switchTab', 'switchHomePeriod', 'initHomeTab', 'changelogPage',
      'initPayrollTab', '_propagatePayslipToWorkHistory',
      'initLeaveTab', 'initOvertimeTab', 'initProfileTab',
      // app.js 의 entry handler 참조
      'closeMigrationModal', 'downloadBackupAndStay', 'switchToProfileTab',
      // tab-loader 동적 dispatch
      'loadTab', 'prefetchTabs',
      // utils-lazy 동적 호출
      'loadPDFJS', 'loadXLSX',
      // inline-ui-helpers
      'updateHourlyWarning', 'dismissHwBanner',
      // shared-utils 헬퍼
      'delegateActions', 'delegateInput', 'registerActions', 'registerInputActions',
      // function expression 형태 (Phase 4 정리 candidate)
      'renderPayHistory', 'renderPayPayslip', 'syncCloudData',
      // ── Phase 3-regression 회귀 fix: tabs/*.html fragment inline onclick 참조 ──
      // app.js
      'calcRetirementEmbedded', 'calculateParentalLeave', 'closeOtBottomSheet',
      'deleteOtRecord', 'noticePage', 'retSelectPeakOpt', 'retSetRetireDate',
      'retToggleRateCard', 'saveOtRecord', 'switchNewsTab',
      'toggleOtHelp', 'toggleOtHelpDetail', 'toggleOtVerifyDetail',
      'renderLeaveTable', 'renderQuickTags', 'retUpdateQuickDates',
      'getCaptureParams', 'updatePayrollGrades', 'updateGrades', 'renderCeremonyTable',
      'answerFaqItem',
      // dashboard / schedule_suite (sub-app cross-call)
      'renderAll', 'renderTabs',
      // leave-tab cross-module variables/functions
      'lvTotalAnnual', 'lvInitialized',
      'closeLvBottomSheet', 'closeLvTypeBottomSheet', 'deleteLvRecord',
      'openLvTypeBottomSheet', 'saveLvRecord',
      'populateLvTypeSelect', 'previewLvCalc', 'editLvRecord',
      'lvNavMonth', 'lvGoToday', 'onLvDateClick', 'toggleCollapsible',
      // pay-estimation
      'calculatePayroll', 'initPayEstimate', 'calcMonthEstimate',
      'payEstMonth', 'changePayEstMonth',
      // payslip-tab
      'renderPayslip', 'renderPayslipMgmt', 'renderVerification', 'renderSavedMonths',
      'showVerifyInQna',
      // profile-tab cross-module + fragments
      'applyProfileToLeave', 'applyProfileToOvertime', 'applyProfileToPayroll',
      'clearProfile', 'downloadBackup', 'saveProfile',
      'switchProfileSection',
      'updateProfileGrades', 'toggleChildFields',
      '_collapseBasicFieldsWithPreview', '_seedFirstWorkFromProfile', '_suggestYear',
      // resume
      'closeResumeItemSheet', 'saveResumeItem',
      // settings-ui (AppLock fragment buttons)
      'onAppLockChangePin', 'onAppLockDisable', 'onAppLockSetupPin',
      'onBiometricDisable', 'onBiometricRegister', 'updateAppLockUI',
      // share-utils
      'shareApp',
      // work-history fragments + cross-call
      'autofillJobDesc', 'autofillRotationTasks',
      'closeRotationSheet', 'closeWorkHistorySheet',
      'deleteRotationEntry', 'openWorkHistorySheet',
      'saveRotationEntry', 'saveWorkHistoryEntry',
      'renderWorkHistory', '_genId', '_saveWorkHistory', '_loadWorkHistory',
      // Phase 4-A 신규
      '_showWorkHistoryUpdateBanner', 'rebuildWorkHistoryFromPayslipsForceReplace',
      // Phase 5-followup: 백업 복원 (모바일 호환 file picker — onclick="triggerBackupFilePicker()")
      'triggerBackupFilePicker', 'uploadBackup',
      // Phase 5-followup: 규정 탭 SPA fragment inline (iframe 거울 제거 — regulation.js 동적 import)
      'initRegulationFragment', '__regulationFragmentInited',
    ]);
    const rootJs = readdirSync(ROOT).filter(f => f.endsWith('.js') && !f.startsWith('vite') && f !== 'vitest.config.js');
    const offenders = [];
    for (const f of rootJs) {
      const content = readFileSync(join(ROOT, f), 'utf8');
      const matches = content.match(/^\s*window\.([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*[a-zA-Z_]/gm) || [];
      for (const m of matches) {
        const fnMatch = m.match(/window\.([a-zA-Z_][a-zA-Z0-9_]*)/);
        if (fnMatch && !KEEP.has(fnMatch[1])) {
          offenders.push(f + ': ' + fnMatch[1]);
        }
      }
    }
    expect(offenders, 'KEEP allowlist 외 window.X 호환층').toEqual([]);
  });
});
