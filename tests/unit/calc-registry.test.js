// Plan E: calc-registry.json ↔ DATA 드리프트 감지
// 단협 개정 시 세 곳 동기화 안 되면 이 테스트가 실패한다:
//   1) data/calc-registry.json (본 assert 기준)
//   2) data.js DATA_STATIC (실제 런타임 값)
//   3) hospital_guidelines_2026.md (사람 가독용 요약)
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const registry = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../data/calc-registry.json'), 'utf8')
);

// data.js 전역 DATA 로드 (Node 호환 CommonJS export 이용)
const { DATA } = require('../../data.js');
globalThis.DATA = DATA;

function getPath(obj, pathStr) {
  return pathStr.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

describe('calc-registry.json ↔ DATA 단일 값 drift', () => {
  registry.data_values.forEach(({ path: p, expected, article, summary }) => {
    it(`${article} → DATA.${p} === ${expected} (${summary})`, () => {
      expect(getPath(DATA, p)).toBe(expected);
    });
  });
});

describe('calc-registry.json ↔ DATA 배열 구조 drift', () => {
  registry.array_assertions.forEach(({ path: p, items, article, summary }) => {
    it(`${article} → DATA.${p} items (${summary})`, () => {
      const actual = getPath(DATA, p);
      expect(Array.isArray(actual), `${p} 는 배열이어야 함`).toBe(true);
      expect(actual.length, `${p} 길이`).toBe(items.length);
      items.forEach((expectedItem, idx) => {
        const actualItem = actual[idx];
        expect(actualItem, `${p}[${idx}] 존재`).toBeDefined();
        Object.entries(expectedItem).forEach(([key, val]) => {
          if (key === 'note') return; // note 는 메타 설명, assert 제외
          expect(actualItem[key], `${p}[${idx}].${key}`).toBe(val);
        });
      });
    });
  });
});

// ── Task 4: CALC 함수 존재성 ──
const { CALC } = require('../../calculators.js');

describe('CALC 함수 존재성 (registry 기준)', () => {
  registry.calc_functions.forEach(({ name, required, note }) => {
    if (required) {
      it(`CALC.${name} 는 함수로 존재 (${note})`, () => {
        expect(typeof CALC[name], `CALC.${name} 타입`).toBe('function');
      });
    } else {
      // dead export — 제거 권장 (Plan F). 현재는 skip.
      it.skip(`CALC.${name} 는 dead export — Plan F 제거 대상 (${note})`, () => {});
    }
  });
});

// ── Task 5: CALC.xxx 외부 호출 참조 무결성 (Bug #3/#4) ──
describe('CALC.xxx 외부 호출 참조 무결성', () => {
  registry.calc_references.forEach(({ name, status, actual_namespace, note }) => {
    if (status === 'ok') {
      it(`CALC.${name} 호출 가능 (정상 참조)`, () => {
        expect(typeof CALC[name]).toBe('function');
      });
    } else {
      // 알려진 broken — 현재 skip. Plan F 완료 후 skip 해제해 PASS 로 승격.
      it.skip(`[${status}] CALC.${name} — ${note}`, () => {
        if (status === 'wrong_namespace' && actual_namespace === 'PROFILE') {
          const { PROFILE } = require('../../profile.js');
          expect(typeof PROFILE[name]).toBe('function'); // 현재는 PROFILE 에 있음
          expect(typeof CALC[name]).toBe('function');    // 수정 후 CALC 에도 있거나 호출부가 PROFILE 로 변경되어야
        } else if (status === 'broken') {
          expect(typeof CALC[name]).toBe('function'); // 수정 후 존재해야 함
        }
      });
    }
  });
});
