// ============================================
// 병원 HR 종합 시스템 - 급여 Q&A 카드 모듈
// ============================================

const PAYROLL = {
  cards: [
    {
      id: 'overtime1h',
      icon: '⏰',
      title: '1시간 시간외 하면 얼마?',
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
      id: 'unpaidLeave',
      icon: '📅',
      title: '무급휴가 1일 쓰면 얼마 공제?',
      desc: '통상임금 일액 (시급 × 8h)',
      calc(profile, wage) {
        const daily = wage.hourlyRate * 8;
        return {
          value: CALC.formatCurrency(daily),
          label: '무급휴가 1일 공제액',
          details: [
            { key: '시급', val: CALC.formatCurrency(wage.hourlyRate) },
            { key: '일 근무시간', val: '8시간' },
            { key: '계산', val: `${CALC.formatNumber(wage.hourlyRate)} × 8h` }
          ]
        };
      }
    },
    {
      id: 'unusedLeave',
      icon: '💰',
      title: '미사용 연차 보상금은?',
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
      id: 'promotionDiff',
      icon: '📈',
      title: '승진하면 얼마나 올라?',
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
      id: 'promotionDate',
      icon: '📊',
      title: '몇 년도에 승진?',
      desc: '자동승격 예상일 타임라인',
      calc(profile, wage) {
        if (!profile.hireDate) return { value: '입사일 필요', label: '프로필에 입사일을 입력하세요', details: [] };
        const parsed = PROFILE.parseDate(profile.hireDate);
        if (!parsed) return { value: '입사일 오류', label: '', details: [] };
        const r = CALC.calcPromotionDate(profile.jobType, profile.grade, new Date(parsed));
        if (r.message) return { value: '해당없음', label: r.message, details: [] };
        const isPast = r.남은일수 === 0;
        return {
          value: isPast ? '✅ 이미 도래' : `D-${r.남은일수}`,
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
      id: 'familyAllowance',
      icon: '👨‍👩‍👧',
      title: '가족수당 계산',
      desc: '배우자·자녀·기타 가족 기준',
      calc(profile, wage) {
        const r = CALC.calcFamilyAllowance(
          profile.hasSpouse,
          parseInt(profile.numChildren) || 0,
          parseInt(profile.otherFamily) || 0
        );
        const details = Object.entries(r.breakdown).map(([key, val]) => ({
          key, val: CALC.formatCurrency(val)
        }));
        return {
          value: CALC.formatCurrency(r.월수당),
          label: '월 가족수당',
          details: details.length > 0 ? details : [{ key: '해당', val: '없음 (가족정보 미입력)' }]
        };
      }
    },
    {
      id: 'longService',
      icon: '🏅',
      title: '장기근속수당',
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
      id: 'severance',
      icon: '🏦',
      title: '퇴직금 시뮬레이션',
      desc: '2015.6.30 이전 입사자 기준',
      calc(profile, wage) {
        const years = profile.hireDate ? PROFILE.calcServiceYears(profile.hireDate) : 0;
        const r = CALC.calcSeverancePay(wage.monthlyWage, years);
        return {
          value: r.퇴직금 > 0 ? CALC.formatCurrency(r.퇴직금) : '해당없음',
          label: r.퇴직금 > 0 ? `근속 ${years}년 기준 예상 퇴직수당` : (r.note || '근속 1년 미만'),
          details: [
            { key: '월 평균임금', val: CALC.formatCurrency(wage.monthlyWage) },
            { key: '근속년수', val: `${years}년` },
            { key: '적용 계수', val: r.적용계수 || '-' },
            { key: '산식', val: r.산식 || '-' }
          ]
        };
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

    html += '<div class="qa-cards-grid">';
    this.cards.forEach(card => {
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
      html += `<div>`;
      html += `<div class="qa-card-title">${card.title}</div>`;
      html += `<div class="qa-card-desc">${card.desc}</div>`;
      html += `</div>`;

      // 미리보기 값 (접힌 상태에서)
      if (!isExpanded && result && result.value) {
        html += `<div style="margin-left:auto; text-align:right;">`;
        html += `<div style="font-size:15px; font-weight:700; color:var(--accent-emerald);">${result.value}</div>`;
        html += `</div>`;
      }
      html += `</div>`;

      // 확장 본문
      if (isExpanded) {
        html += `<div class="qa-card-body" onclick="event.stopPropagation()">`;
        if (!profile || !wage) {
          html += `<p style="color:var(--accent-amber);">내 정보를 먼저 저장해주세요. <a onclick="switchToProfileTab()" style="color:var(--accent-indigo); cursor:pointer; text-decoration:underline;">내 정보 설정 →</a></p>`;
        } else if (result) {
          // 입력 필드 (있는 경우)
          if (card.renderInput) {
            html += card.renderInput();
          }
          // 결과
          html += `<div class="qa-card-result">`;
          html += `<div class="result-value">${result.value}</div>`;
          html += `<div class="result-label">${result.label}</div>`;
          html += `</div>`;
          // 상세 내역
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
    html += '</div>';

    container.innerHTML = html;
  },

  toggle(cardId) {
    if (this.expandedCard === cardId) {
      this.expandedCard = null;
    } else {
      this.expandedCard = cardId;
    }
    this.init();
  },

  recalc(cardId) {
    // 입력 변경 시 해당 카드만 재계산 (전체 리렌더)
    this.init();
  }
};
