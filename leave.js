// ============================================
// 휴가 관리 모듈
// CRUD + 잔여 연차 추적 + 급여 영향 계산
// ============================================

const LEAVE = {
    STORAGE_KEY: 'leaveRecords',

    // ── 휴가 유형 정의 ──
    types: {
        annual: { label: '연차', color: 'var(--accent-emerald)', isPaid: true, usesAnnual: true, days: 1 },
        half_am: { label: '반차(오전)', color: 'var(--accent-emerald)', isPaid: true, usesAnnual: true, days: 0.5 },
        half_pm: { label: '반차(오후)', color: 'var(--accent-emerald)', isPaid: true, usesAnnual: true, days: 0.5 },
        sick: { label: '병가', color: 'var(--accent-rose)', isPaid: false, usesAnnual: false, days: 1 },
        menstrual: { label: '생리휴가', color: 'var(--accent-violet)', isPaid: false, usesAnnual: false, days: 1 },
        ceremony: { label: '경조휴가', color: 'var(--accent-amber)', isPaid: true, usesAnnual: false, days: 1 },
        maternity: { label: '출산휴가', color: 'var(--accent-rose)', isPaid: true, usesAnnual: false, days: 1 },
        spouse_birth: { label: '배우자출산', color: 'var(--accent-cyan)', isPaid: true, usesAnnual: false, days: 1 },
        unpaid: { label: '무급휴가', color: 'var(--accent-rose)', isPaid: false, usesAnnual: false, days: 1 },
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
            const typeInfo = this.types[record.type];
            if (typeInfo && typeInfo.days === 0.5) {
                record.days = 0.5;
            } else {
                record.days = this._calcBusinessDays(record.startDate, record.endDate);
            }
        }

        // 급여 영향 계산
        const typeInfo = this.types[record.type];
        record.isPaid = typeInfo ? typeInfo.isPaid : false;
        record.usesAnnual = typeInfo ? typeInfo.usesAnnual : false;
        record.category = typeInfo ? typeInfo.label : record.type;

        if (!record.isPaid && record.hourlyRate) {
            record.salaryImpact = -(record.hourlyRate * 8 * record.days);
        } else {
            record.salaryImpact = 0;
        }

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
                const typeInfo = this.types[record.type];
                record.isPaid = typeInfo ? typeInfo.isPaid : false;
                record.usesAnnual = typeInfo ? typeInfo.usesAnnual : false;
                record.category = typeInfo ? typeInfo.label : record.type;

                if (!record.isPaid && record.hourlyRate) {
                    record.salaryImpact = -(record.hourlyRate * 8 * record.days);
                } else {
                    record.salaryImpact = 0;
                }

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

    // ── 연차 요약 ──
    calcAnnualSummary(year, totalAnnual) {
        const records = this.getYearRecords(year);
        let usedAnnual = 0;
        let sickDays = 0;
        let unpaidDays = 0;
        let totalDeduction = 0;

        records.forEach(r => {
            if (r.usesAnnual) usedAnnual += (r.days || 0);
            if (r.type === 'sick') sickDays += (r.days || 0);
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
