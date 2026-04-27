// ============================================
// 병원 HR 종합 시스템 - 프로필 모듈
// ============================================
import { CALC } from './calculators.js';
import { DATA } from './data.js';

export const PROFILE = {
    get STORAGE_KEY() {
        return window.getUserStorageKey ? window.getUserStorageKey('bhm_hr_profile') : 'bhm_hr_profile';
    },

    // ── 기본 프로필 템플릿 ──
    defaults: {
        name: '',
        employeeNumber: '', // 사번 (payslip 업로드 시 자동 채움)
        gender: '',        // 'M' / 'F' / '' (미설정)
        hospital: '서울대학교병원',  // SNUH 내부 앱 — 기본값 고정
        department: '',    // 부서 (예: 핵의학과, 중환자실)
        jobType: '간호직',
        grade: 'J3',
        year: 1,
        birthDate: '',
        hireDate: '',
        adjustPay: 0,
        upgradeAdjustPay: 0,
        hasMilitary: false,
        militaryMonths: 24,
        hasSeniority: false,
        numFamily: 0,              // 가족 수 (자녀 제외)
        numChildren: 0,            // 자녀 수
        childrenUnder6Pay: 0,      // 6세이하 자녀수당 월액 (직접 입력, 비통상임금)
        specialPay: 0,
        positionPay: 0,
        workSupportPay: 0,
        nightShiftsUnrewarded: 0,  // 누적 미지급 야간근무 횟수 (리커버리 데이 이월용)
        weeklyHours: 209,          // 월 소정근로시간 (기본 209시간, 비정규직 등 다를 경우 수정)
        unionStepAdjust: '',       // 노조협의 호봉 보정 (''=자동, '0'=해당없음, '1'=+1호봉 수동지정)
        // 이력서 섹션 (Phase 3)
        education: [],   // [{id, period, degree, school, major, grade}]
        licenses: [],    // [{id, date, type, name, issuer}]
        papers: [],      // [{id, year, title, venue}]
        military: {},    // {period, branch, rank, mos, status, veteran}
        coverLetter: '' // 자기소개서 자유 텍스트
    },

    /**
     * 프로필 저장 (localStorage)
     * @param {object} data
     */
    save(data) {
        // 기존 저장본을 defaults와 신규 data 사이에 끼워넣어,
        // data에 없는 키는 기존 저장값을 우선 유지 (생년월일·성별 등 수동입력 필드 보존)
        const existing = this.load() || {};
        const profile = { ...this.defaults, ...existing, ...data, savedAt: new Date().toISOString() };
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(profile));
        if (window.recordLocalEdit) window.recordLocalEdit('bhm_hr_profile');

        window.dispatchEvent(new CustomEvent('profileChanged'));

        return profile;
    },

    /**
     * 프로필 불러오기
     * @returns {object|null}
     */
    load() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (!raw) return null;
            const data = JSON.parse(raw);
            // 마이그레이션: numChildrenUnder6 (인원수×130000) → childrenUnder6Pay (직접 금액)
            if (data.numChildrenUnder6 !== undefined && data.childrenUnder6Pay === undefined) {
                data.childrenUnder6Pay = (parseInt(data.numChildrenUnder6) || 0) * 130000;
                delete data.numChildrenUnder6;
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
            }
            return data;
        } catch (e) {
            return null;
        }
    },

    /**
     * 프로필 삭제
     */
    clear() {
        localStorage.removeItem(this.STORAGE_KEY);
    },

    /**
     * 다양한 텍스트 형식의 날짜 파싱
     * 지원: 2006-07-05, 2006.07.05, 2006/07/05, 20060705, 2006-7-5
     * @param {string} str
     * @returns {string|null} 'YYYY-MM-DD' 형식 또는 null
     */
    parseDate(str) {
        if (!str) return null;
        str = str.trim();

        let y, m, d;

        // YYYYMMDD (8자리 숫자)
        if (/^\d{8}$/.test(str)) {
            y = str.slice(0, 4);
            m = str.slice(4, 6);
            d = str.slice(6, 8);
        }
        // YYYY-MM-DD, YYYY.MM.DD, YYYY/MM/DD
        else {
            const parts = str.split(/[-./]/);
            if (parts.length === 3) {
                y = parts[0];
                m = parts[1].padStart(2, '0');
                d = parts[2].padStart(2, '0');
            }
        }

        if (!y || !m || !d) return null;
        const date = new Date(`${y}-${m}-${d}`);
        if (isNaN(date.getTime())) return null;
        return `${y}-${m}-${d}`;
    },

    /**
     * 입사일로 근속연수 계산
     * @param {string} hireDateStr - 날짜 문자열 (다양한 형식 지원)
     * @param {Date} [baseDate] - 기준일 (기본: 오늘)
     * @returns {number} 근속연수
     */
    calcServiceYears(hireDateStr, baseDate = new Date()) {
        const parsed = this.parseDate(hireDateStr);
        if (!parsed) return 0;
        const hire = new Date(parsed);
        const diff = baseDate - hire;
        return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
    },

    /**
     * 프로필 데이터를 폼 필드에 적용
     * @param {object} profile - 프로필 데이터
     * @param {object} fieldMap - { profileKey: elementId } 매핑
     */
    applyToForm(profile, fieldMap) {
        if (!profile) return;
        Object.entries(fieldMap).forEach(([key, elId]) => {
            const el = document.getElementById(elId);
            if (!el || profile[key] === undefined) return;

            if (el.type === 'checkbox') {
                el.checked = !!profile[key];
                el.dispatchEvent(new Event('change'));
            } else if (el.tagName === 'SELECT') {
                el.value = profile[key];
                el.dispatchEvent(new Event('change'));
            } else {
                el.value = profile[key];
            }
        });
    },

    /**
     * 폼 필드에서 프로필 데이터 수집
     * @param {object} fieldMap - { profileKey: elementId }
     * @returns {object}
     */
    collectFromForm(fieldMap) {
        const data = {};
        Object.entries(fieldMap).forEach(([key, elId]) => {
            const el = document.getElementById(elId);
            if (!el) return;

            if (el.type === 'checkbox') {
                data[key] = el.checked;
            } else if (el.type === 'number') {
                data[key] = parseFloat(el.value) || 0;
            } else {
                data[key] = el.value;
            }
        });
        return data;
    },

    /**
     * 프로필 기반으로 가족수당 계산
     * @param {object} profile
     * @returns {number}
     */
    calcFamilyAllowance(profile) {
        if (!profile) return 0;
        const result = CALC.calcFamilyAllowance(
            parseInt(profile.numFamily) || 0,
            parseInt(profile.numChildren) || 0
        );
        return result.월수당;
    },

    /**
     * 프로필 기반으로 시급 계산
     * @param {object} profile
     * @returns {object|null} { monthlyWage, hourlyRate, breakdown }
     */
    calcWage(profile) {
        if (!profile) return null;
        const serviceYears = profile.hireDate
            ? this.calcServiceYears(profile.hireDate)
            : 0;

        // 근속가산기본급 조건: 저장값이 아닌 입사일로 직접 판단 (2016.02.01 이전 입사자)
        let hasSeniority = false;
        if (profile.hireDate) {
            const parsed = this.parseDate(profile.hireDate);
            if (parsed) hasSeniority = new Date(parsed) < new Date('2016-02-01');
        }

        return CALC.calcOrdinaryWage(profile.jobType, profile.grade, profile.year, {
            hasMilitary: profile.hasMilitary,
            militaryMonths: profile.militaryMonths || 24,
            hasSeniority,
            seniorityYears: hasSeniority ? serviceYears : 0,
            longServiceYears: serviceYears,
            specialPayAmount: profile.specialPay || 0,
            adjustPay: profile.adjustPay || 0,
            upgradeAdjustPay: profile.upgradeAdjustPay || 0,
            positionPay: profile.positionPay || 0,
            workSupportPay: profile.workSupportPay || 0,
            familyAllowance: this.calcFamilyAllowance(profile),
            weeklyHours: profile.weeklyHours || 209
        });
    }
};

