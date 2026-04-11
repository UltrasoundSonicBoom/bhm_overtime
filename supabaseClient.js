// ============================================
// Supabase Client Initialization & Local-First Sync
// ============================================

const SUPABASE_URL = 'https://ulamqyarenzjdxlisijl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Mg-Uzj8SwPBaXi3-d-E8PQ_ojRdKASi';

// TODO Phase 5: supabaseClient.js는 앱 인프라(Admin, RAG)용으로 유지
// 사용자 데이터 sync는 googleAuth.js + syncManager.js로 이전됨

let supabaseClient = null;
window.SupabaseUser = null;

// ── 사용자별 localStorage 키 생성 ──
// googleAuth.js가 먼저 로드되어 window.getUserStorageKey를 재정의함
// 이 함수는 googleAuth.js 로드 실패 시 fallback으로만 사용됨
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
            await supabaseClient.auth.signOut();
            // ✅ 수정: 로컬 캐시를 삭제하지 않음.
            // 키가 이미 `_<userId>` 형태로 구분되어 있으므로 타인이 볼 수 없고,
            // 다음 로그인 시 클라우드 sync 실패해도 로컬 데이터가 보존됨.
        } catch (e) {
            console.error('Logout error:', e);
        }
        window.location.reload();
    },

    async fetchCloudData() {
        if (!window.isFamilyMode || !supabaseClient) return null;
        try {
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (!session) return null;
            const userId = session.user.id;

            const { data: otData, error: otErr } = await supabaseClient
                .from('overtime_records')
                .select('*')
                .eq('user_id', userId);
            
            if (otErr) throw otErr;

            const { data: pfData, error: pfErr } = await supabaseClient
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (pfErr) throw pfErr;

            const { data: lvData, error: lvErr } = await supabaseClient
                .from('leave_records')
                .select('*')
                .eq('user_id', userId);

            if (lvErr) throw lvErr;

            return {
                overtime: otData || [],
                profile: pfData,
                leave: lvData || [],
                _fetchSuccess: true  // ✅ 클라우드 조회 성공 여부 표시
            };
        } catch (e) {
            console.error("Failed to fetch from Supabase:", e);
            // ✅ 수정: null 대신 실패 표시를 반환 → syncCloudData가 로컬 데이터를 보호
            return { _fetchFailed: true };
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
