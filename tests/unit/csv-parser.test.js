// tests/unit/csv-parser.test.js — CSV 파서 단위 테스트
import { describe, it, expect } from 'vitest';
import { parseCsvFile } from '../../apps/web/src/client/schedule-parser/csv-parser.js';

describe('parseCsvFile', () => {
  it('CSV 텍스트 → DutyGrid', async () => {
    const csv = [
      '간호사,1,2,3,4,5,6,7',
      '김민지,D,E,N,O,D,D,E',
      '이수연,N,O,D,E,D,D,E',
    ].join('\n');
    const result = await parseCsvFile(csv);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].name).toBe('김민지');
    expect(result.rows[0].days['1']).toBe('D');
    expect(result.rows[1].days['1']).toBe('N');
    expect(result.confidence).toBe(1.0);
  });

  it('UTF-8 BOM 처리', async () => {
    const csv = '﻿간호사,1,2,3,4,5,6,7\n김민지,D,E,N,O,D,D,E';
    const result = await parseCsvFile(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].name).toBe('김민지');
  });

  it('따옴표 escape', async () => {
    const csv = '간호사,1,2,3,4,5,6,7\n"김, 민지",D,E,N,O,D,D,E';
    const result = await parseCsvFile(csv);
    expect(result.rows).toHaveLength(1);
  });

  it('빈 줄 무시', async () => {
    const csv = [
      '간호사,1,2,3,4,5,6,7',
      '',
      '김민지,D,E,N,O,D,D,E',
      '',
    ].join('\n');
    const result = await parseCsvFile(csv);
    expect(result.rows).toHaveLength(1);
  });

  it('빈 CSV → reason', async () => {
    const result = await parseCsvFile('');
    expect(result.confidence).toBe(0);
    expect(result.rows).toHaveLength(0);
  });
});
