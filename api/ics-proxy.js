// api/ics-proxy.js — Vercel Edge Function
// 브라우저 CORS 우회: 서버에서 ICS URL을 가져와 프록시 반환.
// Google Calendar 비공개(비밀) 주소 지원 목적.

export const config = { runtime: 'edge' };

const ALLOWED_HOSTNAMES = [
  'calendar.google.com',
  'outlook.live.com',
  'outlook.office.com',
  'cal.naver.com',
  'caldav.icloud.com',
];

function isAllowed(hostname) {
  return ALLOWED_HOSTNAMES.some(
    (h) => hostname === h || hostname.endsWith('.' + h)
  );
}

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
      },
    });
  }

  const rawUrl = new URL(request.url).searchParams.get('url');
  if (!rawUrl) {
    return json({ error: 'url 파라미터가 필요합니다.' }, 400);
  }

  let target;
  try {
    target = new URL(rawUrl);
  } catch {
    return json({ error: '유효하지 않은 URL입니다.' }, 400);
  }

  if (!isAllowed(target.hostname)) {
    return json(
      { error: `허용되지 않는 도메인입니다. 지원: ${ALLOWED_HOSTNAMES.join(', ')}` },
      403
    );
  }

  try {
    const upstream = await fetch(rawUrl, {
      headers: { 'User-Agent': 'SNUHMate-ICS-Proxy/1.0' },
    });
    if (!upstream.ok) {
      return json({ error: `ICS 서버 오류: HTTP ${upstream.status}` }, 502);
    }
    const text = await upstream.text();
    return new Response(text, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    return json({ error: `가져오기 실패: ${e.message}` }, 502);
  }
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
