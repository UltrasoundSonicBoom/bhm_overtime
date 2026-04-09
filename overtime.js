// ============================================
// 시간외·온콜 기록 관리 모듈
// CRUD + 자동 요율 계산 + 월간 통계
// ============================================

const OVERTIME = {
    get STORAGE_KEY() {
        return window.getUserStorageKey ? window.getUserStorageKey('overtimeRecords') : 'overtimeRecords';
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

    _monthKey(year, month) {
        return `${year}-${String(month).padStart(2, '0')}`;
    },

    // ── CRUD ──
    getMonthRecords(year, month) {
        const all = this._loadAll();
        return all[this._monthKey(year, month)] || [];
    },

    getDateRecords(year, month, day) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return this.getMonthRecords(year, month).filter(r => r.date === dateStr);
    },

    addRecord(record) {
        const all = this._loadAll();
        const d = new Date(record.date);
        const key = this._monthKey(d.getFullYear(), d.getMonth() + 1);
        if (!all[key]) all[key] = [];

        record.id = 'ot_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
        all[key].push(record);
        this._saveAll(all);

        // Sync to Supabase async
        if (window.SupabaseSync) {
            window.SupabaseSync.pushCloudData('overtime_records', record);
        }

        return record;
    },

    updateRecord(id, updates) {
        const all = this._loadAll();
        for (const key of Object.keys(all)) {
            const idx = all[key].findIndex(r => r.id === id);
            if (idx !== -1) {
                all[key][idx] = { ...all[key][idx], ...updates, id };
                this._saveAll(all);
                
                // Sync to Supabase async
                if (window.SupabaseSync) {
                    window.SupabaseSync.pushCloudData('overtime_records', all[key][idx]);
                }

                return all[key][idx];
            }
        }
        return null;
    },

    deleteRecord(id) {
        const all = this._loadAll();
        for (const key of Object.keys(all)) {
            const idx = all[key].findIndex(r => r.id === id);
            if (idx !== -1) {
                all[key].splice(idx, 1);
                this._saveAll(all);

                // Sync delete to Supabase async
                if (window.SupabaseSync) {
                    window.SupabaseSync.deleteCloudRecord('overtime_records', id);
                }

                return true;
            }
        }
        return false;
    },

    // ── 시간 파싱 유틸 ──
    _parseTime(timeStr) {
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m; // 분 단위
    },

    _minutesToHours(min) {
        return Math.round(min / 15) * 15 / 60; // 15분 단위 반올림
    },

    // ── 자동 요율 분리 계산 ──
    // date: 'YYYY-MM-DD', startTime/endTime: 'HH:MM', isHoliday: boolean
    calcTimeBreakdown(date, startTime, endTime, type, isHoliday) {
        const startMin = this._parseTime(startTime);
        let endMin = this._parseTime(endTime);

        // 자정 넘기는 경우: 종료 < 시작이면 익일로 처리 (+1440분)
        if (endMin <= startMin) {
            endMin += 1440;
        }

        const totalMinutes = endMin - startMin;
        const dow = new Date(date).getDay(); // 0=일, 6=토
        const isWeekend = (dow === 0 || dow === 6);
        const isRestDay = isWeekend || isHoliday;

        let extendedMin = 0;   // 연장 (150%)
        let nightMin = 0;      // 야간 (200%)
        let holidayMin = 0;    // 휴일 (8h 이내 150%, 초과 200%)
        let holidayNightMin = 0; // 휴일야간 (200%)

        // 분 단위로 각 구간 계산
        for (let m = startMin; m < endMin; m++) {
            const hourInDay = m % 1440; // 24시간 내로 정규화
            const isNightTime = (hourInDay >= 1320 || hourInDay < 360); // 22:00~06:00

            if (isRestDay) {
                if (isNightTime) {
                    holidayNightMin++;
                } else {
                    holidayMin++;
                }
            } else {
                if (isNightTime) {
                    nightMin++;
                } else {
                    extendedMin++;
                }
            }
        }

        const extended = this._minutesToHours(extendedMin);
        const night = this._minutesToHours(nightMin);
        const holiday = this._minutesToHours(holidayMin);
        const holidayNight = this._minutesToHours(holidayNightMin);
        const totalHours = this._minutesToHours(totalMinutes);

        return {
            totalHours,
            extended,     // 연장근무 시간
            night,        // 야간근무 시간
            holiday,      // 휴일근무 시간
            holidayNight, // 휴일야간 시간
            isWeekend,
            isHoliday,
        };
    },

    // ── 수당 계산 ──
    calcEstimatedPay(breakdown, hourlyRate, type) {
        const rates = DATA.allowances.overtimeRates;
        let pay = 0;

        pay += breakdown.extended * hourlyRate * rates.extended;
        pay += breakdown.night * hourlyRate * rates.night;
        // 휴일근무: 8시간 이내 150%, 초과 200%
        const holBase = Math.min(breakdown.holiday, 8);
        const holOver = Math.max(breakdown.holiday - 8, 0);
        pay += holBase * hourlyRate * rates.holiday;
        pay += holOver * hourlyRate * rates.holidayOver8;
        pay += breakdown.holidayNight * hourlyRate * rates.holidayNight;

        // 온콜 추가 수당
        if (type === 'oncall_standby') {
            pay = DATA.allowances.onCallStandby; // 대기수당만
        } else if (type === 'oncall_callout') {
            // 교통비 + 시간외 (출퇴근 2시간 이미 totalHours에 포함된 상태로 계산)
            pay += DATA.allowances.onCallTransport;
            // 사용자 요청: 온콜 출근 시 대기수당은 중복 지급되지 않음.
        }

        return Math.round(pay);
    },

    // ── 전체 기록 생성 (입력 → 계산 → 저장) ──
    createRecord(date, startTime, endTime, type, hourlyRate, isHoliday, memo) {
        let breakdown;
        let totalHours;
        let estimatedPay;

        if (type === 'oncall_standby') {
            // 대기만: 시간 계산 불필요
            breakdown = { totalHours: 0, extended: 0, night: 0, holiday: 0, holidayNight: 0 };
            totalHours = 0;
            estimatedPay = DATA.allowances.onCallStandby;
        } else {
            breakdown = this.calcTimeBreakdown(date, startTime, endTime, type, isHoliday);
            totalHours = breakdown.totalHours;

            // 온콜 출근 시 출퇴근 2시간 가산
            if (type === 'oncall_callout') {
                const commuteHours = DATA.allowances.onCallCommuteHours;
                // 출퇴근 시간은 연장근무로 처리
                breakdown.extended += commuteHours;
                breakdown.totalHours += commuteHours;
                totalHours += commuteHours;
            }

            estimatedPay = this.calcEstimatedPay(breakdown, hourlyRate, type);
        }

        const record = {
            date,
            type,
            startTime: type === 'oncall_standby' ? '' : startTime,
            endTime: type === 'oncall_standby' ? '' : endTime,
            memo: memo || '',
            totalHours,
            breakdown: {
                extended: breakdown.extended,
                night: breakdown.night,
                holiday: breakdown.holiday,
                holidayNight: breakdown.holidayNight,
            },
            estimatedPay,
            isWeekend: breakdown.isWeekend || false,
            isHoliday: isHoliday || false,
            hourlyRate,
        };

        return this.addRecord(record);
    },

    // ── 기록 수정 (재계산 포함) ──
    updateRecordFull(id, date, startTime, endTime, type, hourlyRate, isHoliday, memo) {
        let breakdown;
        let totalHours;
        let estimatedPay;

        if (type === 'oncall_standby') {
            breakdown = { totalHours: 0, extended: 0, night: 0, holiday: 0, holidayNight: 0 };
            totalHours = 0;
            estimatedPay = DATA.allowances.onCallStandby;
        } else {
            breakdown = this.calcTimeBreakdown(date, startTime, endTime, type, isHoliday);
            totalHours = breakdown.totalHours;
            if (type === 'oncall_callout') {
                const commuteHours = DATA.allowances.onCallCommuteHours;
                breakdown.extended += commuteHours;
                breakdown.totalHours += commuteHours;
                totalHours += commuteHours;
            }
            estimatedPay = this.calcEstimatedPay(breakdown, hourlyRate, type);
        }

        return this.updateRecord(id, {
            date, type,
            startTime: type === 'oncall_standby' ? '' : startTime,
            endTime: type === 'oncall_standby' ? '' : endTime,
            memo: memo || '',
            totalHours,
            breakdown: {
                extended: breakdown.extended,
                night: breakdown.night,
                holiday: breakdown.holiday,
                holidayNight: breakdown.holidayNight,
            },
            estimatedPay,
            isWeekend: breakdown.isWeekend || false,
            isHoliday: isHoliday || false,
            hourlyRate,
        });
    },

    // ── 월간 통계 ──
    calcMonthlyStats(year, month) {
        const records = this.getMonthRecords(year, month);

        const stats = {
            overtimeHours: 0,
            oncallStandbyDays: 0,
            oncallCalloutCount: 0,
            nightShiftCount: 0,
            totalPay: 0,
            recordCount: records.length,
            byType: {
                overtime: { count: 0, hours: 0, pay: 0 },
                oncall_standby: { count: 0, hours: 0, pay: 0 },
                oncall_callout: { count: 0, hours: 0, pay: 0 },
            },
        };

        records.forEach(r => {
            stats.totalPay += r.estimatedPay || 0;

            if (r.type === 'overtime') {
                stats.overtimeHours += r.totalHours || 0;
                stats.byType.overtime.count++;
                stats.byType.overtime.hours += r.totalHours || 0;
                stats.byType.overtime.pay += r.estimatedPay || 0;
                if ((r.breakdown?.night || 0) > 0) stats.nightShiftCount++;
            } else if (r.type === 'oncall_standby') {
                stats.oncallStandbyDays++;
                stats.byType.oncall_standby.count++;
                stats.byType.oncall_standby.pay += r.estimatedPay || 0;
            } else if (r.type === 'oncall_callout') {
                stats.oncallCalloutCount++;
                stats.overtimeHours += r.totalHours || 0;
                stats.byType.oncall_callout.count++;
                stats.byType.oncall_callout.hours += r.totalHours || 0;
                stats.byType.oncall_callout.pay += r.estimatedPay || 0;
                if ((r.breakdown?.night || 0) > 0) stats.nightShiftCount++;
            }
        });

        return stats;
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
            // 유효성 검사: 각 key가 YYYY-MM 형식이고 값이 배열인지 확인
            for (const [key, val] of Object.entries(data)) {
                if (!/^\d{4}-\d{2}$/.test(key) || !Array.isArray(val)) {
                    throw new Error(`잘못된 형식: ${key}`);
                }
            }
            // 기존 데이터와 병합
            const existing = this._loadAll();
            for (const [key, records] of Object.entries(data)) {
                if (!existing[key]) existing[key] = [];
                // id 중복 체크 후 추가
                const existingIds = new Set(existing[key].map(r => r.id));
                records.forEach(r => {
                    if (!existingIds.has(r.id)) {
                        existing[key].push(r);
                    }
                });
            }
            this._saveAll(existing);
            return { success: true, message: '데이터 가져오기 성공' };
        } catch (e) {
            return { success: false, message: `가져오기 실패: ${e.message}` };
        }
    },

    // ── 유형 라벨 ──
    typeLabel(type) {
        const labels = {
            overtime: '시간외',
            oncall_standby: '온콜대기',
            oncall_callout: '온콜출근',
        };
        return labels[type] || type;
    },

    typeColor(type) {
        const colors = {
            overtime: 'var(--accent-amber)',
            oncall_standby: 'var(--accent-cyan)',
            oncall_callout: 'var(--accent-indigo)',
        };
        return colors[type] || 'var(--text-muted)';
    },
};
