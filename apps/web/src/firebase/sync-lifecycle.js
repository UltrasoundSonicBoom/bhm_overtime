// firebase/sync-lifecycle.js
// Central lifecycle boundary for auth-scoped local state and UI refresh.

import { KEY_REGISTRY, localKeyFor, localScopeOf, syncKeys } from './key-registry.js';

export const AUTH_BRIDGE_FIELDS = ['googleSub', 'googleEmail', 'cachedProfile', 'displayName'];
export const DOMAIN_REFRESH_EVENTS = ['profileChanged', 'overtimeChanged', 'leaveChanged', 'payslipChanged'];

function _readSettings() {
  try { return JSON.parse(localStorage.getItem('snuhmate_settings') || '{}'); }
  catch { return {}; }
}

function _writeSettings(settings) {
  localStorage.setItem('snuhmate_settings', JSON.stringify(settings || {}));
}

function _escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function _dispatch(name, detail) {
  if (typeof window === 'undefined') return;
  try { window.dispatchEvent(new CustomEvent(name, { detail })); }
  catch { /* noop */ }
}

export function stripDeviceLocalSettings(settings) {
  const clean = { ...(settings || {}) };
  for (const field of AUTH_BRIDGE_FIELDS) delete clean[field];
  return clean;
}

export function mergeCloudSettingsForLocal(localSettings, cloudSettings) {
  const local = localSettings || {};
  const cloud = stripDeviceLocalSettings(cloudSettings || {});
  const merged = { ...local, ...cloud };
  for (const field of AUTH_BRIDGE_FIELDS) {
    if (local[field] !== undefined) merged[field] = local[field];
  }
  return merged;
}

export function setAuthBridge(userOrUid) {
  const uid = typeof userOrUid === 'string' ? userOrUid : userOrUid?.uid;
  if (!uid) return;
  if (typeof window !== 'undefined') window.__firebaseUid = uid;
  const settings = _readSettings();
  settings.googleSub = uid;
  if (userOrUid && typeof userOrUid === 'object') {
    if (userOrUid.email) settings.googleEmail = userOrUid.email;
    if (userOrUid.displayName) settings.displayName = userOrUid.displayName;
  }
  _writeSettings(settings);
}

export function clearAuthBridge() {
  const settings = _readSettings();
  for (const field of AUTH_BRIDGE_FIELDS) delete settings[field];
  _writeSettings(settings);
}

export function emitDomainRefresh(detail = {}, options = {}) {
  const eventDetail = { source: 'sync-lifecycle', ...detail };
  for (const name of DOMAIN_REFRESH_EVENTS) _dispatch(name, eventDetail);
  if (options.cloudHydrated !== false) {
    _dispatch('app:cloud-hydrated', eventDetail);
  }
}

export function clearActiveUserLocalData(uid) {
  if (!uid) return [];
  const removed = [];

  for (const baseKey of syncKeys()) {
    if (localScopeOf(baseKey) !== 'user') continue;
    const key = localKeyFor(baseKey, uid);
    if (!key) continue;
    try {
      if (localStorage.getItem(key) !== null) removed.push(key);
      localStorage.removeItem(key);
    } catch { /* noop */ }
  }

  try {
    const payslipRe = new RegExp('^payslip_' + _escapeRe(uid) + '_\\d{4}_\\d{2}(?:_.+)?$');
    for (const key of Object.keys(localStorage)) {
      if (!payslipRe.test(key)) continue;
      removed.push(key);
      localStorage.removeItem(key);
    }
  } catch { /* noop */ }

  return removed;
}

export function login(userOrUid) {
  setAuthBridge(userOrUid);
  const uid = typeof userOrUid === 'string' ? userOrUid : userOrUid?.uid;
  _dispatch('app:sync-login', { uid });
}

export async function hydrate(uid) {
  if (!uid) return { ok: [], failed: ['no-uid'] };
  const mod = await import('./hydrate.js');
  return mod.hydrateFromFirestore(uid);
}

export function logout(uid) {
  const removed = clearActiveUserLocalData(uid);
  clearAuthBridge();
  if (typeof window !== 'undefined') delete window.__firebaseUid;
  emitDomainRefresh({ uid, reason: 'logout', removed }, { cloudHydrated: false });
  _dispatch('app:auth-data-reset', { uid, removed });
  return removed;
}

export function assertSyncKeyCoverage() {
  return syncKeys().map((baseKey) => ({
    baseKey,
    localKey: localKeyFor(baseKey, 'UID'),
    firestorePath: KEY_REGISTRY[baseKey]?.firestorePath?.('UID') || null,
    category: KEY_REGISTRY[baseKey]?.category || null,
  }));
}
