#!/usr/bin/env node
// Plan L Tier 2 — 보수표 27직급 × 8호봉 전수 대조
// 입력: data.js DATA_STATIC.payTables ↔ data/full_union_regulation_2026.md 별첨 보수표
// 출력: docs/architecture/paytable-link-report.md
// 실행: npm run check:paytable
// 의존성 0 (Node 표준 fs/path/vm 만)

'use strict';

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');
// Phase 6 Task 4: root data.js 삭제 → packages/data 로 직접 참조.
const DATA_PATH = path.join(ROOT, 'packages', 'data', 'src', 'index.js');
// Phase 2-A 후: 규정 본문은 public/data/ 하위 (Vite publicDir).
const REG_PATH = path.join(ROOT, 'public', 'data', 'full_union_regulation_2026.md');
const REPORT_PATH = path.join(ROOT, 'docs', 'architecture', 'paytable-link-report.md');

// Phase 2-B 후: data 모듈은 ESM. CJS .cjs 에서 동적 import 으로 로드.
async function loadData() {
    // Node 의 ESM 로더는 브라우저 globals 미정의 → data 모듈의 호환층
    // (`if (typeof window !== 'undefined')`) 가 자동 스킵되어 안전하게 import 됨.
    const mod = await import(pathToFileURL(DATA_PATH).href);
    return mod.DATA_STATIC;
}

