// chrome-extension/tests/auth.test.js
// 실행: node chrome-extension/tests/auth.test.js
if (typeof crypto === 'undefined') global.crypto = require('crypto').webcrypto;
const { BhmAuth } = require('../shared/auth.js');
const { BhmStorage } = require('../shared/storage.js');
let p = 0, f = 0;
const ok  = (c, m) => c ? (console.log('  PASS', m), p++) : (console.error('  FAIL', m), f++);

async function run() {
  const h1 = await BhmAuth.hashPin('1234');
  ok(h1.length === 64,         'hashPin → 64자리 hex');
  ok(h1 === await BhmAuth.hashPin('1234'), 'hashPin 결정적');
  ok(h1 !== await BhmAuth.hashPin('5678'), '다른 PIN → 다른 해시');

  ok(BhmAuth._isLockExpired(null)                === true,  'null → 잠금 없음');
  ok(BhmAuth._isLockExpired(Date.now() - 1000)   === true,  '과거 → 만료됨');
  ok(BhmAuth._isLockExpired(Date.now() + 60000)  === false, '미래 → 잠금 중');

  ok(BhmAuth._isAutoLocked(null)                 === true,  '기록 없음 → 자동 잠금');
  ok(BhmAuth._isAutoLocked(Date.now() - 1800001) === true,  '31분 전 → 자동 잠금');
  ok(BhmAuth._isAutoLocked(Date.now() - 1799000) === false, '29분 전 → 정상');

  ok(BhmStorage.KEYS.PIN_SALT   === 'bhm_pin_salt',   'PIN_SALT 키');
  ok(BhmStorage.KEYS.PIN_LENGTH === 'bhm_pin_length', 'PIN_LENGTH 키');

  console.log(p + ' passed, ' + f + ' failed');
  process.exit(f > 0 ? 1 : 0);
}
run();
