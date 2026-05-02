#!/usr/bin/env node
// Plan J — full_union <-> calc-registry 자동 링크 검증
// 목적: data/calc-registry.json 의 각 data_value 항목이 가진 article (조항)
//   참조에 대해 data/full_union_regulation_2026.md 본문에서
//   해당 조항 섹션을 추출하고, expected 값(숫자)이 본문에 등장하는지 검증.
// 출력: docs/architecture/registry-link-report.md
// 실행: npm run check:regulation
// 의존성 0 (Node 표준 fs/path만 사용)

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
// Phase 2-A 후: 데이터 자산은 public/ 하위 (Vite publicDir).
const REGISTRY_PATH = path.join(ROOT, 'public', 'data', 'calc-registry.json');
const REGULATION_PATH = path.join(ROOT, 'public', 'data', 'full_union_regulation_2026.md');
const REPORT_PATH = path.join(ROOT, 'docs', 'architecture', 'registry-link-report.md');

function readJson(p) {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
}
function readText(p) {
    return fs.readFileSync(p, 'utf8');
}

function normalizeReportTimestamp(text) {
    return text
        .replace(/^> 생성 시각: .+$/m, '> 생성 시각: <generated>')
        .replace(/\s+$/u, '');
}

function writeReportIfMeaningfulChange(reportPath, text) {
    if (fs.existsSync(reportPath)) {
        const current = fs.readFileSync(reportPath, 'utf8');
        if (normalizeReportTimestamp(current) === normalizeReportTimestamp(text)) {
            return;
        }
    }
    fs.writeFileSync(reportPath, text);
}