// ── 별첨 보수표 파싱 ──
// 마크다운 표 형식: | M | M3 | 54,482,400 | ... | 능력급 | 상여금 | 가계지원비 |
function parsePayTableSection(regText, sectionTitle) {
    const idx = regText.indexOf(sectionTitle);
    if (idx === -1) return null;
    // 다음 ### 또는 ## 헤더 직전까지 발췌
    const after = regText.slice(idx + sectionTitle.length);
    const nextHeader = after.search(/\n###?\s/);
    const sliceEnd = nextHeader === -1 ? after.length : nextHeader;
    const slice = after.slice(0, sliceEnd);
    const lines = slice.split('\n').filter(l => l.startsWith('| '));
    // header + separator 2줄 제외
    const dataLines = lines.slice(2);
    const result = {};
    for (const line of dataLines) {
        const cells = line.split('|').map(c => c.trim()).filter((_, i) => i > 0); // 첫 빈 셀 제거
        // cells: [직급, 자격등급, 1년차, ..., 8년차, 능력급, 상여금, 가계지원비]
        if (cells.length < 12) continue;
        const grade = cells[1];
        if (!/^[A-Z]+\d?$/.test(grade)) continue;
        const basePayByYear = cells.slice(2, 10).map(c => parseInt(c.replace(/,/g, ''), 10));
        const ability = parseInt(cells[10].replace(/,/g, ''), 10);
        const bonus = parseInt(cells[11].replace(/,/g, ''), 10);
        const familySupport = parseInt(cells[12].replace(/,/g, ''), 10);
        result[grade] = { basePayByYear, ability, bonus, familySupport };
    }
    return result;
}

function compareTable(name, regTable, dataTable) {
    const drift = [];
    if (!regTable || !dataTable) {
        return { table: name, error: '테이블 검출 실패', drift: [] };
    }
    for (const grade of Object.keys(regTable)) {
        const reg = regTable[grade];
        const dataBase = dataTable.basePay?.[grade];
        const dataAbility = dataTable.abilityPay?.[grade];
        const dataBonus = dataTable.bonus?.[grade];
        const dataFam = dataTable.familySupport?.[grade];

        if (!dataBase) {
            drift.push({ grade, field: 'basePay', regValue: reg.basePayByYear, dataValue: null, severity: '❌' });
            continue;
        }
        for (let i = 0; i < 8; i++) {
            if (reg.basePayByYear[i] !== dataBase[i]) {
                drift.push({
                    grade,
                    field: `basePay[${i + 1}년차]`,
                    regValue: reg.basePayByYear[i],
                    dataValue: dataBase[i],
                    severity: '❌',
                });
            }
        }
        if (reg.ability !== dataAbility) {
            drift.push({ grade, field: 'abilityPay', regValue: reg.ability, dataValue: dataAbility, severity: '❌' });
        }
        if (reg.bonus !== dataBonus) {
            drift.push({ grade, field: 'bonus', regValue: reg.bonus, dataValue: dataBonus, severity: '❌' });
        }
        if (reg.familySupport !== dataFam) {
            drift.push({ grade, field: 'familySupport', regValue: reg.familySupport, dataValue: dataFam, severity: '❌' });
        }
    }
    return { table: name, drift };
}

async function main() {
    const DATA = await loadData();
    const regText = fs.readFileSync(REG_PATH, 'utf8');

    const sections = [
        { title: '### 2025년 일반직 보수표', dataKey: '일반직' },
        { title: '### 2025년 운영기능직 보수표', dataKey: '운영기능직' },
        { title: '### 2025년 환경유지지원직 보수표', dataKey: '환경유지지원직' },
    ];

    const results = sections.map(s => {
        const regTable = parsePayTableSection(regText, s.title);
        const dataTable = DATA.payTables[s.dataKey];
        return compareTable(s.dataKey, regTable, dataTable);
    });

    const totalDrift = results.reduce((sum, r) => sum + (r.drift?.length || 0), 0);
    const totalCells = 27 * 11; // 27등급 × (8년차 + 능력급 + 상여금 + 가계지원비)

    const lines = [];
    lines.push('# Paytable Link Report');
    lines.push('');
    lines.push('> 자동 생성: `scripts/check-paytable.js`');
    lines.push(`> 생성 시각: ${new Date().toISOString()}`);
    lines.push(`> 입력: \`data.js DATA_STATIC.payTables\` ↔ \`data/full_union_regulation_2026.md\` 별첨 보수표`);
    lines.push('');
    lines.push('## 요약');
    lines.push('');
    lines.push(`- **총 비교 셀**: ${totalCells} (27등급 × 11항목)`);
    lines.push(`- **drift 발견**: ${totalDrift} 건`);
    lines.push(`- **strict coverage**: ${Math.round((totalCells - totalDrift) / totalCells * 1000) / 10}%`);
    lines.push('');

    for (const r of results) {
        lines.push(`## ${r.table}`);
        lines.push('');
        if (r.error) {
            lines.push(`❌ ${r.error}`);
            lines.push('');
            continue;
        }
        if (r.drift.length === 0) {
            lines.push('✅ 모든 셀 일치 (drift 0)');
            lines.push('');
            continue;
        }
        lines.push('| grade | field | regulation | data.js | severity |');
        lines.push('|-------|-------|------------|---------|----------|');
        for (const d of r.drift) {
            lines.push(`| ${d.grade} | ${d.field} | ${d.regValue?.toLocaleString?.() ?? d.regValue} | ${d.dataValue?.toLocaleString?.() ?? d.dataValue} | ${d.severity} |`);
        }
        lines.push('');
    }

    lines.push('## 후속');
    lines.push('');
    if (totalDrift === 0) {
        lines.push('- ✅ 모든 보수표 셀이 별첨과 일치 — Plan L Tier 2 완료.');
    } else {
        lines.push(`- ❌ ${totalDrift} 건 drift — \`data.js DATA_STATIC.payTables\` 정정 또는 \`full_union_regulation_2026.md\` 별첨 갱신 필요.`);
    }
    lines.push('- 단협 개정 시 본 스크립트를 재실행해 drift 자동 감지: `npm run check:paytable`.');

    fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
    fs.writeFileSync(REPORT_PATH, lines.join('\n'));

    console.log(`[check-paytable] drift ${totalDrift} / ${totalCells} cells (${Math.round((totalCells - totalDrift) / totalCells * 1000) / 10}% match)`);
    console.log(`[check-paytable] 리포트: ${path.relative(ROOT, REPORT_PATH)}`);
    if (totalDrift > 0) process.exitCode = 2;
}

main().catch(err => { console.error(err); process.exit(1); });
