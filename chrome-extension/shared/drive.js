// chrome-extension/shared/drive.js
'use strict';
function _driveEsc(s) { return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
const BhmDrive = {
  BASE:   'https://www.googleapis.com/drive/v3',
  UPLOAD: 'https://www.googleapis.com/upload/drive/v3',

  async _findFile(name, token) {
    const q = encodeURIComponent("name='" + _driveEsc(name) + "' and trashed=false");
    const r = await fetch(
      BhmDrive.BASE + '/files?spaces=appDataFolder&q=' + q + '&fields=files(id)',
      { headers: { Authorization: 'Bearer ' + token } });
    const d = await r.json();
    return (d.files && d.files[0]) ? d.files[0].id : null;
  },

  async readJson(name, token) {
    const id = await BhmDrive._findFile(name, token);
    if (!id) return null;
    const r = await fetch(BhmDrive.BASE + '/files/' + id + '?alt=media',
      { headers: { Authorization: 'Bearer ' + token } });
    return r.ok ? r.json() : null;
  },

  async writeJson(name, payload, token) {
    const body = JSON.stringify({ schemaVersion: 1, updatedAt: new Date().toISOString(), data: payload });
    const id   = await BhmDrive._findFile(name, token);
    if (id) {
      await fetch(BhmDrive.UPLOAD + '/files/' + id + '?uploadType=media', {
        method: 'PATCH',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body,
      });
    } else {
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify({ name, parents: ['appDataFolder'] })], { type: 'application/json' }));
      form.append('file',     new Blob([body], { type: 'application/json' }));
      await fetch(BhmDrive.UPLOAD + '/files?uploadType=multipart', {
        method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: form,
      });
    }
  },

  async _ensureFolder(name, parentId, token) {
    const pq = parentId ? " and '" + parentId + "' in parents" : " and 'root' in parents";
    const q  = encodeURIComponent("name='" + _driveEsc(name) + "' and mimeType='application/vnd.google-apps.folder'" + pq + " and trashed=false");
    const r  = await fetch(BhmDrive.BASE + '/files?q=' + q + '&fields=files(id)',
      { headers: { Authorization: 'Bearer ' + token } });
    const d  = await r.json();
    if (d.files && d.files[0]) return d.files[0].id;
    const cr = await fetch(BhmDrive.BASE + '/files', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', parents: parentId ? [parentId] : [] }),
    });
    return (await cr.json()).id;
  },

  async uploadPdf(filename, base64, token) {
    const binary   = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const parentId = await BhmDrive._ensureFolder('BHM Overtime', null, token)
      .then(id => BhmDrive._ensureFolder('급여명세서', id, token));
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify({ name: filename, parents: [parentId] })], { type: 'application/json' }));
    form.append('file',     new Blob([binary], { type: 'application/pdf' }));
    await fetch(BhmDrive.UPLOAD + '/files?uploadType=multipart', {
      method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: form,
    });
  },

  async pushAll(storage, token) {
    const d = await storage.get([storage.KEYS.OVERTIME, storage.KEYS.LEAVE, storage.KEYS.PROFILE]);
    await Promise.all([
      BhmDrive.writeJson('overtime.json', d[storage.KEYS.OVERTIME] || [], token),
      BhmDrive.writeJson('leave.json',    d[storage.KEYS.LEAVE]    || [], token),
      BhmDrive.writeJson('profile.json',  d[storage.KEYS.PROFILE]  || {}, token),
    ]);
    await storage.set({ [storage.KEYS.DRIVE_SYNC_AT]: new Date().toISOString() });
  },

  async pullAll(storage, token) {
    const [ot, lv, pr] = await Promise.all([
      BhmDrive.readJson('overtime.json', token),
      BhmDrive.readJson('leave.json',    token),
      BhmDrive.readJson('profile.json',  token),
    ]);
    const update = {};
    if (ot) update[storage.KEYS.OVERTIME] = ot.data;
    if (lv) update[storage.KEYS.LEAVE]    = lv.data;
    if (pr) update[storage.KEYS.PROFILE]  = pr.data;
    if (Object.keys(update).length) await storage.set(update);
  },
};
