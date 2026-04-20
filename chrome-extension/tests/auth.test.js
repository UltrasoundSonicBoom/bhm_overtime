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

  // salted hashPin 테스트
  const h1s = await BhmAuth.hashPin('1234', 'abc');
  const h2s = await BhmAuth.hashPin('1234', 'abc');
  const h3s = await BhmAuth.hashPin('1234', 'xyz');
  const h4s = await BhmAuth.hashPin('1234');
  ok(h1s === h2s,        'salt 동일 → 해시 동일');
  ok(h1s !== h3s,        'salt 다름 → 해시 다름');
  ok(h4s.length === 64,  'salt 없음 하위호환');

  // applyApplockData mock 테스트
  const ms = {
    KEYS: BhmStorage.KEYS,
    _s: {},
    get(keys) { const r={}; keys.forEach(k=>{r[k]=this._s[k]||null;}); return Promise.resolve(r); },
    set(items) { Object.assign(this._s,items); return Promise.resolve(); },
    remove(keys) { keys.forEach(k=>delete this._s[k]); return Promise.resolve(); },
  };
  const r1 = await BhmAuth.applyApplockData(
    { pinEnabled:true, pinHash:'deadbeef', pinSalt:'salt1', pinLength:4 }, ms);
  ok(r1 === true,                         'applyApplockData PIN 없을 때 적용');
  ok(ms._s['bhm_pin_hash']==='deadbeef',  'applyApplockData pinHash 저장');
  const r2 = await BhmAuth.applyApplockData(
    { pinEnabled:true, pinHash:'other',    pinSalt:'salt2', pinLength:4 }, ms);
  ok(r2 === false,                        'applyApplockData 이미 있으면 스킵');
  ok(ms._s['bhm_pin_hash']==='deadbeef',  'applyApplockData 기존 PIN 유지');

  console.log(p + ' passed, ' + f + ' failed');
  process.exit(f > 0 ? 1 : 0);
}
run();
