// regulation-actions.json schema + cross-link drift test
// Plan dazzling-booping-kettle Task B1
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../../');
const actions = JSON.parse(
  readFileSync(resolve(root, 'apps/web/public/data/regulation-actions.json'), 'utf8')
);
const articles = JSON.parse(
  readFileSync(resolve(root, 'apps/web/public/data/union_regulation_2026.json'), 'utf8')
);
const articleIds = new Set(articles.map((a) => a.id));
const categoryIds = new Set(actions.categories.map((c) => c.id));

describe('regulation-actions.json — schema & cross-link drift', () => {
  it('스키마 버전 v1 + 17 events', () => {
    expect(actions.schema).toBe('regulation-actions/v1');
    expect(actions.events.length).toBe(17);
  });

  it('모든 event 의 regulation_articles 는 union_regulation_2026.json 에 존재', () => {
    const missing = [];
    for (const ev of actions.events) {
      for (const aid of ev.regulation_articles) {
        if (!articleIds.has(aid)) missing.push(`${ev.event_id} → ${aid}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('각 event 의 category 는 categories[] 에 정의됨', () => {
    const bad = actions.events.filter((ev) => !categoryIds.has(ev.category));
    expect(bad.map((b) => b.event_id)).toEqual([]);
  });

  it('event_id 중복 없음', () => {
    const ids = actions.events.map((e) => e.event_id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('각 event 는 필수 필드(event_id/category/title/regulation_articles/procedure_steps/contacts) 보유', () => {
    for (const ev of actions.events) {
      expect(ev.event_id, `event_id missing for ${JSON.stringify(ev).slice(0, 80)}`).toBeTruthy();
      expect(ev.category).toBeTruthy();
      expect(ev.title).toBeTruthy();
      expect(Array.isArray(ev.regulation_articles)).toBe(true);
      expect(ev.regulation_articles.length).toBeGreaterThan(0);
      expect(Array.isArray(ev.procedure_steps)).toBe(true);
      expect(ev.procedure_steps.length).toBeGreaterThan(0);
      expect(Array.isArray(ev.contacts)).toBe(true);
      expect(ev.contacts.length).toBeGreaterThan(0);
    }
  });

  it('email_template 이 있으면 to/subject/body 모두 존재', () => {
    for (const ev of actions.events) {
      if (ev.email_template) {
        expect(ev.email_template.to).toBeTruthy();
        expect(ev.email_template.subject).toBeTruthy();
        expect(ev.email_template.body).toBeTruthy();
      }
    }
  });

  it('5 카테고리 모두 1건 이상 event 보유', () => {
    const counts = {};
    for (const ev of actions.events) counts[ev.category] = (counts[ev.category] || 0) + 1;
    expect(counts.bereavement).toBeGreaterThanOrEqual(6);
    expect(counts.wedding).toBeGreaterThanOrEqual(2);
    expect(counts.birth).toBeGreaterThanOrEqual(2);
    expect(counts.leave).toBeGreaterThanOrEqual(4);
    expect(counts.retirement).toBeGreaterThanOrEqual(1);
  });
});
