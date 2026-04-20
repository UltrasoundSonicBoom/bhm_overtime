'use strict';
const OvertimeScreen = {
  render(container, { user }) {
    let selDate = _todayStr();
    let selType = 'overtime';
    const today = new Date();
    let cy = today.getFullYear(), cm = today.getMonth();

    container.innerHTML =
      '<div class="cal-nav"><button id="cp">◀</button><span class="cal-nav-title" id="ct"></span><button id="cn">▶</button></div>' +
      '<div class="cal-grid" id="cg"></div>' +
      '<div class="type-row">' +
        '<button class="type-btn active" data-type="overtime">시간외</button>' +
        '<button class="type-btn" data-type="oncall_standby">온콜대기</button>' +
        '<button class="type-btn" data-type="oncall_work">온콜출근</button>' +
      '</div>' +
      '<div class="time-row" id="tr"><input class="time-input" type="time" id="st" value="18:00"><span class="time-sep">~</span><input class="time-input" type="time" id="et" value="21:00"></div>' +
      '<div class="field"><label class="field-label">메모</label><input class="field-input" type="text" id="memo" maxlength="100" placeholder="선택"></div>' +
      '<label style="display:flex;align-items:center;gap:6px;font-size:12px;margin-bottom:10px"><input type="checkbox" id="ih"> 휴일 근무</label>' +
      '<div class="info-bar" id="ci">날짜와 시간을 선택하세요</div>' +
      '<button class="btn-primary" id="sv">💾 저장</button>' +
      '<div class="status-msg" id="ss"></div>';

    renderCal(cy, cm);
    container.querySelector('#cp').onclick = function() { cm--; if(cm<0){cy--;cm=11;} renderCal(cy,cm); };
    container.querySelector('#cn').onclick = function() { cm++; if(cm>11){cy++;cm=0;} renderCal(cy,cm); };
    container.querySelectorAll('.type-btn').forEach(function(b) {
      b.onclick = function() {
        container.querySelectorAll('.type-btn').forEach(function(x){x.classList.remove('active');});
        b.classList.add('active'); selType = b.dataset.type;
        container.querySelector('#tr').hidden = selType === 'oncall_standby';
        recalc();
      };
    });
    container.querySelector('#st').oninput = recalc;
    container.querySelector('#et').oninput = recalc;
    container.querySelector('#ih').onchange = recalc;
    container.querySelector('#sv').onclick = save;

    function renderCal(y, m) {
      container.querySelector('#ct').textContent = y + '년 ' + (m+1) + '월';
      var grid = container.querySelector('#cg'); grid.innerHTML = '';
      ['일','월','화','수','목','금','토'].forEach(function(d) {
        var el = document.createElement('div'); el.className='cal-cell hd'; el.textContent=d; grid.appendChild(el);
      });
      var first = new Date(y,m,1).getDay(), days = new Date(y,m+1,0).getDate();
      for(var i=0;i<first;i++){var el=document.createElement('div');el.className='cal-cell dim';grid.appendChild(el);}
      for(var d=1;d<=days;d++){
        (function(day){
          var el=document.createElement('div'); var ds=_fmtDate(y,m,day);
          el.className='cal-cell'+(ds===_todayStr()?' today':'')+(ds===selDate?' sel':'');
          el.textContent=day;
          el.onclick=function(){selDate=ds; container.querySelectorAll('.cal-cell').forEach(function(c){c.classList.remove('sel');}); el.classList.add('sel'); recalc();};
          grid.appendChild(el);
        })(d);
      }
    }

    function recalc() {
      var ci=container.querySelector('#ci');
      if(selType==='oncall_standby'){ci.textContent='온콜대기: 시간 입력 불필요';return;}
      var s=container.querySelector('#st').value, e=container.querySelector('#et').value, h=container.querySelector('#ih').checked;
      var r=calcTimeBreakdown(selDate,s,e,selType,h);
      ci.textContent='📊 연장 '+r.extended+'h · 야간 '+r.night+'h · 휴일 '+r.holiday+'h';
    }

    async function save() {
      var btn=container.querySelector('#sv'), ss=container.querySelector('#ss');
      btn.disabled=true;
      try {
        var profile=(await BhmStorage.get([BhmStorage.KEYS.PROFILE]))[BhmStorage.KEYS.PROFILE]||{};
        var s=container.querySelector('#st').value, e=container.querySelector('#et').value, h=container.querySelector('#ih').checked;
        var bd=selType==='oncall_standby'?{extended:0,night:0,holiday:0,holidayNight:0}:calcTimeBreakdown(selDate,s,e,selType,h);
        var rec={id:'ot_'+Date.now(),date:selDate,startTime:selType==='oncall_standby'?'':s,endTime:selType==='oncall_standby'?'':e,type:selType,isHoliday:h,memo:container.querySelector('#memo').value.trim(),hourlyRate:profile.hourlyRate||0,breakdown:bd,createdAt:new Date().toISOString()};
        var d=await BhmStorage.get([BhmStorage.KEYS.OVERTIME]);
        var recs=d[BhmStorage.KEYS.OVERTIME]||[]; recs.push(rec);
        await BhmStorage.set({[BhmStorage.KEYS.OVERTIME]:recs});
        chrome.runtime.sendMessage({type:'SYNC_NOW'});
        ss.textContent='✅ 저장 완료'; ss.className='status-msg ok';
        container.querySelector('#memo').value='';
        setTimeout(function(){ss.textContent='';},2000);
      } finally {
        btn.disabled=false;
      }
    }
  },
};
function _todayStr(){var t=new Date();return _fmtDate(t.getFullYear(),t.getMonth(),t.getDate());}
function _fmtDate(y,m,d){return y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');}
