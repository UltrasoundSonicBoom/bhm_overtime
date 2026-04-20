'use strict';
const SettingsScreen = {
  render(container, { user, onSignOut }) {
    var userArea=document.createElement('div');
    userArea.style.cssText='display:flex;align-items:center;gap:10px;margin-bottom:14px;padding:10px;background:#f9fafb;border-radius:8px;border:1.5px solid #e5e7eb';
    var img=document.createElement('img');
    img.src=user.picture||''; img.style.cssText='width:36px;height:36px;border-radius:50%';
    img.onerror=function(){this.style.display='none';};
    var nameBox=document.createElement('div');
    var nameEl=document.createElement('div'); nameEl.style.fontWeight='700'; nameEl.textContent=user.name;
    var emailEl=document.createElement('div'); emailEl.style.cssText='font-size:11px;color:#6b7280'; emailEl.textContent=user.email;
    nameBox.appendChild(nameEl); nameBox.appendChild(emailEl);
    userArea.appendChild(img); userArea.appendChild(nameBox);
    container.appendChild(userArea);

    container.insertAdjacentHTML('beforeend',
      '<div style="font-weight:700;margin-bottom:8px">🔒 PIN 설정</div>'+
      '<div style="display:flex;gap:6px;margin-bottom:6px">'+
        '<input class="field-input" type="password" id="np" maxlength="4" placeholder="새 PIN 4자리" style="flex:1;text-align:center;letter-spacing:4px">'+
        '<button class="btn-primary" id="sp" style="width:auto;padding:6px 12px;font-size:12px">변경</button>'+
      '</div>'+
      '<div class="status-msg" id="pcs" style="margin-bottom:12px"></div>'+
      '<div style="font-weight:700;margin-bottom:8px">☁️ 동기화</div>'+
      '<div style="display:flex;gap:6px;align-items:center;margin-bottom:14px">'+
        '<div style="flex:1;font-size:12px;color:#6b7280" id="si">확인 중...</div>'+
        '<button class="btn-primary" id="sn" style="width:auto;padding:6px 12px;font-size:12px">지금 동기화</button>'+
      '</div>'+
      '<button class="btn-primary btn-danger" id="so">로그아웃</button>');

    document.getElementById('sp').onclick=async function(){
      var pin=document.getElementById('np').value, pcs=document.getElementById('pcs');
      if(!/^\d{4}$/.test(pin)){pcs.textContent='4자리 숫자 필요'; pcs.className='status-msg err'; return;}
      await BhmAuth.setPin(pin,BhmStorage);
      pcs.textContent='✅ PIN 변경 완료'; pcs.className='status-msg ok';
      document.getElementById('np').value='';
    };

    BhmStorage.get([BhmStorage.KEYS.DRIVE_SYNC_AT]).then(function(d){
      var at=d[BhmStorage.KEYS.DRIVE_SYNC_AT], si=document.getElementById('si');
      si.textContent=at?'마지막: '+new Date(at).toLocaleString('ko-KR'):'아직 동기화 안됨';
    });

    document.getElementById('sn').onclick=function(){
      chrome.runtime.sendMessage({type:'SYNC_NOW'},function(){
        document.getElementById('si').textContent='✅ 동기화 완료';
      });
    };

    document.getElementById('so').onclick=function(){
      if(confirm('로그아웃하면 로컬 데이터가 삭제됩니다. 계속하시겠습니까?')) onSignOut();
    };
  },
};
