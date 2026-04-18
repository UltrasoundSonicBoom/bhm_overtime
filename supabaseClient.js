// ============================================
// Supabase Client - 익명 텔레메트리 전용
// ============================================
// 개인정보(프로필/근무/급여)는 Google Drive에만 저장됨.
// Supabase는 익명 사용 통계와 오류 보고만 수신.

const SUPABASE_URL = 'https://ulamqyarenzjdxlisijl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Mg-Uzj8SwPBaXi3-d-E8PQ_ojRdKASi';

let supabaseClient = null;

// ── 사용자별 localStorage 키 생성 (fallback) ──
// googleAuth.js가 먼저 로드되면 window.getUserStorageKey를 재정의함
if (!window.getUserStorageKey) {
    window.getUserStorageKey = function getUserStorageKey(baseKey) {
        try {
            var settings = JSON.parse(localStorage.getItem('bhm_settings') || '{}');
            var uid = settings.googleSub || 'guest';
            return baseKey + '_' + uid;
        } catch (e) {
            return baseKey + '_guest';
        }
    };
}

if (window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    window.SupabaseClient = supabaseClient;
} else {
    console.error('Supabase SDK not loaded');
}

// ── 익명 디바이스 ID (재방문 식별용, 개인 식별 정보 없음) ──
function getAnonymousId() {
    var id = localStorage.getItem('bhm_anon_id');
    if (!id) {
        id = 'a_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem('bhm_anon_id', id);
    }
    return id;
}

// ── 익명 텔레메트리 ──
// 이벤트 종류:
//   - app_open: 앱 진입
//   - feature_use: 기능 사용 (예: payroll_calc, overtime_add)
//   - error: 클라이언트 오류 (메시지/스택)
// 어떤 PII도 포함하지 않음.
var SupabaseTelemetry = {
    _queue: [],
    _flushTimer: null,

    track: function (eventType, payload) {
        if (!supabaseClient) return;
        var event = {
            anon_id: getAnonymousId(),
            event_type: String(eventType || 'unknown').slice(0, 64),
            payload: payload ? this._sanitize(payload) : null,
            app_version: (window.APP_VERSION || 'dev'),
            user_agent: (navigator.userAgent || '').slice(0, 256),
            ts: new Date().toISOString()
        };
        this._queue.push(event);
        this._scheduleFlush();
    },

    error: function (message, extra) {
        this.track('error', {
            message: String(message || '').slice(0, 512),
            extra: extra ? this._sanitize(extra) : null
        });
    },

    _sanitize: function (obj) {
        // 깊이 1만 허용, 문자열 길이 제한, 객체/배열은 JSON 직렬화 후 길이 제한
        try {
            var s = JSON.stringify(obj);
            if (s.length > 2048) s = s.slice(0, 2048) + '...(truncated)';
            return JSON.parse(s);
        } catch (e) {
            return null;
        }
    },

    _scheduleFlush: function () {
        if (this._flushTimer) return;
        var self = this;
        this._flushTimer = setTimeout(function () {
            self._flushTimer = null;
            self._flush();
        }, 3000);
    },

    _flush: async function () {
        if (!supabaseClient || this._queue.length === 0) return;
        var batch = this._queue.splice(0, this._queue.length);
        try {
            var result = await supabaseClient.from('app_events').insert(batch);
            if (result.error) {
                // 테이블 부재(42P01) 등은 서버 측 마이그레이션 후 정상화. 큐는 버린다.
                console.warn('[Telemetry] insert failed:', result.error.message);
            }
        } catch (e) {
            console.warn('[Telemetry] flush error:', e);
        }
    }
};

// 전역 오류 자동 보고
window.addEventListener('error', function (e) {
    SupabaseTelemetry.error(e.message, { src: e.filename, line: e.lineno, col: e.colno });
});
window.addEventListener('unhandledrejection', function (e) {
    SupabaseTelemetry.error('unhandledrejection', { reason: String(e.reason && e.reason.message || e.reason || '') });
});

