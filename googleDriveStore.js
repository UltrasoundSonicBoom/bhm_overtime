// ============================================================
// googleDriveStore.js — Google Drive appDataFolder 파일 CRUD
// Phase 2: Drive 백업 저장소
// ============================================================
// appDataFolder: 앱 전용 숨김 폴더. 사용자 Drive UI에 보이지 않음.
// 타 앱도 접근 불가. 앱 삭제 시 같이 삭제됨.
//
// 사용:
//   window.GoogleDriveStore.readJsonFile('leave.json')    → Promise<object|null>
//   window.GoogleDriveStore.writeJsonFile('leave.json', data) → Promise<void>
//   window.GoogleDriveStore.uploadPdf('payslips/original_2025_03.pdf', blob) → Promise<void>
//   window.GoogleDriveStore.deleteFile('leave.json')      → Promise<void>

window.GoogleDriveStore = (function () {
  'use strict';

  var BASE_URL = 'https://www.googleapis.com/drive/v3';
  var UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3';

  // fileId 캐시: { 'leave.json': 'abc123', ... }
  var _fileIdCache = {};

  // ── 인증 헤더 ──
  function _headers(extra) {
    var token = window.GoogleAuth && window.GoogleAuth.getAccessToken();
    if (!token) throw new Error('Drive: access token 없음. 먼저 로그인하세요.');
    var h = { Authorization: 'Bearer ' + token };
    return Object.assign(h, extra || {});
  }

  // ── token 유효성 확인 후 1회 refresh 재시도 ──
  function _withToken(fn) {
    var token = window.GoogleAuth && window.GoogleAuth.getAccessToken();
    if (token) return Promise.resolve().then(fn);

    // access token 만료 → refresh 후 재시도
    return window.GoogleAuth.refreshToken().then(fn);
  }

  // ── 파일 ID 조회 (캐시 우선) ──
  function _getFileId(name) {
    if (_fileIdCache[name]) return Promise.resolve(_fileIdCache[name]);

    return _withToken(function () {
      return fetch(
        BASE_URL + '/files?spaces=appDataFolder&fields=files(id,name)&q=' + encodeURIComponent("name='" + name + "'"),
        { headers: _headers() }
      );
    }).then(function (r) {
      if (!r.ok) throw new Error('Drive list ' + r.status);
      return r.json();
    }).then(function (data) {
      if (data.files && data.files.length > 0) {
        _fileIdCache[name] = data.files[0].id;
        return data.files[0].id;
      }
      return null;
    });
  }

  // ── 파일 생성 (신규) ──
  function _createFile(name, body, mimeType) {
    var metadata = JSON.stringify({ name: name, parents: ['appDataFolder'] });
    var contentType = mimeType || 'application/json';
    var content = (contentType === 'application/json' && typeof body !== 'string')
      ? JSON.stringify(body) : body;

    // multipart upload
    var boundary = 'bhm_boundary_' + Date.now();
    var parts = '--' + boundary + '\r\n' +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      metadata + '\r\n' +
      '--' + boundary + '\r\n' +
      'Content-Type: ' + contentType + '\r\n\r\n';

    var encoder = new TextEncoder();
    var head = encoder.encode(parts);
    var tail = encoder.encode('\r\n--' + boundary + '--');
    var bodyBytes = (content instanceof Blob)
      ? content : new Blob([content], { type: contentType });

    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var bodyArr = new Uint8Array(reader.result);
        var merged = new Uint8Array(head.length + bodyArr.length + tail.length);
        merged.set(head, 0);
        merged.set(bodyArr, head.length);
        merged.set(tail, head.length + bodyArr.length);

        _withToken(function () {
          return fetch(UPLOAD_URL + '/files?uploadType=multipart', {
            method: 'POST',
            headers: Object.assign(_headers(), { 'Content-Type': 'multipart/related; boundary=' + boundary }),
            body: merged
          });
        }).then(function (r) {
          if (!r.ok) { r.text().then(function (t) { reject(new Error('Drive create ' + r.status + ': ' + t)); }); return; }
          return r.json();
        }).then(function (data) {
          if (data) { _fileIdCache[name] = data.id; }
          resolve(data);
        }).catch(reject);
      };
      reader.onerror = function () { reject(new Error('FileReader error')); };
      if (bodyBytes instanceof Blob) {
        reader.readAsArrayBuffer(bodyBytes);
      } else {
        reader.readAsArrayBuffer(new Blob([bodyBytes]));
      }
    });
  }

  // ── 파일 업데이트 (기존) ──
  function _updateFile(fileId, body, mimeType) {
    var contentType = mimeType || 'application/json';
    var content = (contentType === 'application/json' && typeof body !== 'string')
      ? new Blob([JSON.stringify(body)], { type: contentType })
      : (body instanceof Blob ? body : new Blob([body], { type: contentType }));

    return _withToken(function () {
      return fetch(UPLOAD_URL + '/files/' + fileId + '?uploadType=media', {
        method: 'PATCH',
        headers: Object.assign(_headers(), { 'Content-Type': contentType }),
        body: content
      });
    }).then(function (r) {
      if (!r.ok) throw new Error('Drive update ' + r.status);
      return r.json();
    });
  }

  // ── readJsonFile ──
  function readJsonFile(name) {
    return _getFileId(name).then(function (fileId) {
      if (!fileId) return null;
      return _withToken(function () {
        return fetch(BASE_URL + '/files/' + fileId + '?alt=media', { headers: _headers() });
      }).then(function (r) {
        if (r.status === 404) {
          delete _fileIdCache[name];
          return null;
        }
        if (!r.ok) throw new Error('Drive read ' + r.status);
        return r.json();
      });
    }).catch(function (err) {
      console.warn('[DriveStore] readJsonFile(' + name + ') failed:', err);
      return null;
    });
  }

  // ── writeJsonFile ──
  function writeJsonFile(name, data) {
    return _getFileId(name).then(function (fileId) {
      if (fileId) {
        return _updateFile(fileId, data);
      } else {
        return _createFile(name, data);
      }
    }).catch(function (err) {
      console.warn('[DriveStore] writeJsonFile(' + name + ') failed:', err);
      // 로컬은 이미 저장됨. Drive 실패는 토스트만 표시
      _showToast('⚠️ Drive 저장 실패. 로컬에는 저장됐어요.');
    });
  }

  // ── deleteFile ──
  function deleteFile(name) {
    return _getFileId(name).then(function (fileId) {
      if (!fileId) return;
      return _withToken(function () {
        return fetch(BASE_URL + '/files/' + fileId, {
          method: 'DELETE',
          headers: _headers()
        });
      }).then(function (r) {
        if (r.ok || r.status === 404) {
          delete _fileIdCache[name];
        } else {
          throw new Error('Drive delete ' + r.status);
        }
      });
    }).catch(function (err) {
      console.warn('[DriveStore] deleteFile(' + name + ') failed:', err);
    });
  }

  // ── uploadPdf (Phase 4: 급여명세서 원본 PDF 백업) ──
  function uploadPdf(name, blob) {
    return _getFileId(name).then(function (fileId) {
      if (fileId) {
        return _updateFile(fileId, blob, 'application/pdf');
      } else {
        return _createFile(name, blob, 'application/pdf');
      }
    }).catch(function (err) {
      console.warn('[DriveStore] uploadPdf(' + name + ') failed:', err);
      _showToast('⚠️ PDF 백업 실패.');
    });
  }

  // ── 토스트 헬퍼 ──
  function _showToast(msg) {
    var toast = document.getElementById('otToast');
    if (!toast) return;
    toast.textContent = msg;
    toast.style.display = 'block';
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(function () { toast.style.display = 'none'; }, 4000);
  }

  return {
    readJsonFile: readJsonFile,
    writeJsonFile: writeJsonFile,
    deleteFile: deleteFile,
    uploadPdf: uploadPdf,
    // 테스트/디버그용
    _getFileId: _getFileId,
    _clearCache: function () { _fileIdCache = {}; }
  };
})();
