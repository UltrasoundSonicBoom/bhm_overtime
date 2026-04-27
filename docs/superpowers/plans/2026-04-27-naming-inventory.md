# BHM → SNUHMate 네이밍 인벤토리 — 2026-04-27

## localStorage 키 사용처
appLock.js:38:    try { uid = localStorage.getItem('bhm_local_uid'); } catch (e) { /* noop */ }
appLock.js:43:      try { localStorage.setItem('bhm_local_uid', uid); } catch (e) { /* noop */ }
appLock.js:82:  // ── bhm_settings 유틸 ──
appLock.js:84:    try { return JSON.parse(localStorage.getItem('bhm_settings') || '{}'); } catch (e) { return {}; }
appLock.js:89:    localStorage.setItem('bhm_settings', JSON.stringify(s));
app.js:3616:  var whKey = window.getUserStorageKey ? window.getUserStorageKey('bhm_work_history') : 'bhm_work_history_guest';
app.js:4004:      var _whK = window.getUserStorageKey ? window.getUserStorageKey('bhm_work_history') : 'bhm_work_history_guest';
app.js:4006:      var _whSK = window.getUserStorageKey ? window.getUserStorageKey('bhm_work_history_seeded') : 'bhm_work_history_seeded_guest';
inline-ui-helpers.js:5:// 4) 데모 배너 표시 (?demo=1 또는 bhm_demo_mode 플래그)
inline-ui-helpers.js:60:    var isDemoFlag = localStorage.getItem('bhm_demo_mode') === '1';
leave.js:20:            if (localStorage.getItem('bhm_leave_migrated_v1')) return;
leave.js:54:            localStorage.setItem('bhm_leave_migrated_v1', '1');
orphan-recovery.js:11:    bhm_hr_profile: '프로필',
orphan-recovery.js:105:          localStorage.setItem('bhm_lastEdit_' + activeKey, new Date().toISOString());
payslip-tab.js:807:  const settings = (() => { try { return JSON.parse(localStorage.getItem('bhm_settings') || '{}'); } catch(e) { return {}; } })();
profile.js:9:        return window.getUserStorageKey ? window.getUserStorageKey('bhm_hr_profile') : 'bhm_hr_profile';
profile.js:65:        if (window.recordLocalEdit) window.recordLocalEdit('bhm_hr_profile');
profile-tab.js:294:      profile: 'bhm_hr_profile_guest',
profile-tab.js:596:  /^bhm_hr_profile/,           // PROFILE (모든 namespace 포함)
profile-tab.js:599:  /^bhm_work_history/,         // 근무이력
profile-tab.js:603:  /^bhm_lastEdit_/,            // sync 메타
profile-tab.js:608:  /^bhm_demo_mode$/,
profile-tab.js:614:  'bhm_local_uid',
profile-tab.js:615:  'bhm_deviceId',
profile-tab.js:616:  'bhm_anon_id',
profile-tab.js:618:  'bhm_leave_migrated_v1',
profile-tab.js:619:  'bhm_debug_parser',
profile-tab.js:622:  // bhm_settings 는 PII 필드만 셀렉티브 wipe (_wipeSettingsPII)
profile-tab.js:625:// bhm_settings 안에서 PII 만 wipe — 사용자 설정 (driveEnabled 등) 은 보존
profile-tab.js:630:    const raw = localStorage.getItem('bhm_settings');
profile-tab.js:637:    if (changed) localStorage.setItem('bhm_settings', JSON.stringify(settings));
profile-tab.js:682:  // bhm_settings 의 PII 필드 셀렉티브 wipe (계정 설정은 보존)
profile-tab.js:1002:  const KNOWN_BASES = ['bhm_hr_profile', 'overtimeRecords', 'leaveRecords', 'bhm_work_history', 'otManualHourly', 'overtimePayslipData'];
profile-tab.js:1076:        ['bhm_hr_profile', data.profile],
retirement-engine.js:48:      ? window.getUserStorageKey('bhm_hr_profile')
retirement-engine.js:49:      : 'bhm_hr_profile';
salary-parser.js:18:  // ── DEBUG 플래그 — localStorage.bhm_debug_parser = '1' 설정 시 trace 활성화 ──
salary-parser.js:20:    try { return localStorage.getItem('bhm_debug_parser') === '1'; }
salary-parser.js:1092:    try { settings = JSON.parse(localStorage.getItem('bhm_settings') || '{}'); } catch (e) {}
resume.js:424:    var _rhK = window.getUserStorageKey ? window.getUserStorageKey('bhm_work_history') : 'bhm_work_history_guest';
settings-ui.js:10:  // bhm_settings 직접 로드 (appLock.js 가 사용하는 동일 키).
settings-ui.js:13:  try { settings = JSON.parse(localStorage.getItem('bhm_settings') || '{}'); }
work-history.js:9:  return window.getUserStorageKey ? window.getUserStorageKey('bhm_work_history') : 'bhm_work_history_guest';
work-history.js:12:  return window.getUserStorageKey ? window.getUserStorageKey('bhm_work_history_seeded') : 'bhm_work_history_seeded_guest';
work-history.js:74:  // bhm_lastEdit_<key> 도 갱신 — 향후 서버 sync 재도입 시 충돌 비교용
work-history.js:75:  localStorage.setItem('bhm_lastEdit_' + _whKey(), new Date().toISOString());
index.html:7:  <script>(function () { try { var s = JSON.parse(localStorage.getItem('bhm_settings') || '{}'); if (s.pinEnabled) { document.documentElement.style.visibility = 'hidden'; } } catch (e) { } })();</script>
regulation.html:867:  <script>(function(){try{var s=JSON.parse(localStorage.getItem('bhm_settings')||'{}');if(s.pinEnabled){document.documentElement.style.visibility='hidden';}}catch(e){}})();</script>
package.json:2:  "name": "bhm_overtime",
package.json:26:    "url": "git+https://github.com/UltrasoundSonicBoom/bhm_overtime.git"

