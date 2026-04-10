// ============================================================
// SNUH 급여명세서 파서 — 회귀 테스트 & 자동 검증
// - 브라우저 콘솔: SALARY_TEST.runAll()
// - 파싱 후 자동 검증: SALARY_TEST.validate(parsed)
// - 새 픽스처 등록: SALARY_TEST.addFixture(parsed, 'label')
// ============================================================

const SALARY_TEST = (() => {
  'use strict';

  // ══════════ 1. 검증용 픽스처 (기대값) ══════════
  // 각 픽스처는 실제 PDF 파싱 결과에서 추출한 정답
  const FIXTURES = [
    {
      id: '2512_급여',
      label: '2025-12 일반직 급여',
      sourceFile: '2512 일반직 급여.pdf',
      expected: {
        metadata: {
          payPeriod: /2025년\s*12월/,
          payslipType: '급여',
          payDate: '2025-12-17',
        },
        employeeInfo: {
          employeeNumber: '20842',
          name: '김계환',
          jobType: '보건직',
          department: '핵의학과',
        },
        salaryItems: {
          '기준기본급': 2907500,
          '근속가산기본급': 214080,
          '능력급': 1075700,
          '상여금': 157400,
          '진료기여수당': 934970,
          '급식보조비': 150000,
          '교통보조비': 150000,
          '경력인정수당': 301700,
          '업무보조비': 80000,
          '무급가족돌봄휴가': -214630,
        },
        deductionItems: {
          '소득세': 335690,
          '주민세': 33560,
          '국민건강': 236800,
          '장기요양': 30660,
          '국민연금': 60000,
          '병원발전기금': 67110,
          '소득세(정산)': 433570,
          '사학연금부담금': 619220,
          '장기요양(정산)': 342940,
        },
        summary: {
          grossPay: 5756720,
          totalDeduction: 2219550,
          netPay: 3537170,
        },
      },
    },
    {
      id: '2512_소급',
      label: '2025-12 일반직 소급분',
      sourceFile: '2512 일반직 소급.pdf',
      expected: {
        metadata: {
          payPeriod: /2025년\s*12월/,
          payslipType: '소급분',
          payDate: '2025-12-30',
        },
        employeeInfo: {
          employeeNumber: '20842',
          name: '김계환',
        },
        salaryItems: {
          '기준기본급': 1774000,
          '근속가산기본급': 124280,
          '경력인정수당': 316610,
          '시간외수당': 12860,
          '무급가족돌봄휴가': -44970,
        },
        deductionItems: {
          '소득세': 344130,
          '주민세': 34410,
          '사학연금부담금': 28360,
        },
        summary: {
          grossPay: 2182780,
          totalDeduction: 406900,
          netPay: 1775880,
        },
      },
    },
    {
      id: '2601_급여',
      label: '2026-01 일반직 급여',
      sourceFile: '2601 일반직 급여.pdf',
      expected: {
        metadata: {
          payPeriod: /2026년\s*0?1월/,
          payslipType: '급여',
          payDate: '2026-01-17',
        },
        employeeInfo: {
          employeeNumber: '20842',
          name: '김계환',
        },
        salaryItems: {
          '기준기본급': 3085900,
          '근속가산기본급': 226570,
          '능력급': 1075700,
          '상여금': 157400,
          '급식보조비': 150000,
          '교통보조비': 150000,
          '경력인정수당': 301700,
          '가족수당': 35000,
          '업무보조비': 80000,
          '무급가족돌봄휴가': -222130,
          '명절수당': 40000,
        },
        deductionItems: {
          '소득세': 474260,
          '주민세': 47420,
          '국민건강': 236800,
          '장기요양': 30660,
          '국민연금': 60000,
          '병원발전기금': 69960,
          '주차료': 24000,
          '사학연금부담금': 619220,
          '장기요양(정산)': 343160,
          '식대공제': 51000,
        },
        summary: {
          grossPay: 5080140,
          totalDeduction: 2390050,
          netPay: 2690090,
        },
      },
    },
    {
      id: '2601_연차수당',
      label: '2026-01 일반직 연차수당',
      sourceFile: '2601 일반직연차수당.pdf',
      expected: {
        metadata: {
          payPeriod: /2026년\s*0?1월/,
          payslipType: '연차수당',
          payDate: '2026-01-10',
        },
        employeeInfo: {
          employeeNumber: '20842',
          name: '김계환',
        },
        salaryItems: {
          '연차수당': 3124740,
        },
        deductionItems: {
          '소득세': 298850,
          '주민세': 29880,
        },
        summary: {
          grossPay: 3124740,
          totalDeduction: 328730,
          netPay: 2796010,
        },
      },
    },
  ];

  // ══════════ 2. 범용 검증 엔진 (픽스처 매칭 없이도 동작) ══════════

  /**
   * 파싱 결과의 구조적 무결성 검증
   * @param {Object} parsed - SALARY_PARSER.parseFile 결과
   * @returns {{ ok: boolean, errors: string[], warnings: string[] }}
   */
  function validate(parsed) {
    const errors = [];
    const warnings = [];

    // ── 필수 구조 ──
    if (!parsed) { return { ok: false, errors: ['parsed가 null/undefined'], warnings }; }
    if (!parsed.metadata) errors.push('metadata 누락');
    if (!parsed.employeeInfo) errors.push('employeeInfo 누락');
    if (!parsed.salaryItems) errors.push('salaryItems 누락');
    if (!parsed.deductionItems) errors.push('deductionItems 누락');
    if (!parsed.summary) errors.push('summary 누락');
    if (errors.length > 0) return { ok: false, errors, warnings };

    // ── 기간 ──
    if (!parsed.metadata.payPeriod) warnings.push('payPeriod 비어있음');
    if (!parsed.metadata.payDate) warnings.push('payDate 비어있음');

    // ── 직원 정보 ──
    const info = parsed.employeeInfo;
    if (!info.name) warnings.push('이름 미추출');
    if (!info.employeeNumber) warnings.push('개인번호 미추출');

    // ── 항목 수 ──
    if (parsed.salaryItems.length === 0) errors.push('지급항목 0건 — 파싱 실패 의심');
    if (parsed.deductionItems.length === 0) warnings.push('공제항목 0건');

    // ── 합계 검증 ──
    const calcGross = parsed.salaryItems.reduce((s, i) => s + i.amount, 0);
    const calcDed = parsed.deductionItems.reduce((s, i) => s + i.amount, 0);
    const { grossPay, totalDeduction, netPay } = parsed.summary;

    if (grossPay > 0 && Math.abs(calcGross - grossPay) > 1) {
      errors.push(`지급합계 불일치: 항목합=${calcGross}, 총액=${grossPay}, 차이=${calcGross - grossPay}`);
    }
    if (totalDeduction > 0 && Math.abs(calcDed - totalDeduction) > 1) {
      errors.push(`공제합계 불일치: 항목합=${calcDed}, 총액=${totalDeduction}, 차이=${calcDed - totalDeduction}`);
    }
    if (grossPay > 0 && totalDeduction > 0 && Math.abs(netPay - (grossPay - totalDeduction)) > 1) {
      errors.push(`실지급액 불일치: ${netPay} ≠ ${grossPay} - ${totalDeduction}`);
    }

    // ── 음수 항목 체크 (무급가족돌봄휴가 등) ──
    const negItems = parsed.salaryItems.filter(i => i.amount < 0);
    negItems.forEach(i => {
      if (!/무급|공제/.test(i.name)) {
        warnings.push(`예상치 못한 음수 지급항목: ${i.name} = ${i.amount}`);
      }
    });

    // ── 신뢰도 ──
    if (parsed._parseInfo) {
      if (parsed._parseInfo.confidence < 70) {
        warnings.push(`파싱 신뢰도 낮음: ${parsed._parseInfo.confidence}/100`);
      }
      if (parsed._parseInfo.method === 'textFallback') {
        warnings.push('텍스트 폴백 모드 사용됨 — 정확도 저하 가능');
      }
    }

    // ── 유형 ──
    if (!parsed.metadata.payslipType) {
      warnings.push('payslipType 미감지');
    }

    return { ok: errors.length === 0, errors, warnings };
  }

  // ══════════ 3. 픽스처 기반 회귀 테스트 ══════════

  /**
   * 파싱 결과를 특정 픽스처와 비교
   * @returns {{ pass: boolean, failures: string[] }}
   */
  function compareWithFixture(parsed, fixture) {
    const failures = [];
    const exp = fixture.expected;

    // metadata
    if (exp.metadata) {
      if (exp.metadata.payPeriod instanceof RegExp) {
        if (!exp.metadata.payPeriod.test(parsed.metadata?.payPeriod || ''))
          failures.push(`payPeriod: "${parsed.metadata?.payPeriod}" ≠ ${exp.metadata.payPeriod}`);
      }
      if (exp.metadata.payslipType && parsed.metadata?.payslipType !== exp.metadata.payslipType)
        failures.push(`payslipType: "${parsed.metadata?.payslipType}" ≠ "${exp.metadata.payslipType}"`);
      if (exp.metadata.payDate && parsed.metadata?.payDate !== exp.metadata.payDate)
        failures.push(`payDate: "${parsed.metadata?.payDate}" ≠ "${exp.metadata.payDate}"`);
    }

    // employeeInfo
    if (exp.employeeInfo) {
      for (const [key, val] of Object.entries(exp.employeeInfo)) {
        if (parsed.employeeInfo?.[key] !== val)
          failures.push(`employeeInfo.${key}: "${parsed.employeeInfo?.[key]}" ≠ "${val}"`);
      }
    }

    // salaryItems
    if (exp.salaryItems) {
      const map = {};
      (parsed.salaryItems || []).forEach(i => { map[i.name] = i.amount; });
      for (const [name, amount] of Object.entries(exp.salaryItems)) {
        if (map[name] === undefined) {
          failures.push(`지급 누락: "${name}" (기대 ${amount.toLocaleString()})`);
        } else if (Math.abs(map[name] - amount) > 1) {
          failures.push(`지급 불일치: "${name}" = ${map[name].toLocaleString()} (기대 ${amount.toLocaleString()})`);
        }
      }
    }

    // deductionItems
    if (exp.deductionItems) {
      const map = {};
      (parsed.deductionItems || []).forEach(i => { map[i.name] = i.amount; });
      for (const [name, amount] of Object.entries(exp.deductionItems)) {
        if (map[name] === undefined) {
          failures.push(`공제 누락: "${name}" (기대 ${amount.toLocaleString()})`);
        } else if (Math.abs(map[name] - amount) > 1) {
          failures.push(`공제 불일치: "${name}" = ${map[name].toLocaleString()} (기대 ${amount.toLocaleString()})`);
        }
      }
    }

    // summary
    if (exp.summary) {
      for (const [key, val] of Object.entries(exp.summary)) {
        const actual = parsed.summary?.[key] || 0;
        if (Math.abs(actual - val) > 1) {
          failures.push(`summary.${key}: ${actual.toLocaleString()} ≠ ${val.toLocaleString()}`);
        }
      }
    }

    return { pass: failures.length === 0, failures };
  }

  /**
   * 파싱 결과에 매칭되는 픽스처를 찾아 비교
   */
  function matchAndCompare(parsed) {
    if (!parsed?.sourceFile) return null;
    const fixture = FIXTURES.find(f => parsed.sourceFile.includes(f.sourceFile));
    if (!fixture) return null;
    const result = compareWithFixture(parsed, fixture);
    return { fixture, ...result };
  }

  // ══════════ 4. 통합 검증 (파싱 직후 호출) ══════════

  /**
   * 파싱 직후 자동 호출 — 구조 검증 + 픽스처 비교
   * 콘솔에 결과 출력, errors 있으면 경고
   */
  function postParseValidation(parsed) {
    const structResult = validate(parsed);
    const fixtureResult = matchAndCompare(parsed);

    const prefix = '[SalaryTest]';

    // 구조 검증
    if (structResult.ok) {
      console.log(`${prefix} ✅ 구조 검증 통과 (항목: 지급 ${parsed.salaryItems?.length || 0}, 공제 ${parsed.deductionItems?.length || 0})`);
    } else {
      console.error(`${prefix} ❌ 구조 검증 실패:`, structResult.errors);
    }
    if (structResult.warnings.length > 0) {
      console.warn(`${prefix} ⚠️ 경고:`, structResult.warnings);
    }

    // 픽스처 비교
    if (fixtureResult) {
      if (fixtureResult.pass) {
        console.log(`${prefix} ✅ 픽스처 "${fixtureResult.fixture.label}" 회귀 테스트 통과`);
      } else {
        console.error(`${prefix} ❌ 픽스처 "${fixtureResult.fixture.label}" 회귀 실패:`, fixtureResult.failures);
      }
    }

    return { structResult, fixtureResult };
  }

  // ══════════ 5. 프로필 반영 검증 ══════════

  function validateProfileApply(parsed, stableRes) {
    const warnings = [];
    if (!stableRes || !stableRes.changed) return { ok: true, warnings };

    const applied = stableRes.applied || [];

    // 가족수당이 있는데 역산 실패한 경우
    const familyFail = applied.find(a => a.note && a.note.includes('자동추정 실패'));
    if (familyFail) {
      warnings.push(`가족수당 역산 실패: ${familyFail.amount}원 — 내 정보에서 직접 입력 필요`);
    }

    // 프로필에 반영된 항목 검증
    if (typeof PROFILE !== 'undefined') {
      const profile = PROFILE.load();
      if (profile) {
        const map = {};
        parsed.salaryItems.forEach(i => { map[i.name] = i.amount; });

        // PAYSLIP_TO_PROFILE_MAP 항목들 확인
        const checks = [
          ['조정급', 'adjustPay'],
          ['승급호봉분', 'upgradeAdjustPay'],
          ['직책수당', 'positionPay'],
          ['업무보조비', 'workSupportPay'],
          ['별정수당(직무)', 'specialPay'],
        ];
        checks.forEach(([itemName, profileKey]) => {
          if (map[itemName] && map[itemName] > 0) {
            const profileVal = parseInt(profile[profileKey]) || 0;
            if (profileVal !== map[itemName]) {
              warnings.push(`프로필 반영 불일치: ${itemName} = ${map[itemName]} vs profile.${profileKey} = ${profileVal}`);
            }
          }
        });
      }
    }

    return { ok: warnings.length === 0, warnings };
  }

  // ══════════ 6. 저장/조회 검증 ══════════

  function validateStorage(parsed, ym) {
    const errors = [];
    if (!ym) { errors.push('ym 없음 — 기간 파싱 실패'); return { ok: false, errors }; }

    const loaded = SALARY_PARSER.loadMonthlyData(ym.year, ym.month, ym.type);
    if (!loaded) {
      errors.push(`저장 실패: payslip_${ym.year}_${String(ym.month).padStart(2, '0')}${ym.type !== '급여' ? '_' + ym.type : ''}`);
      return { ok: false, errors };
    }

    // 저장 후 로드한 데이터가 원본과 같은지 핵심값 비교
    if (loaded.summary?.grossPay !== parsed.summary?.grossPay) {
      errors.push(`저장된 grossPay 불일치: ${loaded.summary?.grossPay} ≠ ${parsed.summary?.grossPay}`);
    }
    if ((loaded.salaryItems?.length || 0) !== (parsed.salaryItems?.length || 0)) {
      errors.push(`저장된 지급항목 수 불일치: ${loaded.salaryItems?.length} ≠ ${parsed.salaryItems?.length}`);
    }

    // 같은 월의 다른 유형이 덮어쓰여지지 않았는지 확인
    const allMonths = SALARY_PARSER.listSavedMonths();
    const sameMonth = allMonths.filter(m => m.year === ym.year && m.month === ym.month);
    if (sameMonth.length > 1) {
      console.log(`[SalaryTest] ℹ️ ${ym.year}년 ${ym.month}월에 ${sameMonth.length}개 명세서 저장됨: ${sameMonth.map(m => m.type).join(', ')}`);
    }

    return { ok: errors.length === 0, errors };
  }

  // ══════════ 7. 전체 통합 테스트 (콘솔용) ══════════

  /**
   * 브라우저 콘솔에서 SALARY_TEST.runAll() 호출
   * - 저장된 모든 명세서를 로드하여 검증
   * - 픽스처 매칭 가능한 것은 회귀 테스트도 실행
   */
  function runAll() {
    console.group('🧪 급여명세서 파서 전체 테스트');
    const months = SALARY_PARSER.listSavedMonths();

    if (months.length === 0) {
      console.warn('저장된 명세서 없음 — PDF를 업로드하세요.');
      console.groupEnd();
      return;
    }

    let pass = 0, fail = 0, warn = 0;

    months.forEach(m => {
      const data = SALARY_PARSER.loadMonthlyData(m.year, m.month, m.type);
      if (!data) { console.warn(`${m.key}: 로드 실패`); fail++; return; }

      const label = `${m.year}-${String(m.month).padStart(2, '0')} ${m.type || '급여'}`;
      console.group(`📋 ${label}`);

      // 구조 검증
      const sv = validate(data);
      if (!sv.ok) { console.error('구조 오류:', sv.errors); fail++; }
      else { console.log('✅ 구조 검증 통과'); pass++; }
      if (sv.warnings.length) { console.warn('경고:', sv.warnings); warn += sv.warnings.length; }

      // 픽스처 비교
      const fv = matchAndCompare(data);
      if (fv) {
        if (fv.pass) { console.log(`✅ 픽스처 "${fv.fixture.label}" 통과`); pass++; }
        else { console.error(`❌ 픽스처 "${fv.fixture.label}" 실패:`, fv.failures); fail++; }
      }

      console.groupEnd();
    });

    console.log(`\n📊 결과: ✅ ${pass} 통과, ❌ ${fail} 실패, ⚠️ ${warn} 경고`);
    console.groupEnd();
    return { pass, fail, warn };
  }

  // ══════════ 8. 새 픽스처 자동 생성 ══════════

  /**
   * 파싱 결과에서 픽스처 코드 자동 생성 (콘솔에 출력)
   * SALARY_TEST.addFixture(parsed, 'label')
   */
  function addFixture(parsed, label) {
    const salMap = {};
    (parsed.salaryItems || []).forEach(i => { salMap[i.name] = i.amount; });
    const dedMap = {};
    (parsed.deductionItems || []).forEach(i => { dedMap[i.name] = i.amount; });

    const period = parsed.metadata?.payPeriod || '';
    const pm = period.match(/(\d{4})년\s*(\d{1,2})월/);
    const yy = pm ? pm[1].slice(2) : 'XX';
    const mm = pm ? pm[2].padStart(2, '0') : 'XX';
    const type = parsed.metadata?.payslipType || '급여';

    const fixture = {
      id: `${yy}${mm}_${type}`,
      label: label || `${pm ? pm[1] : '????'}-${mm} ${type}`,
      sourceFile: parsed.sourceFile || '',
      expected: {
        metadata: {
          payPeriod: `/${pm ? pm[1] + '년\\\\s*' + parseInt(pm[2]) + '월' : '.*'}/`,
          payslipType: type,
          payDate: parsed.metadata?.payDate || '',
        },
        employeeInfo: {
          employeeNumber: parsed.employeeInfo?.employeeNumber || '',
          name: parsed.employeeInfo?.name || '',
        },
        salaryItems: salMap,
        deductionItems: dedMap,
        summary: parsed.summary || {},
      },
    };

    console.log('// ── 새 픽스처 (FIXTURES 배열에 추가) ──');
    console.log(JSON.stringify(fixture, null, 2));
    return fixture;
  }

  // ══════════ 9. 데이터 흐름 E2E 검증 ══════════

  /**
   * 급여 예상 탭과의 데이터 연동 검증
   */
  function validatePayrollIntegration() {
    const warnings = [];

    if (typeof CALC === 'undefined') {
      warnings.push('CALC 미로드');
      return { ok: false, warnings };
    }
    if (typeof PROFILE === 'undefined') {
      warnings.push('PROFILE 미로드');
      return { ok: false, warnings };
    }

    const profile = PROFILE.load();
    if (!profile || !profile.jobType) {
      warnings.push('프로필 미설정 — 급여 예상 연동 검증 불가');
      return { ok: true, warnings };
    }

    // 프로필 기반 통상임금 계산
    const serviceYears = CALC.calcServiceYears ? CALC.calcServiceYears(profile.hireDate) : 0;
    const wage = CALC.calcOrdinaryWage(
      profile.jobType, profile.grade, parseInt(profile.year) || 1,
      {
        hasMilitary: profile.hasMilitary,
        hasSeniority: profile.hasSeniority,
        seniorityYears: profile.hasSeniority ? serviceYears : 0,
        longServiceYears: serviceYears,
        adjustPay: parseInt(profile.adjustPay) || 0,
        upgradeAdjustPay: parseInt(profile.upgradeAdjustPay) || 0,
        specialPayAmount: parseInt(profile.specialPay) || 0,
        positionPay: parseInt(profile.positionPay) || 0,
        workSupportPay: parseInt(profile.workSupportPay) || 0,
      }
    );

    if (!wage) {
      warnings.push('통상임금 계산 실패');
      return { ok: false, warnings };
    }

    console.log('[SalaryTest] 통상임금 계산 성공:', wage.monthlyWage.toLocaleString(), '원');

    // 최근 명세서와 비교
    const months = SALARY_PARSER.listSavedMonths();
    const regularMonths = months.filter(m => m.type === '급여');
    if (regularMonths.length > 0) {
      const latest = regularMonths[0];
      const data = SALARY_PARSER.loadMonthlyData(latest.year, latest.month, latest.type);
      if (data) {
        const ordinaryNames = new Set(Object.keys(wage.breakdown));
        let payslipOrdinarySum = 0;
        (data.salaryItems || []).forEach(item => {
          if (ordinaryNames.has(item.name)) payslipOrdinarySum += item.amount;
        });
        const diff = payslipOrdinarySum - wage.monthlyWage;
        if (Math.abs(diff) > 1) {
          warnings.push(`통상임금 차이: 명세서 ${payslipOrdinarySum.toLocaleString()} vs 계산 ${wage.monthlyWage.toLocaleString()} (차이 ${diff.toLocaleString()})`);
        } else {
          console.log('[SalaryTest] ✅ 통상임금 일치');
        }
      }
    }

    return { ok: warnings.length === 0, warnings };
  }

  // ══════════ Public API ══════════
  return {
    FIXTURES,
    validate,
    compareWithFixture,
    matchAndCompare,
    postParseValidation,
    validateProfileApply,
    validateStorage,
    validatePayrollIntegration,
    runAll,
    addFixture,
  };
})();
