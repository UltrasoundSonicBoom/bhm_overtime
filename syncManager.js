// ============================================================
// syncManager.js — Google Drive 동기화 매니저
// Phase 2: Drive 백업 / 복원 / 충돌 해결
// ============================================================
// Drive 파일 구조:
//   leave.json               → leaveRecords
//   overtime.json             → overtimeRecords
//   profile.json              → bhm_hr_profile
//   overtime_payslip.json     → overtimePayslipData (명세서 보충 데이터)
//   payslips/payslip_YYYY_MM.json → payslip 파싱 결과
//
// localStorage 키 → Drive 파일 매핑은 DATA_MAP에 정의됨

window.SyncManager = (function () {
  'use strict';

  var DEBOUNCE_MS = 3000;
  var _timers = {};  // { dataType: timeoutId }
  var _lastSync = null; // Date

  // ── 데이터 타입별 로컬 키 ↔ Drive 파일명 매핑 ──
  var DATA_MAP = {
    leave:    { localKey: 'leaveRecords',     driveFile: 'leave.json' },
    overtime: { localKey: 'overtimeRecords',  driveFile: 'overtime.json' },
    profile:  { localKey: 'bhm_hr_profile',   driveFile: 'profile.json' },
    overtimePayslip: { localKey: 'overtimePayslipData', driveFile: 'overtime_payslip.json' },
    work_history: { localKey: 'bhm_work_history', driveFile: 'work_history.json' }
    // payslip: 별도 처리 (enqueuePush('payslip', year, month) 형태)
    // applock: 별도 처리 (_pushAppLock / _pullAppLock) — PIN 필드만 분리 동기화
  };

  // ── PIN 설정 Drive 동기화 ──
  // bhm_settings의 PIN 관련 필드만 applock.json으로 저장.
  // biometricCredId는 기기 귀속이므로 동기화 제외.
  var APPLOCK_DRIVE_FILE = 'applock.json';
  var APPLOCK_FIELDS = ['pinEnabled', 'pinHash', 'pinSalt', 'pinLength'];

  function _pushAppLock() {
    if (!_driveReady()) return Promise.resolve();
    if (!window.GoogleDriveStore) return Promise.resolve();
    var settings = window.loadSettings ? window.loadSettings() : {};
    // PIN 비활성화 상태면 빈 객체를 저장 (삭제가 아닌 비활성화 기록)
    var pinData = {};
    APPLOCK_FIELDS.forEach(function (f) {
      pinData[f] = settings[f] !== undefined ? settings[f] : null;
    });
    return window.GoogleDriveStore.writeJsonFile(APPLOCK_DRIVE_FILE, _wrap(pinData)).then(function () {
      _lastSync = new Date();
    }).catch(function (e) {
      console.warn('[SyncManager] applock push failed:', e);
    });
  }

  function _pullAppLock() {
    if (localStorage.getItem('bhm_demo_mode') === '1') return Promise.resolve(null);
    if (!window.GoogleAuth || !window.GoogleAuth.isSignedIn()) return Promise.resolve(null);
    if (!window.GoogleDriveStore) return Promise.resolve(null);
    return window.GoogleDriveStore.readJsonFile(APPLOCK_DRIVE_FILE).then(function (wrapped) {
      if (!wrapped || !wrapped.data) return null;
      var pinData = wrapped.data;
      // 원격에 PIN이 활성화된 경우만 로컬에 머지
      // 로컬에 이미 PIN이 설정돼 있으면 더 최신 쪽을 사용
      var localSettings = window.loadSettings ? window.loadSettings() : {};
      var localHasPin = !!localSettings.pinEnabled;
      var remoteHasPin = !!pinData.pinEnabled;
      if (remoteHasPin && !localHasPin) {
        // 새 기기: Drive에서 PIN 복원
        var patch = {};
        APPLOCK_FIELDS.forEach(function (f) {
          if (pinData[f] !== undefined) patch[f] = pinData[f];
        });
        if (window.saveSettings) window.saveSettings(patch);
        return 'restored';
      }
      return 'no_change';
    }).catch(function (e) {
      console.warn('[SyncManager] applock pull failed:', e);
      return null;
    });
  }

  // ── Drive 파일 래퍼 형식 ──
  // { schemaVersion, updatedAt, deviceId, data }
  var SCHEMA_VERSION = 1;
  var _deviceId = (function () {
    var id = localStorage.getItem('bhm_deviceId');
    if (!id) {
      id = 'dev_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      localStorage.setItem('bhm_deviceId', id);
    }
    return id;
  })();

  function _wrap(data, editedAt) {
    return {
      schemaVersion: SCHEMA_VERSION,
      updatedAt: editedAt || new Date().toISOString(),
      deviceId: _deviceId,
      data: data
    };
  }

  // ── 로컬 편집 시각 기록/조회 ──
  // C2: Drive 충돌 해결을 위해 baseKey 단위로 마지막 편집 시각을 저장한다.
  // 각 데이터 모듈(overtime/leave/profile)의 setter 에서 window.recordLocalEdit(baseKey) 호출.
  function recordLocalEdit(baseKey, whenIso) {
    try {
      var localKey = window.getUserStorageKey ? window.getUserStorageKey(baseKey) : baseKey + '_guest';
      localStorage.setItem('bhm_lastEdit_' + localKey, whenIso || new Date().toISOString());
    } catch (e) {
      // 저장소 초과 등 실패 시 조용히 무시 (데이터 손상보다 낫다)
    }
  }
  function getLocalEditTime(localKey) {
    var v = localStorage.getItem('bhm_lastEdit_' + localKey);
    return v ? new Date(v).getTime() : 0;
  }

  // ── 드라이브 사용 가능 여부 확인 ──
  function _driveReady() {
    if (localStorage.getItem('bhm_demo_mode') === '1') return false;
    if (!window.GoogleAuth || !window.GoogleAuth.isSignedIn()) return false;
    // 토큰 만료 시에도 sync 시도 — _withToken 이 refreshToken 을 silent 호출.
    // 실패 시 initTokenClient.error_callback 이 조용히 reject (팝업/리다이렉트 없음).
    if (!window.GoogleDriveStore) return false;
    var settings = window.loadSettings ? window.loadSettings() : {};
    return !!settings.driveEnabled;
  }

  // ── 토스트 ──
  function _showToast(msg, duration) {
    var toast = document.getElementById('otToast');
    if (!toast) return;
    toast.textContent = msg;
    toast.style.display = 'block';
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { toast.style.display = 'none'; }, duration || 3000);
  }

  // ── Neon DB 동기화 헬퍼 ──
  var API_BASE = (window.BHM_CONFIG && window.BHM_CONFIG.apiBase) || ''

  async function _getAuthHeader() {
    var token = null
    try {
      token = window.GoogleAuth && window.GoogleAuth.getJwtToken
        ? await window.GoogleAuth.getJwtToken()
        : null
    } catch (e) { token = null }
    return token ? { 'Authorization': 'Bearer ' + token } : {}
  }

  // Neon DB에 아이템 업서트 (비동기, 실패 시 조용히 스킵)
  async function _syncToNeon(items) {
    var authHeader = await _getAuthHeader()
    if (!authHeader['Authorization']) return
    var deviceId = localStorage.getItem('bhm_deviceId')
    var itemKeys = (items || []).map(function (it) { return it && it.itemKey })
    try {
      var res = await fetch(API_BASE + '/api/me/sync', {
        method: 'PUT',
        headers: Object.assign({ 'Content-Type': 'application/json' }, authHeader),
        body: JSON.stringify({ items: items, deviceId: deviceId }),
      })
      if (!res.ok) {
        var errBody = ''
        try { errBody = await res.text() } catch (_) {}
        console.warn('[SyncManager] Neon sync HTTP error', res.status, 'keys=', itemKeys, 'body=', String(errBody).slice(0, 300))
        if (window.Telemetry && typeof window.Telemetry.error === 'function') {
          try { window.Telemetry.error('neon_sync_push_error', { status: res.status, body: String(errBody).slice(0, 300), itemKeys: itemKeys }) } catch (_) {}
        }
      }
    } catch (e) {
      console.warn('[SyncManager] Neon sync failed:', e, 'keys=', itemKeys)
      if (window.Telemetry && typeof window.Telemetry.error === 'function') {
        try { window.Telemetry.error('neon_sync_push_error', { error: String(e && e.message || e), itemKeys: itemKeys }) } catch (_) {}
      }
    }
  }

  // Neon DB에서 데이터 pull. 비어있으면 false 반환 (Drive import 필요).
  async function pullFromNeon() {
    var authHeader = await _getAuthHeader()
    if (!authHeader['Authorization']) return false
    try {
      var res = await fetch(API_BASE + '/api/me/sync', { headers: authHeader })
      if (!res.ok) {
        var errBody = ''
        try { errBody = await res.text() } catch (_) {}
        console.warn('[SyncManager] Neon pull HTTP error', res.status, 'body=', String(errBody).slice(0, 300))
        if (window.Telemetry && typeof window.Telemetry.error === 'function') {
          try { window.Telemetry.error('neon_sync_pull_error', { status: res.status, body: String(errBody).slice(0, 300) }) } catch (_) {}
        }
        return false
      }
      var data = await res.json()
      var itemsArr = data.items || []
      console.log('[SyncManager] Neon pull items=' + itemsArr.length + ' driveImportNeeded=' + !!data.drive_import_needed)
      if (data.drive_import_needed) return false
      itemsArr.forEach(function (item) {
        var key = item.item_key
        if (key && item.payload != null) {
          localStorage.setItem(key, JSON.stringify(item.payload))
        }
      })
      return itemsArr.length > 0
    } catch (e) {
      console.warn('[SyncManager] pullFromNeon failed:', e)
      if (window.Telemetry && typeof window.Telemetry.error === 'function') {
        try { window.Telemetry.error('neon_sync_pull_error', { error: String(e && e.message || e) }) } catch (_) {}
      }
      return false
    }
  }

  // Drive 데이터를 Neon DB에 1회 업로드 (첫 로그인 시)
  async function _uploadDriveDataToNeon() {
    var settings = window.loadSettings ? window.loadSettings() : {}
    var uid = settings.googleSub || 'guest'
    var items = []
    var DATA_KEYS = ['leaveRecords', 'overtimeRecords', 'bhm_hr_profile',
                     'overtimePayslipData', 'bhm_work_history']
    DATA_KEYS.forEach(function (key) {
      var val = localStorage.getItem(key + '_' + uid)
      if (val) {
        try { items.push({ itemKey: key + '_' + uid, payload: JSON.parse(val) }) } catch (e) {}
      }
    })
    if (items.length > 0) await _syncToNeon(items)
  }

  // ── enqueuePush ──
  // 3초 디바운스. dataType = 'leave'|'overtime'|'profile'|'payslip'
  // payslip은 추가 인자: enqueuePush('payslip', year, month)
  function enqueuePush(dataType, year, month) {
    if (!_driveReady()) return;
    var key = dataType + (year ? '_' + year + '_' + month : '');
    clearTimeout(_timers[key]);
    _timers[key] = setTimeout(function () {
      pushToDrive(dataType, year, month).catch(function (e) {
        console.warn('[SyncManager] push failed:', e);
        // I2: 조용히 실패하지 않고 사용자에게 알린다.
        // 로컬에는 저장됐지만 Drive 반영 실패 — 다음 편집 시 재시도.
        _showToast('☁️ Drive 동기화 실패. 로컬에 저장됐어요.', 4000);
      });
    }, DEBOUNCE_MS);
  }

  // ── pushToDrive ──
  function pushToDrive(dataType, year, month) {
    if (!_driveReady()) return Promise.resolve();

    if (dataType === 'payslip') {
      return _pushPayslip(year, month);
    }

    var map = DATA_MAP[dataType];
    if (!map) return Promise.reject(new Error('Unknown dataType: ' + dataType));

    var localKey = window.getUserStorageKey ? window.getUserStorageKey(map.localKey) : map.localKey + '_guest';
    var raw = localStorage.getItem(localKey);
    if (!raw) return Promise.resolve(); // 데이터 없으면 skip

    var data;
    try { data = JSON.parse(raw); } catch (e) { return Promise.reject(e); }

    var editedAt = localStorage.getItem('bhm_lastEdit_' + localKey) || undefined;

    return window.GoogleDriveStore.writeJsonFile(map.driveFile, _wrap(data, editedAt)).then(function () {
      _lastSync = new Date();
      _updateSyncLabel();
      // Neon DB에도 병렬 저장 (비동기, 실패해도 Drive 결과에 영향 없음)
      _syncToNeon([{ itemKey: localKey, payload: data }]).catch(function () {})
    });
  }

  // ── payslip 전용 push ──
  function _pushPayslip(year, month) {
    var mm = String(month).padStart(2, '0');
    var settings = {};
    try { settings = JSON.parse(localStorage.getItem('bhm_settings') || '{}'); } catch (e) {}
    var uid = settings.googleSub || 'guest';
    var localKey = 'payslip_' + uid + '_' + year + '_' + mm;
    var raw = localStorage.getItem(localKey);
    if (!raw) return Promise.resolve();
    var data;
    try { data = JSON.parse(raw); } catch (e) { return Promise.reject(e); }
    var driveFile = 'payslips/payslip_' + year + '_' + mm + '.json';
    return window.GoogleDriveStore.writeJsonFile(driveFile, _wrap(data)).then(function () {
      _lastSync = new Date();
      _updateSyncLabel();
    });
  }

  // ── payslip 전용 pull ──
  // Drive 의 payslips/*.json 을 모두 읽어 localStorage 로 복구.
  // 로그아웃 → 재로그인 시 "업로드했던 급여명세서가 사라짐" 현상을 방지.
  function _pullPayslip() {
    if (!window.GoogleDriveStore || typeof window.GoogleDriveStore.listAppDataFiles !== 'function') {
      return Promise.resolve([]);
    }
    var settings = {};
    try { settings = JSON.parse(localStorage.getItem('bhm_settings') || '{}'); } catch (e) {}
    var uid = settings.googleSub;
    if (!uid) return Promise.resolve([]);

    return window.GoogleDriveStore.listAppDataFiles('payslip_').then(function (files) {
      var reads = files.filter(function (f) {
        // 'payslips/payslip_YYYY_MM.json' 또는 'payslip_YYYY_MM*.json' 형태만 복구
        return /payslip_(\d{4})_(\d{2})/.test(f.name);
      }).map(function (f) {
        return window.GoogleDriveStore.readJsonFile(f.name).then(function (wrapped) {
          if (!wrapped || !wrapped.data) return { file: f.name, result: 'no_data' };
          var m = f.name.match(/payslip_(\d{4})_(\d{2})(?:_([^.]+))?/);
          if (!m) return { file: f.name, result: 'bad_name' };
          var localKey = 'payslip_' + uid + '_' + m[1] + '_' + m[2] + (m[3] ? '_' + m[3] : '');
          var existing = localStorage.getItem(localKey);
          if (!existing) {
            localStorage.setItem(localKey, JSON.stringify(wrapped.data));
            if (wrapped.updatedAt) localStorage.setItem('bhm_lastEdit_' + localKey, wrapped.updatedAt);
            return { file: f.name, result: 'restored', key: localKey };
          }
          // 이미 로컬에 있음 — 충돌 해결 규칙 준수
          var conflict = resolveConflict(localKey, wrapped);
          if (conflict === 'remote') {
            localStorage.setItem(localKey, JSON.stringify(wrapped.data));
            if (wrapped.updatedAt) localStorage.setItem('bhm_lastEdit_' + localKey, wrapped.updatedAt);
            return { file: f.name, result: 'remote_wins', key: localKey };
          }
          return { file: f.name, result: 'local_wins', key: localKey };
        });
      });
      return Promise.all(reads);
    }).catch(function (err) {
      console.warn('[SyncManager] _pullPayslip failed:', err);
      return [];
    });
  }

  // ── pullFromDrive ──
  // Drive → localStorage 복원. updatedAt 비교 후 최신 데이터 사용.
  function pullFromDrive() {
    if (!window.GoogleAuth || !window.GoogleAuth.isSignedIn()) return Promise.resolve({});
    if (!window.GoogleDriveStore) return Promise.resolve({});

    var promises = Object.keys(DATA_MAP).map(function (dataType) {
      var map = DATA_MAP[dataType];
      return window.GoogleDriveStore.readJsonFile(map.driveFile).then(function (wrapped) {
        if (!wrapped || !wrapped.data) return { type: dataType, result: 'no_remote' };

        var localKey = window.getUserStorageKey ? window.getUserStorageKey(map.localKey) : map.localKey + '_guest';
        var localRaw = localStorage.getItem(localKey);

        if (!localRaw) {
          // 로컬 없음 → Drive 데이터 바로 복원
          localStorage.setItem(localKey, JSON.stringify(wrapped.data));
          if (wrapped.updatedAt) {
            localStorage.setItem('bhm_lastEdit_' + localKey, wrapped.updatedAt);
          }
          return { type: dataType, result: 'restored' };
        }

        // 충돌 해결 (C2): bhm_lastEdit_<localKey> 와 wrapped.updatedAt 비교
        var conflict = resolveConflict(localKey, wrapped);
        if (conflict === 'remote') {
          // 덮어쓰기 전에 로컬 편집이 있었다면 orphan 으로 백업
          if (getLocalEditTime(localKey) > 0) {
            var orphanStamp = new Date().toISOString().replace(/[:.]/g, '-');
            localStorage.setItem(localKey + '_orphan_' + orphanStamp, localRaw);
          }
          localStorage.setItem(localKey, JSON.stringify(wrapped.data));
          if (wrapped.updatedAt) {
            localStorage.setItem('bhm_lastEdit_' + localKey, wrapped.updatedAt);
          }
          return { type: dataType, result: 'remote_wins' };
        }
        return { type: dataType, result: 'local_wins' };
      });
    });

    // payslip 은 DATA_MAP 방식이 아닌 별도 flow — 로그인 시 함께 복구
    var payslipPromise = _pullPayslip().then(function (arr) {
      return (arr || []).map(function (r) { return Object.assign({ type: 'payslip' }, r); });
    });

    return Promise.all([Promise.all(promises), payslipPromise]).then(function (r) {
      return r[0].concat(r[1] || []);
    });
  }

  // ── resolveConflict ──
  // localKey: 전체 localStorage 키 (예: overtimeRecords_112233...)
  // remoteWrapped: Drive 래퍼 { updatedAt, data }
  // 반환: 'local' | 'remote'
  // bhm_lastEdit_<localKey> 에 기록된 마지막 편집 시각을 기준으로 비교한다.
  // 로컬 편집 시각이 없고 원격 데이터만 존재하면 remote 승 (다른 기기 데이터 보존).
  function resolveConflict(localKey, remoteWrapped) {
    var localTime = getLocalEditTime(localKey);
    var remoteTime = remoteWrapped && remoteWrapped.updatedAt
      ? new Date(remoteWrapped.updatedAt).getTime() : 0;
    return localTime > remoteTime ? 'local' : 'remote';
  }

  // ── fullSync ──
  // 로그인 직후 호출. 1순위: Neon DB pull, 2순위: Drive pull.
  async function fullSync() {
    if (!window.GoogleAuth || !window.GoogleAuth.isSignedIn()) return

    var settings = window.loadSettings ? window.loadSettings() : {}

    if (settings.googleSub && settings.googleSub !== 'demo') {
      migrateGuestData(settings.googleSub)
    }

    // 1순위: Neon DB
    var neonLoaded = await pullFromNeon().catch(function () { return false })
    if (neonLoaded) {
      _refreshUI()
      _lastSync = new Date()
      _updateSyncLabel()
      if (typeof updateDriveBackupUI === 'function') updateDriveBackupUI()
      return
    }

    // 2순위: Drive (첫 로그인 or Neon 비어있음)
    if (!window.GoogleDriveStore) return
    if (!settings.driveEnabled) {
      if (typeof updateDriveBackupUI === 'function') updateDriveBackupUI()
      return
    }

    return Promise.all([
      pullFromDrive(),
      _pullAppLock()
    ]).then(function (allResults) {
      var results = allResults[0] || []
      var applockResult = allResults[1]
      var restored = results.filter(function (r) { return r.result === 'restored' || r.result === 'remote_wins' })
      if (restored.length > 0 || applockResult === 'restored') {
        _showToast('☁️ Drive에서 데이터를 복원했어요.', 4000)
        _refreshUI()
        if (applockResult === 'restored' && typeof updateAppLockUI === 'function') {
          updateAppLockUI()
        }
      }
      _lastSync = new Date()
      _updateSyncLabel()
      if (typeof updateDriveBackupUI === 'function') updateDriveBackupUI()
      // Drive 데이터를 Neon DB에 1회 업로드
      _uploadDriveDataToNeon().catch(function () {})
    }).catch(function (err) {
      console.warn('[SyncManager] Drive fullSync failed:', err)
      _showToast('⚠️ Drive 동기화 실패. 로컬 데이터로 계속합니다.', 4000)
    })
  }

  // ── migrateGuestData ──
  // 비로그인(_guest) → 로그인(_{googleSub}) 키 이전
  // 로그인 직후, pullFromDrive 전에 호출
  //
  // 충돌 정책 (C1):
  //   (a) newKey 가 비어 있음 → guest 데이터를 그대로 이전
  //   (b) newKey 가 있지만 guest 데이터가 더 새로움 → guest 를 이전, 기존 newKey 는 _orphan 로 백업
  //   (c) newKey 가 있고 더 새로움 → guest 를 _orphan 로 백업 (삭제하지 않음)
  // 어떤 경우에도 guest 편집분이 조용히 사라지지 않도록 보장한다.
  function migrateGuestData(googleSub) {
    var MIGRATE_KEYS = [
      { base: 'bhm_hr_profile',   dataType: 'profile' },
      { base: 'overtimeRecords',  dataType: 'overtime' },
      { base: 'leaveRecords',     dataType: 'leave' },
      { base: 'otManualHourly',   dataType: null },
      { base: 'bhm_work_history', dataType: 'work_history' },
    ];

    var guestSuffix = '_guest';
    var newSuffix = '_' + googleSub;
    var orphanStamp = new Date().toISOString().replace(/[:.]/g, '-');
    var migrated = [];
    var orphaned = [];

    function editTime(suffix, base) {
      var v = localStorage.getItem('bhm_lastEdit_' + base + suffix);
      return v ? new Date(v).getTime() : 0;
    }

    MIGRATE_KEYS.forEach(function (item) {
      var guestKey = item.base + guestSuffix;
      var newKey = item.base + newSuffix;
      var guestData = localStorage.getItem(guestKey);
      if (!guestData) return;

      var existing = localStorage.getItem(newKey);
      var guestTime = editTime(guestSuffix, item.base);
      var existingTime = editTime(newSuffix, item.base);

      if (!existing) {
        // (a) 바로 이전
        localStorage.setItem(newKey, guestData);
        var guestEdit = localStorage.getItem('bhm_lastEdit_' + guestKey);
        if (guestEdit) localStorage.setItem('bhm_lastEdit_' + newKey, guestEdit);
        migrated.push(item.base);
      } else if (guestTime > existingTime) {
        // (b) guest 가 더 새로움 → 기존을 orphan 로 백업 후 덮어쓰기
        var orphanKey = item.base + '_orphan_' + orphanStamp + newSuffix;
        localStorage.setItem(orphanKey, existing);
        localStorage.setItem(newKey, guestData);
        var guestEdit2 = localStorage.getItem('bhm_lastEdit_' + guestKey);
        if (guestEdit2) localStorage.setItem('bhm_lastEdit_' + newKey, guestEdit2);
        orphaned.push(item.base + ' (existing backed up)');
        migrated.push(item.base);
      } else {
        // (c) 기존이 더 새로움 → guest 를 orphan 로 백업
        var orphanKey2 = item.base + '_orphan_' + orphanStamp + guestSuffix;
        localStorage.setItem(orphanKey2, guestData);
        orphaned.push(item.base + ' (guest backed up)');
      }

      // 원본 guest 키는 정리 (orphan 에 이미 보존됨)
      localStorage.removeItem(guestKey);
      localStorage.removeItem('bhm_lastEdit_' + guestKey);
    });

    if (migrated.length > 0) {
      console.log('[SyncManager] migrated guest keys:', migrated);
    }
    if (orphaned.length > 0) {
      console.warn('[SyncManager] guest/login conflicts archived as _orphan:', orphaned);
      _showToast('⚠️ 비로그인 편집분 중 일부를 _orphan 백업으로 보관했어요. 관리자에게 문의해 주세요.', 6000);
    }

    // 구버전 googleSub(숫자) → Neon UUID 키 이전 (Task 7)
    var settings2 = window.loadSettings ? window.loadSettings() : {};
    var oldSub = settings2._oldGoogleSub;
    if (oldSub && oldSub !== googleSub) {
      var SUFFIX_KEYS = ['overtimeRecords', 'leaveRecords', 'bhm_hr_profile',
                         'bhm_work_history', 'overtimePayslipData'];
      SUFFIX_KEYS.forEach(function (base) {
        var fromKey = base + '_' + oldSub;
        var toKey = base + '_' + googleSub;
        var val = localStorage.getItem(fromKey);
        if (val && !localStorage.getItem(toKey)) {
          localStorage.setItem(toKey, val);
          localStorage.removeItem(fromKey);
        }
      });
      if (window.saveSettings) window.saveSettings({ _oldGoogleSub: null });
      console.log('[SyncManager] migrated old googleSub (' + oldSub + ') keys → Neon UUID (' + googleSub + ')');
    }

    // payslip 구 키 (payslip_YYYY_MM) → 신규 키 (payslip_<googleSub>_YYYY_MM) 마이그레이션
    (function migratePayslipKeys() {
      var oldPattern = /^payslip_(\d{4})_(\d{2})(?:_(.+))?$/;
      var keysToMigrate = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && oldPattern.test(k)) keysToMigrate.push(k);
      }
      keysToMigrate.forEach(function(k) {
        var m = k.match(oldPattern);
        if (!m) return;
        var newKey = 'payslip_' + googleSub + '_' + m[1] + '_' + m[2] + (m[3] ? '_' + m[3] : '');
        if (!localStorage.getItem(newKey)) {
          localStorage.setItem(newKey, localStorage.getItem(k));
        }
        localStorage.removeItem(k);
      });
      if (keysToMigrate.length > 0) {
        console.log('[SyncManager] migrated ' + keysToMigrate.length + ' payslip keys to namespace payslip_' + googleSub + '_*');
      }
    }());
  }

  // ── UI 헬퍼 ──
  function _refreshUI() {
    // 현재 활성 탭 재렌더링 시도
    if (window.OT && window.OT.renderList) window.OT.renderList();
    if (window.LEAVE && window.LEAVE.renderList) window.LEAVE.renderList();
    if (window.PROFILE && window.PROFILE.render) window.PROFILE.render();
  }

  function _updateSyncLabel() {
    var el = document.getElementById('driveLastSyncLabel');
    if (!el || !_lastSync) return;
    var h = _lastSync.getHours();
    var m = String(_lastSync.getMinutes()).padStart(2, '0');
    el.textContent = '마지막 동기화: ' + h + ':' + m;
  }

  // ── clearPendingPushes ──
  // signOut 등 계정 전환 경합을 막기 위해 대기 중인 debounce 타이머를 모두 취소한다
  function clearPendingPushes() {
    Object.keys(_timers).forEach(function (k) { clearTimeout(_timers[k]); });
    _timers = {};
  }

  // 전역 편의 바인딩 — 데이터 모듈이 저장 직후 호출
  window.recordLocalEdit = recordLocalEdit;

  // ── pullOnResume ──
  // 다른 기기(A)에서 편집한 내용을 이 기기(B)에서 자동 반영하기 위한 재수신 루틴.
  // visibilitychange(탭 복귀) / focus(창 복귀) 시 호출되며, 직전 pull 로부터
  // RESUME_COOLDOWN_MS 이하 경과 시에는 호출을 생략해 과도한 Drive API 호출을 막는다.
  // 로그아웃 상태이면 아무 동작도 하지 않는다.
  var RESUME_COOLDOWN_MS = 20 * 1000; // 20초. Drive API 사용량 보호.
  var _lastResumePull = 0;
  function pullOnResume() {
    if (!window.GoogleAuth || !window.GoogleAuth.isSignedIn()) return;
    // 페이지 로드 중 focus 이벤트로 발화할 때 GIS init이 아직 안 끝났을 수 있음.
    // 이 경우 조용히 스킵 — init 완료 후 다음 focus 이벤트에서 정상 동작.
    if (typeof window.GoogleAuth.isReady === 'function' && !window.GoogleAuth.isReady()) return;
    if (!window.GoogleDriveStore) return;
    var now = Date.now();
    if (now - _lastResumePull < RESUME_COOLDOWN_MS) return;
    _lastResumePull = now;
    pullFromDrive().then(function (results) {
      if (!Array.isArray(results)) return;
      var restored = results.filter(function (r) { return r && (r.result === 'restored' || r.result === 'remote_wins'); });
      if (restored.length > 0) {
        _refreshUI();
        _showToast('☁️ 다른 기기의 변경사항을 불러왔어요.', 2500);
      }
    }).catch(function (err) {
      // 재수신 실패는 조용히 기록 — 로컬에는 영향 없음, 다음 기회에 다시 시도된다
      console.warn('[SyncManager] pullOnResume failed:', err);
    });
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') pullOnResume();
    });
    window.addEventListener('focus', pullOnResume);
  }

  // ── beforeunload: 대기 중인 push 즉시 flush ──
  // 3초 debounce 도중 페이지를 닫으면 Drive가 로컬보다 뒤처진다.
  // 로컬 데이터는 이미 안전하지만, 다음 기기에서 pullFromDrive 시 충돌 가능.
  // → 타이머를 취소하고 즉시 push를 시도한다 (비동기, 최선-노력).
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', function () {
      var pending = Object.keys(_timers);
      if (pending.length === 0) return;
      pending.forEach(function (key) {
        clearTimeout(_timers[key]);
        delete _timers[key];
        // key 형태: 'leave'|'overtime'|'profile'|'payslip_YYYY_MM'
        var parts = key.split('_');
        if (parts[0] === 'payslip' && parts.length >= 3) {
          pushToDrive('payslip', parseInt(parts[1]), parseInt(parts[2])).catch(function () {});
        } else {
          pushToDrive(parts[0]).catch(function () {});
        }
      });
    });
  }

  return {
    enqueuePush: enqueuePush,
    pushToDrive: pushToDrive,
    pullFromDrive: pullFromDrive,
    pullFromNeon: pullFromNeon,
    pullOnResume: pullOnResume,
    fullSync: fullSync,
    migrateGuestData: migrateGuestData,
    resolveConflict: resolveConflict,
    clearPendingPushes: clearPendingPushes,
    recordLocalEdit: recordLocalEdit,
    getLocalEditTime: getLocalEditTime,
    pushAppLockSettings: _pushAppLock  // PIN 설정 변경 시 즉시 Drive 백업
  };
})();