## 한글 BHM/보라매
index.html:10:  <meta name="description" content="SNUH 메이트: 서울대학교병원, 보라매병원 등 급여 및 휴가 관리 어시스턴트">
privacy.html:137:      <p>SNUH 메이트(이하 "서비스" 또는 "앱")는 서울대학교병원, 보라매병원 등 의료기관 종사자가 연차 휴가, 시간외 근무, 급여명세서 등의 근무 기록을 스스로 관리할 수 있도록 지원하는 웹 애플리케이션입니다.</p>
terms.html:108:      <p>SNUH 메이트는 서울대학교병원, 보라매병원 등 의료기관 종사자가 자신의 휴가, 시간외 근무, 급여명세서 내역 등을 보다 편리하게 기록·확인·정리할 수 있도록 돕는 웹 기반 보조 서비스입니다.</p>
config.js:5:window.BHM_CONFIG = {
data.js:2:// 병원 HR 종합 시스템 - 데이터 모듈
data.js:492:    { category: '복지', q: '진료비 감면 혜택은?', a: '직원 본인:\n• 보험·비보험 50% 감면\n• 선택진료비 100% 감면\n\n가족 (배우자·부모·만25세 미만 자녀):\n• 50% 감면\n\n적용 병원: 본원·보라매·분당·치과병원', ref: '제67조' },
data.js:493:    { category: '복지', q: '어린이집 정원은?', a: '보라매병원 1동 3층\n\n• 1세: 10명\n• 2세: 14명\n• 3~5세: 20명\n• 총 44명\n\n운영시간: 07:30~19:30', ref: '제62조' },
data.js:582:        { title: '진료비 감면', ref: '제67조', body: '직원 본인:\n• 접수비: 50% 감면\n• 보험/비보험/비급여: 50% 감면\n• 선택진료비: 100% 감면\n\n배우자·부모·자녀(만25세 미만):\n• 보험/비보험/비급여: 50% 감면\n\n적용 병원: 본원, 보라매, 분당, 치과병원' },
data.js:584:        { title: '어린이집', ref: '제62조', body: '보라매병원 1동 3층.\n정원 44명: 1세 10명, 2세 14명, 3~5세 20명.\n운영시간: 07:30~19:30.' }
app.js:2:// 병원 HR 종합 시스템 - 앱 로직 — index.html 단일 ESM entry
holidays.js:2:// 병원 HR 종합 시스템 - 공휴일·기념일 모듈
calculators.js:2:// 병원 HR 종합 시스템 - 계산기 모듈
payroll.js:2:// 병원 HR 종합 시스템 - 급여 계산 모듈
payroll.js:838:            { key: '적용병원', val: '본원·보라매·분당·치과병원' }
profile.js:2:// 병원 HR 종합 시스템 - 프로필 모듈
sentry.js:9://   3. config.js 의 BHM_CONFIG에 sentryDsn 추가
sentry.js:18:  var CONFIG = window.BHM_CONFIG || {};
ROADMAP.md:1:# 프로젝트 로드맵 (BHM Overtime)
SPEC.md:1:# SPEC: BHM Overtime Admin & Content Operating Platform

## package.json
  "name": "bhm_overtime",
  "description": "",
  "repository": {
  "bugs": {
  "homepage": "https://github.com/UltrasoundSonicBoom/bhm_overtime#readme",