// PROFILE_FIELDS — form id ↔ profile property 매핑 (Phase 5 D3: app.js → profile.js 이동)
// consumer: profile-tab.js, salary-parser.js, pay-estimation.js, payroll.js, payslip-tab.js, app.js
export const PROFILE_FIELDS = {
  name: 'pfName',
  employeeNumber: 'pfEmployeeNumber',
  gender: 'pfGender',
  jobType: 'pfJobType',
  department: 'pfDepartment',
  grade: 'pfGrade',
  year: 'pfYear',
  birthDate: 'pfBirthDate',
  hireDate: 'pfHireDate',
  adjustPay: 'pfAdjust',
  upgradeAdjustPay: 'pfUpgradeAdjust',
  hasMilitary: 'pfMilitary',
  militaryMonths: 'pfMilitaryMonths',
  hasSeniority: 'pfSeniority',
  numFamily: 'pfFamily',
  numChildren: 'pfChildren',
  childrenUnder6Pay: 'pfChildrenUnder6Pay',
  specialPay: 'pfSpecial',
  positionPay: 'pfPosition',
  workSupportPay: 'pfWorkSupport',
  weeklyHours: 'pfWeeklyHours',
  promotionDate: 'pfPromotionDate',
  unionStepAdjust: 'pfUnionStepAdjust'
};

// 호환층 — IIFE 모듈 (Layer 4 등) 이 아직 window.PROFILE 사용
if (typeof window !== 'undefined') {
  window.PROFILE = PROFILE;
  window.PROFILE_FIELDS = PROFILE_FIELDS;
}
