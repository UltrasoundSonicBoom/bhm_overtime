#!/usr/bin/env node
// scripts/refresh-holidays.mjs
//
// 정부 공공데이터포털 SpcdeInfoService 에서 연도별 공휴일을 가져와
// apps/web/public/data/holidays/{year}.json 갱신.
//
// 사용:
//   PUBLIC_DATA_API_KEY=xxx node scripts/refresh-holidays.mjs --year=2026
//   PUBLIC_DATA_API_KEY=xxx node scripts/refresh-holidays.mjs --years=2025,2026,2027,2028
//
// GitHub Actions 가 매월 1일 호출 → diff 발생 시 PR 자동 생성.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../apps/web/public/data/holidays');

const API_BASE = 'https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService';
const SERVICE_KEY = process.env.PUBLIC_DATA_API_KEY || process.env.DATA_GO_KR_SERVICE_KEY;

if (!SERVICE_KEY) {
  console.error('PUBLIC_DATA_API_KEY 환경변수 필요');
  process.exit(1);
}

function parseYears() {
  const args = process.argv.slice(2);
  const yearArg = args.find(a => a.startsWith('--year='));
  const yearsArg = args.find(a => a.startsWith('--years='));
  if (yearArg) return [Number(yearArg.split('=')[1])];
  if (yearsArg) return yearsArg.split('=')[1].split(',').map(Number);
  // default: 올해 + 다음 해
  const now = new Date().getFullYear();
  return [now, now + 1];
}

async function fetchOperation(operation, year) {
  const url = new URL(`${API_BASE}/${operation}`);
  url.searchParams.set('ServiceKey', SERVICE_KEY);
  url.searchParams.set('solYear', String(year));
  url.searchParams.set('numOfRows', '100');
  url.searchParams.set('_type', 'json');

  const res = await fetch(url);
  if (!res.ok) throw new Error(`${operation} ${year} HTTP ${res.status}`);
  const data = await res.json();
  const raw = data?.response?.body?.items?.item;
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  return list.map(item => ({
    name: String(item.dateName ?? ''),
    date: String(item.locdate ?? ''),
    isHoliday: item.isHoliday === 'Y' || item.isHoliday === true,
    dateKind: String(item.dateKind ?? ''),
  }));
}

// 정부 API ↔ SNUH 단협 표기 정규화 (정부 명칭 → 단협/내부 통일 명칭)
const NAME_NORMALIZATION = {
  '노동절': '근로자의 날', // 단협 제32조(6) 표기
};

function normalizeHolidayName(rawName) {
  return NAME_NORMALIZATION[rawName] ?? rawName;
}

async function refreshYear(year) {
  console.log(`[${year}] fetching getRestDeInfo + getHoliDeInfo...`);
  const [rest, holi] = await Promise.all([
    fetchOperation('getRestDeInfo', year),
    fetchOperation('getHoliDeInfo', year),
  ]);

  const merged = new Map();
  for (const item of [...rest, ...holi]) {
    if (item.isHoliday !== false) {
      const normalizedName = normalizeHolidayName(item.name);
      // dedupe key 는 정규화된 이름 기준 — 정부 API 가 노동절/근로자의 날 두 가지로 보내도 1건으로 머지
      merged.set(`${item.date}_${normalizedName}`, { ...item, name: normalizedName });
    }
  }

  // 단협 제32조(6): 근로자의 날 (5/1) 정부 API 미포함 시 명시 추가 (안전망)
  const workersDay = `${year}0501`;
  if (!Array.from(merged.values()).some(h => h.date === workersDay)) {
    merged.set(`${workersDay}_근로자의 날`, {
      name: '근로자의 날',
      date: workersDay,
      isHoliday: true,
      dateKind: '01',
    });
  }

  // 카테고리 분류
  const items = Array.from(merged.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(h => {
      let category = '법정공휴일';
      if (h.name.includes('대체공휴일')) category = '대체공휴일';
      else if (h.name.includes('선거')) category = '임시공휴일';
      return { name: h.name, date: h.date, category };
    });

  const json = {
    _meta: {
      year,
      source: '공공데이터포털 SpcdeInfoService + 단협 제32조(6) (근로자의 날 포함)',
      updated: new Date().toISOString().slice(0, 10),
    },
    holidays: items,
  };

  const file = path.join(DATA_DIR, `${year}.json`);
  const existing = await fs.readFile(file, 'utf-8').catch(() => null);
  const next = JSON.stringify(json, null, 2) + '\n';

  if (existing === next) {
    console.log(`[${year}] no change`);
    return false;
  }
  await fs.writeFile(file, next, 'utf-8');
  console.log(`[${year}] updated (${items.length} items)`);
  return true;
}

const years = parseYears();
let anyChanged = false;
for (const year of years) {
  try {
    const changed = await refreshYear(year);
    anyChanged = anyChanged || changed;
  } catch (e) {
    console.error(`[${year}] 실패:`, e.message);
  }
}

// GitHub Actions 가 stdout 으로 변경 여부 감지
console.log(`CHANGED=${anyChanged ? '1' : '0'}`);
process.exit(0);
