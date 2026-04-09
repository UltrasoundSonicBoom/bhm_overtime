const SUPABASE_URL = 'https://ulamqyarenzjdxlisijl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Mg-Uzj8SwPBaXi3-d-E8PQ_ojRdKASi';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const loginBtn = document.getElementById('loginBtn');
const refreshBtn = document.getElementById('refreshBtn');
const refreshNextBtn = document.getElementById('refreshNextBtn');
const authStatus = document.getElementById('authStatus');
const yearInput = document.getElementById('yearInput');
const resultBox = document.getElementById('resultBox');

yearInput.value = String(new Date().getFullYear());

function setResult(data) {
  resultBox.textContent = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
}

async function getAccessToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

async function updateAuthState() {
  const { data: { session } } = await supabase.auth.getSession();
  const loggedIn = Boolean(session?.access_token);
  authStatus.textContent = loggedIn ? `로그인됨: ${session.user.email}` : '로그인 필요';
  refreshBtn.disabled = !loggedIn;
  refreshNextBtn.disabled = !loggedIn;
  loginBtn.textContent = loggedIn ? '로그인 완료' : '구글 로그인';
  loginBtn.disabled = loggedIn;
}

async function postRefresh(year) {
  const token = await getAccessToken();
  if (!token) {
    setResult('로그인이 필요합니다.');
    return;
  }

  setResult(`${year}년 공휴일 스냅샷 갱신 중...`);

  const response = await fetch('/api/admin/calendar/refresh', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ year }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    setResult({ status: response.status, ...data });
    return;
  }

  setResult(data);
}

loginBtn.addEventListener('click', async () => {
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}${window.location.pathname}`,
      queryParams: { prompt: 'select_account' },
    },
  });
});

refreshBtn.addEventListener('click', async () => {
  const year = Number(yearInput.value);
  await postRefresh(year);
});

refreshNextBtn.addEventListener('click', async () => {
  const year = Number(yearInput.value);
  await postRefresh(year);
  await postRefresh(year + 1);
});

supabase.auth.onAuthStateChange(() => {
  updateAuthState();
});

updateAuthState();