function escapeRegExp(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findNextSectionEnd(regText, startIdx, fallbackChars = 5000) {
    const nextHeaderPattern = /^(?:---\s*)?(?:#{2,4}\s+|\*\*제\d+조|\*\*<\d{4}\.\d{2}>|\*\*<\s*별\s*표\s*>|\*\*개인별|\*\*기본급|\*\*보수월액|\*\*직급보조비)/gm;
    nextHeaderPattern.lastIndex = startIdx + 1;
    const nextMatch = nextHeaderPattern.exec(regText);
    return nextMatch ? nextMatch.index : Math.min(startIdx + fallbackChars, regText.length);
}

function extractByLiteralHeading(regText, article) {
    if (!article) return null;
    const idx = regText.indexOf(article);
    if (idx === -1) return null;
    const lineStart = regText.lastIndexOf('\n', idx);
    const startIdx = lineStart === -1 ? idx : lineStart + 1;
    return regText.slice(startIdx, findNextSectionEnd(regText, startIdx, 5000));
}

// 조항 본문 추출 — "제XX조" / "제XX조의Y" / "<YYYY.MM>" 패턴
function extractArticleBody(regText, article) {
    const m = article.match(/제(\d+)조(?:의(\d+))?/);
    if (m) {
        const num = m[1];
        const sub = m[2];
        const headerPattern = sub
            ? new RegExp(`\\*\\*제${num}조의${sub}[^*]*\\*\\*`, 'g')
            : new RegExp(`\\*\\*제${num}조[^*]*\\*\\*`, 'g');
        const startMatch = headerPattern.exec(regText);
        if (!startMatch) return null;
        const startIdx = startMatch.index;
        const nextHeaderPattern = /\*\*제\d+조[^*]*\*\*/g;
        nextHeaderPattern.lastIndex = startIdx + startMatch[0].length;
        const nextMatch = nextHeaderPattern.exec(regText);
        const endIdx = nextMatch ? nextMatch.index : Math.min(startIdx + 5000, regText.length);
        return regText.slice(startIdx, endIdx);
    }
    const sep = article.match(/<(\d{4})\.(\d{2})>/);
    if (sep) {
        const tag = `<${sep[1]}.${sep[2]}>`;
        const idx = regText.indexOf(tag);
        if (idx === -1) return null;
        return regText.slice(Math.max(0, idx - 200), Math.min(regText.length, idx + 1500));
    }
    return null;
}

// 숫자 정규화
function valueAppears(body, expected) {
    if (body == null || expected == null) return false;
    if (typeof expected === 'number') {
        if (Number.isInteger(expected)) {
            const raw = String(expected);
            const withComma = expected.toLocaleString('en-US');
            const inMan = expected % 10000 === 0 ? `${expected / 10000}만` : null;
            const cands = [raw, withComma, inMan].filter(Boolean);
            return cands.some(c => body.includes(c));
        }
        const asPct = `${Math.round(expected * 100)}%`;
        const asDecimal = String(expected);
        return body.includes(asPct) || body.includes(asDecimal);
    }
    if (typeof expected === 'string') {
        return body.includes(expected);
    }
    return false;
}

function main() {
    const registry = readJson(REGISTRY_PATH);
    const regText = readText(REGULATION_PATH);
    const rows = [];
    let pass = 0, ambiguous = 0, fail = 0;

    for (const item of (registry.data_values || [])) {
        const body = extractArticleBody(regText, item.article || '');
        let status, note;
        if (body == null) {
            status = '❌';
            note = `${item.article} 조항 본문 미검출`;
            fail++;
        } else if (valueAppears(body, item.expected)) {
            status = '✅';
            note = '본문 expected 값 일치';
            pass++;
        } else {
            status = '🟡';
            note = `조항 본문 발견되었으나 expected=${item.expected} 미검출 (별첨 가능성 / 단위 불일치)`;
            ambiguous++;
        }
        rows.push({
            status,
            path: item.path,
            article: item.article,
            expected: item.expected,
            note,
        });
    }

    const total = rows.length;
    const lines = [];
    lines.push('# Registry Link Report');
    lines.push('');
    lines.push('> 자동 생성: `scripts/check-regulation-link.js`');
    lines.push(`> 생성 시각: ${new Date().toISOString()}`);
    lines.push(`> 입력: \`data/calc-registry.json\` (${total} data_values) ↔ \`data/full_union_regulation_2026.md\``);
    lines.push('');
    lines.push('## 요약');
    lines.push('');
    lines.push('| 상태 | 개수 | 비율 |');
    lines.push('|------|------|------|');
    lines.push(`| ✅ 일치 | ${pass} | ${total ? Math.round(pass / total * 100) : 0}% |`);
    lines.push(`| 🟡 불명확 | ${ambiguous} | ${total ? Math.round(ambiguous / total * 100) : 0}% |`);
    lines.push(`| ❌ 미일치 | ${fail} | ${total ? Math.round(fail / total * 100) : 0}% |`);
    lines.push(`| **총** | **${total}** | — |`);
    lines.push('');
    lines.push('## 항목별 검증');
    lines.push('');
    lines.push('| 상태 | path | article | expected | note |');
    lines.push('|------|------|---------|----------|------|');
    for (const r of rows) {
        const expDisplay = typeof r.expected === 'number' ? r.expected.toLocaleString('en-US') : String(r.expected);
        lines.push(`| ${r.status} | \`${r.path}\` | ${r.article} | ${expDisplay} | ${r.note} |`);
    }
    lines.push('');
    lines.push('## 해석');
    lines.push('');
    lines.push('- **✅ 일치**: full_union 본문에서 해당 조항 발견 + expected 값 그대로 등장 → SoT 일치.');
    lines.push('- **🟡 불명확**: 조항 발견되었으나 expected 값이 본문에 직접 등장 안 함. 별첨 일람표에만 기재되었거나 (예: 별첨 보수표), 단위 표기 차이 (예: "15만원" vs "150,000") 가능. **수동 확인 필요.**');
    lines.push('- **❌ 미일치**: 조항 헤더 자체 검출 실패. 조항 번호 오타 / 별도합의 태그 형식 차이 / regulation 미반영. **즉시 수정 필요.**');
    lines.push('');
    lines.push('## 후속');
    lines.push('');
    lines.push('- 🟡 항목은 별첨 섹션 수동 확인 후 정상 처리 또는 calc-registry.json article 필드 정정.');
    lines.push('- ❌ 항목은 regulation 본문에 해당 조항 추가 또는 article 필드 오기 정정.');
    lines.push('- 단협 개정 시 본 스크립트를 재실행해 drift 자동 감지: `npm run check:regulation`');

    fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
    writeReportIfMeaningfulChange(REPORT_PATH, `${lines.join('\n')}\n`);

    console.log(`[check-regulation-link] ✅ ${pass} / 🟡 ${ambiguous} / ❌ ${fail} (총 ${total})`);
    console.log(`[check-regulation-link] 리포트: ${path.relative(ROOT, REPORT_PATH)}`);

    if (fail > 0) {
        process.exitCode = 2;
    }
}

main();
