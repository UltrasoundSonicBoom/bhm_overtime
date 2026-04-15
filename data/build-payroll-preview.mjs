import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const parserModule = await import(path.join(repoRoot, 'salary-parser.js'));
const parser = parserModule.default || parserModule;

if (!parser.__debug?.parsePdfBytes) {
  throw new Error('SALARY_PARSER.__debug.parsePdfBytes is unavailable');
}

const FIXTURES = [
  { id: '2512_salary', label: '2512 일반직 급여', fileName: '2512 일반직 급여.pdf' },
  { id: '2512_salary_retro', label: '2512 일반직 소급', fileName: '2512 일반직 소급.pdf' },
  { id: '2601_salary', label: '2601 일반직 급여', fileName: '2601 일반직 급여.pdf' },
  { id: '2601_annual_leave', label: '2601 일반직 연차수당', fileName: '2601 일반직연차수당.pdf' },
  { id: '2602_salary', label: '2602 salary', fileName: '2602 salary.pdf' },
];

function toComparableItem(item) {
  return {
    name: item.name,
    originalName: item.originalName,
    canonicalName: item.canonicalName,
    value: item.value,
    unit: item.unit,
    confidence: item.confidence,
  };
}

function toComparableLine(line) {
  return {
    section: line.section,
    itemName: line.itemName,
    amount: line.amount,
  };
}

async function build() {
  const outputDir = path.join(repoRoot, 'data', 'payroll-preview');
  const outputPath = path.join(outputDir, 'preview-data.json');
  await fs.mkdir(outputDir, { recursive: true });

  const documents = [];
  for (const fixture of FIXTURES) {
    const absolutePath = path.join(repoRoot, 'data', fixture.fileName);
    const raw = await fs.readFile(absolutePath);
    const result = await parser.__debug.parsePdfBytes(new Uint8Array(raw), { pdfjsLib });

    documents.push({
      id: fixture.id,
      label: fixture.label,
      fileName: fixture.fileName,
      pdfPath: `../${fixture.fileName}`,
      metadata: result.metadata || {},
      employeeInfo: result.employeeInfo || {},
      summary: result.summary || {},
      earnings: (result.earnings || []).map(toComparableItem),
      deductions: (result.deductions || []).map(toComparableItem),
      workRecords: (result.workRecords || []).map(toComparableItem),
      detailLines: (result.detailLines || []).map(toComparableLine),
      unknownItems: (result.unknownItems || []).map(toComparableItem),
      documentModel: result.documentModel ? {
        pages: result.documentModel.pages,
        blocks: result.documentModel.blocks,
        tables: result.documentModel.tables,
      } : null,
      rawBlocks: result.rawBlocks || [],
      parseInfo: result._parseInfo || {},
    });
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    totalDocuments: documents.length,
    documents,
  };

  await fs.writeFile(outputPath, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`Wrote ${outputPath}`);
}

await build();
