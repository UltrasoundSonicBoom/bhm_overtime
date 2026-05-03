// firebase/sync/career-events-sync.js — 커리어 타임라인 통합 이벤트 Firestore sync
//
// collection-by-id: 각 event → users/{uid}/careerEvents/{eventId}
// 암호화: title, sub, amount, detailTokens (id/category/dateFrom/dateTo/badge/flags 평문)
//
// work-history-sync.js 와 동일 패턴 (collection-by-id, full replace semantics).

import { initFirebase } from '../firebase-init.js';
import { firebaseConfig } from '../../client/config.js';
import { deriveKey, encryptDoc, decryptDoc } from '../crypto.js';
import { ENCRYPTED_FIELDS } from './_encrypted-fields.js';
import { mockFirestoreMod } from './mock-firestore.js';

const COLLECTION = (uid) => `users/${uid}/careerEvents`;

export async function writeAllCareerEvents(dbOrNull, uid, events) {
  if (!Array.isArray(events)) return;
  const key = await deriveKey(uid);
  const encFields = ENCRYPTED_FIELDS['careerEvents/*'];
  const { db, firestoreMod } = dbOrNull
    ? { db: dbOrNull, firestoreMod: mockFirestoreMod() }
    : await _f();

  const nextIds = new Set(events.filter(ev => ev && ev.id).map(ev => String(ev.id)));
  const col = firestoreMod.collection(db, COLLECTION(uid));
  const snap = await firestoreMod.getDocs(col);
  if (!snap.empty) {
    await Promise.all(snap.docs.map((docSnap) => {
      const eventId = docSnap.id || docSnap._path?.split('/').pop();
      if (!eventId || nextIds.has(String(eventId))) return Promise.resolve();
      const ref = firestoreMod.doc(db, `${COLLECTION(uid)}/${eventId}`);
      return firestoreMod.deleteDoc(ref);
    }));
  }

  await Promise.all(events.map(async (ev) => {
    if (!ev || !ev.id) return;
    // dynamic 이벤트(`dyn-leave-*`)는 매 렌더 재계산 — Firestore 저장 제외
    if (ev.dynamic) return;
    const docData = { ...ev, lastEditAt: Date.now() };
    const encrypted = await encryptDoc(docData, encFields, key);
    const ref = firestoreMod.doc(db, `${COLLECTION(uid)}/${ev.id}`);
    await firestoreMod.setDoc(ref, encrypted);
  }));
}

export async function readAllCareerEvents(dbOrNull, uid) {
  const key = await deriveKey(uid);
  const encFields = ENCRYPTED_FIELDS['careerEvents/*'];
  const { db, firestoreMod } = dbOrNull
    ? { db: dbOrNull, firestoreMod: mockFirestoreMod() }
    : await _f();

  const col = firestoreMod.collection(db, COLLECTION(uid));
  const snap = await firestoreMod.getDocs(col);
  if (snap.empty) return [];

  const results = await Promise.all(snap.docs.map(async (d) => {
    const raw = d.data();
    const dec = await decryptDoc(raw, encFields, key);
    delete dec.lastEditAt;
    return dec;
  }));
  return results;
}

export async function deleteCareerEventEntry(dbOrNull, uid, eventId) {
  const { db, firestoreMod } = dbOrNull
    ? { db: dbOrNull, firestoreMod: mockFirestoreMod() }
    : await _f();
  const ref = firestoreMod.doc(db, `${COLLECTION(uid)}/${eventId}`);
  await firestoreMod.deleteDoc(ref);
}

let _firebase = null;
async function _f() {
  if (!_firebase) _firebase = await initFirebase(firebaseConfig);
  return { db: _firebase.db, firestoreMod: _firebase.firestoreMod };
}
