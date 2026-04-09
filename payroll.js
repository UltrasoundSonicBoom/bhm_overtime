// ============================================
// 병원 HR 종합 시스템 - 급여 Q&A 카드 모듈
// ============================================

const PAYROLL = {
  // ── 카테고리 정의 ──
  categories: [
    { id: 'overtime', label: '수당·시간외', icon: '⏰' },
    { id: 'leave',    label: '휴가·휴직',  icon: '📅' },
    { id: 'career',   label: '승진·근속',  icon: '📈' },
    { id: 'welfare',  label: '복지·감면',  icon: '🎁' },
  ],

  cards: [
    // ═══════════ 수당·시간외 ═══════════
    {
      id: 'overtime1h', category: 'overtime',
      icon: '⏰', title: '시간외 1시간 수당',
      desc: '연장근무 시급 × 150%',
      calc(profile, wage) {
        const r = CALC.calcOvertimePay(wage.hourlyRate, 1, 0, 0);
        return {
          value: CALC.formatCurrency(r.연장근무수당),
          label: '연장근무 1시간 수당',
          details: [
            { key: '시급', val: CALC.formatCurrency(wage.hourlyRate) },
            { key: '요율', val: '150%' },
            { key: '계산', val: `${CALC.formatNumber(wage.hourlyRate)} × 1.5 × 1h` }
          ]
        };
      }
    },
    {
      id: 'holidayWork', category: 'overtime',
      icon: '🔴', title: '휴일근무 하면 얼마?',
      desc: '휴일근무 8시간 기준 수당',
      hasInput: true,
      calc(profile, wage, inputs) {
        const hours = inputs.hours || 8;
        const r = CALC.calcOvertimePay(wage.hourlyRate, 0, 0, hours);
        const holBase = Math.min(hours, 8);
        const holOver = Math.max(hours - 8, 0);
        const details = [
          { key: '시급', val: CALC.formatCurrency(wage.hourlyRate) },
          { key: '8h 이내 (150%)', val: `${CALC.formatNumber(wage.hourlyRate)} × 1.5 × ${holBase}h = ${CALC.formatCurrency(Math.round(wage.hourlyRate * 1.5 * holBase))}` }
        ];
        if (holOver > 0) {
          details.push({ key: '8h 초과 (200%)', val: `${CALC.formatNumber(wage.hourlyRate)} × 2.0 × ${holOver}h = ${CALC.formatCurrency(Math.round(wage.hourlyRate * 2.0 * holOver))}` });
        }
        return {
          value: CALC.formatCurrency(r.휴일근무수당),
          label: `휴일근무 ${hours}시간 수당`,
          details
        };
      },
      renderInput() {
        return `<div class="form-group" style="margin-top:12px;">
          <label>휴일근무 시간</label>
          <input type="number" id="qaHolidayHours" value="8" min="1" max="24" onchange="PAYROLL.recalc('holidayWork')">
        </div>`;
      },
      getInputs() {
        const el = document.getElementById('qaHolidayHours');
        return { hours: el ? parseInt(el.value) || 8 : 8 };
      }
    },
    {
      id: 'nightShift', category: 'overtime',
      icon: '🌙', title: '야간근무 N회 수당',
      desc: '가산금 + 리커버리데이 발생 여부',
      hasInput: true,
      calc(profile, wage, inputs) {
        const count = inputs.count || 7;
        const r = CALC.calcNightShiftBonus(count);
        const details = [
          { key: '야간근무 횟수', val: `${count}회` },
          { key: '가산금 (회당 1만원)', val: CALC.formatCurrency(r.야간근무가산금) },
          { key: '리커버리데이', val: r.리커버리데이 > 0 ? `${r.리커버리데이}일 발생` : '해당없음' },
        ];
        if (r.초과경고) details.push({ key: '경고', val: r.초과경고 });
        return {
          value: CALC.formatCurrency(r.야간근무가산금),
          label: `야간 ${count}회 가산금` + (r.리커버리데이 > 0 ? ` + 리커버리 ${r.리커버리데이}일` : ''),
          details
        };
      },
      renderInput() {
        return `<div class="form-group" style="margin-top:12px;">
          <label>이번 달 야간근무 횟수</label>
          <input type="number" id="qaNightCount" value="7" min="0" max="15" onchange="PAYROLL.recalc('nightShift')">
        </div>`;
      },
      getInputs() {
        const el = document.getElementById('qaNightCount');
        return { count: el ? parseInt(el.value) || 7 : 7 };
      }
    },
    {
      id: 'oncall', category: 'overtime',
      icon: '📞', title: '온콜 1회 출근하면?',
      desc: '대기수당 + 교통비 + 시간외 합산',
      hasInput: true,
      calc(profile, wage, inputs) {
        const standby = inputs.standby || 1;
        const hours = inputs.hours || 2;
        const r = CALC.calcOnCallPay(wage.hourlyRate, standby, 1, hours, false);
        return {
          value: CALC.formatCurrency(r.합계),
          label: `온콜 대기${standby}일 + 출근1회 (${hours}h 근무)`,
          details: [
            { key: '온콜대기수당', val: CALC.formatCurrency(r.온콜대기수당) + ` (${standby}일 × 1만원)` },
            { key: '온콜교통비', val: CALC.formatCurrency(r.온콜교통비) + ' (1회 5만원)' },
            { key: '시간외근무수당', val: CALC.formatCurrency(r.시간외근무수당) + ` (근무${hours}h+출퇴근2h)` },
          ]
        };
      },
      renderInput() {
        return `<div style="display:flex; gap:8px; margin-top:12px;">
          <div class="form-group" style="flex:1;">
            <label>대기 일수</label>
            <input type="number" id="qaOncallStandby" value="1" min="0" max="7" onchange="PAYROLL.recalc('oncall')">
          </div>
          <div class="form-group" style="flex:1;">
            <label>실 근무시간</label>
            <input type="number" id="qaOncallHours" value="2" min="0" max="12" onchange="PAYROLL.recalc('oncall')">
          </div>
        </div>`;
      },
      getInputs() {
        return {
          standby: parseInt(document.getElementById('qaOncallStandby')?.value) || 1,
          hours: parseInt(document.getElementById('qaOncallHours')?.value) || 2
        };
      }
    },
    {
      id: 'familyAllowance', category: 'overtime',
      icon: '👨‍👩‍👧', title: '가족수당 계산',
      desc: '가족·자녀 수 기준 (6세 이하 별도)',
      calc(profile, wage) {
        const r = CALC.calcFamilyAllowance(
          parseInt(profile.numFamily) || 0,
          parseInt(profile.numChildren) || 0
        );
        const under6Pay = parseInt(profile.childrenUnder6Pay) || 0;
        const details = Object.entries(r.breakdown).map(([key, val]) => ({
          key, val: CALC.formatCurrency(val)
        }));
        if (under6Pay > 0) {
          details.push({ key: '6세 이하 자녀수당', val: CALC.formatCurrency(under6Pay) });
        }
        return {
          value: CALC.formatCurrency(r.월수당 + under6Pay),
          label: '월 가족수당 합계',
          details: details.length > 0 ? details : [{ key: '해당', val: '없음 (가족정보 미입력)' }]
        };
      }
    },

    // ═══════════ 휴가·휴직 ═══════════
    {
      id: 'annualLeave', category: 'leave',
      icon: '🏖️', title: '내 연차 몇 일?',
      desc: '입사일 기준 올해 연차 일수',
      calc(profile, wage) {
        if (!profile.hireDate) return { value: '입사일 필요', label: '프로필에 입사일을 입력하세요', details: [] };
        const parsed = PROFILE.parseDate(profile.hireDate);
        if (!parsed) return { value: '입사일 오류', label: '', details: [] };
        const r = CALC.calcAnnualLeave(new Date(parsed));
        return {
          value: `${r.totalLeave}일`,
          label: r.explanation,
          details: [
            { key: '입사일', val: parsed },
            { key: '근속', val: r.diffYears >= 1 ? `${r.diffYears}년차` : `${r.diffMonths}개월` },
            { key: '연차일수', val: `${r.totalLeave}일` },
            { key: '근거', val: '보수규정 제36조' }
          ]
        };
      }
    },
    {
      id: 'unpaidLeave', category: 'leave',
      icon: '📋', title: '무급휴가 1일 공제액',
      desc: '통상임금 월액 / 30',
      calc(profile, wage) {
        const dailyOrdinary = Math.round(wage.monthlyWage / 30);
        const dailyBasePay = Math.round((wage.breakdown['기준기본급'] || 0) / 30);
        return {
          value: CALC.formatCurrency(dailyOrdinary),
          label: '무급휴가 1일 공제액 (통상임금 기준)',
          details: [
            { key: '통상임금 월액', val: CALC.formatCurrency(wage.monthlyWage) },
            { key: '통상임금 일액 (÷30)', val: CALC.formatCurrency(dailyOrdinary) },
            { key: '기본급 일액 (÷30)', val: CALC.formatCurrency(dailyBasePay) + ' ← 생리휴가 기준' },
            { key: '근거', val: '보수규정 제7조②' }
          ]
        };
      }
    },
    {
      id: 'unusedLeave', category: 'leave',
      icon: '💰', title: '미사용 연차 보상금',
      desc: '시급 × 8h × 잔여일수',
      hasInput: true,
      calc(profile, wage, inputs) {
        const days = inputs.days || 1;
        const daily = wage.hourlyRate * 8;
        const total = daily * days;
        return {
          value: CALC.formatCurrency(total),
          label: `미사용 연차 ${days}일 보상금`,
          details: [
            { key: '1일 금액', val: CALC.formatCurrency(daily) },
            { key: '잔여일수', val: `${days}일` },
            { key: '계산', val: `${CALC.formatNumber(daily)} × ${days}일` }
          ]
        };
      },
      renderInput() {
        return `<div class="form-group" style="margin-top:12px;">
          <label>잔여 연차 일수</label>
          <input type="number" id="qaUnusedDays" value="5" min="1" max="30" onchange="PAYROLL.recalc('unusedLeave')">
        </div>`;
      },
      getInputs() {
        const el = document.getElementById('qaUnusedDays');
        return { days: el ? parseInt(el.value) || 1 : 1 };
      }
    },
    {
      id: 'parentalLeave', category: 'leave',
      icon: '👶', title: '육아휴직 급여는?',
      desc: '월별 급여 + 상한선 시뮬레이션',
      hasInput: true,
      calc(profile, wage, inputs) {
        const months = inputs.months || 12;
        const r = CALC.calcParentalLeavePay(wage.monthlyWage, months);
        const details = [
          { key: '월 통상임금', val: CALC.formatCurrency(wage.monthlyWage) },
        ];
        r.monthly.forEach(m => {
          details.push({ key: `${m.month}개월차`, val: CALC.formatCurrency(m.pay) + ` (${m.explanation.split(':')[1]?.trim() || ''})` });
        });
        return {
          value: CALC.formatCurrency(r.total),
          label: `육아휴직 ${months}개월 총 예상 급여`,
          details
        };
      },
      renderInput() {
        return `<div class="form-group" style="margin-top:12px;">
          <label>육아휴직 개월수</label>
          <input type="number" id="qaParentalMonths" value="12" min="1" max="18" onchange="PAYROLL.recalc('parentalLeave')">
        </div>`;
      },
      getInputs() {
        const el = document.getElementById('qaParentalMonths');
        return { months: el ? parseInt(el.value) || 12 : 12 };
      }
    },

    // ═══════════ 승진·근속 ═══════════
    {
      id: 'promotionDiff', category: 'career',
      icon: '📈', title: '승진하면 얼마나 올라?',
      desc: '현재 vs 다음 등급 통상임금 비교',
      calc(profile, wage) {
        const table = DATA.payTables[CALC.resolvePayTable(profile.jobType)];
        if (!table || !table.autoPromotion[profile.grade]) {
          return { value: '해당없음', label: '자동승격 정보 없음', details: [] };
        }
        const nextGrade = table.autoPromotion[profile.grade].next;
        const nextWage = CALC.calcOrdinaryWage(profile.jobType, nextGrade, 1, {
          hasMilitary: profile.hasMilitary, militaryMonths: profile.militaryMonths || 24,
          hasSeniority: profile.hasSeniority,
          seniorityYears: profile.hireDate ? PROFILE.calcServiceYears(profile.hireDate) : 0,
          adjustPay: parseInt(profile.adjustPay) || 0
        });
        if (!nextWage) return { value: '계산 불가', label: '', details: [] };
        const diff = nextWage.monthlyWage - wage.monthlyWage;
        const currentLabel = table.gradeLabels?.[profile.grade] || profile.grade;
        const nextLabel = table.gradeLabels?.[nextGrade] || nextGrade;
        return {
          value: (diff > 0 ? '+' : '') + CALC.formatCurrency(diff),
          label: `${currentLabel} → ${nextLabel} 월급 차이`,
          details: [
            { key: `현재 (${currentLabel})`, val: CALC.formatCurrency(wage.monthlyWage) },
            { key: `승진 후 (${nextLabel})`, val: CALC.formatCurrency(nextWage.monthlyWage) },
            { key: '월 차액', val: (diff > 0 ? '+' : '') + CALC.formatCurrency(diff) }
          ]
        };
      }
    },
    {
      id: 'promotionDate', category: 'career',
      icon: '📊', title: '몇 년도에 승진?',
      desc: '자동승격 예상일 타임라인',
      calc(profile, wage) {
        if (!profile.hireDate) return { value: '입사일 필요', label: '프로필에 입사일을 입력하세요', details: [] };
        const parsed = PROFILE.parseDate(profile.hireDate);
        if (!parsed) return { value: '입사일 오류', label: '', details: [] };
        const r = CALC.calcPromotionDate(profile.jobType, profile.grade, new Date(parsed));
        if (r.message) return { value: '해당없음', label: r.message, details: [] };
        const isPast = r.남은일수 === 0;
        return {
          value: isPast ? '이미 도래' : `D-${r.남은일수}`,
          label: r.label,
          details: [
            { key: '소요 연수', val: r.소요연수 },
            { key: '예상 승격일', val: r.예상승격일 },
            { key: '남은 일수', val: isPast ? '이미 도래' : `${r.남은일수}일` }
          ]
        };
      }
    },
    {
      id: 'longService', category: 'career',
      icon: '🏅', title: '장기근속수당',
      desc: '근속연수 기반 월 수당',
      calc(profile, wage) {
        const years = profile.hireDate ? PROFILE.calcServiceYears(profile.hireDate) : 0;
        const r = CALC.calcLongServicePay(years);
        return {
          value: r.월수당 > 0 ? CALC.formatCurrency(r.월수당) : '해당없음',
          label: r.월수당 > 0 ? `근속 ${years}년 (${r.구간})` : `근속 ${years}년 (5년 미만 해당없음)`,
          details: [
            { key: '근속연수', val: `${years}년` },
            { key: '적용 구간', val: r.구간 },
            { key: '월 수당', val: r.월수당 > 0 ? CALC.formatCurrency(r.월수당) : '0원' }
          ]
        };
      }
    },
    {
      id: 'severance', category: 'career',
      icon: '🏦', title: '퇴직금 시뮬레이션',
      desc: '최근 3개월 평균임금 자동 계산',
      calc(profile, wage) {
        const years = profile.hireDate ? PROFILE.calcServiceYears(profile.hireDate) : 0;
        const avg = CALC.calcAverageWage(wage.monthlyWage, 3);
        const r = CALC.calcSeveranceFullPay(avg.monthlyAvgWage, years, profile.hireDate || null);
        const hasOt = avg.totalOtPay > 0;
        return {
          value: r.퇴직금 > 0 ? CALC.formatCurrency(r.퇴직금) : '해당없음',
          label: r.퇴직금 > 0 ? `근속 ${r.근속기간 || years + '년'} 기준 예상 퇴직금` : (r.note || '근속 1년 미만'),
          details: [
            { key: '월 통상임금', val: CALC.formatCurrency(wage.monthlyWage) },
            { key: '시간외 수당 (3개월)', val: CALC.formatCurrency(avg.totalOtPay) + (hasOt ? '' : ' (없음)') },
            { key: '월 평균임금 (×30)', val: CALC.formatCurrency(avg.monthlyAvgWage) + (hasOt ? ' ↑시간외 반영' : '') },
            { key: '근속기간', val: r.근속기간 || `${years}년` },
            { key: '기본 퇴직금', val: CALC.formatCurrency(r.기본퇴직금 || 0) },
            { key: '퇴직수당', val: r.퇴직수당 > 0 ? CALC.formatCurrency(r.퇴직수당) : '해당없음' },
            { key: '산식', val: r.산식 || '-' }
          ]
        };
      }
    },

    // ═══════════ 복지·감면 ═══════════
    {
      id: 'medicalDiscount', category: 'welfare',
      icon: '🏥', title: '진료비 감면 혜택',
      desc: '본인·배우자·가족별 감면율',
      calc(profile, wage) {
        const md = DATA.medicalDiscount;
        return {
          value: '최대 100%',
          label: '본인 선택진료비 100% 감면',
          details: [
            { key: '본인 접수비', val: `${md.self.registration}% 감면` },
            { key: '본인 보험/비보험', val: `${md.self.insurance}% 감면` },
            { key: '본인 선택진료비', val: `${md.self.selectDoctor}% 감면` },
            { key: '배우자 보험/비보험', val: `${md.spouse.insurance}% 감면` },
            { key: '가족 보험/비보험', val: `${md.family.insurance}% 감면` },
            { key: '적용병원', val: '본원·보라매·분당·치과병원' }
          ]
        };
      }
    },
    {
      id: 'welfarePoint', category: 'welfare',
      icon: '🎫', title: '내 복지포인트',
      desc: '근속연수 기반 자동 계산 (1P=1,000원)',
      calc(profile, wage) {
        const years = profile.hireDate ? PROFILE.calcServiceYears(profile.hireDate) : 0;
        const base = 700;
        const serviceBonus = Math.min(years * 10, 300);
        const total = base + serviceBonus;
        return {
          value: `${total.toLocaleString()}P`,
          label: `${CALC.formatCurrency(total * 1000)} 상당`,
          details: [
            { key: '기본', val: '700P' },
            { key: '근속 가산', val: `${serviceBonus}P (${years}년 × 10P, 최대 300P)` },
            { key: '합계', val: `${total}P = ${CALC.formatCurrency(total * 1000)}` },
            { key: '참고', val: '가족포인트·자녀학자금(1,200P) 별도' }
          ]
        };
      }
    },
    {
      id: 'dutyPay', category: 'welfare',
      icon: '🛏️', title: '일직/숙직비',
      desc: '일당 5만원 × 횟수',
      hasInput: true,
      calc(profile, wage, inputs) {
        const count = inputs.count || 1;
        const perDay = DATA.allowances.dutyAllowance;
        const total = perDay * count;
        return {
          value: CALC.formatCurrency(total),
          label: `일직/숙직 ${count}회 수당`,
          details: [
            { key: '일당', val: CALC.formatCurrency(perDay) },
            { key: '횟수', val: `${count}회` },
            { key: '합계', val: CALC.formatCurrency(total) }
          ]
        };
      },
      renderInput() {
        return `<div class="form-group" style="margin-top:12px;">
          <label>이번 달 일직/숙직 횟수</label>
          <input type="number" id="qaDutyCount" value="1" min="1" max="10" onchange="PAYROLL.recalc('dutyPay')">
        </div>`;
      },
      getInputs() {
        const el = document.getElementById('qaDutyCount');
        return { count: el ? parseInt(el.value) || 1 : 1 };
      }
    }
  ],

  expandedCard: null,

  init() {
    const container = document.getElementById('qaCardsContainer');
    if (!container) return;

    const profile = PROFILE.load();
    const wage = profile ? PROFILE.calcWage(profile) : null;

    let html = '';

    // 프로필 미저장 경고
    if (!profile) {
      html += `<div class="qa-profile-warning">
        ⚠️ 내 정보를 먼저 저장하면 자동 계산됩니다.
        <a onclick="switchToProfileTab()">내 정보 설정 →</a>
      </div>`;
    }

    // 카테고리별 렌더링
    this.categories.forEach(cat => {
      const catCards = this.cards.filter(c => c.category === cat.id);
      if (catCards.length === 0) return;

      html += `<div class="qa-category">`;
      html += `<div class="qa-category-title">${cat.icon} ${cat.label}</div>`;
      html += `<div class="qa-cards-grid">`;

      catCards.forEach(card => {
        const isExpanded = this.expandedCard === card.id;
        let result = null;
        if (profile && wage) {
          try {
            const inputs = card.getInputs ? card.getInputs() : {};
            result = card.calc(profile, wage, inputs);
          } catch (e) { result = null; }
        }

        html += `<div class="qa-card ${isExpanded ? 'expanded' : ''}" id="qa-${card.id}" onclick="PAYROLL.toggle('${card.id}')">`;
        html += `<div class="qa-card-header">`;
        html += `<span class="qa-card-icon">${card.icon}</span>`;
        html += `<div style="flex:1; min-width:0;">`;
        html += `<div class="qa-card-title">${card.title}</div>`;
        html += `<div class="qa-card-desc">${card.desc}</div>`;
        html += `</div>`;

        // 미리보기 값 (접힌 상태)
        if (!isExpanded && result && result.value) {
          html += `<div style="margin-left:auto; text-align:right; flex-shrink:0;">`;
          html += `<div style="font-size:var(--text-body-large); font-weight:700; color:var(--accent-emerald);">${result.value}</div>`;
          html += `</div>`;
        }
        html += `</div>`;

        // 확장 본문
        if (isExpanded) {
          html += `<div class="qa-card-body" onclick="event.stopPropagation()">`;
          if (!profile || !wage) {
            html += `<p style="color:var(--accent-amber);">내 정보를 먼저 저장해주세요. <a onclick="switchToProfileTab()" style="color:var(--accent-indigo); cursor:pointer; text-decoration:underline;">내 정보 설정 →</a></p>`;
          } else if (result) {
            if (card.renderInput) html += card.renderInput();
            html += `<div class="qa-card-result">`;
            html += `<div class="result-value">${result.value}</div>`;
            html += `<div class="result-label">${result.label}</div>`;
            html += `</div>`;
            if (result.details && result.details.length > 0) {
              result.details.forEach(d => {
                html += `<div class="result-row"><span class="key">${d.key}</span><span class="val">${d.val}</span></div>`;
              });
            }
          }
          html += `</div>`;
        }
        html += `</div>`;
      });

      html += `</div></div>`;
    });

    container.innerHTML = html;
  },

  toggle(cardId) {
    this.expandedCard = this.expandedCard === cardId ? null : cardId;
    this.init();
  },

  recalc(cardId) {
    this.init();
  }
};
