// firebase/sync/favorites-sync.js — Phase 8 Task 7 즐겨찾기 Firestore sync
//
// doc: users/{uid}/settings/reference
// 암호화: 없음 (favorites 는 규정 ID 배열 — 식별성 없음)

import { initFirebase } from '../firebase-init.js';
import { firebaseConfig } from '../../client/config.js';
import { deriveKey, encryptDoc, decryptDoc } from '../crypto.js';
import { ENCRYPTED_FIELDS } from './_encrypted-fields.js';
import { mockFirestoreMod } from './mock-firestore.js';

const PATH = (uid) => `users/${uid}/settings/reference`;
const ENC_FIELDS = ENCRYPTED_FIELDS['settings/reference'];

export async function writeFavorites(dbOrNull, uid, favorites) {
  const key = await deriveKey(uid);
  const { db, firestoreMod } = dbOrNull
    ? { db: dbOrNull, firestoreMod: mockFirestoreMod() }
    : await _f();

  const docData = { favorites: favorites || [], lastEditAt: Date.now() };
  const encrypted = await encryptDoc(docData, ENC_FIELDS, key);
  const ref = firestoreMod.doc(db, PATH(uid));
  await firestoreMod.setDoc(ref, encrypted, { merge: true });
}

export async function readFavorites(dbOrNull, uid) {
  const key = await deriveKey(uid);
  const { db, firestoreMod } = dbOrNull
    ? { db: dbOrNull, firestoreMod: mockFirestoreMod() }
    : await _f();

  const ref = firestoreMod.doc(db, PATH(uid));
  const snap = await firestoreMod.getDoc(ref);
  if (!snap.exists()) return [];

  const dec = await decryptDoc(snap.data(), ENC_FIELDS, key);
  return dec.favorites || [];
}

let _firebase = null;
async function _f() {
  if (!_firebase) _firebase = await initFirebase(firebaseConfig);
  return { db: _firebase.db, firestoreMod: _firebase.firestoreMod };
}
