var assert = require('assert');

var uid = 'u12345';
var base = 'payslip_' + uid + '_' + '2026' + '_' + '04';
assert.strictEqual(base, 'payslip_u12345_2026_04', '기본 키 포맷');

var withType = base + '_성과';
assert.strictEqual(withType, 'payslip_u12345_2026_04_성과', '타입 suffix 포맷');

var oldKey = 'payslip_2026_04';
var m = oldKey.match(/^payslip_(\d{4})_(\d{2})(?:_(.+))?$/);
assert.ok(m, '구 키 regex 매칭');
assert.strictEqual(m[1], '2026'); assert.strictEqual(m[2], '04');

console.log('PASS payslip-namespace: 3 passed');
