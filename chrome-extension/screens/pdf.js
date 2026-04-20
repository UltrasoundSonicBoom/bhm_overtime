'use strict';
const PdfScreen = {
  render(container, { user }) {
    container.innerHTML=
      '<div class="pdf-drop" id="pd">📥 PDF를 여기에 드래그<br>또는 클릭해서 선택<input type="file" id="pf" accept=".pdf" style="display:none"></div>'+
      '<div style="font-size:11px;color:#9ca3af;text-align:center;margin-bottom:8px">— 최근 감지된 PDF —</div>'+
      '<div id="rp"></div>'+
      '<div class="status-msg" id="ps"></div>';

    container.querySelector('#pd').onclick=function(){container.querySelector('#pf').click();};
    container.querySelector('#pf').onchange=function(e){if(e.target.files[0])handleFile(e.target.files[0]);};
    var drop=container.querySelector('#pd');
    drop.ondragover=function(e){e.preventDefault();drop.style.borderColor='#1a56db';};
    drop.ondragleave=function(){drop.style.borderColor='';};
    drop.ondrop=function(e){e.preventDefault();drop.style.borderColor='';var f=e.dataTransfer.files[0];if(f&&f.name.endsWith('.pdf'))handleFile(f);};

    BhmStorage.get(['bhm_last_pdf']).then(function(d){
      var pdf=d['bhm_last_pdf'];
      if(!pdf||Date.now()-pdf.detectedAt>86400000)return;
      var mins=Math.floor((Date.now()-pdf.detectedAt)/60000);
      var item=document.createElement('div'); item.className='pdf-recent-item';
      var icon=document.createElement('span'); icon.textContent='📄'; icon.style.fontSize='20px';
      var info=document.createElement('div'); info.style.flex='1';
      var name=document.createElement('div'); name.style.cssText='font-weight:600;font-size:12px';
      name.textContent=pdf.fileName;
      var age=document.createElement('div'); age.style.cssText='font-size:11px;color:#9ca3af';
      age.textContent=(mins<1?'방금 전':mins+'분 전')+' 감지됨';
      info.appendChild(name); info.appendChild(age);
      var btn=document.createElement('button'); btn.className='pdf-import-btn'; btn.textContent='가져오기';
      btn.onclick=function(){importBase64(pdf.base64,pdf.fileName);};
      item.appendChild(icon); item.appendChild(info); item.appendChild(btn);
      container.querySelector('#rp').appendChild(item);
    });

    function handleFile(file){
      var reader=new FileReader();
      reader.onload=function(e){
        var bytes=new Uint8Array(e.target.result);
        var binary='';
        for(var i=0;i<bytes.length;i++) binary+=String.fromCharCode(bytes[i]);
        importBase64(btoa(binary),file.name);
      };
      reader.readAsArrayBuffer(file);
    }

    async function importBase64(base64,fileName){
      var ps=container.querySelector('#ps'); ps.textContent='⏳ Drive에 저장 중...'; ps.className='status-msg';
      try {
        var token=await BhmAuth.getToken(true);
        await BhmDrive.uploadPdf(fileName,base64,token);
        ps.textContent='✅ '+fileName+' 저장 완료'; ps.className='status-msg ok';
      } catch(e){
        ps.textContent='❌ '+e.message; ps.className='status-msg err';
      }
    }
  },
};
