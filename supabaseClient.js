// ============================================
// Supabase Client Initialization & Local-First Sync
// ============================================

const SUPABASE_URL = 'https://ulamqyarenzjdxlisijl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Mg-Uzj8SwPBaXi3-d-E8PQ_ojRdKASi';

// app.js보다 먼저 로드되므로 여기서 isFamilyMode를 먼저 설정
const urlParams = new URLSearchParams(window.location.search);
window.isFamilyMode = urlParams.get('mode') === 'family';

let supabaseClient = null;
window.SupabaseUser = null;

// ── 사용자별 localStorage 키 생성 ──
// 로그인 유저: 'baseKey_<userId>', 비로그인: 'baseKey_guest'
function getUserStorageKey(baseKey) {
    const uid = window.SupabaseUser ? window.SupabaseUser.id : 'guest';
    return `${baseKey}_${uid}`;
}
window.getUserStorageKey = getUserStorageKey;

// Initialize Supabase Client if URL and Key are provided
if (SUPABASE_URL !== 'YOUR_SUPABASE_URL' && SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY') {
    // Requires Supabase JS SDK loaded via CDN
    if (window.supabase) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        // Listen to Auth state changes
        supabaseClient.auth.onAuthStateChange((event, session) => {
            if (session) {
                window.SupabaseUser = session.user;
                if (typeof updateAuthUI === 'function') updateAuthUI(session.user);

                // 로그인/세션복원 시에만 클라우드 데이터 동기화
                // TOKEN_REFRESHED, USER_UPDATED 등 반복 이벤트에서는 불필요한 재동기화 방지
                const syncEvents = ['SIGNED_IN', 'INITIAL_SESSION'];
                if (window.isFamilyMode && syncEvents.includes(event) && typeof window.syncCloudData === 'function') {
                    SupabaseSync.fetchCloudData().then(data => {
                        window.syncCloudData(data);
                    });
                }
            } else {
                window.SupabaseUser = null;
                if (typeof updateAuthUI === 'function') updateAuthUI(null);
            }
        });
    } else {
        console.error("Supabase SDK not loaded");
    }
}

const SupabaseSync = {
    async signInWithGoogle() {
        if (!window.isFamilyMode || !supabaseClient) return;
        await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                // Use dynamic origin to support both localhost and production deployments
                redirectTo: `${window.location.origin}${window.location.pathname}?mode=family`,
                queryParams: {
                    prompt: 'select_account' // 구글 자동 로그인 건너뛰기 방지
                }
            }
        });
    },

    async signOut() {
        if (!window.isFamilyMode || !supabaseClient) return;
        try {
            // 로그아웃 전에 userId 캡처 (signOut 후엔 SupabaseUser가 null이 됨)
            const uid = window.SupabaseUser ? window.SupabaseUser.id : 'guest';
            await supabaseClient.auth.signOut();
            // 가족 모드: 로그아웃 시 타인에게 정보 노출 방지를 위해 정확한 로컬 캐시 키 파기
            localStorage.removeItem(`bhm_hr_profile_${uid}`);
            localStorage.removeItem(`overtimeRecords_${uid}`);
            localStorage.removeItem(`leaveRecords_${uid}`);
            localStorage.removeItem(`otManualHourly_${uid}`);
        } catch (e) {
            console.error('Logout error:', e);
        }
        // 화면 데이터를 확실히 초기화하기 위해 파라미터 유지한 채로 완전히 새로고침
        window.location.reload();
    },

    async fetchCloudData() {
        if (!window.isFamilyMode || !supabaseClient) return null;
        try {
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (!session) return null;
            const userId = session.user.id;

            // 유저 로그인 상태라면 본인 데이터만 가져오도록 user_id로 명시적 필터링
            const { data: otData, error: otErr } = await supabaseClient
                .from('overtime_records')
                .select('*')
                .eq('user_id', userId);
            
            if (otErr) throw otErr;

            // profiles 테이블은 RLS가 열려 있어 모두 열람 가능할 수 있으므로, 명시적으로 id 필터링
            const { data: pfData, error: pfErr } = await supabaseClient
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (pfErr) throw pfErr;

            // 휴가 기록도 가져오기
            const { data: lvData, error: lvErr } = await supabaseClient
                .from('leave_records')
                .select('*')
                .eq('user_id', userId);

            if (lvErr) throw lvErr;

            return {
                overtime: otData,
                profile: pfData,
                leave: lvData
            };
        } catch (e) {
            console.error("Failed to fetch from Supabase:", e);
            return null;
        }
    },

    async pushCloudData(tableName, record) {
        console.log(`[SupabaseSync] pushCloudData called: table=${tableName}, isFamilyMode=${window.isFamilyMode}, hasClient=${!!supabaseClient}, hasUser=${!!window.SupabaseUser}`);

        if (!window.isFamilyMode || !supabaseClient) {
            console.warn(`[SupabaseSync] Skipped: isFamilyMode=${window.isFamilyMode}, supabaseClient=${!!supabaseClient}`);
            return;
        }

        if (!window.SupabaseUser) {
            console.warn(`[SupabaseSync] No user logged in, skipping cloud sync`);
            return;
        }

        try {
            // profiles 테이블은 user_id 컬럼이 없고 대신 id를 Primary Key로 사용함
            if (tableName !== 'profiles') {
                record.user_id = window.SupabaseUser.id;
            }

            console.log(`[SupabaseSync] Upserting to ${tableName}:`, record);

            const { data, error } = await supabaseClient
                .from(tableName)
                .upsert(record)
                .select();

            if (error) throw error;
            console.log(`[SupabaseSync] Success:`, data);
        } catch (e) {
            console.error(`[SupabaseSync] Failed to push to ${tableName}:`, e);
        }
    },

    async deleteCloudRecord(tableName, id) {
        if (!window.isFamilyMode || !supabaseClient) return;
        if (!window.SupabaseUser) return;
        try {
            const userId = window.SupabaseUser.id;
            // profiles 테이블은 id가 PK이므로 user_id 필터 불필요
            // 그 외 테이블은 user_id 필터 추가로 타인 레코드 삭제 방지
            let query = supabaseClient.from(tableName).delete().eq('id', id);
            if (tableName !== 'profiles') {
                query = query.eq('user_id', userId);
            }
            const { error } = await query;
            if (error) throw error;
        } catch (e) {
            console.error(`Failed to delete from ${tableName}:`, e);
        }
    }
};

window.SupabaseSync = SupabaseSync;
