// ============================================
// 병원 HR 종합 시스템 - 프로필 모듈
// ============================================

const PROFILE = {
    get STORAGE_KEY() {
        return window.getUserStorageKey ? window.getUserStorageKey('bhm_hr_profile') : 'bhm_hr_profile';
    },

    // ── 기본 프로필 템플릿 ──
    defaults: {
        name: '',
        gender: '',        // 'M' / 'F' / '' (미설정)
        jobType: '일반직',
        grade: 'J1',
        year: 1,
        hireDate: '',
        adjustPay: 0,
        upgradeAdjustPay: 0,
        hasMilitary: false,
        militaryMonths: 24,
        hasSeniority: false,
        hasSpouse: false,
        numChildren: 0,
        otherFamily: 0,
        specialPay: 0,
        positionPay: 0,
        workSupportPay: 0
    },

    /**
     * 프로필 저장 (localStorage)
     * @param {object} data
     */
    save(data) {
        const profile = { ...this.defaults, ...data, savedAt: new Date().toISOString() };
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(profile));
        
        // Sync to Supabase async (로그인 상태일 때만)
        if (window.isFamilyMode && window.SupabaseSync && window.SupabaseUser) {
            profile.id = window.SupabaseUser.id;
            window.SupabaseSync.pushCloudData('profiles', profile);
        }

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
            return JSON.parse(raw);
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
            profile.hasSpouse || false,
            profile.numChildren || 0,
            profile.otherFamily || 0
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
            familyAllowance: this.calcFamilyAllowance(profile)
        });
    }
};
