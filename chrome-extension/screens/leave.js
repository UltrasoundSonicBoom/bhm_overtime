'use strict';
var LEAVE_TYPES=[
  {id:'annual',label:'연차',cal:false},{id:'half',label:'반차',cal:false},
  {id:'sick',label:'병가',cal:true},{id:'ceremony',label:'경조사',cal:false},
  {id:'unpaid',label:'무급',cal:false},{id:'other',label:'기타',cal:false},
];
const LeaveScreen = {
  render(container, { user }) {
    var selType='annual';
    var today=new Date(), todayStr=_lvDate(today.getFullYear(),today.getMonth(),today.getDate());
    var cy=today.getFullYear(), cm=today.getMonth();
    var selStart=todayStr, selEnd=todayStr;

    container.innerHTML=
      '<div class="cal-nav"><button id="lcp">◀</button><span class="cal-nav-title" id="lct"></span><button id="lcn">▶</button></div>'+
      '<div class="cal-grid" id="lcg"></div>'+
      '<div class="leave-type-grid" id="ltg">'+
        LEAVE_TYPES.map(function(t){return '<div class="leave-type-item'+(t.id==='annual'?' active':'')+'" data-id="'+t.id+'">'+t.label+'</div>';}).join('')+
      '</div>'+
      '<div style="display:flex;gap:6px;margin-bottom:10px">'+
        '<div class="field" style="flex:1"><label class="field-label">시작</label><input class="field-input" type="date" id="ls"></div>'+
        '<div class="field" style="flex:1"><label class="field-label">종료</label><input class="field-input" type="date" id="le"></div>'+
      '</div>'+
      '<div class="field"><label class="field-label">사유</label><input class="field-input" type="text" id="lr" maxlength="100" placeholder="선택"></div>'+
      '<div class="info-bar green" id="li">날짜를 선택하세요</div>'+
      '<button class="btn-primary btn-green" id="lb">🌴 휴가 신청</button>'+
      '<div class="status-msg" id="lss"></div>';

    container.querySelector('#ls').value=selStart;
    container.querySelector('#le').value=selEnd;
    renderCal();

    container.querySelector('#lcp').onclick=function(){cm--;if(cm<0){cy--;cm=11;}renderCal();};
    container.querySelector('#lcn').onclick=function(){cm++;if(cm>11){cy++;cm=0;}renderCal();};
    container.querySelectorAll('.leave-type-item').forEach(function(el){
      el.onclick=function(){
        container.querySelectorAll('.leave-type-item').forEach(function(x){x.classList.remove('active');});
        el.classList.add('active'); selType=el.dataset.id; recalc();
      };
    });
    container.querySelector('#ls').oninput=function(){selStart=this.value; renderCal(); recalc();};
    container.querySelector('#le').oninput=function(){selEnd=this.value; renderCal(); recalc();};
    container.querySelector('#lb').onclick=save;

    function renderCal() {
      var grid=container.querySelector('#lcg');
      grid.innerHTML='';
      container.querySelector('#lct').textContent=cy+'년 '+(cm+1)+'월';
      ['일','월','화','수','목','금','토'].forEach(function(d){
        var h=document.createElement('div');h.className='cal-cell hd';h.textContent=d;grid.appendChild(h);
      });
      var first=new Date(cy,cm,1).getDay(), days=new Date(cy,cm+1,0).getDate();
      for(var i=0;i<first;i++){var dim=document.createElement('div');dim.className='cal-cell dim';grid.appendChild(dim);}
      for(var day=1;day<=days;day++){
        (function(d){
          var ds=_lvDate(cy,cm,d);
          var inRange=selStart&&selEnd&&selStart<=ds&&selEnd>=ds;
          var el=document.createElement('div');
          el.dataset.date=ds;
          el.className='cal-cell'+(ds===todayStr?' today':'')+(inRange?' sel':'');
          el.textContent=d;
          el.onclick=function(){
            selStart=ds; selEnd=ds;
            container.querySelector('#ls').value=selStart;
            container.querySelector('#le').value=selEnd;
            renderCal(); recalc();
          };
          grid.appendChild(el);
        })(day);
      }
      BhmStorage.get([BhmStorage.KEYS.LEAVE]).then(function(d){
        var recs=d[BhmStorage.KEYS.LEAVE]||[];
        grid.querySelectorAll('[data-date]').forEach(function(cell){
          var ds2=cell.dataset.date;
          if(recs.some(function(r){return r.startDate<=ds2&&r.endDate>=ds2;})){
            var dot=document.createElement('div');
            dot.style.cssText='width:4px;height:4px;border-radius:50%;background:#059669;margin:0 auto';
            cell.appendChild(dot);
          }
        });
      });
    }

    function recalc(){
      var s=container.querySelector('#ls').value, e=container.querySelector('#le').value;
      var li=container.querySelector('#li');
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
      try{
        var t=LEAVE_TYPES.find(function(x){return x.id===selType;});
        var days=selType==='half'?0.5:calcLeaveDays(s,e,t.cal);
        var rec={id:'lv_'+Date.now(),type:selType,startDate:s,endDate:e,days:days,reason:container.querySelector('#lr').value.trim(),createdAt:new Date().toISOString()};
        var d=await BhmStorage.get([BhmStorage.KEYS.LEAVE]);
        var recs=d[BhmStorage.KEYS.LEAVE]||[]; recs.push(rec);
        await BhmStorage.set({[BhmStorage.KEYS.LEAVE]:recs});
        chrome.runtime.sendMessage({type:'SYNC_NOW'});
        ss.textContent='✅ '+days+'일 저장 완료'; ss.className='status-msg ok';
        container.querySelector('#lr').value='';
        selStart=todayStr; selEnd=todayStr;
        container.querySelector('#ls').value=selStart;
        container.querySelector('#le').value=selEnd;
        renderCal(); recalc();
        setTimeout(function(){ss.textContent='';},2000);
      } finally { btn.disabled=false; }
    }
  },
};
function _lvDate(y,m,d){return y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');}
