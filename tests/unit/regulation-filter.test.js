import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  REGULATION_HIDDEN_CHAPTERS,
  getVisibleRegulationChapters,
} from '../../apps/web/src/client/regulation-filter.js';

describe('regulation browse visibility', () => {
  it('does not hide any chapter by default', () => {
    const articles = JSON.parse(readFileSync('apps/web/public/data/union_regulation_2026.json', 'utf8'));
    const chapters = [...new Set(articles.map((article) => article.chapter))];

    expect(REGULATION_HIDDEN_CHAPTERS).toEqual({});
    expect(getVisibleRegulationChapters(chapters)).toEqual(chapters);
    expect(chapters).toEqual([
      '제1장 총칙',
      '제2장 조합 활동',
      '제3장 인사',
      '제4장 근로시간',
      '제5장 임금 및 퇴직금',
      '제6장 복리후생 및 교육훈련',
      '제7장 안전보건, 재해보상',
      '제8장 단체교섭',
      '제9장 노사협의회',
      '제10장 부칙',
      '별도 합의사항',
      '별첨',
    ]);
  });

  it('keeps a separate explicit filter path for future compact views', () => {
    expect(getVisibleRegulationChapters(['A', 'B', 'C'], { B: true })).toEqual(['A', 'C']);
  });
});
