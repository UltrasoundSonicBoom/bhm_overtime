// ============================================
// 휴가 관리 모듈
// CRUD + 잔여 연차 추적 + 급여 영향 계산
// data.js leaveQuotas 기반 동적 유형 관리
// ============================================

const LEAVE = {
    STORAGE_KEY: 'leaveRecords',

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
        try {
            return JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || {};
        } catch { return {}; }
    },

    _saveAll(data) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
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

        // 일수 자동 계산
        if (!record.days) {
            const typeInfo = this.getTypeById(record.type);
            if (typeInfo && typeInfo.isTimeBased && record.hours) {
                record.days = Math.round(record.hours / 8 * 100) / 100;
            } else {
                record.days = this._calcBusinessDays(record.startDate, record.endDate);
            }
        }

        // 청원휴가: ceremonyDays 자동 반영
        const typeInfo = this.getTypeById(record.type);
        if (typeInfo && typeInfo.ceremonyDays && !record.daysOverride) {
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
                const typeInfo = this.getTypeById(record.type);
                record.isPaid = typeInfo ? typeInfo.isPaid : false;
                record.usesAnnual = typeInfo ? typeInfo.usesAnnual : false;
                record.category = typeInfo ? typeInfo.label : record.type;
                record.deductType = typeInfo ? (typeInfo.deductType || 'none') : 'none';
                record.salaryImpact = this._calcDeduction(record, typeInfo);

                this._saveAll(all);
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
                return true;
            }
        }
        return false;
    },

    // ── 급여 공제 계산 ──
    _calcDeduction(record, typeInfo) {
        if (!typeInfo || typeInfo.deductType === 'none') return 0;
        const days = record.days || 0;

        if (typeInfo.deductType === 'basePay') {
            // 생리휴가: 기본급 기준 일액 공제
            const basePay = record.monthlyBasePay || record.hourlyRate * 209 || 0;
            return -(basePay / 30 * days);
        }

        if (typeInfo.deductType === 'ordinary') {
            // 병가/무급: 통상임금 기준 1/30 공제
            const hourlyRate = record.hourlyRate || 0;
            return -(hourlyRate * 8 * days);
        }

        return 0;
    },

    // ── 영업일 계산 (주말 제외) ──
    _calcBusinessDays(startStr, endStr) {
        const start = new Date(startStr);
        const end = new Date(endStr);
        let count = 0;
        const cur = new Date(start);
        while (cur <= end) {
            const dow = cur.getDay();
            if (dow !== 0 && dow !== 6) count++;
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

        // 연차 계열 합산 (annual + time_leave)
        const annualUsed = (usage['annual'] || 0) + (usage['time_leave'] || 0);

        const result = [];
        this.getTypes().forEach(t => {
            const used = usage[t.id] || 0;
            let quota = t.quota;

            // 연차는 동적 한도
            if (t.usesAnnual) {
                quota = totalAnnual;
                // 시간차는 연차에서 사용 → 별도 표시하지 않음
                if (t.id === 'time_leave') return;
                result.push({
                    id: t.id, label: t.label, category: t.category,
                    used: annualUsed, quota: quota, remaining: quota - annualUsed,
                    overQuota: quota !== null && annualUsed > quota,
                    isPaid: t.isPaid,
                });
                return;
            }

            if (quota !== null) {
                result.push({
                    id: t.id, label: t.label, category: t.category,
                    used, quota, remaining: quota - used,
                    overQuota: used > quota,
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

        return {
            totalAnnual,
            usedAnnual,
            remainingAnnual: totalAnnual - usedAnnual,
            sickDays,
            unpaidDays,
            totalDeduction,
            timeLeaveHours,
            timeLeaveDays,
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

        return { totalDays, annualUsed, deduction, recordCount: records.length };
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
};
