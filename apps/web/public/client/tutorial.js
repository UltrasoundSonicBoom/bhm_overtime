// Phase 6 Task 4-2: tutorial inline script extracted to public/client.
// 원본: root tutorial.html (인라인 <script>) — 동작 변경 없음.
// NOTE: innerHTML 사용은 원본 그대로 (전부 정적 template literal — 사용자 입력 없음).
(function(){

    // ── 테마 동기화 (index.html과 맞춤) ──
    (function () {
      var saved = localStorage.getItem('theme');
      if (saved === 'linear') {
        document.documentElement.removeAttribute('data-theme');
      }
    })();

    // ── 유틸 ──
    function _now() {
      var d = new Date();
      return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate(), dow: ['일','월','화','수','목','금','토'][d.getDay()] };
    }

    function _wfProg(label, used, total, color) {
      var pct = total > 0 ? Math.round(used / total * 100) : 0;
      return '<div class="wf-progress">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;">'
        + '<span style="font-weight:600;font-size:var(--text-body-normal);color:var(--text-primary);">' + label + '</span>'
        + '<span style="font-weight:700;font-size:var(--text-label-small);color:' + color + ';">' + (total - used) + '일 남음</span></div>'
        + '<div class="wf-progress-bar"><div style="height:100%;width:' + pct + '%;background:' + color + ';border-radius:3px;"></div></div>'
        + '<div style="font-size:var(--text-label-small);color:var(--text-muted);">' + used + '/' + total + '일 사용</div></div>';
    }

    function _wfRow(bg, icon, label, sub, value) {
      var valColor = value.charAt(0) === '-' ? 'var(--accent-rose)' : 'var(--accent-indigo)';
      return '<div class="wf-row">'
        + '<div class="wf-icon" style="background:' + bg + ';">' + icon + '</div>'
        + '<div style="flex:1;min-width:0;"><div style="font-weight:600;font-size:var(--text-body-normal);color:var(--text-primary);">' + label + '</div>'
        + '<div style="font-size:var(--text-label-small);color:var(--text-muted);">' + sub + '</div></div>'
        + '<div style="font-weight:700;font-size:var(--text-body-normal);color:' + valColor + ';white-space:nowrap;">' + value + '</div></div>';
    }

    // ── 스텝 정의 ──
    var STEPS = [
      // 0: 시작
      {
        render: function () {
          return '<div style="text-align:center; padding:24px 0;">'
            + '<img src="/snuhmatecircle.png" alt="" style="width:80px;height:80px;border-radius:50%;border:2px solid var(--border-active);margin-bottom:16px;">'
            + '<div class="tut-step-title" style="text-align:center;">SNUH Mate 사용법</div>'
            + '<p style="font-size:var(--text-body-large);color:var(--text-secondary);line-height:1.8;">'
            + '화면 예시를 보면서<br>주요 기능을 안내합니다.<br><br>'
            + '<span style="color:var(--accent-indigo);font-weight:600;">실제 데이터는 전혀 건드리지 않아요!</span><br><br>'
            + '<span style="font-size:var(--text-body-normal);color:var(--text-muted);">총 8단계 &middot; 약 1분 소요</span>'
            + '</p></div>';
        }
      },

      // 1: 개인정보
      {
        title: '👤 Step 1 &middot; 개인정보 등록',
        desc: '하단 <span class="hl">👤 info</span> 탭에서 개인정보를 등록하세요.',
        render: function () {
          return '<div class="wf-card"><div class="wf-card-title">👤 내 정보 (예시)</div>'
            + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">'
            + '<div class="wf-field"><span class="wf-label">직종</span><span style="font-weight:600;">간호직</span></div>'
            + '<div class="wf-field"><span class="wf-label">호봉</span><span style="font-weight:600;">3년차</span></div>'
            + '<div class="wf-field"><span class="wf-label">입사일</span><span style="font-weight:600;">2023-03-01</span></div>'
            + '<div class="wf-field"><span class="wf-label">시급</span><span style="font-weight:600;color:var(--accent-indigo);">32,424원</span></div>'
            + '</div>'
            + '<p style="margin-top:10px;font-size:var(--text-label-small);color:var(--text-muted);">직종&middot;호봉&middot;입사일을 저장하면 시급과 연차가 자동 계산됩니다.</p>'
            + '<p style="margin-top:6px;font-size:var(--text-label-small);color:var(--text-muted);">&#x1f4a1; 급여명세서 PDF를 올리면 자동 입력도 가능!</p>'
            + '</div>';
        }
      },

      // 2: 휴가 캘린더
      {
        title: '&#x1f4c5; Step 2 &middot; 휴가 관리',
        desc: '하단 <span class="hl">&#x1f4c5; 휴가</span> 탭에서 휴가를 기록하세요.',
        render: function () {
          var n = _now();
          var dows = '<div style="display:grid;grid-template-columns:repeat(7,1fr);text-align:center;font-size:var(--text-label-small);color:var(--text-muted);margin-bottom:4px;">'
            + '<span style="color:var(--accent-rose);">일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span style="color:var(--accent-blue);">토</span></div>';
          var firstDow = new Date(n.y, n.m - 1, 1).getDay();
          var lastDay = new Date(n.y, n.m, 0).getDate();
          var dotDays = { 3: 'var(--accent-emerald)', 10: 'var(--accent-emerald)', 11: 'var(--accent-emerald)', 17: 'var(--accent-rose)' };
          var days = '<div style="display:grid;grid-template-columns:repeat(7,1fr);text-align:center;gap:1px;">';
          for (var i = 0; i < firstDow; i++) days += '<div style="padding:6px;"></div>';
          for (var dd = 1; dd <= Math.min(lastDay, 28); dd++) {
            var isToday = dd === n.d;
            var dot = dotDays[dd] || '';
            var bg = isToday ? 'background:var(--accent-indigo);color:#fff;border-radius:50%;' : '';
            days += '<div style="padding:5px 0;font-size:var(--text-label-small);font-weight:' + (isToday ? '700' : '500') + ';' + bg + 'position:relative;">'
              + dd + (dot ? '<div style="position:absolute;bottom:1px;left:50%;transform:translateX(-50%);width:4px;height:4px;border-radius:50%;background:' + dot + ';"></div>' : '')
              + '</div>';
          }
          days += '</div>';
          return '<div class="wf-card"><div class="wf-card-title">' + n.m + '월 휴가 캘린더 (예시)</div>' + dows + days
            + '<div style="display:flex;gap:12px;margin-top:8px;font-size:var(--text-label-small);color:var(--text-muted);">'
            + '<span><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--accent-emerald);margin-right:3px;"></span>연차</span>'
            + '<span><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--accent-rose);margin-right:3px;"></span>병가</span></div></div>'
            + '<p style="font-size:var(--text-body-normal);color:var(--text-secondary);line-height:1.7;margin-top:8px;">'
            + '&#x1f4c6; <strong>날짜를 탭</strong> &rarr; 유형 선택 &rarr; 저장<br>'
            + '&#x270f;&#xfe0f; 이미 기록된 날짜를 탭 &rarr; <strong>수정/삭제</strong></p>';
        }
      },

      // 3: 휴가 현황
      {
        title: '&#x1f3d6;&#xfe0f; Step 3 &middot; 휴가 현황',
        desc: '캘린더 아래에서 <span class="hl">유형별 잔여 휴가</span>를 확인하세요.',
        render: function () {
          return '<div class="wf-card"><div class="wf-card-title">2026년 휴가 현황 (예시)</div>'
            + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">'
            + '<div style="padding:10px;background:var(--bg-glass);border-radius:var(--radius-md);">' + _wfProg('연차', 3, 24, 'var(--accent-emerald)') + '</div>'
            + '<div style="padding:10px;background:var(--bg-glass);border-radius:var(--radius-md);">' + _wfProg('검진휴가', 0, 1, 'var(--accent-blue)') + '</div>'
            + '<div style="padding:10px;background:var(--bg-glass);border-radius:var(--radius-md);">' + _wfProg('교육연수', 1, 3, 'var(--accent-amber)') + '</div>'
            + '<div style="padding:10px;background:var(--bg-glass);border-radius:var(--radius-md);">' + _wfProg('병원필수교육', 0, 3, 'var(--accent-violet)') + '</div>'
            + '</div></div>'
            + '<p style="font-size:var(--text-label-small);color:var(--text-muted);margin-top:6px;">&#x1f4a1; 입사일 기반으로 연차가 자동 계산됩니다.</p>';
        }
      },

      // 4: 시간외
      {
        title: '&#x23f0; Step 4 &middot; 시간외&middot;온콜 기록',
        desc: '하단 <span class="hl">&#x23f0; 시간외</span> 탭에서 기록하세요. 사용법은 휴가와 동일!',
        render: function () {
          return '<div class="wf-card"><div class="wf-card-title">이번 달 시간외 기록 (예시)</div>'
            + _wfRow('rgba(99,102,241,0.15)', '&#x23f0;', '4/2 (수) 시간외', '18:00 ~ 21:00 &middot; 3시간', '+48,636')
            + _wfRow('rgba(245,158,11,0.15)', '&#x1f319;', '4/7 (월) 당직', '17:30 ~ 08:30 &middot; 15시간', '+256,000')
            + _wfRow('rgba(244,63,94,0.15)', '&#x1f4de;', '4/14 (월) 온콜', '22:00 ~ 00:00 &middot; 2시간', '+89,600')
            + _wfRow('rgba(99,102,241,0.15)', '&#x23f0;', '4/21 (월) 시간외', '18:00 ~ 20:00 &middot; 2시간', '+32,424')
            + '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;margin-top:4px;border-top:1.5px solid var(--border-glass);">'
            + '<span style="font-weight:600;font-size:var(--text-body-normal);color:var(--text-muted);">4월 예상 수당</span>'
            + '<span style="font-weight:800;font-size:var(--text-title-large);color:var(--accent-indigo);">426,660원</span></div></div>'
            + '<p style="font-size:var(--text-body-normal);color:var(--text-secondary);line-height:1.7;margin-top:6px;">'
            + '&#x1f4c6; 날짜 탭 &rarr; <strong>유형&middot;시간</strong> 입력 &rarr; 저장<br>'
            + '수당이 자동 계산됩니다 (참고용)</p>';
        }
      },

      // 5: 급여명세서
      {
        title: '&#x1f4b0; Step 5 &middot; 급여명세서 관리',
        desc: '하단 <span class="hl">&#x1f4b0; 급여</span> 탭 &rarr; <strong>급여명세서 관리</strong>',
        render: function () {
          return '<div class="wf-card"><div class="wf-card-title">2026년 3월 급여 (예시)</div>'
            + '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:12px;">'
            + '<div style="font-size:var(--text-amount-large);font-weight:800;color:var(--text-primary);">3,842,160원</div>'
            + '<div style="font-size:var(--text-label-small);color:var(--accent-emerald);font-weight:700;">+124,000 vs 2월</div></div>'
            + '<div style="display:flex;height:8px;border-radius:4px;overflow:hidden;gap:2px;margin-bottom:8px;">'
            + '<div style="flex:5.5;background:var(--accent-blue);border-radius:3px;"></div>'
            + '<div style="flex:2;background:var(--accent-emerald);border-radius:3px;"></div>'
            + '<div style="flex:1.5;background:var(--accent-amber);border-radius:3px;"></div>'
            + '<div style="flex:1;background:var(--accent-rose);border-radius:3px;"></div></div>'
            + '<div style="display:flex;gap:12px;font-size:var(--text-label-small);color:var(--text-muted);flex-wrap:wrap;">'
            + '<span><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--accent-blue);margin-right:3px;"></span>기본급</span>'
            + '<span><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--accent-emerald);margin-right:3px;"></span>수당</span>'
            + '<span><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--accent-amber);margin-right:3px;"></span>시간외</span>'
            + '<span><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--accent-rose);margin-right:3px;"></span>공제</span></div>'
            + '<div style="margin-top:12px;border-top:1px solid var(--border-glass);padding-top:10px;">'
            + '<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:var(--text-body-normal);"><span style="color:var(--text-muted);">본봉</span><span style="font-weight:600;">2,850,000</span></div>'
            + '<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:var(--text-body-normal);"><span style="color:var(--text-muted);">시간외수당</span><span style="font-weight:600;color:var(--accent-amber);">620,000</span></div>'
            + '<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:var(--text-body-normal);"><span style="color:var(--text-muted);">공제 합계</span><span style="font-weight:600;color:var(--accent-rose);">-978,000</span></div>'
            + '</div></div>'
            + '<p style="font-size:var(--text-body-normal);color:var(--text-secondary);line-height:1.7;margin-top:6px;">'
            + '&#x1f4c4; 급여명세서 <strong>PDF를 업로드</strong>하면 자동 파싱!<br>'
            + '전월 대비 변동도 한눈에 확인돼요.</p>';
        }
      },

      // 6: 급여 계산 도구
      {
        title: '&#x1f9ee; Step 6 &middot; 급여 계산 도구',
        desc: '&#x1f4b0; 급여 탭에는 3개의 서브탭이 있어요.',
        render: function () {
          return '<div style="display:flex;gap:6px;margin-bottom:14px;">'
            + '<div style="flex:1;padding:8px;text-align:center;border-radius:var(--radius-md);background:var(--accent-indigo);color:#fff;font-weight:700;font-size:var(--text-body-normal);">급여명세서 관리</div>'
            + '<div style="flex:1;padding:8px;text-align:center;border-radius:var(--radius-md);background:var(--bg-glass);color:var(--text-secondary);font-weight:600;font-size:var(--text-body-normal);">급여 예상</div>'
            + '<div style="flex:1;padding:8px;text-align:center;border-radius:var(--radius-md);background:var(--bg-glass);color:var(--text-secondary);font-weight:600;font-size:var(--text-body-normal);">급여 계산</div></div>'
            + '<div class="wf-card">'
            + '<div style="font-size:var(--text-body-normal);color:var(--text-secondary);line-height:1.8;">'
            + '<div style="margin-bottom:10px;"><span style="font-weight:700;color:var(--text-primary);">&#x1f4c4; 급여명세서 관리</span><br>업로드한 급여명세서를 월별로 시각화</div>'
            + '<div style="margin-bottom:10px;"><span style="font-weight:700;color:var(--text-primary);">&#x1f4b0; 급여 예상</span><br>이번 달 예상 실수령액 시뮬레이션</div>'
            + '<div><span style="font-weight:700;color:var(--text-primary);">&#x1f9ee; 급여 계산</span><br>시간외수당, 당직수당, 연차수당, 공제 등<br>항목별 계산기</div>'
            + '</div></div>';
        }
      },

      // 7: 수정·삭제
      {
        title: '&#x270f;&#xfe0f; Step 7 &middot; 수정 &amp; 삭제',
        desc: '휴가&middot;시간외 모두 <span class="hl">같은 방식</span>으로 수정&middot;삭제해요.',
        render: function () {
          var n = _now();
          var ds = n.y + '-' + String(n.m).padStart(2,'0') + '-' + String(n.d).padStart(2,'0');
          return '<div class="wf-card"><div class="wf-card-title">&#x1f4c6; ' + n.m + '월 ' + n.d + '일 (' + n.dow + ') &mdash; 저장</div>'
            + '<div class="wf-field active"><span class="wf-label">유형</span><span style="font-weight:600;">&#x1f3d6;&#xfe0f; 연차</span></div>'
            + '<div class="wf-field"><span class="wf-label">종료일</span><span>' + ds + '</span></div>'
            + '<div class="wf-btn-mock" style="margin-top:10px;background:var(--accent-indigo);color:#fff;">&#x1f4be; 저장하기</div></div>'
            + '<div class="wf-card"><div class="wf-card-title">&#x270f;&#xfe0f; 수정 모드</div>'
            + '<div class="wf-field active"><span class="wf-label">유형</span>'
            + '<span style="font-weight:600;">&#x1f3d6;&#xfe0f; 연차 &rarr; &#x1fa7a; 병가</span>'
            + '<span style="margin-left:auto;color:var(--accent-indigo);font-size:var(--text-label-small);font-weight:700;">변경!</span></div>'
            + '<div style="display:flex;gap:8px;margin-top:10px;">'
            + '<div class="wf-btn-mock" style="flex:1;background:rgba(244,63,94,0.1);color:var(--accent-rose);">&#x1f5d1; 삭제</div>'
            + '<div class="wf-btn-mock" style="flex:1;background:var(--accent-indigo);color:#fff;">&#x1f4be; 수정</div></div></div>'
            + '<p style="font-size:var(--text-body-normal);color:var(--text-secondary);line-height:1.7;margin-top:6px;">'
            + '같은 날짜를 다시 탭 &rarr; <strong style="color:var(--accent-indigo);">수정 모드</strong> 진입<br>'
            + '유형 변경 후 저장하거나 삭제할 수 있어요!</p>';
        }
      },
    ];

    var TOTAL = STEPS.length;
    var currentStep = 0;

    function renderStep() {
      var step = STEPS[currentStep];
      var container = document.getElementById('stepContent');

      // 프로그레스
      var pct = Math.round((currentStep + 1) / TOTAL * 100);
      document.getElementById('progressFill').style.width = pct + '%';
      document.getElementById('progressLabel').textContent = (currentStep + 1) + ' / ' + TOTAL;

      // 콘텐츠 조립
      var titleHtml = step.title ? '<div class="tut-step-title">' + step.title + '</div>' : '';
      var descHtml = step.desc ? '<div class="tut-step-desc">' + step.desc + '</div>' : '';
      var bodyHtml = '<div class="tut-step-body">' + step.render() + '</div>';

      // textContent로 먼저 클리어 후 DOM으로 구축
      container.textContent = '';
      var wrapper = document.createElement('div');
      wrapper.style.cssText = 'display:flex;flex-direction:column;flex:1;overflow:hidden;';
      wrapper.innerHTML = titleHtml + descHtml + bodyHtml;
      container.appendChild(wrapper);

      // 스크롤 최상단
      var bodyEl = container.querySelector('.tut-step-body');
      if (bodyEl) bodyEl.scrollTop = 0;

      // 애니메이션 리트리거
      container.style.animation = 'none';
      container.offsetHeight;
      container.style.animation = '';

      // 버튼 상태
      document.getElementById('btnPrev').style.display = currentStep === 0 ? 'none' : '';
      document.getElementById('btnNext').textContent = currentStep === TOTAL - 1 ? '시작하기 \u{1F680}' : '다음 \u2192';
    }

    function nextStep() {
      if (currentStep >= TOTAL - 1) { goToApp(); return; }
      currentStep++;
      renderStep();
    }

    function prevStep() {
      if (currentStep <= 0) return;
      currentStep--;
      renderStep();
    }

    function goToApp() {
      window.location.href = '/';
    }

    // Phase 3-A: data-action 위임 (인라인 onclick 제거)
    document.body.addEventListener('click', function (e) {
      var el = e.target.closest && e.target.closest('[data-action]');
      if (!el) return;
      var a = el.dataset.action;
      if (a === 'goToApp') goToApp();
      else if (a === 'nextStep') nextStep();
      else if (a === 'prevStep') prevStep();
    });

    // 초기 렌더
    renderStep();
  
})();
