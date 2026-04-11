// ============================================================
// syncManager.js — Google Drive 동기화 매니저
// Phase 2: Drive 백업 / 복원 / 충돌 해결
// ============================================================
// Drive 파일 구조:
//   leave.json      → leaveRecords
//   overtime.json   → overtimeRecords
//   profile.json    → bhm_hr_profile
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
    profile:  { localKey: 'bhm_hr_profile',   driveFile: 'profile.json' }
    // payslip: 별도 처리 (enqueuePush('payslip', year, month) 형태)
  };

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

  function _wrap(data) {
    return {
      schemaVersion: SCHEMA_VERSION,
      updatedAt: new Date().toISOString(),
      deviceId: _deviceId,
      data: data
    };
  }

  // ── 드라이브 사용 가능 여부 확인 ──
  function _driveReady() {
    if (!window.GoogleAuth || !window.GoogleAuth.isSignedIn()) return false;
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

    return window.GoogleDriveStore.writeJsonFile(map.driveFile, _wrap(data)).then(function () {
      _lastSync = new Date();
      _updateSyncLabel();
    });
  }

  // ── payslip 전용 push ──
  function _pushPayslip(year, month) {
    var mm = String(month).padStart(2, '0');
    var localKey = 'payslip_' + year + '_' + mm;
    // getUserStorageKey는 payslip에서는 사용하지 않음 (기존 salary-parser 패턴 유지)
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
          return { type: dataType, result: 'restored' };
        }

        // 충돌 해결: updatedAt 비교
        var conflict = resolveConflict(localRaw, wrapped);
        if (conflict === 'remote') {
          localStorage.setItem(localKey, JSON.stringify(wrapped.data));
          return { type: dataType, result: 'remote_wins' };
        }
        return { type: dataType, result: 'local_wins' };
      });
    });

    return Promise.all(promises);
  }

  // ── resolveConflict ──
  // local: raw JSON string, remote: Drive 래퍼 { updatedAt, data }
  // 반환: 'local' | 'remote'
  function resolveConflict(localRaw, remoteWrapped) {
    var localObj;
    try { localObj = JSON.parse(localRaw); } catch (e) { return 'remote'; }

    // 로컬에 updatedAt이 있으면 비교, 없으면 remote 우선
    var localTime = localObj && localObj.updatedAt ? new Date(localObj.updatedAt).getTime() : 0;
    var remoteTime = remoteWrapped.updatedAt ? new Date(remoteWrapped.updatedAt).getTime() : 0;

    // 동점이면 remote 우선 (다른 기기 데이터 보존)
    return localTime > remoteTime ? 'local' : 'remote';
  }

  // ── fullSync ──
  // 로그인 직후 호출. guest 마이그레이션 → Drive pull → UI 갱신.
  function fullSync() {
    if (!window.GoogleAuth || !window.GoogleAuth.isSignedIn()) return Promise.resolve();
    if (!window.GoogleDriveStore) return Promise.resolve();

    var settings = window.loadSettings ? window.loadSettings() : {};

    // 로그인 직후 guest 데이터 이전 (driveEnabled 여부 무관)
    if (settings.googleSub) {
      migrateGuestData(settings.googleSub);
    }

    if (!settings.driveEnabled) {
      // Drive 미사용이지만 UI는 업데이트
      if (typeof updateDriveBackupUI === 'function') updateDriveBackupUI();
      return Promise.resolve();
    }

    return pullFromDrive().then(function (results) {
      var restored = results.filter(function (r) { return r.result === 'restored' || r.result === 'remote_wins'; });
      if (restored.length > 0) {
        _showToast('☁️ Drive에서 데이터를 복원했어요.', 4000);
        // UI 재렌더링 (각 탭 데이터 새로고침)
        _refreshUI();
      }
      _lastSync = new Date();
      _updateSyncLabel();
      if (typeof updateDriveBackupUI === 'function') updateDriveBackupUI();
    }).catch(function (err) {
      console.warn('[SyncManager] fullSync failed:', err);
      _showToast('⚠️ Drive 동기화 실패. 로컬 데이터로 계속합니다.', 4000);
    });
  }

  // ── migrateGuestData ──
  // 비로그인(_guest) → 로그인(_{googleSub}) 키 이전
  // 로그인 직후, pullFromDrive 전에 호출
  function migrateGuestData(googleSub) {
    var MIGRATE_KEYS = [
      { base: 'bhm_hr_profile',  dataType: 'profile' },
      { base: 'overtimeRecords', dataType: 'overtime' },
      { base: 'leaveRecords',    dataType: 'leave' },
      { base: 'otManualHourly',  dataType: null }
    ];

    var guestSuffix = '_guest';
    var newSuffix = '_' + googleSub;
    var migrated = [];

    MIGRATE_KEYS.forEach(function (item) {
      var guestKey = item.base + guestSuffix;
      var newKey = item.base + newSuffix;
      var guestData = localStorage.getItem(guestKey);
      if (!guestData) return;

      // 이미 로그인 키에 데이터가 있으면 덮어쓰지 않음 (Drive 데이터 보존)
      if (!localStorage.getItem(newKey)) {
        localStorage.setItem(newKey, guestData);
        migrated.push(item.base);
      }
      localStorage.removeItem(guestKey);
    });

    if (migrated.length > 0) {
      console.log('[SyncManager] migrated guest keys:', migrated);
    }
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

  return {
    enqueuePush: enqueuePush,
    pushToDrive: pushToDrive,
    pullFromDrive: pullFromDrive,
    fullSync: fullSync,
    migrateGuestData: migrateGuestData,
    resolveConflict: resolveConflict
  };
})();
