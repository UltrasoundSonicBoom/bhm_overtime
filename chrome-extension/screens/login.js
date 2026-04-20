'use strict';
const LoginScreen = {
  render(container, { onLogin }) {
    container.className = 'view';
    const wrapper = document.createElement('div');
    wrapper.className = 'popup-header';
    const title = document.createElement('span');
    title.className = 'header-title';
    title.textContent = '🏥 SNUH Mate';
    wrapper.appendChild(title);
    container.appendChild(wrapper);

    const body = document.createElement('div');
    body.className = 'login-screen';
    body.innerHTML =
      '<div style="font-size:40px">🏥</div>' +
      '<div style="font-weight:700;font-size:15px">SNUH Mate</div>' +
      '<div style="font-size:12px;color:#6b7280;line-height:1.6">시간외·휴가·급여명세서 기록<br>snuhmate.com 없이 바로 사용</div>';

    const btn = document.createElement('button');
    btn.className = 'google-btn';
    btn.innerHTML = '<span style="font-weight:900;color:#4285f4;font-size:16px">G</span>';
    const btnLabel = document.createElement('span');
    btnLabel.textContent = 'Google 계정으로 로그인';
    btn.appendChild(btnLabel);

    const status = document.createElement('div');
    status.className = 'status-msg';

    body.appendChild(btn);
    body.appendChild(status);
    container.appendChild(body);

    btn.onclick = async function() {
      btn.disabled = true;
      btnLabel.textContent = '로그인 중...';
      try {
        const token = await BhmAuth.getToken(true);
        const user  = await BhmAuth.fetchProfile(token);
        await onLogin(user);
      } catch (e) {
        status.textContent = '로그인 실패: ' + e.message;
        status.className   = 'status-msg err';
        btn.disabled       = false;
        btnLabel.textContent = 'Google 계정으로 로그인';
      }
    };
  },
};
