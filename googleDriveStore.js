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
  // token 을 반드시 인자로 받는다. window.GoogleAuth.getAccessToken() 는 async 라
  // 여기서 직접 호출하면 Promise 객체가 'Bearer ' 에 문자열화돼 401 을 유발한다.
  function _headers(token, extra) {
    if (!token) throw new Error('Drive: access token 없음. 먼저 로그인하세요.');
    var h = { Authorization: 'Bearer ' + token };
    return Object.assign(h, extra || {});
  }

  // 공통: Google 응답을 검사해 401/403 을 사용자/텔레메트리에 surface.
  function _checkResponse(r, context) {
    if (r.ok) return r;
    if (r.status === 401 || r.status === 403) {
      return r.clone().text().then(function (body) {
        var reason = body;
        try { var j = JSON.parse(body); reason = (j && j.error && (j.error.message || j.error.status)) || body; } catch (_) {}
        console.warn('[DriveStore] ' + r.status + ' ' + context + ' reason=' + String(reason).slice(0, 300));
        if (window.Telemetry && typeof window.Telemetry.error === 'function') {
          try { window.Telemetry.error('drive_auth_error', { status: r.status, context: context, reason: String(reason).slice(0, 300) }); } catch (_) {}
        }
        return r;
      });
    }
    return r;
  }

  // ── token 확보 후 콜백 실행 (백그라운드 sync 용 — silent). ──
  // GoogleAuth.getAccessToken() 은 async → 반드시 await.
  // 토큰 없으면 refreshToken() 1회 재시도, 그래도 없으면 reject.
  function _withToken(fn) {
    var gauth = window.GoogleAuth;
    if (!gauth) return Promise.reject(new Error('Drive: GoogleAuth 미초기화'));
    return Promise.resolve(gauth.getAccessToken()).then(function (token) {
      if (token) return fn(token);
      return Promise.resolve(gauth.refreshToken && gauth.refreshToken()).then(function (t2) {
        if (!t2) throw new Error('Drive: access token 없음 (로그인 필요)');
        return fn(t2);
      });
    });
  }

  // 사용자 액션 경로 용 — silent refresh 우선, 실패 시 interactive picker 허용.
  function _withTokenInteractive(fn) {
    var gauth = window.GoogleAuth;
    if (!gauth) return Promise.reject(new Error('Drive: GoogleAuth 미초기화'));
    return Promise.resolve(gauth.getAccessToken()).then(function (token) {
      if (token) return fn(token);
      var ensure = (typeof gauth.ensureTokenInteractive === 'function')
        ? gauth.ensureTokenInteractive
        : gauth.refreshToken;
      return Promise.resolve(ensure.call(gauth)).then(function (t2) {
        if (!t2) throw new Error('Drive: access token 없음 (로그인 필요)');
        return fn(t2);
      });
    });
  }

  // ── 파일 ID 조회 (캐시 우선) ──
  function _getFileId(name) {
    if (_fileIdCache[name]) return Promise.resolve(_fileIdCache[name]);

    return _withToken(function (token) {
      return fetch(
        BASE_URL + '/files?spaces=appDataFolder&fields=files(id,name)&q=' + encodeURIComponent("name='" + name + "'"),
        { headers: _headers(token) }
      ).then(function (r) { return _checkResponse(r, 'list(' + name + ')'); });
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
  function _createFile(name, body, mimeType, parentId) {
    var metadata = JSON.stringify({ name: name, parents: [parentId || 'appDataFolder'] });
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

        _withToken(function (token) {
          return fetch(UPLOAD_URL + '/files?uploadType=multipart', {
            method: 'POST',
            headers: Object.assign(_headers(token), { 'Content-Type': 'multipart/related; boundary=' + boundary }),
            body: merged
          }).then(function (r) { return _checkResponse(r, 'create(' + name + ')'); });
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

    return _withToken(function (token) {
      return fetch(UPLOAD_URL + '/files/' + fileId + '?uploadType=media', {
        method: 'PATCH',
        headers: Object.assign(_headers(token), { 'Content-Type': contentType }),
        body: content
      }).then(function (r) { return _checkResponse(r, 'update(' + fileId + ')'); });
    }).then(function (r) {
      if (!r.ok) throw new Error('Drive update ' + r.status);
      return r.json();
    });
  }

  // ── listAppDataFiles ──
  // appDataFolder 안에서 name 이 prefix 로 시작하는 파일 목록 조회.
  // Drive search 는 'name contains' 를 제공하므로 정확한 prefix 매칭이 아니지만,
  // 호출자가 prefix 로 추가 필터링한다. (예: 'payslip_' prefix → 'payslips/payslip_...' 도 포함)
  function listAppDataFiles(prefix) {
    var q = "trashed=false";
    if (prefix) q += " and name contains '" + String(prefix).replace(/'/g, "\\'") + "'";
    return _withToken(function (token) {
      return fetch(
        BASE_URL + '/files?spaces=appDataFolder&pageSize=1000&fields=files(id,name)&q=' + encodeURIComponent(q),
        { headers: _headers(token) }
      ).then(function (r) { return _checkResponse(r, 'list(' + (prefix || 'all') + ')'); });
    }).then(function (r) {
      if (!r.ok) throw new Error('Drive list ' + r.status);
      return r.json();
    }).then(function (data) {
      var list = (data.files || []).map(function (f) { return { id: f.id, name: f.name }; });
      if (prefix) {
        list = list.filter(function (f) { return String(f.name).indexOf(prefix) >= 0; });
      }
      return list;
    }).catch(function (err) {
      console.warn('[DriveStore] listAppDataFiles(' + prefix + ') failed:', err);
      return [];
    });
  }

  // ── readJsonFile ──
  function readJsonFile(name) {
    return _getFileId(name).then(function (fileId) {
      if (!fileId) return null;
      return _withToken(function (token) {
        return fetch(BASE_URL + '/files/' + fileId + '?alt=media', { headers: _headers(token) })
          .then(function (r) { return _checkResponse(r, 'read(' + name + ')'); });
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
      return _withToken(function (token) {
        return fetch(BASE_URL + '/files/' + fileId, {
          method: 'DELETE',
          headers: _headers(token)
        }).then(function (r) { return _checkResponse(r, 'delete(' + name + ')'); });
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

  // ── My Drive 폴더 찾기/생성 ──
  var _myDriveFolderCache = {};

  function _findOrCreateFolder(name, parentId) {
    var cacheKey = (parentId || 'root') + '/' + name;
    if (_myDriveFolderCache[cacheKey]) return Promise.resolve(_myDriveFolderCache[cacheKey]);

    var q = "mimeType='application/vnd.google-apps.folder' and name='" + name.replace(/'/g, "\\'") + "' and trashed=false";
    if (parentId) q += " and '" + parentId + "' in parents";

    return _withToken(function (token) {
      return fetch(BASE_URL + '/files?q=' + encodeURIComponent(q) + '&fields=files(id)', { headers: _headers(token) })
        .then(function (r) { return _checkResponse(r, 'folderList(' + name + ')'); });
    }).then(function (r) {
      if (!r.ok) return r.text().then(function (t) { throw new Error('folder list[' + name + '] ' + r.status + ': ' + t); });
      return r.json();
    }).then(function (data) {
      if (data.files && data.files.length > 0) {
        _myDriveFolderCache[cacheKey] = data.files[0].id;
        return data.files[0].id;
      }
      var meta = { name: name, mimeType: 'application/vnd.google-apps.folder' };
      if (parentId) meta.parents = [parentId];
      return _withToken(function (token) {
        return fetch(BASE_URL + '/files', {
          method: 'POST',
          headers: Object.assign(_headers(token), { 'Content-Type': 'application/json' }),
          body: JSON.stringify(meta)
        }).then(function (r) { return _checkResponse(r, 'folderCreate(' + name + ')'); });
      }).then(function (r) {
        if (!r.ok) return r.text().then(function (t) { throw new Error('folder create[' + name + '] ' + r.status + ': ' + t); });
        return r.json();
      }).then(function (folder) {
        _myDriveFolderCache[cacheKey] = folder.id;
        return folder.id;
      });
    });
  }

  // ── uploadPdfToMyDrive ──
  // PDF 원본을 사용자 My Drive에 저장 (drive.file scope 필요)
  // 경로: 내 드라이브/snuhmate/YYMM/YYMM_{title}.pdf
  //   title 예: '급여명세서', '급여명세서_연차수당'
  //   ym: { year, month } — YY=년 끝2자리, MM=2자리 월
  function uploadPdfToMyDrive(title, blob, ym) {
    if (!ym || !ym.year || !ym.month) {
      console.warn('[DriveStore] uploadPdfToMyDrive: ym 누락');
      return Promise.resolve(null);
    }
    var yy = String(ym.year).slice(-2);
    var mm = String(ym.month).padStart(2, '0');
    var ymPrefix = yy + mm;
    var fileName = ymPrefix + '_' + title + '.pdf';

    // 사용자 클릭 직후 경로 → interactive token (만료 시 picker 허용)
    // 폴더 조회/생성 + 파일 upload 까지 같은 세션 토큰으로 수행한다.
    return _withTokenInteractive(function (token) {
      return _findOrCreateFolder('snuhmate', null)
        .then(function (rootId) { return _findOrCreateFolder(ymPrefix, rootId); })
        .then(function (folderId) {
          var q = "name='" + fileName.replace(/'/g, "\\'") + "' and '" + folderId + "' in parents and trashed=false";
          return fetch(BASE_URL + '/files?q=' + encodeURIComponent(q) + '&fields=files(id)', { headers: _headers(token) })
            .then(function (r) { return _checkResponse(r, 'myDriveList(' + fileName + ')'); })
            .then(function (r) {
              if (!r.ok) return r.text().then(function (t) { throw new Error('list ' + r.status + ': ' + t); });
              return r.json();
            })
            .then(function (data) {
              if (data.files && data.files.length > 0) {
                return _updateFile(data.files[0].id, blob, 'application/pdf');
              } else {
                return _createFile(fileName, blob, 'application/pdf', folderId);
              }
            });
        });
    }).catch(function (err) {
      var msg = (err && err.message) ? err.message : String(err);
      console.error('[DriveStore] uploadPdfToMyDrive failed:', err);
      // 원인을 사용자에게 보여준다 (토큰/권한/네트워크 중 어느 층에서 터졌는지 진단용).
      _showToast('⚠️ PDF 저장 실패: ' + msg.slice(0, 140));
      return null;
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
    listAppDataFiles: listAppDataFiles,
    deleteFile: deleteFile,
    uploadPdf: uploadPdf,
    uploadPdfToMyDrive: uploadPdfToMyDrive,
    // 테스트/디버그용
    _getFileId: _getFileId,
    _clearCache: function () { _fileIdCache = {}; _myDriveFolderCache = {}; }
  };
})();
