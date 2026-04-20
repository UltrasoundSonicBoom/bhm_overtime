// chrome-extension/shared/auth.js
'use strict';
const BhmAuth = {
  AUTO_LOCK_MS:  30 * 60 * 1000,
  LOCK_DURATION: 60 * 60 * 1000,
  MAX_ATTEMPTS:  5,

  async hashPin(pin) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  },

  _isLockExpired(ms)    { return ms == null || Date.now() > ms; },
  _isAutoLocked(ms)     { return ms == null || Date.now() - ms > BhmAuth.AUTO_LOCK_MS; },

  async checkLockState(storage) {
    const d = await storage.get([
      storage.KEYS.PIN_HASH, storage.KEYS.PIN_LOCKED_UNTIL, storage.KEYS.PIN_UNLOCKED_AT,
    ]);
    if (!d[storage.KEYS.PIN_HASH]) return { status: 'no_pin' };
    const lu = d[storage.KEYS.PIN_LOCKED_UNTIL] || null;
    if (!BhmAuth._isLockExpired(lu)) return { status: 'locked', lockedUntil: lu };
    if (BhmAuth._isAutoLocked(d[storage.KEYS.PIN_UNLOCKED_AT] || null)) return { status: 'requires_pin' };
    return { status: 'unlocked' };
  },

  async verifyPin(pin, storage) {
    // reset attempts counter if previous lockout has expired
    const lockedUntil = (await storage.get([storage.KEYS.PIN_LOCKED_UNTIL]))[storage.KEYS.PIN_LOCKED_UNTIL];
    if (lockedUntil && BhmAuth._isLockExpired(lockedUntil)) {
      await storage.remove([storage.KEYS.PIN_LOCKED_UNTIL, storage.KEYS.PIN_ATTEMPTS]);
    }
    const d = await storage.get([storage.KEYS.PIN_HASH, storage.KEYS.PIN_ATTEMPTS]);
    if (!d[storage.KEYS.PIN_HASH]) return { ok: false, error: 'no_pin' };
    const hash = await BhmAuth.hashPin(pin);
    if (hash !== d[storage.KEYS.PIN_HASH]) {
      const attempts = (d[storage.KEYS.PIN_ATTEMPTS] || 0) + 1;
      const update = { [storage.KEYS.PIN_ATTEMPTS]: attempts };
      if (attempts >= BhmAuth.MAX_ATTEMPTS)
        update[storage.KEYS.PIN_LOCKED_UNTIL] = Date.now() + BhmAuth.LOCK_DURATION;
      await storage.set(update);
      return { ok: false, attempts, locked: attempts >= BhmAuth.MAX_ATTEMPTS };
    }
    await storage.set({
      [storage.KEYS.PIN_ATTEMPTS]: 0,
      [storage.KEYS.PIN_LOCKED_UNTIL]: null,
      [storage.KEYS.PIN_UNLOCKED_AT]: Date.now(),
    });
    return { ok: true };
  },

  async setPin(pin, storage) {
    const hash = await BhmAuth.hashPin(pin);
    await storage.set({
      [storage.KEYS.PIN_HASH]: hash,
      [storage.KEYS.PIN_ATTEMPTS]: 0,
      [storage.KEYS.PIN_LOCKED_UNTIL]: null,
      [storage.KEYS.PIN_UNLOCKED_AT]: Date.now(),
    });
  },

  getToken(interactive) {
    return new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive }, token => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(token);
      });
    });
  },

  async fetchProfile(token) {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo',
      { headers: { Authorization: 'Bearer ' + token } });
    if (!res.ok) throw new Error('userinfo ' + res.status);
    const d = await res.json();
    return { sub: d.sub, email: d.email, name: d.name, picture: d.picture };
  },

  async signOut(storage) {
    try {
      const token = await BhmAuth.getToken(false);
      await new Promise(r => chrome.identity.removeCachedAuthToken({ token }, r));
      await fetch('https://accounts.google.com/o/oauth2/revoke?token=' + token);
    } catch (_) {}
    await storage.remove([...Object.values(storage.KEYS), 'bhm_last_pdf']);
  },
};
if (typeof module !== 'undefined') {
  if (typeof crypto === 'undefined') global.crypto = require('crypto').webcrypto;
  module.exports = { BhmAuth };
}
