// ============================================
// 시간외·온콜 기록 관리 모듈
// CRUD + 자동 요율 계산 + 월간 통계
// ============================================
import { CALC } from '@snuhmate/calculators';
import { DATA } from '@snuhmate/data';

export const OVERTIME = {
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
        if (window.recordLocalEdit) window.recordLocalEdit('overtimeRecords');

        // Phase 8: Firestore write-through (로그인 시만, fire-and-forget)
        if (typeof window !== 'undefined' && window.__firebaseUid) {
            const uid = window.__firebaseUid;
            import('/src/firebase/sync/overtime-sync.js').then(m =>
                m.writeAllOvertime(null, uid, data)
            ).catch(err => {
                console.warn('[Phase 8] overtime cloud sync 실패 (무해)', err?.message || err);
            });
        }
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

        window.dispatchEvent(new CustomEvent('overtimeChanged'));

        return record;
    },

    updateRecord(id, updates) {
        const all = this._loadAll();
        for (const key of Object.keys(all)) {
            const idx = all[key].findIndex(r => r.id === id);
            if (idx !== -1) {
                all[key][idx] = { ...all[key][idx], ...updates, id };
                this._saveAll(all);

                        window.dispatchEvent(new CustomEvent('overtimeChanged'));

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

                        window.dispatchEvent(new CustomEvent('overtimeChanged'));

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

    // ── 출퇴근 시간 시간대별 분류 (온콜용) ──
    // 출근 전 1시간 + 퇴근 후 1시간을 시간대에 따라 연장/야간/휴일/휴일야간으로 분류
    _calcCommuteBreakdown(startMin, endMin, isRestDay) {
        let ext = 0, ngt = 0, hol = 0, holNgt = 0;

        // 출근 전 1시간: (startMin - 60) ~ startMin
        const commuteBefore = startMin - 60;
        for (let m = commuteBefore; m < startMin; m++) {
            const hourInDay = ((m % 1440) + 1440) % 1440; // 음수 대응
            const isNight = (hourInDay >= 1320 || hourInDay < 360);
            if (isRestDay) { isNight ? holNgt++ : hol++; }
            else { isNight ? ngt++ : ext++; }
        }

        // 퇴근 후 1시간: endMin ~ (endMin + 60)
        for (let m = endMin; m < endMin + 60; m++) {
            const hourInDay = m % 1440;
            const isNight = (hourInDay >= 1320 || hourInDay < 360);
            if (isRestDay) { isNight ? holNgt++ : hol++; }
            else { isNight ? ngt++ : ext++; }
        }

        return {
            extended: this._minutesToHours(ext),
            night: this._minutesToHours(ngt),
            holiday: this._minutesToHours(hol),
            holidayNight: this._minutesToHours(holNgt),
            totalMinutes: 120,
        };
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
            isHoliday,    // 법정공휴일 여부 (API 판별) — 제32조(6) 50% 추가 가산 트리거
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

        // 제32조(6) 법정공휴일 50% 추가 가산 — 휴일근무 가산과 별개로 적용
        // isHoliday=true 는 공공데이터포털 API 가 법정공휴일로 판별한 날짜만 의미 (주휴일·토요일 제외)
        if (breakdown.isHoliday && (breakdown.holiday > 0 || breakdown.holidayNight > 0)) {
            pay += (breakdown.holiday + breakdown.holidayNight) * hourlyRate * rates.publicHoliday;
        }

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

            // 온콜 출근 시 출퇴근 2시간 가산 (시간대별 야간/휴일 반영)
            if (type === 'oncall_callout') {
                const startMin = this._parseTime(startTime);
                let endMin = this._parseTime(endTime);
                if (endMin <= startMin) endMin += 1440;
                const isRestDay = breakdown.isWeekend || isHoliday;
                const commute = this._calcCommuteBreakdown(startMin, endMin, isRestDay);

                breakdown.extended += commute.extended;
                breakdown.night += commute.night;
                breakdown.holiday += commute.holiday;
                breakdown.holidayNight += commute.holidayNight;
                breakdown.totalHours += this._minutesToHours(commute.totalMinutes);
                totalHours += this._minutesToHours(commute.totalMinutes);
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
            // 온콜 출근 시 출퇴근 2시간 가산 (시간대별 야간/휴일 반영)
            if (type === 'oncall_callout') {
                const startMin = this._parseTime(startTime);
                let endMin = this._parseTime(endTime);
                if (endMin <= startMin) endMin += 1440;
                const isRestDay = breakdown.isWeekend || isHoliday;
                const commute = this._calcCommuteBreakdown(startMin, endMin, isRestDay);

                breakdown.extended += commute.extended;
                breakdown.night += commute.night;
                breakdown.holiday += commute.holiday;
                breakdown.holidayNight += commute.holidayNight;
                breakdown.totalHours += this._minutesToHours(commute.totalMinutes);
                totalHours += this._minutesToHours(commute.totalMinutes);
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

    // ── 주간 한도 검증 (제34조(1)) — M2-8 ──
    // 주별 시간외 + 연장 시간 합산 후 CALC.checkOvertimeLimit 호출.
    // 반환: [{weekStart: 'YYYY-MM-DD', daily: max일 hours, weekly: 합계, warning?}]
    calcWeeklyLimitCheck(year, month) {
        const records = this.getMonthRecords(year, month);
        const weekMap = {}; // ISO week key → { daily: max, weekly: sum, days: { 'YYYY-MM-DD': hours } }

        records.forEach(r => {
            if (r.type !== 'overtime') return; // 연장근로만 한도 적용
            const date = r.date || r.startDate;
            if (!date) return;
            const ext = r.breakdown?.extended || 0;
            // ISO 주 키: 해당 날짜의 월요일
            const d = new Date(date);
            const dow = (d.getDay() + 6) % 7; // 월=0
            d.setDate(d.getDate() - dow);
            const weekKey = d.toISOString().slice(0, 10);

            if (!weekMap[weekKey]) weekMap[weekKey] = { weekly: 0, days: {} };
            weekMap[weekKey].days[date] = (weekMap[weekKey].days[date] || 0) + ext;
            weekMap[weekKey].weekly += ext;
        });

        const checkFn = (typeof CALC !== 'undefined' && CALC.checkOvertimeLimit) ? CALC.checkOvertimeLimit : null;
        return Object.entries(weekMap).map(([weekStart, w]) => {
            const dailyMax = Math.max(0, ...Object.values(w.days));
            const result = checkFn ? checkFn({ daily: dailyMax, weekly: w.weekly }) : { warning: null };
            return { weekStart, daily: dailyMax, weekly: w.weekly, warning: result.warning };
        }).filter(w => w.warning);
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
                stats.byType.oncall_callout.count++;
                stats.byType.oncall_callout.hours += r.totalHours || 0;
                stats.byType.oncall_callout.pay += r.estimatedPay || 0;
                if ((r.breakdown?.night || 0) > 0) stats.nightShiftCount++;
            }
        });

        // ── 명세서 보충 정보 (base 수치는 변경하지 않음) ──
        const payslipData = this.getPayslipData(year, month);
        if (payslipData) {
            const ws = payslipData.workStats || [];
            const wsMap = {};
            ws.forEach(s => { wsMap[s.name] = s.value; });

            const psExtH = wsMap['시간외근무시간'] || 0;
            const psNightH = wsMap['야간근무시간'] || wsMap['야간근로시간'] || 0;
            const psHolidayH = wsMap['휴일근무시간'] || 0;

            let manualExt = 0, manualNight = 0, manualHoliday = 0;
            records.forEach(r => {
                manualExt += r.breakdown?.extended || 0;
                manualNight += (r.breakdown?.night || 0) + (r.breakdown?.holidayNight || 0);
                manualHoliday += r.breakdown?.holiday || 0;
            });

            const extSupp = Math.max(0, psExtH - manualExt);
            const nightSupp = Math.max(0, psNightH - manualNight);
            const holidaySupp = Math.max(0, psHolidayH - manualHoliday);

            if (extSupp > 0 || nightSupp > 0 || holidaySupp > 0) {
                const hr = payslipData.hourlyRate || 0;
                const rt = (typeof DATA !== 'undefined') ? DATA.allowances.overtimeRates : { extended: 1.5, night: 2.0, holiday: 1.5 };
                stats.payslipSupplement = {
                    extended: extSupp,
                    night: nightSupp,
                    holiday: holidaySupp,
                    totalHours: extSupp + nightSupp + holidaySupp,
                    pay: Math.round(extSupp * hr * rt.extended) + Math.round(nightSupp * hr * rt.night) + Math.round(holidaySupp * hr * rt.holiday),
                };
            }
        }

        return stats;
    },

    // ── 연간 통계 ──
    calcYearlyStats(year) {
        let totalOvertimeHours = 0;
        let totalOncallStandbyCount = 0;
        let totalOncallCalloutCount = 0;
        let totalOncallHours = 0;
        let totalPay = 0;
        let recordCount = 0;
        for (let m = 1; m <= 12; m++) {
            const s = this.calcMonthlyStats(year, m);
            totalOvertimeHours += s.byType.overtime.hours || 0;
            totalOncallStandbyCount += s.byType.oncall_standby.count || 0;
            totalOncallCalloutCount += s.byType.oncall_callout.count || 0;
            totalOncallHours += (s.byType.oncall_standby.hours || 0) +
                                 (s.byType.oncall_callout.hours || 0);
            totalPay += s.totalPay || 0;
            recordCount += s.recordCount || 0;
            // 명세서 보충분 합산
            if (s.payslipSupplement) {
                totalOvertimeHours += s.payslipSupplement.totalHours;
                totalPay += s.payslipSupplement.pay;
            }
        }
        return {
            totalOvertimeHours, totalOncallStandbyCount,
            totalOncallCalloutCount, totalOncallHours,
            totalPay, recordCount
        };
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

    // ── 명세서 데이터 저장/조회 (교차 검증용) ──

    get PAYSLIP_STORAGE_KEY() {
        return window.getUserStorageKey ? window.getUserStorageKey('overtimePayslipData') : 'overtimePayslipData';
    },

    _loadPayslipAll() {
        try {
            return JSON.parse(localStorage.getItem(this.PAYSLIP_STORAGE_KEY)) || {};
        } catch { return {}; }
    },

    _savePayslipAll(data) {
        localStorage.setItem(this.PAYSLIP_STORAGE_KEY, JSON.stringify(data));
    },

    /**
     * 명세서 파싱 결과를 교차 검증용으로 저장 (upsert)
     * @param {string} ym - 'YYYY-MM'
     * @param {object} data - { workStats, overtimeItems, hourlyRate }
     *   workStats: [{ name, value }]  (salary-parser workStats)
     *   overtimeItems: [{ name, amount }]  (시간외/야간/휴일 수당 금액)
     *   hourlyRate: number (역계산 기준 시급)
     */
    savePayslipData(ym, data) {
        const all = this._loadPayslipAll();
        all[ym] = { ...data, savedAt: new Date().toISOString() };
        this._savePayslipAll(all);
        window.dispatchEvent(new CustomEvent('payslipChanged', { detail: { ym } }));
    },

    getPayslipData(year, month) {
        const all = this._loadPayslipAll();
        return all[this._monthKey(year, month)] || null;
    },

    /**
     * 교차 검증: 수동 기록 vs 명세서 데이터
     * @returns {{ items, summary, alerts }}
     */
    crossVerify(year, month) {
        const manualStats = this.calcMonthlyStats(year, month);
        const payslipData = this.getPayslipData(year, month);

        if (!payslipData) return null;

        const ws = payslipData.workStats || [];
        const hourlyRate = payslipData.hourlyRate || 0;
        const rates = (typeof DATA !== 'undefined') ? DATA.allowances.overtimeRates : { extended: 1.5, night: 2.0, holiday: 1.5 };

        // workStats에서 시간 추출
        const wsMap = {};
        ws.forEach(s => { wsMap[s.name] = s.value; });

        const psExtH = wsMap['시간외근무시간'] || 0;
        const psNightH = wsMap['야간근무시간'] || wsMap['야간근로시간'] || 0;
        const psHolidayH = wsMap['휴일근무시간'] || 0;

        // 수동 기록 합산 (모든 유형의 breakdown 합산)
        const records = this.getMonthRecords(year, month);
        let manualExt = 0, manualNight = 0, manualHoliday = 0, manualHolidayNight = 0;
        let oncallStandbyCount = 0, oncallCalloutCount = 0;
        records.forEach(r => {
            manualExt += r.breakdown?.extended || 0;
            manualNight += r.breakdown?.night || 0;
            manualHoliday += r.breakdown?.holiday || 0;
            manualHolidayNight += r.breakdown?.holidayNight || 0;
            if (r.type === 'oncall_standby') oncallStandbyCount++;
            if (r.type === 'oncall_callout') oncallCalloutCount++;
        });

        // 명세서 수당 금액 (salaryItems에서)
        const otItems = payslipData.overtimeItems || [];
        const otMap = {};
        otItems.forEach(i => { otMap[i.name] = i.amount; });

        const psExtPay = otMap['시간외수당'] || otMap['시간외근무수당'] || 0;
        const psNightPay = otMap['야간수당'] || otMap['야간근무수당'] || otMap['야간근무가산'] || 0;
        const psHolidayPay = otMap['휴일수당'] || otMap['휴일근무수당'] || 0;

        // 비교 항목 생성
        const items = [
            {
                label: '연장근무',
                manualHours: manualExt,
                payslipHours: psExtH,
                diffHours: manualExt - psExtH,
                manualPay: Math.round(manualExt * hourlyRate * rates.extended),
                payslipPay: psExtPay,
            },
            {
                label: '야간근무',
                manualHours: manualNight + manualHolidayNight,
                payslipHours: psNightH,
                diffHours: (manualNight + manualHolidayNight) - psNightH,
                manualPay: Math.round((manualNight + manualHolidayNight) * hourlyRate * rates.night),
                payslipPay: psNightPay,
            },
            {
                label: '휴일근무',
                manualHours: manualHoliday,
                payslipHours: psHolidayH,
                diffHours: manualHoliday - psHolidayH,
                manualPay: Math.round(manualHoliday * hourlyRate * rates.holiday),
                payslipPay: psHolidayPay,
            },
        ];

        // 합계
        const totalManualPay = manualStats.totalPay;
        const totalPayslipPay = psExtPay + psNightPay + psHolidayPay;

        // 알림 생성
        const alerts = [];
        items.forEach(item => {
            if (Math.abs(item.diffHours) >= 0.5) {
                const dir = item.diffHours > 0 ? '많음' : '부족';
                alerts.push(`${item.label}: 내 기록이 명세서보다 ${Math.abs(item.diffHours).toFixed(1)}시간 ${dir}`);
            }
        });
        if (totalManualPay > 0 && totalPayslipPay > 0) {
            const payDiff = totalManualPay - totalPayslipPay;
            if (Math.abs(payDiff) >= 1000) {
                alerts.push(`수당 합계: ${payDiff > 0 ? '명세서가 ' + Math.abs(payDiff).toLocaleString() + '원 부족' : '명세서가 ' + Math.abs(payDiff).toLocaleString() + '원 초과'}`);
            }
        }

        return {
            items,
            oncall: { standby: oncallStandbyCount, callout: oncallCalloutCount },
            summary: {
                totalManualPay,
                totalPayslipPay,
                diff: totalManualPay - totalPayslipPay,
            },
            alerts,
            hourlyRate,
            hasManualRecords: records.length > 0,
            hasPayslipData: true,
        };
    },
};

// 호환층 — IIFE 모듈이 window.OVERTIME 사용
if (typeof window !== 'undefined') {
  window.OVERTIME = OVERTIME;
}