// 앱 진입 이벤트
SupabaseTelemetry.track('app_open', { path: location.pathname + location.search });

window.SupabaseTelemetry = SupabaseTelemetry;

// ── 호환 shim: 구 SupabaseSync.pushCloudData 호출은 무시 ──
window.SupabaseSync = {
    pushCloudData: function () {},
    deleteCloudRecord: function () {},
    fetchCloudData: function () { return Promise.resolve(null); },
    signInWithGoogle: function () {},
    signOut: function () {}
};

// ── SupabaseUserSync ──────────────────────────────────────────
// 인증 사용자 전용 데이터 동기화 (user_data_blobs 테이블 + RLS).
// Google ID 토큰으로 Supabase 세션을 확립한 뒤 push/pull 사용.
// Drive가 기본 저장소, Supabase는 병렬 백업 + 서버-사이드 접근 제어.
// ─────────────────────────────────────────────────────────────
var SupabaseUserSync = {
    _TABLE: 'user_data_blobs',

    // ── signInWithIdToken ──
    // Google ID 토큰(accounts.id credential)으로 Supabase 세션 확립.
    // nonce: FedCM replay 방지용 (raw nonce, Google initialize에는 hashed 버전 전달됨).
    // 실패해도 앱은 계속 동작 (Drive가 primary).
    signInWithIdToken: function (idToken, nonce) {
        if (!supabaseClient) return Promise.resolve(null);
        var params = { provider: 'google', token: idToken };
        if (nonce) params.nonce = nonce;
        return supabaseClient.auth.signInWithIdToken(params).then(function (result) {
            if (result.error) {
                console.warn('[SupabaseUserSync] signIn failed:', result.error.message);
                return null;
            }
            return result.data && result.data.user ? result.data.user : null;
        }).catch(function (e) {
            console.warn('[SupabaseUserSync] signIn error:', e);
            return null;
        });
    },

    // ── signOut ──
    signOut: function () {
        if (!supabaseClient) return Promise.resolve();
        return supabaseClient.auth.signOut().catch(function () {});
    },

    // ── getSession ──
    // 현재 세션이 유효하면 user 객체, 없으면 null.
    getSession: function () {
        if (!supabaseClient) return Promise.resolve(null);
        return supabaseClient.auth.getSession().then(function (r) {
            return (r.data && r.data.session && r.data.session.user) || null;
        }).catch(function () { return null; });
    },

    // ── push ──
    // dataType: 'overtime'|'leave'|'profile'|'applock'|'overtime_payslip'
    // data: plain JS object (JSON-serializable)
    push: function (dataType, data) {
        if (!supabaseClient) return Promise.resolve(false);
        return this.getSession().then(function (user) {
            if (!user) return false;
            return supabaseClient
                .from(SupabaseUserSync._TABLE)
                .upsert(
                    { user_id: user.id, data_type: dataType, data: data },
                    { onConflict: 'user_id,data_type' }
                )
                .then(function (r) {
                    if (r.error) {
                        console.warn('[SupabaseUserSync] push failed:', r.error.message);
                        return false;
                    }
                    return true;
                });
        }).catch(function (e) {
            console.warn('[SupabaseUserSync] push error:', e);
            return false;
        });
    },

    // ── pullAll ──
    // 이 사용자의 모든 data_type rows 반환: [{ data_type, data, updated_at }]
    pullAll: function () {
        if (!supabaseClient) return Promise.resolve(null);
        return this.getSession().then(function (user) {
            if (!user) return null;
            return supabaseClient
                .from(SupabaseUserSync._TABLE)
                .select('data_type, data, updated_at')
                .eq('user_id', user.id)
                .then(function (r) {
                    if (r.error) {
                        console.warn('[SupabaseUserSync] pullAll failed:', r.error.message);
                        return null;
                    }
                    return r.data || null;
                });
        }).catch(function (e) {
            console.warn('[SupabaseUserSync] pullAll error:', e);
            return null;
        });
    }
};

window.SupabaseUserSync = SupabaseUserSync;
