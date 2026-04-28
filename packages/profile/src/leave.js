// ============================================
// 휴가 관리 모듈
// CRUD + 잔여 연차 추적 + 급여 영향 계산
// data.js leaveQuotas 기반 동적 유형 관리
// ============================================
import { CALC } from '@snuhmate/calculators';
import { DATA } from '@snuhmate/data';
import { PROFILE } from './profile.js';

export const LEAVE = {
    // 로컬 단독 저장. auth 독립이므로 namespace 없이 단일 키 사용.
    STORAGE_KEY: 'leaveRecords',

    // ── 구버전 키 마이그레이션 ──
    // 과거에는 `leaveRecords_<uid>` / `leaveRecords_guest` 처럼
    // 사용자별 접미사가 붙은 키를 썼다. 로컬 단독으로 전환하면서 단일 키로 병합한다.
    // 최초 로드 시 1회만 실행되어 기존 데이터 유실 방지.
    _migrateLegacyKeys() {
        try {
            if (localStorage.getItem('snuhmate_leave_migrated_v1')) return;

            const merged = (() => {
                try { return JSON.parse(localStorage.getItem('leaveRecords')) || {}; }
                catch { return {}; }
            })();

            const legacyKeys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.startsWith('leaveRecords_')) legacyKeys.push(k);
            }

            legacyKeys.forEach(key => {
                let data;
                try { data = JSON.parse(localStorage.getItem(key)); }
                catch { return; }
                if (!data || typeof data !== 'object') return;

                for (const [year, records] of Object.entries(data)) {
                    if (!Array.isArray(records)) continue;
                    if (!merged[year]) merged[year] = [];
                    const existingIds = new Set(merged[year].map(r => r && r.id));
                    records.forEach(r => {
                        if (r && r.id && !existingIds.has(r.id)) merged[year].push(r);
                    });
                }
            });

            if (legacyKeys.length > 0) {
                localStorage.setItem('leaveRecords', JSON.stringify(merged));
                legacyKeys.forEach(k => localStorage.removeItem(k));
                console.log('[LEAVE] 구버전 키 ' + legacyKeys.length + '개 → leaveRecords 단일 키로 병합');
            }
            localStorage.setItem('snuhmate_leave_migrated_v1', '1');
        } catch (e) {
            console.warn('[LEAVE] 레거시 키 마이그레이션 실패:', e);
        }
    },

    // ── 유형 조회 (data.js 기반) ──
    getTypes() {
        return (DATA.leaveQuotas && DATA.leaveQuotas.types) || [];
    },

    getCategories() {
        return (DATA.leaveQuotas && DATA.leaveQuotas.categories) || [];
    },

    getTypeById(id) {
        return this.getTypes().find(t => t.id === id) || null;
    },

    // 성별 필터링된 유형 목록
    getFilteredTypes(gender) {
        return this.getTypes().filter(t => {
            if (!t.gender) return true;           // 성별 제한 없음
            if (!gender) return true;              // 프로필 미설정 → 전부 표시
            return t.gender === gender;            // 성별 일치만
        });
    },

    // 카테고리별 그룹핑
    getGroupedTypes(gender) {
        const filtered = this.getFilteredTypes(gender);
        const categories = this.getCategories();
        const groups = [];
        categories.forEach(cat => {
            const items = filtered.filter(t => t.category === cat.id);
            if (items.length > 0) {
                groups.push({ ...cat, items });
            }
        });
        return groups;
    },

    // ── 하위 호환: types 객체 (기존 코드 호환) ──
    get types() {
        const map = {};
        this.getTypes().forEach(t => {
            map[t.id] = t;
        });
        return map;
    },

    // ── 저장소 접근 ──
    _loadAll() {
        this._migrateLegacyKeys();
        try {
            return JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || {};
        } catch { return {}; }
    },

    _saveAll(data) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
        if (window.recordLocalEdit) window.recordLocalEdit('leaveRecords');

        // Phase 8: Firestore write-through (로그인 시만, fire-and-forget)
        if (typeof window !== 'undefined' && window.__firebaseUid) {
            const uid = window.__firebaseUid;
            import('/src/firebase/sync/leave-sync.js').then(m =>
                m.writeAllLeave(null, uid, data)
            ).catch(err => {
                console.warn('[Phase 8] leave cloud sync 실패 (무해)', err?.message || err);
            });
        }
    },

    // ── CRUD ──
    getYearRecords(year) {
        const all = this._loadAll();
        return all[String(year)] || [];
    },

    getMonthRecords(year, month) {
        const records = this.getYearRecords(year);
        const monthStr = String(month).padStart(2, '0');
        return records.filter(r => {
            const m = r.startDate.split('-')[1];
            return m === monthStr;
        });
    },

    getDateRecords(dateStr) {
        const year = dateStr.split('-')[0];
        const records = this.getYearRecords(parseInt(year));
        return records.filter(r => {
            const start = new Date(r.startDate);
            const end = new Date(r.endDate);
            const check = new Date(dateStr);
            return check >= start && check <= end;
        });
    },

    addRecord(record) {
        const all = this._loadAll();
        const year = record.startDate.split('-')[0];
        if (!all[year]) all[year] = [];

        record.id = 'lv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);

        // 시간 정보가 있으면 시간차로 강제 설정 (데이터 일관성 보장)
        if (record.hours && record.hours > 0) {
            record.type = 'time_leave';
        }

        // 일수 자동 계산
        if (!record.days) {
            const typeInfo = this.getTypeById(record.type);
            if (typeInfo && typeInfo.isTimeBased && record.hours) {
                record.days = Math.round(record.hours / 8 * 10) / 10;
            } else {
                record.days = this._calcBusinessDays(record.startDate, record.endDate, {
                    calendarDays: record.type === 'sick'
                });
            }
        }

        // 청원휴가: ceremonyDays 자동 반영 (days가 없거나 daysOverride가 아닌 경우에만)
        const typeInfo = this.getTypeById(record.type);
        if (typeInfo && typeInfo.ceremonyDays && !record.days && !record.daysOverride) {
            record.days = typeInfo.ceremonyDays;
        }

        // 유형 정보 복사
        record.isPaid = typeInfo ? typeInfo.isPaid : false;
        record.usesAnnual = typeInfo ? typeInfo.usesAnnual : false;
        record.category = typeInfo ? typeInfo.label : record.type;
        record.deductType = typeInfo ? (typeInfo.deductType || 'none') : 'none';

        // 급여 영향 계산
        record.salaryImpact = this._calcDeduction(record, typeInfo);

        all[year].push(record);
        this._saveAll(all);

        window.dispatchEvent(new CustomEvent('leaveChanged'));

        return record;
    },

    updateRecord(id, updates) {
        const all = this._loadAll();
        for (const year of Object.keys(all)) {
            const idx = all[year].findIndex(r => r.id === id);
            if (idx !== -1) {
                all[year][idx] = { ...all[year][idx], ...updates, id };

                // 재계산
                const record = all[year][idx];

                // 시간 정보가 있으면 시간차로 강제 설정 (데이터 일관성 보장)
                if (record.hours && record.hours > 0) {
                    record.type = 'time_leave';
                }

                const typeInfo = this.getTypeById(record.type);

                // 시간차의 경우 hours로 days 재계산
                if (typeInfo && typeInfo.isTimeBased && record.hours) {
                    record.days = Math.round(record.hours / 8 * 10) / 10;
                }

                record.isPaid = typeInfo ? typeInfo.isPaid : false;
                record.usesAnnual = typeInfo ? typeInfo.usesAnnual : false;
                record.category = typeInfo ? typeInfo.label : record.type;
                record.deductType = typeInfo ? (typeInfo.deductType || 'none') : 'none';
                record.salaryImpact = this._calcDeduction(record, typeInfo);

                this._saveAll(all);

                        window.dispatchEvent(new CustomEvent('leaveChanged'));

                return all[year][idx];
            }
        }
        return null;
    },

    deleteRecord(id) {
        const all = this._loadAll();
        for (const year of Object.keys(all)) {
            const idx = all[year].findIndex(r => r.id === id);
            if (idx !== -1) {
                all[year].splice(idx, 1);
                this._saveAll(all);

                        window.dispatchEvent(new CustomEvent('leaveChanged'));

                return true;
            }
        }
        return false;
    },

    // ── 급여 공제 계산 ──
    // 보수규정 제7조② 기준:
    //   basePay 공제: 기본급 월액 / 30 × 일수 (생리휴가 등)
    //   ordinary 공제: 통상임금 월액 / 30 × 일수 (병가, 무급휴가, 가족돌봄 무급 등)
    _calcDeduction(record, typeInfo) {
        if (!typeInfo || typeInfo.deductType === 'none') return 0;
        const days = record.days || 0;
        if (days === 0) return 0;

        // 프로필 기반 급여 정보 로드 (record에 저장된 값이 없으면 현재 프로필에서 계산)
        let hourlyRate = record.hourlyRate || 0;
        let monthlyBasePay = record.monthlyBasePay || 0;
        let monthlyOrdinaryWage = 0;

        if ((hourlyRate === 0 || monthlyBasePay === 0) && typeof PROFILE !== 'undefined' && typeof CALC !== 'undefined') {
            const profile = PROFILE.load();
            if (profile) {
                const wage = PROFILE.calcWage(profile);
                if (wage) {
                    hourlyRate = hourlyRate || wage.hourlyRate || 0;
                    monthlyOrdinaryWage = wage.monthlyWage || 0;
                    // 기준기본급 (한글 키 사용)
                    monthlyBasePay = monthlyBasePay || wage.breakdown['기준기본급'] || 0;
                }
            }
        }

        // monthlyOrdinaryWage 미설정 시 hourlyRate에서 역산
        if (monthlyOrdinaryWage === 0 && hourlyRate > 0) {
            monthlyOrdinaryWage = hourlyRate * 209; // 월 소정근로시간 209h
        }

        if (typeInfo.deductType === 'basePay') {
            // 생리휴가: 기본급 일액 × 공제율 × 일수 (제37조: 9/10 공제, 2026.01~)
            // deductRate 미설정 시 1.0 (하위 호환)
            if (monthlyBasePay === 0) return 0;
            const rate = typeInfo.deductRate ?? 1.0;
            return -(Math.round(monthlyBasePay / 30 * rate) * days);
        }

        if (typeInfo.deductType === 'ordinary') {
            // 병가/무급: 통상임금 기준 일액 공제 (통상임금 월액 / 30 × 일수)
            // 보수규정 제7조② "무급 휴가 기간 중 보수는 통상임금 일액 기준으로 공제한다"
            if (monthlyOrdinaryWage === 0) return 0;
            return -(Math.round(monthlyOrdinaryWage / 30) * days);
        }

        return 0;
    },

    // ── 영업일 계산 (주말 제외) ──
    // calendarDays=true: 주말·공휴일 포함 역일수 계산 (병가용)
    // calendarDays=false: 주말 제외 영업일 계산 (연차·기타 휴가용)
    _calcBusinessDays(startStr, endStr, { calendarDays = false } = {}) {
        const start = new Date(startStr);
        const end = new Date(endStr);
        let count = 0;
        const cur = new Date(start);
        while (cur <= end) {
            if (calendarDays) {
                count++;
            } else {
                const dow = cur.getDay();
                if (dow !== 0 && dow !== 6) count++;
            }
            cur.setDate(cur.getDate() + 1);
        }
        return Math.max(count, 1);
    },

    // ── 유형별 소진 현황 ──
    calcQuotaSummary(year, totalAnnual) {
        const records = this.getYearRecords(year);
        const usage = {};

        // 유형별 사용량 집계
        records.forEach(r => {
            if (!usage[r.type]) usage[r.type] = 0;
            usage[r.type] += (r.days || 0);
        });

        // 소수점 1자리로 반올림 (부동소수점 오류 방지)
        const round1 = v => Math.round(v * 10) / 10;

        // 연차 계열 합산 (annual + time_leave)
        const annualUsed = round1((usage['annual'] || 0) + (usage['time_leave'] || 0));

        // 항상 표시할 기본 휴가 목록
        const alwaysShow = ['annual', 'checkup', 'edu_training', 'edu_mandatory'];

        const result = [];
        this.getTypes().forEach(t => {
            const used = round1(usage[t.id] || 0);

            // 장기재직휴가: 근속연수 기반 동적 부여 (<2025.10> 별도합의, 2026 시행)
            // 10~19년 5일 / 20년+ 7일 / 미달 0일 — 자격자는 사용 0 이어도 표시
            let dynamicLongService = null;
            if (t.id === 'long_service' && typeof CALC !== 'undefined' && CALC.calcLongServiceLeave) {
                const profile = typeof PROFILE !== 'undefined' ? PROFILE.load() : null;
                if (profile && profile.hireDate) {
                    const parsed = PROFILE.parseDate(profile.hireDate);
                    if (parsed) {
                        const yearsServed = (Date.now() - new Date(parsed)) / (1000 * 60 * 60 * 24 * 365.25);
                        const allotted = CALC.calcLongServiceLeave(yearsServed);
                        if (allotted > 0) dynamicLongService = allotted;
                    }
                }
            }

            // 항상 표시 항목이 아니고, 사용량이 0이면 숨김 처리
            // (장기재직휴가는 자격자에 한해 사용 0 이어도 표시)
            if (!alwaysShow.includes(t.id) && used === 0 && dynamicLongService == null) {
                return;
            }

            let quota = t.quota;

            // 가족돌봄(유급): 자녀 2명 이상 → 3일 (제42조, 2021.11 단협)
            if (t.id === 'family_care_paid') {
                const profile = typeof PROFILE !== 'undefined' ? PROFILE.load() : null;
                if (profile && (parseInt(profile.numChildren) || 0) >= 2) {
                    quota = 3;
                }
            }

            if (dynamicLongService != null) quota = dynamicLongService;

            // 연차는 동적 한도
            if (t.usesAnnual) {
                quota = totalAnnual;
                // 시간차는 연차에서 사용 → 별도 표시하지 않음
                if (t.id === 'time_leave') return;
                result.push({
                    id: t.id, label: t.label, category: t.category,
                    used: annualUsed, quota: quota, remaining: round1(quota - annualUsed),
                    overQuota: quota !== null && annualUsed > quota,
                    isPaid: t.isPaid,
                });
                return;
            }

            if (quota !== null || alwaysShow.includes(t.id) || used > 0) {
                result.push({
                    id: t.id, label: t.label, category: t.category,
                    used, quota, remaining: quota !== null ? round1(quota - used) : null,
                    overQuota: quota !== null ? used > quota : false,
                    isPaid: t.isPaid,
                });
            }
        });

        return result;
    },

    // ── 연차 요약 ──
    calcAnnualSummary(year, totalAnnual) {
        const records = this.getYearRecords(year);
        let usedAnnual = 0;
        let sickDays = 0;
        let unpaidDays = 0;
        let totalDeduction = 0;
        let timeLeaveHours = 0;
        let timeLeaveDays = 0;

        records.forEach(r => {
            if (r.usesAnnual) usedAnnual += (r.days || 0);
            if (r.type === 'sick') sickDays += (r.days || 0);
            if (r.type === 'time_leave') {
                timeLeaveHours += (r.hours || 0);
                timeLeaveDays += (r.days || 0);
            }
            if (!r.isPaid) {
                unpaidDays += (r.days || 0);
                totalDeduction += Math.abs(r.salaryImpact || 0);
            }
        });

        // 소수점 1자리로 반올림 (부동소수점 오류 방지)
        const round1 = v => Math.round(v * 10) / 10;

        return {
            totalAnnual,
            usedAnnual: round1(usedAnnual),
            remainingAnnual: round1(totalAnnual - usedAnnual),
            sickDays: round1(sickDays),
            unpaidDays: round1(unpaidDays),
            totalDeduction: Math.round(totalDeduction),
            timeLeaveHours: round1(timeLeaveHours),
            timeLeaveDays: round1(timeLeaveDays),
            recordCount: records.length,
            usagePercent: totalAnnual > 0 ? Math.round((usedAnnual / totalAnnual) * 100) : 0,
        };
    },

    // ── 월별 통계 ──
    calcMonthlySummary(year, month) {
        const records = this.getMonthRecords(year, month);
        let totalDays = 0;
        let annualUsed = 0;
        let deduction = 0;

        records.forEach(r => {
            totalDays += (r.days || 0);
            if (r.usesAnnual) annualUsed += (r.days || 0);
            if (!r.isPaid) deduction += Math.abs(r.salaryImpact || 0);
        });

        // 소수점 1자리로 반올림 (부동소수점 오류 방지)
        const round1 = v => Math.round(v * 10) / 10;
        return { totalDays: round1(totalDays), annualUsed: round1(annualUsed), deduction: Math.round(deduction), recordCount: records.length };
    },

    // ── JSON 내보내기 ──
    exportData() {
        const all = this._loadAll();
        return JSON.stringify(all, null, 2);
    },

    // ── JSON 가져오기 ──
    importData(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            const existing = this._loadAll();
            for (const [year, records] of Object.entries(data)) {
                if (!Array.isArray(records)) continue;
                if (!existing[year]) existing[year] = [];
                const existingIds = new Set(existing[year].map(r => r.id));
                records.forEach(r => {
                    if (!existingIds.has(r.id)) existing[year].push(r);
                });
            }
            this._saveAll(existing);
            return { success: true, message: '휴가 데이터 가져오기 성공' };
        } catch (e) {
            return { success: false, message: `가져오기 실패: ${e.message}` };
        }
    },

    // ── 기존 기록 마이그레이션 (유형 규정 변경 시 재계산) ──
    migrateRecords() {
        const all = this._loadAll();
        let migrated = false;

        for (const year of Object.keys(all)) {
            if (!Array.isArray(all[year])) continue;
            all[year].forEach(record => {
                const typeInfo = this.getTypeById(record.type);
                if (!typeInfo) return;

                // 현재 규정과 다르면 업데이트
                const needsUpdate =
                    record.isPaid !== typeInfo.isPaid ||
                    record.deductType !== (typeInfo.deductType || 'none');

                if (needsUpdate) {
                    record.isPaid = typeInfo.isPaid;
                    record.usesAnnual = typeInfo.usesAnnual;
                    record.deductType = typeInfo.deductType || 'none';
                    record.salaryImpact = this._calcDeduction(record, typeInfo);
                    migrated = true;
                }

                // salaryImpact가 0인데 deductType이 공제 필요 유형이면 재계산
                if (record.salaryImpact === 0 && typeInfo.deductType !== 'none' && (record.days || 0) > 0) {
                    record.salaryImpact = this._calcDeduction(record, typeInfo);
                    if (record.salaryImpact !== 0) migrated = true;
                }
            });
        }

        if (migrated) {
            this._saveAll(all);
            console.log('[LEAVE] 기존 기록 마이그레이션 완료 (규정 변경 반영)');
        }
        return migrated;
    },
};

// 호환층 — IIFE 모듈이 window.LEAVE 사용
if (typeof window !== 'undefined') {
  window.LEAVE = LEAVE;
}
