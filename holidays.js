// ============================================
// 병원 HR 종합 시스템 - 공휴일·기념일 모듈
// 공공데이터포털 특일 정보 API + 정적 데이터 폴백
// ============================================

const HOLIDAYS = {
    // 서버 프록시 API (공공데이터 키는 서버 환경변수에서만 사용)
    _getApiBase() {
        if (location.protocol === 'file:') return 'http://localhost:3001/api';
        const lh = { 'localhost': true, '127.0.0.1': true, '::1': true };
        if (lh[location.hostname] && location.port !== '3001') return 'http://localhost:3001/api';
        return '/api';
    },

    // 캐시 (연도별)
    _cache: {},
    _anniversaryCache: {},
    _disabledOperations: {},
    _pending: {},
    _anniversaryPending: {},
    _cacheMeta: {},
    _anniversaryCacheMeta: {},

    CACHE_VERSION: '2026-04',
    REFRESH_MONTHS: [12, 3, 6, 9],
    ANNIVERSARY_API_ENABLED: false,

    // ── 요일 라벨 ──
    _dayLabels: ['일', '월', '화', '수', '목', '금', '토'],

    // ── 정적 폴백 데이터 (공휴일 + 국경일) ──
    staticData: {
        2025: [
            { name: '신정', date: '20250101' },
            { name: '설날', date: '20250128' },
            { name: '설날', date: '20250129' },
            { name: '설날', date: '20250130' },
            { name: '삼일절', date: '20250301' },
            { name: '대체공휴일(삼일절)', date: '20250303' },
            { name: '어린이날', date: '20250505' },
            { name: '부처님오신날', date: '20250505' },
            { name: '대체공휴일(부처님오신날)', date: '20250506' },
            { name: '현충일', date: '20250606' },
            { name: '광복절', date: '20250815' },
            { name: '추석', date: '20251005' },
            { name: '추석', date: '20251006' },
            { name: '추석', date: '20251007' },
            { name: '개천절', date: '20251003' },
            { name: '한글날', date: '20251009' },
            { name: '성탄절', date: '20251225' },
        ],
        2026: [
            { name: '1월1일', date: '20260101' },
            { name: '설날', date: '20260216' },
            { name: '설날', date: '20260217' },
            { name: '설날', date: '20260218' },
            { name: '삼일절', date: '20260301' },
            { name: '대체공휴일(삼일절)', date: '20260302' },
            { name: '어린이날', date: '20260505' },
            { name: '부처님오신날', date: '20260524' },
            { name: '대체공휴일(부처님오신날)', date: '20260525' },
            { name: '전국동시지방선거', date: '20260603' },
            { name: '현충일', date: '20260606' },
            { name: '제헌절', date: '20260717' },
            { name: '광복절', date: '20260815' },
            { name: '대체공휴일(광복절)', date: '20260817' },
            { name: '추석', date: '20260924' },
            { name: '추석', date: '20260925' },
            { name: '추석', date: '20260926' },
            { name: '개천절', date: '20261003' },
            { name: '대체공휴일(개천절)', date: '20261005' },
            { name: '한글날', date: '20261009' },
            { name: '기독탄신일', date: '20261225' },
        ],
        2027: [
            { name: '신정', date: '20270101' },
            { name: '설날', date: '20270206' },
            { name: '설날', date: '20270207' },
            { name: '설날', date: '20270208' },
            { name: '대체공휴일(설날)', date: '20270209' },
            { name: '삼일절', date: '20270301' },
            { name: '어린이날', date: '20270505' },
            { name: '부처님오신날', date: '20270513' },
            { name: '현충일', date: '20270606' },
            { name: '광복절', date: '20270815' },
            { name: '대체공휴일(광복절)', date: '20270816' },
            { name: '추석', date: '20271014' },
            { name: '추석', date: '20271015' },
            { name: '추석', date: '20271016' },
            { name: '개천절', date: '20271003' },
            { name: '대체공휴일(개천절)', date: '20271004' },
            { name: '한글날', date: '20271009' },
            { name: '성탄절', date: '20271225' },
        ],
        2028: [
            { name: '신정', date: '20280101' },
            { name: '설날', date: '20280125' },
            { name: '설날', date: '20280126' },
            { name: '설날', date: '20280127' },
            { name: '삼일절', date: '20280301' },
            { name: '제22대 국회의원선거', date: '20280412' },
            { name: '부처님오신날', date: '20280502' },
            { name: '어린이날', date: '20280505' },
            { name: '현충일', date: '20280606' },
            { name: '광복절', date: '20280815' },
            { name: '추석', date: '20281002' },
            { name: '추석', date: '20281003' },
            { name: '추석', date: '20281004' },
            { name: '개천절', date: '20281003' },
            { name: '대체공휴일(개천절)', date: '20281005' },
            { name: '한글날', date: '20281009' },
            { name: '성탄절', date: '20281225' },
        ]
    },

    // ── 병원 자체 유급휴일 (API 미제공, 취업규칙 제35조 + <2015.05>·<2025.10>) ──
    hospitalHolidays: [
        { name: '근로자의 날', month: 5, day: 1 },
        { name: '조합설립일', month: 8, day: 1, halfDay: true, halfDayHours: '09:00–13:00' }, // <2015.05>·<2025.10> 오전 반일 휴무
        { name: '개원기념일', month: 10, day: 15 },
    ],

    // ── 기념일 정적 폴백 데이터 (비휴일) ──
    staticAnniversaryData: {
        // 매년 고정 기념일 (음력 제외)
        fixed: [
            { name: '식목일', month: 4, day: 5 },
            { name: '스승의날', month: 5, day: 15 },
            { name: '제헌절', month: 7, day: 17 },
            { name: '국군의날', month: 10, day: 1 },
            { name: '한글날', month: 10, day: 9 },
        ]
    },

    _getCurrentMonthKey() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    },

    _getStorageKey(kind, year) {
        return `holidays_${this.CACHE_VERSION}_${kind}_${year}`;
    },

    _readStorage(key) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    },

    _writeStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) { /* 저장 실패 무시 */ }
    },

    _isRefreshMonth() {
        const now = new Date();
        return this.REFRESH_MONTHS.includes(now.getMonth() + 1);
    },

    _shouldUseCachedEntry(entry) {
        if (!entry || !Array.isArray(entry.data) || entry.data.length === 0) return false;
        if (!this._isRefreshMonth()) return true;
        return entry.refreshMonthKey === this._getCurrentMonthKey();
    },

    _mergeHospitalHolidays(year, holidays) {
        const merged = [...holidays];
        const existingDates = new Set(merged.map(h => String(h.date)));

        this.hospitalHolidays.forEach(h => {
            const dateStr = `${year}${String(h.month).padStart(2, '0')}${String(h.day).padStart(2, '0')}`;
            if (!existingDates.has(dateStr)) {
                merged.push({ name: h.name, date: dateStr, isHoliday: true });
            }
        });

        return merged;
    },

    _buildFallbackAnniversaries(year) {
        return this.staticAnniversaryData.fixed.map(a => ({
            name: a.name,
            date: `${year}${String(a.month).padStart(2, '0')}${String(a.day).padStart(2, '0')}`,
            isHoliday: false,
            dateKind: '기념일'
        }));
    },

    // ══════════════════════════════════════════
    // ── API 호출 (서버 프록시) ──
    // ══════════════════════════════════════════

    /**
     * 서버 /api/calendar/holidays 를 통해 공휴일 데이터 가져오기
     * 공공데이터포털 키는 서버 환경변수에서만 사용 — 브라우저에 노출 없음
     * @param {number} year
     * @returns {Promise<Array|null>} [{ name, date(YYYYMMDD), isHoliday }]
     */
    async fetchFromAPI(year) {
        try {
            const resp = await fetch(`${this._getApiBase()}/calendar/holidays?year=${year}`);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const data = await resp.json();
            const items = Array.isArray(data?.items) ? data.items : null;
            return items && items.length > 0 ? items : null;
        } catch (e) {
            console.warn(`[HOLIDAYS] 서버 API 실패 (${year}):`, e.message);
            return null;
        }
    },

    /**
     * API에서 기념일 데이터 가져오기
     * @param {number} year
     * @returns {Promise<Array>} [{ name, date(YYYYMMDD), isHoliday }]
     */
    async fetchAnniversariesFromAPI(year) {
        if (!this.ANNIVERSARY_API_ENABLED) return null;
        return null;
    },

    // ══════════════════════════════════════════
    // ── 데이터 조회 (캐시 + 폴백) ──
    // ══════════════════════════════════════════

    /**
     * 연도별 공휴일 가져오기 (API → 캐시 → 정적 폴백)
     * @param {number} year
     * @param {number=} focusMonth
     * @returns {Promise<Array>}
     */
    async getHolidays(year, focusMonth, options = {}) {
        // 캐시 확인
        if (!options.force && this._cache[year] && this._shouldUseCachedEntry(this._cacheMeta[year])) {
            return this._cache[year];
        }

        // localStorage 캐시 확인
        const lsKey = this._getStorageKey('holidays', year);
        const storedEntry = this._readStorage(lsKey);
        if (!options.force && this._shouldUseCachedEntry(storedEntry)) {
            const merged = this._mergeHospitalHolidays(year, storedEntry.data);
            this._cache[year] = merged;
            this._cacheMeta[year] = storedEntry;
            console.log(`💾 ${year}년 공휴일 localStorage 캐시 사용 (${merged.length}건)`);
            return merged;
        }

        if (!options.force && !storedEntry && !this._isRefreshMonth()) {
            const fallback = this._mergeHospitalHolidays(year, this.staticData[year] || []);
            const entry = {
                data: fallback,
                source: 'static',
                refreshMonthKey: null,
                checkedAt: Date.now()
            };
            this._cache[year] = fallback;
            this._cacheMeta[year] = entry;
            this._writeStorage(lsKey, entry);
            console.log(`📋 ${year}년 공휴일 정적 데이터 사용 (${fallback.length}건)`);
            return fallback;
        }

        if (this._pending[year]) return this._pending[year];

        this._pending[year] = (async () => {
            const apiData = await this.fetchFromAPI(year);
            let holidays;
            let source = 'static';
            if (apiData && apiData.length > 0) {
                holidays = apiData;
                source = 'api';
                console.log(`✅ ${year}년 공휴일 API 로드 성공 (${apiData.length}건)`);
            } else {
                holidays = [...(this.staticData[year] || [])];
                if (holidays.length > 0) {
                    console.log(`📋 ${year}년 공휴일 정적 데이터 사용 (${holidays.length}건)`);
                } else {
                    console.warn(`⚠️ ${year}년 공휴일 데이터 없음`);
                }
            }

            const merged = this._mergeHospitalHolidays(year, holidays);
            const entry = {
                data: merged,
                source,
                refreshMonthKey: this._getCurrentMonthKey(),
                checkedAt: Date.now()
            };

            this._cache[year] = merged;
            this._cacheMeta[year] = entry;
            this._writeStorage(lsKey, entry);
            return merged;
        })();

        try {
            return await this._pending[year];
        } finally {
            delete this._pending[year];
        }
    },

    /**
     * 연도별 기념일 가져오기 (API → 캐시 → 정적 폴백)
     * @param {number} year
     * @returns {Promise<Array>}
     */
    async getAnniversaries(year) {
        if (this._anniversaryCache[year] && this._anniversaryCacheMeta[year]?.refreshMonthKey === this._getCurrentMonthKey()) {
            return this._anniversaryCache[year];
        }

        const lsKey = this._getStorageKey('anniversaries', year);
        const storedEntry = this._readStorage(lsKey);
        if (storedEntry && storedEntry.refreshMonthKey === this._getCurrentMonthKey() && Array.isArray(storedEntry.data)) {
            this._anniversaryCache[year] = storedEntry.data;
            this._anniversaryCacheMeta[year] = storedEntry;
            return storedEntry.data;
        }

        if (this._anniversaryPending[year]) return this._anniversaryPending[year];

        this._anniversaryPending[year] = (async () => {
            const apiData = await this.fetchAnniversariesFromAPI(year);
            const anniversaries = (apiData && apiData.length > 0)
                ? apiData
                : this._buildFallbackAnniversaries(year);

            const source = (apiData && apiData.length > 0) ? 'api' : 'static';
            const entry = {
                data: anniversaries,
                source,
                refreshMonthKey: this._getCurrentMonthKey(),
                checkedAt: Date.now()
            };

            this._anniversaryCache[year] = anniversaries;
            this._anniversaryCacheMeta[year] = entry;
            this._writeStorage(lsKey, entry);

            if (source === 'api') {
                console.log(`✅ ${year}년 기념일 API 로드 성공 (${anniversaries.length}건)`);
            } else {
                console.log(`📋 ${year}년 기념일 정적 데이터 사용 (${anniversaries.length}건)`);
            }
            return anniversaries;
        })();

        try {
            return await this._anniversaryPending[year];
        } finally {
            delete this._anniversaryPending[year];
        }
    },

    /**
     * 특정 월의 공휴일 목록
     * @param {number} year
     * @param {number} month (1~12)
     * @returns {Promise<Array>} [{ name, date, day, dayOfWeek }]
     */
    async getMonthHolidays(year, month) {
        const holidays = await this.getHolidays(year, month);
        const mm = String(month).padStart(2, '0');
        const prefix = `${year}${mm}`;
        return holidays
            .filter(h => h.date.startsWith(prefix))
            .map(h => {
                const d = new Date(`${h.date.slice(0, 4)}-${h.date.slice(4, 6)}-${h.date.slice(6, 8)}`);
                return {
                    ...h,
                    day: parseInt(h.date.slice(6, 8)),
                    dayOfWeek: this._dayLabels[d.getDay()]
                };
            });
    },

    /**
     * 특정 월의 기념일 목록
     * @param {number} year
     * @param {number} month (1~12)
     * @returns {Promise<Array>}
     */
    async getMonthAnniversaries(year, month) {
        const anniversaries = await this.getAnniversaries(year);
        const mm = String(month).padStart(2, '0');
        const prefix = `${year}${mm}`;
        return anniversaries
            .filter(a => a.date.startsWith(prefix))
            .map(a => {
                const d = new Date(`${a.date.slice(0, 4)}-${a.date.slice(4, 6)}-${a.date.slice(6, 8)}`);
                return {
                    ...a,
                    day: parseInt(a.date.slice(6, 8)),
                    dayOfWeek: this._dayLabels[d.getDay()]
                };
            });
    },

    // ══════════════════════════════════════════
    // ── 날짜 유틸리티 (정적, 즉시 사용 가능) ──
    // ══════════════════════════════════════════

    /**
     * 주말 여부 (정적)
     * @param {number} year
     * @param {number} month (1~12)
     * @param {number} day
     * @returns {boolean}
     */
    isWeekend(year, month, day) {
        const dow = new Date(year, month - 1, day).getDay();
        return dow === 0 || dow === 6;
    },

    /**
     * 요일 라벨 반환 (정적)
     * @param {number} year
     * @param {number} month (1~12)
     * @param {number} day
     * @returns {string} '월'~'일'
     */
    getWeekday(year, month, day) {
        return this._dayLabels[new Date(year, month - 1, day).getDay()];
    },

    /**
     * 특정 날짜의 유형 분류
     * @param {number} year
     * @param {number} month (1~12)
     * @param {number} day
     * @returns {Promise<object>} { type, label, names }
     *   type: 'holiday' | 'anniversary' | 'weekend' | 'workday'
     *   label: 한글 설명
     *   names: 해당 날짜의 특일 이름 배열
     */
    async getDateType(year, month, day) {
        const dateStr = `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`;
        const isWknd = this.isWeekend(year, month, day);
        const weekdayLabel = this.getWeekday(year, month, day);

        // 공휴일 확인
        const holidays = await this.getHolidays(year);
        const matchedHolidays = holidays.filter(h => h.date === dateStr);
        if (matchedHolidays.length > 0) {
            const names = matchedHolidays.map(h => h.name);
            return {
                type: 'holiday',
                label: `공휴일 (${names.join(', ')})`,
                names,
                dayOfWeek: weekdayLabel,
                isDayOff: true
            };
        }

        // 기념일 확인
        const anniversaries = await this.getAnniversaries(year);
        const matchedAnniversaries = anniversaries.filter(a => a.date === dateStr);
        if (matchedAnniversaries.length > 0) {
            const names = matchedAnniversaries.map(a => a.name);
            return {
                type: 'anniversary',
                label: `기념일 (${names.join(', ')})`,
                names,
                dayOfWeek: weekdayLabel,
                isDayOff: isWknd  // 기념일 자체는 쉬는 날 아님, 주말이면 쉬는 날
            };
        }

        // 주말
        if (isWknd) {
            return {
                type: 'weekend',
                label: `주말 (${weekdayLabel}요일)`,
                names: [],
                dayOfWeek: weekdayLabel,
                isDayOff: true
            };
        }

        // 평일
        return {
            type: 'workday',
            label: `평일 (${weekdayLabel}요일)`,
            names: [],
            dayOfWeek: weekdayLabel,
            isDayOff: false
        };
    },

    /**
     * 특정 날짜가 쉬는 날인지 판별 (공휴일 또는 주말)
     * @param {number} year
     * @param {number} month (1~12)
     * @param {number} day
     * @returns {Promise<boolean>}
     */
    async isDayOff(year, month, day) {
        const info = await this.getDateType(year, month, day);
        return info.isDayOff;
    },

    // ══════════════════════════════════════════
    // ── 근무일수 계산 ──
    // ══════════════════════════════════════════

    /**
     * 특정 월의 근무일수 계산 (평일 - 공휴일이 평일인 날)
     * @param {number} year
     * @param {number} month (1~12)
     * @returns {Promise<{workDays, totalDays, holidays, weekends, ...}>}
     */
    async calcWorkDays(year, month) {
        const holidays = await this.getMonthHolidays(year, month);
        const anniversaries = await this.getMonthAnniversaries(year, month);
        const daysInMonth = new Date(year, month, 0).getDate();

        let weekdays = 0;
        let weekends = 0;
        const holidayDates = new Set(holidays.map(h => h.day));

        // 주말 + 공휴일(평일) 계산
        let holidaysOnWeekday = 0;
        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(year, month - 1, d);
            const dow = date.getDay();
            if (dow === 0 || dow === 6) {
                weekends++;
            } else {
                weekdays++;
                if (holidayDates.has(d)) {
                    holidaysOnWeekday++;
                }
            }
        }

        return {
            workDays: weekdays - holidaysOnWeekday,
            totalDays: daysInMonth,
            weekdays,
            weekends,
            holidaysOnWeekday,
            holidays,
            anniversaries
        };
    },

    /**
     * 연간 근무일수 합산 계산
     * @param {number} year
     * @returns {Promise<object>} { totalWorkDays, totalHolidays, totalWeekends, monthlyBreakdown }
     */
    async calcYearWorkDays(year) {
        const monthlyBreakdown = [];
        let totalWorkDays = 0;
        let totalHolidaysOnWeekday = 0;
        let totalWeekends = 0;
        let totalDays = 0;

        for (let m = 1; m <= 12; m++) {
            const info = await this.calcWorkDays(year, m);
            monthlyBreakdown.push({
                month: m,
                ...info
            });
            totalWorkDays += info.workDays;
            totalHolidaysOnWeekday += info.holidaysOnWeekday;
            totalWeekends += info.weekends;
            totalDays += info.totalDays;
        }

        return {
            year,
            totalDays,
            totalWorkDays,
            totalHolidaysOnWeekday,
            totalWeekends,
            totalDaysOff: totalWeekends + totalHolidaysOnWeekday,
            monthlyBreakdown
        };
    },

    // ══════════════════════════════════════════
    // ── 급여 관련 유틸리티 ──
    // ══════════════════════════════════════════

    /**
     * 명절지원비 해당월 여부
     * 설날·추석이 포함된 월 + 5월 + 7월 = 명절지원비 지급
     * @param {number} year
     * @param {number} month
     * @returns {Promise<boolean>}
     */
    async isHolidayBonusMonth(year, month) {
        // 5월, 7월은 항상 명절지원비 해당
        if (month === 5 || month === 7) return true;

        // 설날·추석 해당월 확인
        const holidays = await this.getMonthHolidays(year, month);
        return holidays.some(h =>
            h.name.includes('설날') || h.name.includes('추석')
        );
    },

    /**
     * 가계지원비 미지급월 여부
     * 규정: 연간 11개월 균등 지급 (1개월 미지급)
     * 지급월: 3,4,5,6,7,8,10,11,12월 + 설날 해당월 + 추석 해당월 (총 11개월)
     * 미지급월: 위 목록에 포함되지 않는 달 (보통 1월 또는 2월 또는 9월)
     * @param {number} year
     * @param {number} month
     * @returns {Promise<boolean>} true면 미지급월
     */
    async isFamilySupportSkipMonth(year, month) {
        // 기본 지급 월: 3,4,5,6,7,8,10,11,12
        const fixedPayMonths = new Set([3, 4, 5, 6, 7, 8, 10, 11, 12]);

        // 설날·추석 해당월 추가
        const holidays = await this.getHolidays(year);
        const seolMonth = holidays.find(h => h.name.includes('설날'));
        const chuseokMonth = holidays.find(h => h.name.includes('추석'));

        if (seolMonth) {
            fixedPayMonths.add(parseInt(seolMonth.date.slice(4, 6)));
        }
        if (chuseokMonth) {
            fixedPayMonths.add(parseInt(chuseokMonth.date.slice(4, 6)));
        }

        // 11개월만 지급이므로, 전체 12개월 중 fixedPayMonths에 포함 안 된 달이 미지급월
        // 만약 설/추석이 이미 고정월에 속하면, 지급월이 9개+2=11이라 추가 월 없이 정확히 11개월
        // 설/추석이 1월이나 2월, 9월에 해당하면 그 달이 지급월에 추가됨
        return !fixedPayMonths.has(month);
    },

    /**
     * 특정 날짜 정보 요약 (UI 표시용)
     * @param {number} year
     * @param {number} month
     * @param {number} day
     * @returns {Promise<string>} 날짜 정보 요약 문자열
     */
    async getDateSummary(year, month, day) {
        const info = await this.getDateType(year, month, day);
        const mm = String(month).padStart(2, '0');
        const dd = String(day).padStart(2, '0');
        return `${year}.${mm}.${dd} (${info.dayOfWeek}) - ${info.label}`;
    },

    /**
     * API 상태 표시 텍스트
     */
    getSourceLabel(year) {
        if (!this._cache[year]) return '미로드';
        return this._cacheMeta[year]?.source === 'api' ? 'API' : '정적 데이터';
    },

    /**
     * localStorage 캐시 초기화
     */
    clearCache() {
        this._cache = {};
        this._anniversaryCache = {};
        this._pending = {};
        this._anniversaryPending = {};
        this._cacheMeta = {};
        this._anniversaryCacheMeta = {};
        for (let y = 2025; y <= 2030; y++) {
            try { localStorage.removeItem(this._getStorageKey('holidays', y)); } catch (e) { }
            try { localStorage.removeItem(this._getStorageKey('anniversaries', y)); } catch (e) { }
        }
        console.log('🗑️ 공휴일 캐시 초기화 완료');
    },

    async forceRefreshYear(year) {
        const data = await this.getHolidays(year, undefined, { force: true });
        this._anniversaryCache[year] = this._buildFallbackAnniversaries(year);
        this._anniversaryCacheMeta[year] = {
            data: this._anniversaryCache[year],
            source: 'static',
            refreshMonthKey: this._getCurrentMonthKey(),
            checkedAt: Date.now()
        };
        this._writeStorage(this._getStorageKey('anniversaries', year), this._anniversaryCacheMeta[year]);
        return {
            holidays: data,
            anniversaries: this._anniversaryCache[year]
        };
    }
};
