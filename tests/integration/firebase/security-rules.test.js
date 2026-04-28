// Phase 8 Task 3 — Firestore Security Rules negative tests (emulator 의존)
//
// 자동 가드: emulator (127.0.0.1:8080) 미기동 시 전체 테스트 SKIP — CI/local 안전.
//
// 검증 6 케이스:
//   1. 비인증 사용자: users/ 차단
//   2. 인증 + 본인 doc read/write 허용
//   3. 인증 + 본인 nested doc (payslip, overtime, leave, work_history, settings) 허용
//   4. 인증 + 다른 uid doc 접근 차단
//   5. users/ 외 경로 차단 (admin/, public/, 루트)
//   6. 비인증 사용자: 본인이라 주장해도 차단
//
// 실행:
//   터미널 1: npx firebase emulators:start --only firestore --project=snuhmate-test
//   터미널 2: npx vitest run tests/integration/firebase/security-rules.test.js

import { describe, it, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const RULES_PATH = path.resolve('firestore.rules');
const EMULATOR_HOST = '127.0.0.1';
const EMULATOR_PORT = 8080;
const PROJECT_ID = 'snuhmate-test';

// top-level await — describe 가 등록되기 전에 평가됨
const emulatorAvailable = await (async () => {
  try {
    const res = await fetch(`http://${EMULATOR_HOST}:${EMULATOR_PORT}/`);
    return res.status >= 100;
  } catch (e) {
    return false;
  }
})();

if (!emulatorAvailable) {
  console.warn('[security-rules.test] emulator (127.0.0.1:8080) 미기동 — 전체 테스트 SKIP');
}

let testEnv = null;
let testingMod = null;

beforeAll(async () => {
  if (!emulatorAvailable) return;
  testingMod = await import('@firebase/rules-unit-testing');
  testEnv = await testingMod.initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: fs.readFileSync(RULES_PATH, 'utf8'),
      host: EMULATOR_HOST,
      port: EMULATOR_PORT,
    },
  });
});

afterAll(async () => {
  if (testEnv) await testEnv.cleanup();
});

const d = emulatorAvailable ? describe : describe.skip;

d('Firestore Security Rules — strict uid match', () => {
  it('비인증 사용자: users/ 차단', async () => {
    const { assertFails } = testingMod;
    const ctx = testEnv.unauthenticatedContext();
    await assertFails(ctx.firestore().doc('users/any/profile/identity').get());
  });

  it('인증 + 본인 doc read/write 허용', async () => {
    const { assertSucceeds } = testingMod;
    const ctx = testEnv.authenticatedContext('alice');
    await assertSucceeds(ctx.firestore().doc('users/alice/profile/identity').set({ name: 'Alice' }));
    await assertSucceeds(ctx.firestore().doc('users/alice/profile/identity').get());
  });

  it('인증 + 본인 nested doc (payslip, overtime, leave, work_history, settings) 허용', async () => {
    const { assertSucceeds } = testingMod;
    const ctx = testEnv.authenticatedContext('alice');
    await assertSucceeds(ctx.firestore().doc('users/alice/payslips/p1').set({ payMonth: '2026-04' }));
    await assertSucceeds(ctx.firestore().doc('users/alice/overtime/202604').set({ entries: [] }));
    await assertSucceeds(ctx.firestore().doc('users/alice/leave/2026').set({ entries: [] }));
    await assertSucceeds(ctx.firestore().doc('users/alice/work_history/wh1').set({ employer: 'X' }));
    await assertSucceeds(ctx.firestore().doc('users/alice/settings/app').set({ theme: 'dark' }));
  });

  it('인증 + 다른 uid doc 접근 차단', async () => {
    const { assertFails } = testingMod;
    const ctx = testEnv.authenticatedContext('alice');
    await assertFails(ctx.firestore().doc('users/bob/profile/identity').get());
    await assertFails(ctx.firestore().doc('users/bob/profile/identity').set({ name: 'X' }));
    await assertFails(ctx.firestore().doc('users/bob/payslips/p1').get());
  });

  it('users/ 외 경로 차단 (admin/, public/, 루트)', async () => {
    const { assertFails } = testingMod;
    const ctx = testEnv.authenticatedContext('alice');
    await assertFails(ctx.firestore().doc('admin/x').get());
    await assertFails(ctx.firestore().doc('public/x').set({ a: 1 }));
    await assertFails(ctx.firestore().doc('any/doc').get());
  });

  it('비인증 사용자: 본인이라 주장해도 차단 (auth null)', async () => {
    const { assertFails } = testingMod;
    const ctx = testEnv.unauthenticatedContext();
    await assertFails(ctx.firestore().doc('users/alice/profile/identity').set({ name: 'X' }));
  });
});
