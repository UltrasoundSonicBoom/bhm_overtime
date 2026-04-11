// ============================================================
// googleCalendarSync.js — 휴가 → Google Calendar 연동
// Phase 3: 휴가 기록을 전용 캘린더에 자동 동기화
// ============================================================
// 시간외(overtime)는 캘린더에 넣지 않음. 휴가(leave)만 연동.
//
// 사용:
//   window.GoogleCalendarSync.createOrUpdateEvent(leaveRecord)
//   window.GoogleCalendarSync.deleteEvent(leaveRecord)
//   window.GoogleCalendarSync.resyncAll()
//   window.GoogleCalendarSync.disconnect()

window.GoogleCalendarSync = (function () {
  'use strict';

  var CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
  var CALENDAR_NAME = 'SNUH Mate 휴가';
  var BHM_SOURCE = 'bhm_overtime';
  var BHM_VERSION = '1';

  // 전용 캘린더 ID 캐시 (bhm_settings.calendarId 에도 저장)
  var _calendarId = null;

  // ── 인증 헤더 ──
  function _headers(extra) {
    var token = window.GoogleAuth && window.GoogleAuth.getAccessToken();
    if (!token) throw new Error('Calendar: access token 없음');
    return Object.assign({ Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, extra || {});
  }

  // ── token 유효성 확인 후 1회 refresh ──
  function _withToken(fn) {
    var token = window.GoogleAuth && window.GoogleAuth.getAccessToken();
    if (token) return Promise.resolve().then(fn);
    return window.GoogleAuth.refreshToken().then(fn);
  }

  // ── Calendar 사용 가능 여부 ──
  function _calendarReady() {
    if (!window.GoogleAuth || !window.GoogleAuth.isSignedIn()) return false;
    var settings = window.loadSettings ? window.loadSettings() : {};
    return !!settings.calendarEnabled;
  }

  // ── 전용 캘린더 확보 (없으면 생성) ──
  function ensureDedicatedCalendar() {
    // 설정에 저장된 캘린더 ID 먼저 확인
    var settings = window.loadSettings ? window.loadSettings() : {};
    if (_calendarId) return Promise.resolve(_calendarId);
    if (settings.calendarId) {
      _calendarId = settings.calendarId;
      return Promise.resolve(_calendarId);
    }

    // 캘린더 목록 조회 → "SNUH Mate 휴가" 찾기
    return _withToken(function () {
      return fetch(CALENDAR_API + '/users/me/calendarList', { headers: _headers() });
    }).then(function (r) {
      if (!r.ok) throw new Error('calendarList ' + r.status);
      return r.json();
    }).then(function (data) {
      var existing = (data.items || []).find(function (c) { return c.summary === CALENDAR_NAME; });
      if (existing) {
        _calendarId = existing.id;
        if (window.saveSettings) window.saveSettings({ calendarId: _calendarId });
        return _calendarId;
      }

      // 없으면 새 캘린더 생성
      return _withToken(function () {
        return fetch(CALENDAR_API + '/calendars', {
          method: 'POST',
          headers: _headers(),
          body: JSON.stringify({ summary: CALENDAR_NAME, timeZone: 'Asia/Seoul' })
        });
      }).then(function (r) {
        if (!r.ok) throw new Error('createCalendar ' + r.status);
        return r.json();
      }).then(function (cal) {
        _calendarId = cal.id;
        if (window.saveSettings) window.saveSettings({ calendarId: _calendarId });
        return _calendarId;
      });
    });
  }

  // ── 이벤트 body 생성 ──
  function _buildEventBody(record) {
    var settings = window.loadSettings ? window.loadSettings() : {};
    var privacyMode = settings.calendarPrivacyMode || 'genericTitle';

    // 이벤트 제목
    var summary;
    if (privacyMode === 'detailedTitle') {
      // type 레이블 (data.js의 leaveQuotas.types 참조)
      var typeLabel = record.category || record.type || '휴가';
      summary = typeLabel;
    } else {
      summary = '휴가';
    }

    var body = {
      summary: summary,
      visibility: 'private',
      transparency: 'opaque',
      extendedProperties: {
        private: {
          bhmLeaveId: record.id,
          bhmType: record.type || '',
          bhmSource: BHM_SOURCE,
          bhmVersion: BHM_VERSION
        }
      }
    };

    if (record.type === 'time_leave' && record.hours && record.hours > 0) {
      // 시간차 → timed event (09:00 시작, hours만큼)
      var startDt = record.startDate + 'T09:00:00+09:00';
      var endMs = new Date(record.startDate + 'T09:00:00+09:00').getTime() + record.hours * 3600000;
      var endDt = new Date(endMs).toISOString().replace('Z', '+09:00').replace(/\.\d{3}/, '');
      body.start = { dateTime: startDt, timeZone: 'Asia/Seoul' };
      body.end = { dateTime: endDt, timeZone: 'Asia/Seoul' };
    } else {
      // 날짜 단위 → all-day event (end는 endDate +1일)
      var endDate = new Date(record.endDate);
      endDate.setDate(endDate.getDate() + 1);
      var endStr = endDate.toISOString().split('T')[0];
      body.start = { date: record.startDate };
      body.end = { date: endStr };
    }

    return body;
  }

  // ── createOrUpdateEvent ──
  function createOrUpdateEvent(record) {
    if (!_calendarReady()) return Promise.resolve();

    return ensureDedicatedCalendar().then(function (calId) {
      var body = _buildEventBody(record);

      if (record.googleEventId) {
        // 기존 이벤트 업데이트 (PUT)
        return _withToken(function () {
          return fetch(CALENDAR_API + '/calendars/' + encodeURIComponent(calId) + '/events/' + record.googleEventId, {
            method: 'PUT',
            headers: _headers(),
            body: JSON.stringify(body)
          });
        }).then(function (r) {
          if (r.status === 404) {
            // 이벤트가 삭제된 경우 → 새로 생성
            record.googleEventId = null;
            return createOrUpdateEvent(record);
          }
          if (!r.ok) throw new Error('updateEvent ' + r.status);
          return r.json();
        }).then(function (evt) {
          if (evt && evt.id) _persistEventId(record, evt.id);
        });
      } else {
        // 새 이벤트 생성 (POST)
        return _withToken(function () {
          return fetch(CALENDAR_API + '/calendars/' + encodeURIComponent(calId) + '/events', {
            method: 'POST',
            headers: _headers(),
            body: JSON.stringify(body)
          });
        }).then(function (r) {
          if (!r.ok) throw new Error('createEvent ' + r.status);
          return r.json();
        }).then(function (evt) {
          if (evt && evt.id) _persistEventId(record, evt.id);
        });
      }
    });
  }

  // ── deleteEvent ──
  function deleteEvent(record) {
    if (!_calendarReady()) return Promise.resolve();
    if (!record.googleEventId) return Promise.resolve();

    return ensureDedicatedCalendar().then(function (calId) {
      return _withToken(function () {
        return fetch(CALENDAR_API + '/calendars/' + encodeURIComponent(calId) + '/events/' + record.googleEventId, {
          method: 'DELETE',
          headers: _headers()
        });
      }).then(function (r) {
        if (r.ok || r.status === 404 || r.status === 410) return; // 이미 삭제된 경우도 정상
        throw new Error('deleteEvent ' + r.status);
      });
    });
  }

  // ── googleEventId를 leave 레코드에 저장 ──
  function _persistEventId(record, eventId) {
    record.googleEventId = eventId;
    // LEAVE 모듈을 통해 localStorage 업데이트
    if (window.LEAVE) {
      var all = window.LEAVE._loadAll();
      var year = record.startDate.split('-')[0];
      if (all[year]) {
        var idx = all[year].findIndex(function (r) { return r.id === record.id; });
        if (idx !== -1) {
          all[year][idx].googleEventId = eventId;
          window.LEAVE._saveAll(all);
        }
      }
    }
  }

  // ── resyncMonth ──
  function resyncMonth(year, month) {
    if (!_calendarReady()) return Promise.resolve();
    var records = window.LEAVE ? window.LEAVE.getMonthRecords(year, month) : [];
    return records.reduce(function (chain, record) {
      return chain.then(function () {
        return createOrUpdateEvent(record).catch(function (e) {
          console.warn('[Calendar] resyncMonth record failed:', e);
        });
      });
    }, Promise.resolve());
  }

  // ── resyncAll ──
  function resyncAll() {
    if (!_calendarReady()) return Promise.resolve();
    if (!window.LEAVE) return Promise.resolve();

    var all = window.LEAVE._loadAll();
    var records = [];
    Object.values(all).forEach(function (yearRecords) {
      records = records.concat(yearRecords);
    });

    // 순차 처리 (rate limit 방지)
    return records.reduce(function (chain, record) {
      return chain.then(function () {
        return createOrUpdateEvent(record).catch(function (e) {
          console.warn('[Calendar] resyncAll record failed:', e);
        });
      });
    }, Promise.resolve());
  }

  // ── disconnect ──
  // Calendar 연동 해제 (캘린더 자체는 삭제하지 않음)
  function disconnect() {
    _calendarId = null;
    if (window.saveSettings) window.saveSettings({ calendarEnabled: false, calendarId: null });
    if (typeof updateCalendarUI === 'function') updateCalendarUI();
  }

  return {
    createOrUpdateEvent: createOrUpdateEvent,
    deleteEvent: deleteEvent,
    ensureDedicatedCalendar: ensureDedicatedCalendar,
    resyncMonth: resyncMonth,
    resyncAll: resyncAll,
    disconnect: disconnect,
    // 테스트용
    _buildEventBody: _buildEventBody
  };
})();
