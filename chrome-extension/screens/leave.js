'use strict';
var LEAVE_TYPES=[
  {id:'annual',label:'연차',cal:false},{id:'half',label:'반차',cal:false},
  {id:'sick',label:'병가',cal:true},{id:'ceremony',label:'경조사',cal:false},
  {id:'unpaid',label:'무급',cal:false},{id:'other',label:'기타',cal:false},
];
const LeaveScreen = {
  render(container, { user }) {
    var selType='annual';
    var todayStr=new Date().toISOString().slice(0,10);

    container.innerHTML=
      '<div class="leave-type-grid" id="ltg">'+
        LEAVE_TYPES.map(function(t){return '<div class="leave-type-item'+(t.id==='annual'?' active':'')+'" data-id="'+t.id+'">'+t.label+'</div>';}).join('')+
      '</div>'+
      '<div style="display:flex;gap:6px;margin-bottom:10px">'+
        '<div class="field" style="flex:1"><label class="field-label">시작일</label><input class="field-input" type="date" id="ls"></div>'+
        '<div class="field" style="flex:1"><label class="field-label">종료일</label><input class="field-input" type="date" id="le"></div>'+
      '</div>'+
      '<div class="field"><label class="field-label">사유</label><input class="field-input" type="text" id="lr" maxlength="100" placeholder="선택"></div>'+
      '<div class="info-bar green" id="li">날짜를 선택하세요</div>'+
      '<button class="btn-primary btn-green" id="lb">🌴 휴가 신청</button>'+
      '<div class="status-msg" id="lss"></div>';

    container.querySelector('#ls').value=todayStr;
    container.querySelector('#le').value=todayStr;

    container.querySelectorAll('.leave-type-item').forEach(function(el){
      el.onclick=function(){
        container.querySelectorAll('.leave-type-item').forEach(function(x){x.classList.remove('active');});
        el.classList.add('active'); selType=el.dataset.id; recalc();
      };
    });
    container.querySelector('#ls').oninput=recalc;
    container.querySelector('#le').oninput=recalc;
    container.querySelector('#lb').onclick=save;

    function recalc(){
      var s=container.querySelector('#ls').value, e=container.querySelector('#le').value, li=container.querySelector('#li');
      if(!s||!e||s>e){li.textContent='날짜를 선택하세요';return;}
      var t=LEAVE_TYPES.find(function(x){return x.id===selType;});
      var days=selType==='half'?0.5:calcLeaveDays(s,e,t.cal);
      li.textContent='📊 '+days+'일 신청';
    }

    async function save(){
      var btn=container.querySelector('#lb'), ss=container.querySelector('#lss');
      btn.disabled=true;
      var s=container.querySelector('#ls').value, e=container.querySelector('#le').value;
      if(!s||!e||s>e){ss.textContent='날짜 확인'; ss.className='status-msg err'; btn.disabled=false; return;}
      try {
        var t=LEAVE_TYPES.find(function(x){return x.id===selType;});
        var days=selType==='half'?0.5:calcLeaveDays(s,e,t.cal);
        var rec={id:'lv_'+Date.now(),type:selType,startDate:s,endDate:e,days:days,reason:container.querySelector('#lr').value.trim(),createdAt:new Date().toISOString()};
        var d=await BhmStorage.get([BhmStorage.KEYS.LEAVE]);
        var recs=d[BhmStorage.KEYS.LEAVE]||[]; recs.push(rec);
        await BhmStorage.set({[BhmStorage.KEYS.LEAVE]:recs});
        chrome.runtime.sendMessage({type:'SYNC_NOW'});
        ss.textContent='✅ '+days+'일 저장 완료'; ss.className='status-msg ok';
        container.querySelector('#lr').value='';
        setTimeout(function(){ss.textContent='';},2000);
      } finally {
        btn.disabled=false;
      }
    }
  },
};
